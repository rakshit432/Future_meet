# 🎙️ Smart Meeting Assistant

> **Your intelligent, real-time meeting companion that transcribes, answers questions, and summarizes calls.**

The **Smart Meeting Assistant** is a dual-application system (Python Backend + Next.js Frontend) that brings an AI agent into your video calls. It listens to conversations, maintains a real-time transcript, and answers context-aware questions when addressed.

---

## ✨ Key Features

### 🤖 Intelligent AI Agent
- **Real-time Transcription**: Listens to the meeting audio and generates a live transcript.
- **Multi-lingual Trigger Support**: Wakes up to:
  - English: "Hey Assistant", "Hey Agent"
  - Hindi: "हे असिस्टेंट" (Hey Assistant), "हे एजेंट" (Hey Agent)
- **Context-Aware Q&A**: Ask questions like *"What did we decide about the budget?"* or *"Summarize the last 5 minutes"* and get answers based **strictly** on the meeting history.

### 📹 Modern Video Interface
- **High-Quality Video/Audio**: Built on [Stream's Global Edge Network](https://getstream.io/video/).
- **Live Transcript UI**: View the real-time conversation log on the side.
- **Interactive Design**: Glassmorphic UI with smooth animations and responsive layout.

### 🧠 Logic & Intelligence
- **Gemini Realtime API**: Powered by Google's multimodal models for low-latency understanding.
- **Vision Agents**: Uses the `vision_agents` framework to orchestrate the agent's sensing and acting capabilities.
- **Memory**: The agent maintains a local state of the entire conversation until the session ends.

---

## 🏗️ Architecture

The project consists of two distinct parts that work together:

1.  **`meeting_assistant` (Frontend)**
    *   **Framework**: Next.js 16 (App Router)
    *   **Styling**: Tailwind CSS v4
    *   **Video SDK**: `@stream-io/video-react-sdk`
    *   **Role**: Provides the UI for users to join the call and see the transcript.

2.  **`backend` (Backend Agent)**
    *   **Language**: Python 3.11+
    *   **Core Library**: `vision-agents`
    *   **Role**: Runs as a "bot" participant in the call. It connects to the same Stream channel, receives the audio stream, processes it via Gemini, and sends text messages back to the chat channel.

---

## 🛠️ Prerequisites

Before you begin, ensure you have:

*   **Node.js**: v18 or higher
*   **Python**: v3.11 or higher
*   **GetStream Account**: You need an App Key and Secret from [GetStream.io](https://getstream.io/).
*   **Google Gemini API Key**: For the LLM capabilities.

---

## 🚀 Installation & Setup

### 1. Backend Setup (The Brain)

Navigate to the backend folder and set up the Python environment.

```bash
cd backend
```

**Create and Activate Virtual Environment:**
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

**Install Dependencies:**
```bash
pip install -r requirements.txt
```

**Configure Environment:**
Create a `.env` file in the `backend/` directory:
```ini
# Get these from your Stream Dashboard
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

# Get this from Google AI Studio
GEMINI_API_KEY=your_gemini_api_key

# Optional: Fixed Call ID (default is random)
CALL_ID=my-test-meeting
```

**Run the Agent:**
```bash
python main.py
```
*The agent will start and wait for a call to join.*

### 2. Frontend Setup (The Interface)

Open a new terminal and navigate to the frontend folder.

```bash
cd meeting_assistant
```

**Install Dependencies:**
```bash
npm install
```

**Configure Environment:**
Create a `.env.local` file in the `meeting_assistant/` directory:
```ini
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key_same_as_backend
NEXT_PUBLIC_MEETING_ID=my-test-meeting
```
*Note: `NEXT_PUBLIC_MEETING_ID` must match the `CALL_ID` used by the backend if you set one, or you must update the URL manually.*

**Run Development Server:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## � Usage Guide

1.  **Start the Backend**: detailed logs will show `🤖 Starting Meeting Assistant...`.
2.  **Join via Frontend**:
    *   Go to `http://localhost:3000`.
    *   Enter your name and click "Join".
    *   The `Meeting Assistant` bot should already be in the call (or will join shortly).
3.  **Interact**:
    *   Speak normally. You will see your text appear in the transcript panel.
    *   **Ask a Question**: Say *"Hey Assistant, what is the summary so far?"*
    *   The assistant will reply in the chat/video interface.

---

## 📂 Project Structure

```text
smart_meeting/
├── backend/                  # Python Agent
│   ├── main.py              # Entry point for the AI agent
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Backend secrets (API Keys)
│
├── meeting_assistant/        # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx         # Login/Join screen
│   │   ├── meeting/
│   │   │   └── [id]/
│   │   │       ├── page.jsx            # Main meeting wrapper
│   │   │       ├── meeting-room.jsx    # Video grid & controls
│   │   │       ├── transcript.jsx      # Real-time transcript sidebar
│   │   │       └── stream-provider.jsx # Context provider
│   ├── public/              # Static assets
│   └── package.json         # Node dependencies
│
└── README.md                # This file
```

---

## 🔧 Troubleshooting

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| **Agent not joining** | Backend not running or mismatched Call ID | Ensure `python main.py` is running and `CALL_ID` matches the URL. |
| **"Policy Violation"** | Expired/Wrong API Key | Check your Stream API Key and Secret in `.env`. |
| **No Transcription** | Microphone permissions | Allow browser microphone access. Ensure you are not muted. |
| **WebRTC Error** | Firewall/Network | Disable VPNs or strict firewalls that block UDP ports. |

---

## 📦 Deployment

### Backend (Render/Railway)
The backend is stateless but needs to run continuously.
- **Docker/Render**: Use the provided `render.yaml`.
- **Command**: `python main.py`

### Frontend (Vercel)
Standard Next.js deployment.
- **Build Command**: `next build`
- **Output Directory**: `.next`

---
Made with ❤️ using [Stream](https://getstream.io) & [Vision Agents](https://github.com/vision-agents).
