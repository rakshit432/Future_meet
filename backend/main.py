import sys
# Disable aiodns on Windows to prevent DNS resolution issues with virtual adapters in aiohttp
sys.modules['aiodns'] = None

import asyncio
import os
import logging
import time
from uuid import uuid4
from dotenv import load_dotenv

# Vision Agents imports
from vision_agents.core import agents
from vision_agents.plugins import getstream, gemini
from vision_agents.core.edge.types import User
from getstream.models import MessageRequest, ChannelMemberRequest

# Core events
from vision_agents.core.events import (
    CallSessionParticipantJoinedEvent,
    CallSessionParticipantLeftEvent,
    CallSessionStartedEvent,
    CallSessionEndedEvent,
    PluginErrorEvent,
    ClosedCaptionEvent
)

# LLM events
from vision_agents.core.llm.events import (
    RealtimeUserSpeechTranscriptionEvent,
    LLMResponseChunkEvent
)

# Setup logging
logging.basicConfig(level=logging.INFO, force=True)
logger = logging.getLogger(__name__)

# Load environment variables
# Load environment variables from the same directory as this script
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Global configuration loading completed



async def start_agent(call_id: str):
    logging.getLogger("httpx").setLevel(logging.WARNING) # Disable HTTPX request logging
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    logger.info("🤖 Starting Meeting Assistant...")
    # Key logging removed for security
    logger.info(f"📞 Call ID: {call_id}")
    
    meeting_data = {
        "transcript": [],
        "is_active": False,
        "stop_event": asyncio.Event(),
        "organizers": set(),
        "members": set(),
        "call_id": call_id,
        "user_names": {},
        "active_msg_id": None,
        "active_speaker": None,
        "last_msg_update": 0.0,
        "start_time": time.time(),  # Track when the agent session started
        "transcript_lock": asyncio.Lock()  # Lock to serialize transcript updates
    }
    
    # Set the correct environment variable for Gemini
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_key:
        os.environ["GOOGLE_API_KEY"] = gemini_key
        
    # Create agent with Gemini
    agent = agents.Agent(
        edge=getstream.Edge(),
        agent_user=User(
            id="meeting-assistant-bot",
            name="Meeting Assistant"
        ),
        instructions="""
        You are a silent meeting transcription assistant.
        
        CRITICAL RULES:
        1. You must remain completely silent and produce ZERO output unless a user starts their sentence with the trigger phrase "Hey Assistant".
        2. If the user does not say "Hey Assistant", you must NOT generate any text, audio, or response. Leave the response completely empty.
        3. Do NOT speak, do NOT say "I am staying silent", do NOT say "Stay silent", do NOT say "...", and do NOT acknowledge user chat.
        4. ONLY respond when a user explicitly starts their message with the trigger phrase "Hey Assistant".
        5. You will receive background updates starting with "[System Context Update]". You must NEVER respond to these messages. Keep them in your memory as the meeting transcript context to help answer future user questions.
        
        When you hear "Hey Assistant":
        - Answer the question using the meeting transcript context from the [System Context Update] messages in your history.
        - Keep the answer very brief (1-2 sentences).
        - If there is no question, simply say: "I'm listening."
        """,
        llm=gemini.Realtime(
            fps=1,
        ),
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
        participant = getattr(event, 'participant', None)
        if not participant:
            return
        user_id = None
        participant_name = None
        user_obj = getattr(participant, 'user', None)
        if user_obj:
            user_id = getattr(user_obj, 'id', None)
            participant_name = getattr(user_obj, 'name', None) or user_id
        else:
            user_id = getattr(participant, 'user_id', None)
            participant_name = getattr(participant, 'name', None) or user_id
        if not user_id or user_id == "meeting-assistant-bot":
            return
        # Use the name from the frontend join ping if available and better
        pinged_name = join_user_names.get(call_id, {}).get(user_id)
        if pinged_name:
            participant_name = pinged_name
        meeting_data["user_names"][user_id] = participant_name
        logger.info(f"👤 Participant joined: {participant_name} ({user_id})")
        # Add participant as a channel member so they can receive message.new events
        try:
            channel = meeting_data.get("channel")
            if channel:
                await channel.update(add_members=[ChannelMemberRequest(user_id=user_id)])
                logger.info(f"✅ Added {user_id} as channel member")
        except Exception as e:
            logger.warning(f"⚠️ Could not add {user_id} as channel member: {e}")
    
    @agent.events.subscribe
    async def handle_participant_left(event: CallSessionParticipantLeftEvent):
        participant = getattr(event, 'participant', None)
        if not participant:
            logger.warning("👋 handle_participant_left called but event.participant is None")
            return
        user_id = None
        participant_name = None
        user_obj = getattr(participant, 'user', None)
        if user_obj:
            user_id = getattr(user_obj, 'id', None)
            participant_name = getattr(user_obj, 'name', None) or user_id
        else:
            user_id = getattr(participant, 'user_id', None)
            participant_name = getattr(participant, 'name', None) or user_id
        if not user_id or user_id == "meeting-assistant-bot":
            return
        logger.info(f"👋 Participant left: {participant_name} ({user_id})")
        
        # Check if any human participants remain in the call
        await asyncio.sleep(2.0)
        
        # Only perform auto-stop if the agent has been running for at least 30 seconds
        running_time = time.time() - meeting_data.get("start_time", time.time())
        if running_time < 30.0:
            logger.info(f"Skipping auto-stop check because agent only started {running_time:.1f}s ago")
            return
            
        try:
            if agent._connection and hasattr(agent._connection, "participants"):
                active_humans = [
                    p for p in agent._connection.participants.get_participants()
                    if p.user_id != "meeting-assistant-bot"
                ]
                if len(active_humans) == 0:
                    logger.info("👋 No human participants remain in the call. Stopping agent gracefully...")
                    meeting_data["stop_event"].set()
        except Exception as e:
            logger.warning(f"⚠️ Error checking remaining participants: {e}")
    
    @agent.events.subscribe
    async def handle_transcript(event: ClosedCaptionEvent):
        """Handle transcripts using Stream's native closed captions"""
        cc = getattr(event, 'closed_caption', None)
        if not cc or not cc.text or len(cc.text.strip()) == 0:
            return
            
        transcript_text = cc.text
        speaker_id = cc.speaker_id
        
        # Ignore transcripts from the bot itself to prevent it talking to itself
        if speaker_id == "meeting-assistant-bot":
            logger.info("Ignoring bot's own speech transcript")
            return
            
        speaker_name = 'Unknown'
        if cc.user:
            if isinstance(cc.user, dict):
                speaker_name = cc.user.get('name') or cc.user.get('id')
            else:
                speaker_name = getattr(cc.user, 'name', None) or getattr(cc.user, 'id', None)
                
        if not speaker_name or speaker_name == 'Unknown':
            if speaker_id:
                speaker_name = meeting_data["user_names"].get(speaker_id, speaker_id)
            
        if not speaker_name or speaker_name == 'Unknown':
            non_bot_users = {uid: name for uid, name in meeting_data["user_names"].items() if uid != "meeting-assistant-bot"}
            if len(non_bot_users) == 1:
                speaker_name = list(non_bot_users.values())[0]
            else:
                speaker_name = 'Unknown'
                
        logger.info(f"📨 Stream raw transcript received: '{transcript_text}' from '{speaker_name}'")
        
        async with meeting_data["transcript_lock"]:
            # Publish transcript message to the chat channel so the frontend receives it
            try:
                channel = None
                if agent.conversation and hasattr(agent.conversation, "channel"):
                    channel = agent.conversation.channel
                if not channel:
                    channel = meeting_data.get("channel")
                if not channel:
                    logger.warning("⚠️ Chat channel not initialized or cached yet, transcript will not be published to frontend")
                if channel:
                    now = time.time()
                    # Reuse the existing message if it's the same speaker and less than 5 seconds since the last update
                    should_reuse = (
                        meeting_data.get("active_msg_id") is not None
                        and meeting_data.get("active_speaker") == speaker_name
                        and (now - meeting_data.get("last_msg_update", 0.0)) < 5.0
                    )
                    
                    # Update text dynamically based on should_reuse
                    if should_reuse:
                        prev_text = meeting_data.get("active_msg_text", "")
                        if prev_text and not prev_text.endswith(" ") and not transcript_text.startswith(" ") and not transcript_text.startswith((".", ",", "!", "?")):
                            meeting_data["active_msg_text"] = prev_text + " " + transcript_text
                        else:
                            meeting_data["active_msg_text"] = prev_text + transcript_text
                    else:
                        meeting_data["active_msg_text"] = transcript_text
                    
                    current_text = meeting_data["active_msg_text"]
                    
                    if should_reuse:
                        try:
                            msg_id = meeting_data["active_msg_id"]
                            await channel.client.update_message_partial(
                                msg_id,
                                user_id="meeting-assistant-bot",
                                set={
                                    "text": current_text
                                }
                            )
                            meeting_data["last_msg_update"] = now
                            logger.info(f"Updated transcript message ({msg_id}) for '{speaker_name}': {current_text}")
                        except Exception as ue:
                            logger.warning(f"Failed to update message: {ue}, falling back to new message")
                            should_reuse = False
                            # If update fails, fallback to new message with transcript_text
                            meeting_data["active_msg_text"] = transcript_text
                            current_text = transcript_text
                            
                    if not should_reuse:
                        response = await channel.send_message(MessageRequest(
                            text=current_text,
                            user_id="meeting-assistant-bot",
                            custom={
                                "speaker": speaker_name,
                                "note_type": "transcription"
                            }
                        ))
                        meeting_data["active_msg_id"] = response.data.message.id
                        meeting_data["active_speaker"] = speaker_name
                        meeting_data["last_msg_update"] = now
                        logger.info(f"Published new transcript message ({response.data.message.id}) for '{speaker_name}': {current_text}")
            except Exception as e:
                logger.error(f"❌ Failed to publish transcript to channel: {e}")
            
            current_text = meeting_data.get("active_msg_text", transcript_text)

            # Store transcript
            if should_reuse and len(meeting_data["transcript"]) > 0:
                meeting_data["transcript"][-1]["text"] = current_text
            else:
                meeting_data["transcript"].append({
                    "speaker": speaker_name,
                    "text": current_text,
                    "timestamp": getattr(event, 'timestamp', None)
                })
            
            logger.info(f"📝 [{speaker_name}]: {current_text}")
            
            # Q&A handling: detect 'hey assistant' anywhere in the active speaker's accumulated transcript
            lower = current_text.lower()
            
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
                active_msg_id = meeting_data.get("active_msg_id")
                # Only trigger Q&A if we haven't already processed it for this message
                if active_msg_id and active_msg_id != meeting_data.get("qa_triggered_msg_id"):
                    # Extract everything after the trigger phrase as the question
                    question = current_text[idx + len(trigger):].strip(" \t\n\r,.:;!?-")
        
                    if question:
                        # Mark the message as triggered so we don't repeat the LLM call for subsequent chunks
                        meeting_data["qa_triggered_msg_id"] = active_msg_id
                        logger.info(f"❓ Q&A triggered via '{trigger}': {question}")
                        
                        # Send acknowledgement to chat
                        try:
                            channel = meeting_data.get("channel")
                            if channel:
                                await channel.send_message(MessageRequest(
                                    text=f"Thinking about: {question}",
                                    user_id="meeting-assistant-bot"
                                ))
                        except:
                            pass
        
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
                        # If the user has just said the trigger but no question yet,
                        # we can send a friendly prompt, but we shouldn't block future question content in the same message.
                        # We use a flag to make sure we only trigger the "I'm listening" response once per message.
                        if not meeting_data.get("listening_prompt_sent_for_msg") == active_msg_id:
                            meeting_data["listening_prompt_sent_for_msg"] = active_msg_id
                            logger.info(f"❓ Q&A trigger detected ({trigger}) but no question text yet")
                            try:
                                # Send acknowledgement to chat
                                channel = meeting_data.get("channel")
                                if channel:
                                    await channel.send_message(MessageRequest(
                                        text="I'm listening! How can I help?",
                                        user_id="meeting-assistant-bot"
                                    ))
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
                        "closed_caption_mode": "auto-on",
                        "language": "en"
                    }
                }
            })
            logger.info("✅ Call settings updated / Call created")

            # Grant meeting-assistant-bot admin permissions to publish audio/video tracks
            try:
                from getstream.models import MemberRequest
                await call.update_call_members(
                    update_members=[
                        MemberRequest(user_id="meeting-assistant-bot", role="admin")
                    ]
                )
                logger.info("✅ Added meeting-assistant-bot as admin member to call")
            except Exception as me:
                logger.warning(f"⚠️ Failed to update call members: {me}")

            try:
                await call.update_user_permissions(
                    user_id="meeting-assistant-bot",
                    grant_permissions=["send-audio", "send-video"]
                )
                logger.info("✅ Granted send-audio and send-video permissions to bot")
            except Exception as pe:
                logger.warning(f"⚠️ Failed to update user permissions: {pe}")
        except Exception as e:
            logger.error(f"❌ Error in get_or_create / settings update: {e}")
            raise

        async with agent.join(call):
            logger.info("\n" + "="*60)
            logger.info("🎙️  MEETING ASSISTANT ACTIVE!")
            logger.info("="*60)
            
            # Cache the chat channel to meeting_data first
            try:
                if agent.conversation and hasattr(agent.conversation, "channel"):
                    meeting_data["channel"] = agent.conversation.channel
                    logger.info("✅ Chat channel cached from conversation")
            except Exception as e:
                logger.error(f"❌ Error caching chat channel: {e}")
            
            # Populate already-joined participants and add them to the chat channel
            try:
                if agent._connection and hasattr(agent._connection, "participants"):
                    for p in agent._connection.participants.get_participants():
                        if p.user_id == "meeting-assistant-bot":
                            continue
                        user_id = p.user_id
                        # Prefer name from frontend ping over Stream's user record
                        pinged_name = join_user_names.get(call_id, {}).get(user_id)
                        participant_name = pinged_name or p.name or p.user_id
                        meeting_data["user_names"][user_id] = participant_name
                        logger.info(f"👤 Pre-joined participant cached: {participant_name} ({user_id})")
                        # Add as channel member so frontend can receive message.new events
                        try:
                            ch = meeting_data.get("channel")
                            if ch:
                                await ch.update(add_members=[ChannelMemberRequest(user_id=user_id)])
                                logger.info(f"✅ Added pre-joined {user_id} as channel member")
                        except Exception as me:
                            logger.warning(f"⚠️ Could not add pre-joined {user_id} to channel: {me}")
            except Exception as e:
                logger.error(f"❌ Error caching pre-joined participants: {e}")
            
            # Send silent join confirmation to chat channel (no audio)
            try:
                channel = None
                if agent.conversation and hasattr(agent.conversation, "channel"):
                    channel = agent.conversation.channel
                if not channel:
                    channel = meeting_data.get("channel")
                    
                if channel:
                    await channel.send_message(MessageRequest(
                        text="✅ Meeting Assistant joined. Say 'Hey Assistant' to ask a question.",
                        user_id="meeting-assistant-bot",
                        custom={"note_type": "system"}
                    ))
                # No warm-up audio - the bot must remain silent until triggered
            except Exception as e:
                logger.error(f"❌ Failed to send join message: {e}")
                
            logger.info("\n📋 Features:")
            logger.info("   1. ✅ Auto-transcription")
            logger.info("   2. ✅ Q&A (say 'Hey Assistant')")
            logger.info(f"\n🔗 Meeting ID: {call_id}")
            logger.info("\nPress Ctrl+C to stop\n")
            logger.info("="*60 + "\n")

            await meeting_data["stop_event"].wait()
            print_meeting_summary(meeting_data)
    except Exception as e:
        logger.error(f"❌ Failed to join or run agent in call {call_id}: {e}")
        raise
    
    logger.info("✅ Agent finished")

