# Deep Dive: Frontend Architecture & Flow

The frontend is a sophisticated Real-Time Communication (RTC) application built with **Next.js 14+ (App Router)** and **React**. It delegates the heavy lifting of audio/video transport to the **Stream Video SDK**, allowing the frontend code to focus on UI state and user intent.

## 1. Core Architecture: The Client-Side Hook Pattern

The heart of the frontend is the custom hook `useStreamClients` (located in `app/hooks/use-stream-clients.js`). This hook manages the lifecycle of the connection to the Stream infrastructure.

### The Application State Machine
1.  **Uninitialized**: State is null.
2.  **Authentication**: The app calls `/api/token` to identify the user.
3.  **Initialization**: `StreamVideoClient` and `StreamChat` instances are created with the token.
4.  **Connected**: The clients establish WebSocket connections to Stream's Edge network.
5.  **Active Session**: The user joins a specific `Call` object.

### Token Management & Security
The potentially complex part of RTC is secure access.
- **Problem**: You cannot share your `STREAM_API_SECRET` with the browser.
- **Solution**: A "Token Provider" pattern.
    - When `StreamVideoClient` is initialized, it is passed a `tokenProvider` function.
    - If the client detects the token is expiring (or is missing), it automatically executes this function.
    - The function fetches a new JWT from your Next.js API route (`/api/token`).
    - **Clock Skew Handling**: The hook calculates the difference between the user's browser time and the server time (`serverTimeOffsetRef`) to ensure the token's "Issued At" (`iat`) timestamp is valid, preventing "Token used before issued" errors.

## 2. The Meeting Lifecycle

The user flow is distinctively split into two stages:

### Stage A: The Onboarding (`app/page.tsx`)
This is a standard React form. It captures the user's display name.
- **Output**: Redirects to `/meeting/[meeting_id]?name=[user_name]`.
- **Note**: The `[meeting_id]` is often static in MVP verisons (defined in `.env` as `NEXT_PUBLIC_MEETING_ID`), but the architecture supports dynamic IDs.

### Stage B: The Active Meeting (`app/meeting/[id]/page.jsx`)
This page is the container for the real-time session.

1.  **Preparation**:
    - Reads `id` from URL params.
    - Reads `name` from Search params.
    - Triggers the `useStreamClients` hook.
    - While loading, displays a "Preparing your meeting" skeleton screen.

2.  **Rendering the Video Grid**:
    - Once clients are ready, the app renders `<StreamProvider>`.
    - Inside, `<MeetingRoom>` handles the layout.
    - **Components**:
        - `<ParticipantView />`: Renders individual video tiles.
        - `<Controls />`: Renders Mute/Unmute, Camera Toggle, Leave.
    - **Layout Logic**: The SDK automatically handles the "Dominant Speaker" logic (making the person talking appear larger) or switches to a Grid view.

## 3. How Audio/Video Actually Works (Under the Hood)
The frontend does **not** send video to your Python backend.

1.  **WebRTC**: The browser captures the Camera/Mic stream.
2.  **SFU (Selective Forwarding Unit)**: The browser sends this stream to Stream.io's servers.
3.  **Distribution**: Stream.io forwards this data to:
    - Other human participants.
    - **Your Python Agent** (which is just another "participant" connecting from the backend script).

This "Star Topology" ensures that even if your Python script crashes, the humans can still see and hear each other.
