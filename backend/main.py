import asyncio
import os
import logging
from uuid import uuid4
from dotenv import load_dotenv

# Vision Agents imports
from vision_agents.core import agents
from vision_agents.plugins import getstream, gemini
from vision_agents.core.edge.types import User

# Core events
from vision_agents.core.events import (
    CallSessionParticipantJoinedEvent,
    CallSessionParticipantLeftEvent,
    CallSessionStartedEvent,
    CallSessionEndedEvent,
    PluginErrorEvent
)

# LLM events
from vision_agents.core.llm.events import (
    RealtimeUserSpeechTranscriptionEvent, 
    LLMResponseChunkEvent
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
# Load environment variables from the same directory as this script
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Meeting data storage
meeting_data = {
    "transcript": [],
    "is_active": False
}

async def start_agent(call_id: str):
    logging.getLogger("httpx").setLevel(logging.WARNING) # Disable HTTPX request logging
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    logger.info("🤖 Starting Meeting Assistant...")
    # Key logging removed for security
    logger.info(f"📞 Call ID: {call_id}")
    meeting_data["stop_event"] = asyncio.Event()
    
    # Create agent with Gemini Realtime
    agent = agents.Agent(
        edge=getstream.Edge(),
        agent_user=User(
            id="meeting-assistant-bot",
            name="Meeting Assistant"
        ),
        instructions="""
        You are a meeting transcription bot.
        
        CRITICAL RULES - FOLLOW EXACTLY:
        1. YOU MUST NEVER SPEAK unless someone says "Hey Assistant"
        2. DO NOT respond to conversations between users
        3. DO NOT acknowledge anything users say to each other
        4. DO NOT explain that you're staying silent
        5. DO NOT say "I should remain silent" or any variation
        6. ONLY RESPOND when you explicitly hear "Hey Assistant"
        7. If unsure whether to speak: DON'T SPEAK
        
        Your ONLY job:
        - Listen silently
        - Transcribe everything
        - Wait for "Hey Assistant"
        
        When you DO hear "Hey Assistant":
        - If there is a question, answer it using meeting transcript and notes
        - If there is NO question, simply say "Yes?" or "I'm listening"
        - Keep answer short and factual
        - Use only information from this meeting
        
        Example:
        ❌ User: "Let's discuss the budget" → You: STAY COMPLETELY SILENT
        ❌ User: "What do you think?" → You: STAY COMPLETELY SILENT
        
        ✅ User: "Hey Assistant" → You: "Yes?"
        ✅ User: "Hey Assistant, what are the action items?" → You: Answer with action items
        ✅ User: "Hey Assistant, summarize the meeting" → You: Provide summary
        """,
        llm=gemini.Realtime(fps=16),
    )
    
    meeting_data["agent"] = agent
    meeting_data["call_id"] = call_id
    
    @agent.events.subscribe
    async def handle_session_started(event: CallSessionStartedEvent):
        meeting_data["is_active"] = True
        logger.info("🎙️ Meeting started")
        
        try:
            channel = agent.edge.client.channel("messaging", call_id)
            await channel.watch()
            meeting_data["channel"] = channel
            logger.info("✅ Chat channel initialized")
        except Exception as e:
            logger.error(f"❌ Chat channel error: {e}")
    
    @agent.events.subscribe
    async def handle_participant_joined(event: CallSessionParticipantJoinedEvent):
        if event.participant.user.id == "meeting-assistant-bot":
            return
        participant_name = event.participant.user.name
        logger.info(f"👤 Participant joined: {participant_name}")
    
    @agent.events.subscribe
    async def handle_participant_left(event: CallSessionParticipantLeftEvent):
        if event.participant.user.id == "meeting-assistant-bot":
            return
        participant_name = event.participant.user.name
        logger.info(f"👋 Participant left: {participant_name}")
    
    @agent.events.subscribe
    async def handle_transcript(event: RealtimeUserSpeechTranscriptionEvent):
        """Handle transcripts"""
        logger.info(f"📨 Raw transcript received: '{event.text}'")
        if not event.text or len(event.text.strip()) == 0:
            return
        
        speaker = getattr(event, 'participant_id', 'Unknown')
        transcript_text = event.text
        
        # Store transcript
        meeting_data["transcript"].append({
            "speaker": speaker,
            "text": transcript_text,
            "timestamp": getattr(event, 'timestamp', None)
        })
        
        logger.info(f"📝 [{speaker}]: {transcript_text}")
        
        # Q&A handling: detect 'hey assistant' anywhere in the transcript chunk
        lower = transcript_text.lower()
        
        # Check for English and Hindi triggers
        triggers = ["hey assistant", "hey agent", "हे असिस्टेंट", "हे एजेंट"]
        trigger = None
        idx = -1
        
        for t in triggers:
            found_idx = lower.find(t)
            if found_idx != -1:
                trigger = t
                idx = found_idx
                break
            
        if idx != -1:
            # Extract everything after the trigger phrase as the question
            question = transcript_text[idx + len(trigger):].strip(" \t\n\r,.:;!?-")

            if question:
                logger.info(f"❓ Q&A triggered via '{trigger}': {question}")

                # Build context from transcript
                context = "MEETING TRANSCRIPT:\n\n"
                for entry in meeting_data["transcript"]:
                    context += f"[{entry['speaker']}]: {entry['text']}\n"

                prompt = f"""
                {context}

                USER QUESTION: {question}

                Answer based ONLY on the meeting transcript above.
                Be concise and helpful.
                """

                try:
                    await agent.simple_response(prompt)
                    logger.info(f"🤖 Responding to question")
                except Exception as e:
                    logger.error(f"❌ Q&A error: {e}")
            else:
                logger.info(f"❓ Q&A trigger detected ({trigger}) but no question text")
                try:
                    await agent.simple_response("The user said 'Hey Assistant'. Briefly acknowledge that you are listening.")
                except Exception as e:
                    logger.error(f"❌ Q&A error: {e}")
    
    @agent.events.subscribe
    async def handle_llm_response(event: LLMResponseChunkEvent):
        """Log agent responses"""
        if hasattr(event, 'delta') and event.delta:
            logger.info(f"🤖 Agent: {event.delta}")
    
    @agent.events.subscribe
    async def handle_session_ended(event: CallSessionEndedEvent):
        meeting_data["is_active"] = False
        meeting_data["stop_event"].set()
        logger.info("🛑 Meeting ended")
        logger.info(f"📊 Final Stats:")
        logger.info(f"   - Transcript entries: {len(meeting_data['transcript'])}")
    
    @agent.events.subscribe
    async def handle_errors(event: PluginErrorEvent):
        logger.error(f"❌ Plugin error: {event.error_message}")
        if event.is_fatal:
            logger.error("🚨 Fatal error")
    
    # Initialize agent
    try:
        logger.info("ℹ️ Creating agent user...")
        await agent.create_user()
        logger.info("✅ Agent user created")
    except Exception as e:
        logger.error(f"❌ Failed to create agent user: {e}")
        raise

    call = agent.edge.client.video.call("default", call_id)

    logger.info("✅ Attempting to join call...")
    try:
        # Force update call settings to ensure transcription is ON
        logger.info("⚙️ Configuring call settings for transcription...")
        logger.debug(f"Calling get_or_create on call {call_id}...")
        try:
             await call.get_or_create(data={
                "created_by_id": "meeting-assistant-bot",
                "settings": {
                    "transcription": {
                        "mode": "auto-on",
                        "closed_caption_mode": "auto-on"
                    }
                }
            })
             logger.info("✅ Call settings updated / Call created")
        except Exception as e:
            logger.error(f"❌ Error in get_or_create: {e}")
            raise

        async with agent.join(call):
            logger.info("\n" + "="*60)
            logger.info("🎙️  MEETING ASSISTANT ACTIVE!")
            logger.info("="*60)
            logger.info("\n📋 Features:")
            logger.info("   1. ✅ Auto-transcription")
            logger.info("   2. ✅ Q&A (say 'Hey Assistant')")
            logger.info(f"\n🔗 Meeting ID: {call_id}")
            logger.info("\nPress Ctrl+C to stop\n")
            logger.info("="*60 + "\n")

            await meeting_data["stop_event"].wait()
    except Exception as e:
        logger.error(f"❌ Failed to join or run agent in call {call_id}: {e}")
        raise
    
    logger.info("✅ Agent finished")

def print_meeting_summary():
    """Print meeting summary"""
    print("\n" + "="*70)
    print("📋 MEETING SUMMARY")
    print("="*70)
    
    print(f"\n📝 Transcript ({len(meeting_data['transcript'])} entries):")
    print("-"*70)
    for entry in meeting_data['transcript']:
        print(f"[{entry['speaker']}]: {entry['text']}")
    
    print("\n" + "="*70)
    print("✅ Summary Complete")
    print("="*70 + "\n")

# Health check server for Render
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")
    
    def log_message(self, format, *args):
        pass  # Data handling silence

def start_health_server():
    try:
        port = int(os.environ.get("PORT", 10000))
        server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
        logger.info(f"✅ Health check server listening on port {port}")
        server.serve_forever()
    except Exception as e:
        logger.error(f"❌ Failed to start health server: {e}")

if __name__ == "__main__":
    # Start health check server in background
    health_thread = threading.Thread(target=start_health_server, daemon=True)
    health_thread.start()

    call_id = os.getenv("CALL_ID", f"meeting-{uuid4().hex[:8]}")
    
    print("\n" + "="*70)
    print("🎯 SMART MEETING ASSISTANT")
    print("="*70)
    print("\n✨ Features:")
    print("   1. Auto-transcription")
    print("   2. Q&A with 'Hey Assistant'")
    print("="*70 + "\n")
    
    async def main_loop(call_id):
        retry_count = 0
        while True:
            try:
                await start_agent(call_id)
                logger.info("👋 Meeting ended normally.")
                break
            except Exception as e:
                retry_count += 1
                wait_time = min(30, 2 * retry_count) # Exponential backoff capped at 30s
                logger.error(f"⚠️ Agent disconnected (Error: {e})")
                logger.info(f"🔄 Attempting to reconnect in {wait_time}s (Attempt {retry_count})...")
                await asyncio.sleep(wait_time)
                
                # Reset for new connection attempts
                meeting_data["transcript"].append({
                    "speaker": "System", 
                    "text": "[Connection lost. Reconnecting...]",
                    "timestamp": 0
                })

    try:
        asyncio.run(main_loop(call_id))
    except KeyboardInterrupt:
        print("\n\n🛑 Stopped by user")
    finally:
        if meeting_data["transcript"]:
            print_meeting_summary()