def print_meeting_summary(meeting_data):
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

# Health check server for Render with dynamic /join support
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
from urllib.parse import urlparse, parse_qs

# Global state for managing dynamic agents across rooms
active_agents = {}       # maps call_id to the scheduled Future
active_agent_tasks = {}  # maps call_id to the running asyncio.Task
main_event_loop = None   # main event loop running in primary thread
join_user_names = {}  # call_id -> {user_id: display_name}  (set from /join ping)
agent_spawn_lock = threading.Lock()
last_spawn_time = {}     # maps call_id to timestamp of last spawn

async def run_agent_lifecycle(call_id: str):
    active_agent_tasks[call_id] = asyncio.current_task()
    retry_count = 0
    try:
        while True:
            try:
                await start_agent(call_id)
                logger.info(f"👋 Agent finished normally for call: {call_id}")
                break
            except asyncio.CancelledError:
                logger.info(f"Agent lifecycle task cancelled for call: {call_id}")
                raise
            except Exception as e:
                retry_count += 1
                wait_time = min(30, 2 * retry_count) # Exponential backoff capped at 30s
                logger.error(f"⚠️ Agent disconnected for call {call_id} (Error: {e})")
                logger.info(f"🔄 Reconnecting in {wait_time}s (Attempt {retry_count})...")
                await asyncio.sleep(wait_time)
    finally:
        if active_agent_tasks.get(call_id) == asyncio.current_task():
            active_agent_tasks.pop(call_id, None)
            active_agents.pop(call_id, None)
        logger.info(f"Cleaned up agent task for call_id: {call_id}")

