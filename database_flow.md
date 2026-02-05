# Deep Dive: Data & Persistence Strategy

The application currently uses a **Volatile Memory** architecture. This is a deliberate design choice for MVP (Minimum Viable Product) real-time systems, but understanding its limits is crucial.

## 1. The In-Memory State (`meeting_data`)

Inside `main.py`, the entire database is represented by a single python dictionary:

```python
meeting_data = {
    "transcript": [
        {"speaker": "Alice", "text": "Hi everyone", "timestamp": 1700001},
        {"speaker": "Bob", "text": "Hello Alice", "timestamp": 1700005}
    ],
    "is_active": True,
    "call_id": "meeting-uuid-1234"
}
```

### Implementation Details:
- **Scope**: Global variable module-level scope.
- **Concurrency**: As `asyncio` is single-threaded (cooperative multitasking), we generally don't need complex locks (`mutex`) to access this simple list, assuming we only append to it.
- **Risk**: If the `main.py` process restarts (deployment updates, crash, server reboot), **ALL DATA IS LOST**. The new instance starts with an empty transcript.

## 2. External State (Stream.io)

While your Python script forgets everything on restart, **Stream.io** remembers:
- **User Profiles**: When `api/token/route.js` calls `serverClient.upsertUsers([...])`, that user data persists in Stream's database.
- **Call Metadata**: Stream knows a call existed, when it started, and when it ended.
- **Chat Messages**: If you use the Text Chat feature (which is separate from the voice transcript), those messages are stored permanently on Stream's servers and can be retrieved via their API.

## 3. How to Scale to Production (The "Real" Database)

To make this application production-ready, you would replace the in-memory list with a persistent store.

### Recommended Architecture:
1.  **Session Storage (Redis)**:
    - Replace `meeting_data` with a Redis instance.
    - **Why?** Redis is fast enough for real-time appends but survives process restarts.
    - Structure: `RPUSH call:123:transcript "Alice: Hello"`

2.  **Permanent Storage (PostgreSQL)**:
    - Hook into the `handle_session_ended` event in `main.py`.
    - **Action**: Take the full transcript list and save it to a Data Lake or SQL Table.
    - **Schema Example**:
        ```sql
        CREATE TABLE meetings (
            id UUID PRIMARY KEY,
            started_at TIMESTAMP,
            ended_at TIMESTAMP
        );
        CREATE TABLE transcript_lines (
            id SERIAL PRIMARY KEY,
            meeting_id UUID REFERENCES meetings(id),
            speaker_name TEXT,
            content TEXT,
            timestamp_offset INTEGER
        );
        ```

3.  **Vector Database (Pinecone/Weaviate)**:
    - For "Chat with your *past* meetings", you would embed the transcripts and store them in a vector DB.
    - This allows the agent to answer questions like *"What did we decide about the budget last month?"*—something the current in-memory version cannot do.
