"use client";

import { useEffect, useState, useRef } from "react";
import {
  StreamCall,
  useStreamVideoClient,
  SpeakerLayout,
  PaginatedGridLayout,
  StreamTheme,
  useCallStateHooks,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  ScreenShareButton,
  CancelCallButton,
} from "@stream-io/video-react-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  Video as VideoIcon, 
  LogOut, 
  Settings, 
  Users, 
  Layout, 
  Info,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  CircleDot,
  MessageSquare,
  Save,
  Check,
  Smile
} from "lucide-react";
import { useSession } from "next-auth/react";

import { TranscriptPanel } from "./transcript";
import "@stream-io/video-react-sdk/dist/css/styles.css";

function AgentAutoJoiner({ callId }) {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const { data: session } = useSession();
  const lastPingRef = useRef(0);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!callId || !session?.user) return;
    
    // Only start checking 10 seconds after mounting to allow parent's initial ping to connect the bot
    if (Date.now() - mountTimeRef.current < 10000) return;
    
    // Check if the meeting-assistant-bot is in the participant list
    const isBotPresent = participants.some(
      (p) => p.userId === "meeting-assistant-bot" || p.user?.id === "meeting-assistant-bot"
    );
    
    if (!isBotPresent) {
      const now = Date.now();
      // Rate-limit pings to at most once every 10 seconds to avoid spamming the backend
      if (now - lastPingRef.current > 10000) {
        lastPingRef.current = now;
        
        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
          backendUrl = "http://127.0.0.1:10000";
        }
        
        const userName = encodeURIComponent(
          session.user.name || session.user.email || session.user.id || ""
        );
        const uid = encodeURIComponent(session.user.id || "");
        
        console.log(`[AutoJoiner] Bot is missing from call. Pinging backend to join call ${callId}...`);
        fetch(`${backendUrl}/join?call_id=${callId}&user_name=${userName}&user_id=${uid}`).catch((err) => {
          console.warn("[AutoJoiner] Failed to ping backend agent:", err);
        });
      }
    }
  }, [participants, callId, session]);

  return null;
}

