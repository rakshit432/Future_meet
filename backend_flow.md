# Deep Dive: Backend Agent Architecture

The backend is an **Autonomous Agent** built using Python `asyncio`. It is not a classic web server (like Flask/Django) but an **Event-Driven Daemon**. It sits in an infinite loop, monitoring a meeting for specific interaction triggers.

## 1. The Async Event Loop (`main.py`)

The core of the application is the `start_agent` function, which sets up a non-blocking event loop.

```python
# Simplified Logic Flow
while True:
    try:
        agent = create_agent(...)
        await agent.join(call) # Blocks here until call ends or error
    except Exception:
        wait_exponential_backoff()
        retry()
```

### Why Asyncio?
Real-time audio processing requires high concurrency. The agent must:
1.  Receive incoming audio packets.
2.  Send outgoing audio (TTS).
3.  Wait for LLM responses.
4.  Listen for new participants.
**All at the same time.** Standard synchronous Python would block on the first network request, causing the agent to "freeze" and miss what people are saying.

## 2. Integration with Vision Agents & Stream

The project uses the `vision_agents` library as an abstraction layer over the raw Stream WebSocket protocol.

- **The `Agent` Object**: This is the brain. It is configured with:
    - **Edge (GetStream)**: The "ears" and "mouth". Handles the raw `RealtimeUserSpeechTranscriptionEvent` events.
    - **LLM (Gemini Realtime)**: The "cortex". Processes text/audio and generates intelligence.

### The Speech Pipeline
1.  **Ingestion**: Stream's servers transcribe user audio *in the cloud* and send text chunks to the python script via WebSocket.
    - Event: `RealtimeUserSpeechTranscriptionEvent`.
    - Payload: `{ "text": "Hello assistant...", "participant_id": "user-123", "is_final": false }`
2.  **Aggregation**: The script appends these chunks to `meeting_data["transcript"]`. It has to handle "partial" results vs "final" results to avoid duplicate text (though the simple version just appends).

## 3. The "Wake Word" Logic
The agent is not always talking. It implements a **Wake Word Detection** pattern effectively:

1.  **Passive Mode**: It listens to the transcript stream.
    ```python
    if "hey assistant" in transcript_text.lower():
        trigger_active_mode()
    ```
2.  **Active Mode (Q&A)**:
    - **Step 1: Extract Query**: Everything spoken *after* "Hey Assistant" is captured as the query.
    - **Step 2: Context Construction**: The agent loops through the *entire* `meeting_data['transcript']` list to build a "Prompt Context".
    - **Step 3: RAG-lite**: It effectively performs "In-Context Learning" by dumping the whole conversation history into the prompt.
    - **Step 4: Generation**: It asks Gemini: *"Based ONLY on the transcript above, answer: [User Query]"*.
    - **Step 5: TTS**: The text response from Gemini is converted to audio and streamed back into the call.

## 4. Error Handling & Resilience
- **Reconnection**: If the internet blips, the `main_loop` catches the exception and sleeps for `min(30, 2 * retry_count)` seconds before reconnecting.
- **Health Checks**: A separate `threading.Thread` runs a tiny HTTP server on port 10000. This is purely to satisfy hosting platforms (like Render/Heroku) that kill services which don't bind to a port.