def request_agent_join(call_id: str) -> str:
    global main_event_loop
    if not main_event_loop:
        logger.error("❌ Main event loop not initialized!")
        return "Error: Main event loop not initialized"
        
    with agent_spawn_lock:
        # 1. Check if there is already an active running task
        if call_id in active_agent_tasks:
            task = active_agent_tasks[call_id]
            if not task.done():
                logger.info(f"Agent already active for call_id: {call_id}. Skipping spawn.")
                return f"Agent already active for {call_id}"
                
        # 2. Prevent rapid duplicate spawns within 10 seconds for the same room (rate-limiting)
        now = time.time()
        last_time = last_spawn_time.get(call_id, 0.0)
        if now - last_time < 10.0:
            logger.info(f"Ignoring duplicate join request for call_id {call_id} (requested {now - last_time:.2f}s ago)")
            return f"Agent join already requested recently for {call_id}"
            
        last_spawn_time[call_id] = now
        
        # Spawn the agent lifecycle coroutine in the main loop thread-safely
        coro = run_agent_lifecycle(call_id)
        future = asyncio.run_coroutine_threadsafe(coro, main_event_loop)
        active_agents[call_id] = future
        logger.info(f"Spawned agent task for call_id: {call_id}")
        return f"Started agent for {call_id}"

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query)
        
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
        
        if path == "/join":
            call_ids = query_params.get("call_id")
            if call_ids:
                call_id = call_ids[0]
                # Cache the user's real display name before the agent joins
                user_id_list = query_params.get("user_id")
                user_name_list = query_params.get("user_name")
                if user_id_list and user_name_list:
                    uid = user_id_list[0]
                    uname = user_name_list[0]
                    if uid and uname:
                        if call_id not in join_user_names:
                            join_user_names[call_id] = {}
                        join_user_names[call_id][uid] = uname
                status_msg = request_agent_join(call_id)
                self.wfile.write(status_msg.encode())
            else:
                self.wfile.write(b"Error: Missing call_id parameter")
        elif path == "/logs":
            try:
                log_path = os.path.join(os.path.dirname(__file__), 'backend.log')
                if os.path.exists(log_path):
                    content = ""
                    for encoding in ('utf-16', 'utf-8', 'cp1252'):
                        try:
                            with open(log_path, 'r', encoding=encoding) as f:
                                lines = f.readlines()
                                content = "".join(lines[-200:])
                                break
                        except Exception:
                            continue
                    self.wfile.write(content.encode('utf-8', errors='ignore'))
                else:
                    self.wfile.write(b"Log file does not exist")
            except Exception as e:
                self.wfile.write(f"Error reading logs: {e}".encode())
        else:
            self.wfile.write(b"OK")
        
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
    
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
    # Start health check server in background thread
    health_thread = threading.Thread(target=start_health_server, daemon=True)
    health_thread.start()

    print("\n" + "="*70)
    print("SMART MEETING ASSISTANT (MULTI-ROOM SUPPORT)")
    print("="*70)
    print("\nFeatures:")
    print("   1. Auto-transcription")
    print("   2. Q&A with 'Hey Assistant'")
    print("   3. Dynamic room joining enabled (pings from frontend)")
    print("="*70 + "\n")
    
    # Store the loop in global variable
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    main_event_loop = loop
    
    # Keep loop running forever to handle incoming dynamic connections
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Stopped by user")
    finally:
        # Cancel all running tasks
        pending = asyncio.all_tasks(loop)
        for task in pending:
            task.cancel()
        if pending:
            loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        loop.close()
        print("✅ Event loop closed.")