function MeetingHeader({ callId, showTranscript, setShowTranscript, layout, setLayout, onSaveMeeting, isSaving, isSaved, saveError }) {
  const { useParticipantCount, useParticipants } = useCallStateHooks();
  const participantCount = useParticipantCount();
  const participants = useParticipants();
  const { data: session } = useSession();

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between px-3 md:px-6 py-2 md:py-4 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl"
    >
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <div className="w-8 h-8 md:w-10 h-10 md:rounded-xl rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
          <VideoIcon className="w-4 h-4 md:w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs md:text-base font-bold tracking-tight text-white truncate max-w-[80px] sm:max-w-none">
              <span className="hidden sm:inline">Room: </span><span className="text-indigo-400 font-mono uppercase text-[10px] sm:text-sm">{callId}</span>
            </h1>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
              <CircleDot className="w-1 h-1 md:w-1.5 md:h-1.5 text-emerald-400 fill-emerald-400 animate-pulse" />
              <span className="text-[7px] md:text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
          </div>
          <p className="hidden md:block text-[10px] md:text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="w-2 h-2 md:w-3 md:h-3 text-indigo-400" />
            End-to-end encrypted • AI Captions active
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Layout Switcher */}
        <div className="hidden md:flex items-center p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => setLayout("grid")}
            className={`p-1.5 rounded-lg transition-all ${
              layout === "grid"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-gray-400 hover:text-gray-200"
            }`}
            title="Grid View"
          >
            <Layout className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLayout("speaker")}
            className={`p-1.5 rounded-lg transition-all ${
              layout === "speaker"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-gray-400 hover:text-gray-200"
            }`}
            title="Speaker View"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Header Transcript Toggle */}
        <button 
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
          title="Toggle Transcript"
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline text-xs font-semibold text-gray-200">Transcript</span>
        </button>

        {/* Save Meeting Button */}
        {session && (
          <button 
            onClick={onSaveMeeting}
            disabled={isSaving || isSaved}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            title={isSaved ? 'Meeting Saved' : 'Save Meeting'}
          >
            {isSaving ? (
              <Save className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : isSaved ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="hidden sm:inline text-xs font-semibold text-gray-200">
              {isSaved ? 'Saved' : 'Save'}
            </span>
          </button>
        )}
        
        {/* Participant Count */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold text-gray-300">
              {participantCount}<span className="hidden sm:inline"> Participant{participantCount !== 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MeetingRoom({ callId, onLeave, userId }) {
  const client = useStreamVideoClient();
  const [call, setCall] = useState(null);
  const [error, setError] = useState(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const [layout, setLayout] = useState("grid"); // "grid" or "speaker"
  const [mobileTranscriptOpen, setMobileTranscriptOpen] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [activeReactions, setActiveReactions] = useState([]);

  useEffect(() => {
    if (!call) return;
    const unsubscribe = call.on("call.reaction_new", (event) => {
      if (event.type === "call.reaction_new" && event.reaction) {
        const reactionId = Math.random().toString(36).substring(2, 9);
        const reactionEmoji = event.reaction.emoji_code;
        const participantId = event.reaction.user_id;
        
        const participant = call.state.participants.find(p => p.userId === participantId);
        const participantName = participant?.name || participantId;

        const newReaction = {
          id: reactionId,
          emoji: reactionEmoji,
          userName: participantName,
          x: Math.random() * 80 + 10,
        };

        setActiveReactions(prev => [...prev, newReaction]);

        setTimeout(() => {
          setActiveReactions(prev => prev.filter(r => r.id !== reactionId));
        }, 3000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [call]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const normalizedCallId =
    callId && callId !== "undefined"
      ? callId
      : null;

  const joinedRef = useRef(false);
  const leavingRef = useRef(false);
  const callRef = useRef(null);  // ref copy so cleanup can access latest call
  const callType = "default";

  useEffect(() => {
    if (!client || !normalizedCallId) return;

    let isMounted = true;
    let myCall = null;

    const init = async () => {
      try {
        myCall = client.call(callType, normalizedCallId);

        await myCall.join({
          create: true,
        });

        if (!isMounted) {
          myCall.leave().catch(() => {});
          return;
        }

        // Best-effort: start Stream's native closed captions (non-fatal)
        myCall.startClosedCaptions({ language: "en" }).catch(() => {});

        myCall.on("call.session_ended", () => onLeave?.());
        callRef.current = myCall;
        setCall(myCall);
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      if (myCall) {
        myCall.leave().catch(() => {});
      } else if (callRef.current) {
        callRef.current.leave().catch(() => {});
      }
    };
  }, [client, normalizedCallId, userId]);

  const handleLeaveClick = async () => {
    if (leavingRef.current) return onLeave?.();
    leavingRef.current = true;
    try {
      const c = callRef.current;
      if (c) {
        // stop_closed_captions may fail if captions weren't started — ignore
        await c.stopClosedCaptions().catch(() => {});
        // leave() throws if already left — ignore
        await c.leave().catch(() => {});
      }
    } finally {
      onLeave?.();
    }
  };

  const [saveError, setSaveError] = useState(null);

  const handleSaveMeeting = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const transcriptText = transcript.map(t => `${t.speaker || 'Unknown'} [${t.timestamp}]: ${t.text}`).join('\n');

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: normalizedCallId,
          title: `Meeting on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
          transcript: transcriptText
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save meeting');
      }

      console.log('Meeting saved successfully:', result);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save meeting:', e);
      setSaveError(e.message);
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl bg-red-500/10 backdrop-blur-xl border border-red-500/20 px-6 md:px-8 py-6 md:py-8 text-center max-w-sm w-full"
        >
          <div className="w-10 h-10 md:w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Info className="w-5 h-5 md:w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-sm md:text-base text-gray-400 leading-relaxed mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2.5 md:py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors text-sm md:text-base"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen bg-[#020203] text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border border-white/[0.06] border-t-indigo-500 border-r-indigo-500"
            />
            <div className="absolute flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold tracking-widest text-gray-200 uppercase font-sans">Synchronizing Call</h3>
            <p className="text-xs text-gray-500 font-medium font-sans">Establishing connection with Stream servers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StreamTheme>
      <StreamCall call={call}>
        <AgentAutoJoiner callId={normalizedCallId} />
        <div className="h-screen bg-[#050505] text-gray-100 relative overflow-hidden flex flex-col p-3 md:p-4 lg:p-6 gap-3 md:gap-4">
          {/* Background Glows */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-600/10 rounded-full blur-[120px]" />
          </div>

          <MeetingHeader 
            callId={normalizedCallId} 
            showTranscript={showTranscript} 
            setShowTranscript={setShowTranscript} 
            layout={layout}
            setLayout={setLayout}
            onSaveMeeting={handleSaveMeeting}
            isSaving={isSaving}
            isSaved={isSaved}
            saveError={saveError}
          />

          {/* Save Error Notification */}
          <AnimatePresence>
            {saveError && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span>{saveError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 min-h-0 relative flex flex-col lg:flex-row gap-3 md:gap-6">
            {/* VIDEO AREA */}
            <div className="flex-1 flex flex-col gap-3 md:gap-4 min-h-0">
              <motion.div 
                layout
                className="flex-1 rounded-2xl md:rounded-3xl bg-black/60 backdrop-blur-3xl border border-white/10 overflow-hidden shadow-2xl relative"
              >
                {layout === "grid" ? (
                  <PaginatedGridLayout />
                ) : (
                  <SpeakerLayout participantsBarPosition="bottom" />
                )}

                {/* Floating Emojis */}
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                  <AnimatePresence>
                    {activeReactions.map((reaction) => (
                      <motion.div
                        key={reaction.id}
                        initial={{ opacity: 0, y: 100, scale: 0.5 }}
                        animate={{ 
                          opacity: [0, 1, 1, 0], 
                          y: [0, -100, -200, -300], 
                          scale: [0.5, 1.2, 1, 0.8] 
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3, ease: "easeOut" }}
                        style={{
                          position: 'absolute',
                          left: `${reaction.x}%`,
                          bottom: '10%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span className="text-3xl filter drop-shadow-lg">{reaction.emoji}</span>
                        <span className="text-[10px] bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-white border border-white/5 whitespace-nowrap">
                          {reaction.userName}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                
                {/* Desktop Transcript Toggle */}
                <button 
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="hidden lg:flex absolute top-4 right-4 p-3 rounded-2xl bg-black/70 border border-white/20 backdrop-blur-xl shadow-xl hover:bg-black/90 transition-all z-10"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <ChevronRight className={`w-4 h-4 text-white transition-transform duration-300 ${showTranscript ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              </motion.div>

              {/* CONTROLS */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex justify-center pb-1"
              >
                <div className="px-4 md:px-8 py-2 md:py-2.5 rounded-[2rem] bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 relative">
                  <ToggleAudioPublishingButton />
                  <ToggleVideoPublishingButton />
                  <ScreenShareButton />

                  {/* Reactions Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowReactionMenu(!showReactionMenu)}
                      className="p-3 bg-white/5 hover:bg-white/10 text-yellow-400 hover:text-yellow-300 rounded-full border border-white/10 transition-all duration-300 flex items-center justify-center"
                      title="Send Reaction"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {showReactionMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 flex items-center gap-2 shadow-2xl z-50 whitespace-nowrap"
                        >
                          {["👍", "❤️", "🎉", "😂", "😮", "👏", "🔥", "🚀"].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                if (call) {
                                  call.sendReaction({ type: "reaction", emoji_code: emoji }).catch(err => {
                                    console.error("Failed to send reaction:", err);
                                  });
                                }
                                setShowReactionMenu(false);
                              }}
                              className="text-2xl hover:scale-130 active:scale-95 transition-transform p-1.5 hover:bg-white/5 rounded-xl"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <CancelCallButton onLeave={handleLeaveClick} />
                </div>
              </motion.div>
            </div>

            {/* DESKTOP TRANSCRIPT SIDEBAR */}
            <AnimatePresence>
              {showTranscript && isLargeScreen && (
                <motion.div 
                  initial={{ x: 50, opacity: 0, width: 0 }}
                  animate={{ x: 0, opacity: 1, width: '100%', maxWidth: '320px' }}
                  exit={{ x: 50, opacity: 0, width: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="hidden lg:flex flex-col rounded-2xl md:rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex-shrink-0"
                >
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                      <Layout className="w-3.5 h-3.5 text-indigo-400" />
                      <h2 className="text-xs font-bold tracking-wider uppercase text-gray-200">
                        Live Transcript
                      </h2>
                    </div>
                    <button onClick={() => setShowTranscript(false)} className="p-1 rounded-full hover:bg-white/10">
                      <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <TranscriptPanel onTranscriptUpdate={setTranscript} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* MOBILE TRANSCRIPT DRAWER & OVERLAY */}
          <AnimatePresence>
            {showTranscript && !isLargeScreen && (
              <>
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowTranscript(false)}
                  className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-40"
                />
                
                {/* Bottom slide-up drawer */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-[#0F1115]/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/10 shadow-2xl flex flex-col h-[65vh] overflow-hidden"
                >
                  {/* Drawer Header */}
                  <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                        Live Transcript
                      </h2>
                    </div>
                    <button 
                      onClick={() => setShowTranscript(false)} 
                      className="p-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Drawer Transcript Content */}
                  <div className="flex-1 overflow-hidden">
                    <TranscriptPanel onTranscriptUpdate={setTranscript} />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </StreamCall>
    </StreamTheme>
  );
}
