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
  Smile,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { TranscriptPanel } from "./transcript";
import "@stream-io/video-react-sdk/dist/css/styles.css";

// ── Agent auto-joiner (unchanged logic) ────────────────────────────────────
function AgentAutoJoiner({ callId }) {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const { data: session } = useSession();
  const lastPingRef = useRef(0);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!callId || !session?.user) return;
    if (Date.now() - mountTimeRef.current < 10000) return;
    const isBotPresent = participants.some(
      (p) => p.userId === "meeting-assistant-bot" || p.user?.id === "meeting-assistant-bot"
    );
    if (!isBotPresent) {
      const now = Date.now();
      if (now - lastPingRef.current > 10000) {
        lastPingRef.current = now;
        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
          backendUrl = "http://127.0.0.1:10000";
        }
        const userName = encodeURIComponent(session.user.name || session.user.email || session.user.id || "");
        const uid = encodeURIComponent(session.user.id || "");
        console.log(`[AutoJoiner] Bot missing. Pinging backend for call ${callId}...`);
        fetch(`${backendUrl}/join?call_id=${callId}&user_name=${userName}&user_id=${uid}`).catch((err) => {
          console.warn("[AutoJoiner] Failed to ping backend agent:", err);
        });
      }
    }
  }, [participants, callId, session]);

  return null;
}

// ── Meeting Header ─────────────────────────────────────────────────────────
function MeetingHeader({ callId, showTranscript, setShowTranscript, layout, setLayout, onSaveMeeting, isSaving, isSaved, saveError }) {
  const { useParticipantCount } = useCallStateHooks();
  const participantCount = useParticipantCount();
  const { data: session } = useSession();

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3.5 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(8,8,18,0.85)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"
      }}
    >
      {/* Top shimmer line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      {/* Left: Branding + Room ID */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <VideoIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
          </div>
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 opacity-20 blur-sm" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs font-mono text-indigo-400 truncate max-w-[90px] sm:max-w-none uppercase tracking-wider hidden sm:block">
              {callId}
            </span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex-shrink-0">
              <CircleDot className="w-1.5 h-1.5 text-emerald-400 fill-emerald-400 animate-pulse" />
              <span className="text-[8px] md:text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
          </div>
          <p className="hidden md:flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
            <ShieldCheck className="w-2.5 h-2.5 text-indigo-500/70" />
            End-to-end encrypted · AI Captions active
          </p>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Layout Switcher */}
        <div className="hidden md:flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.07]">
          {[["grid", Layout], ["speaker", Users]].map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setLayout(mode)}
              className={`p-1.5 rounded-lg transition-all ${
                layout === mode
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-gray-500 hover:text-gray-200"
              }`}
              title={mode === "grid" ? "Grid View" : "Speaker View"}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Transcript Toggle */}
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline text-xs font-semibold text-gray-200">Transcript</span>
        </button>

        {/* Save */}
        {session && (
          <button
            onClick={onSaveMeeting}
            disabled={isSaving || isSaved}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
            title={isSaved ? "Meeting Saved" : "Save Meeting"}
          >
            {isSaving ? (
              <Save className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : isSaved ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="hidden sm:inline text-xs font-semibold text-gray-200">
              {isSaved ? "Saved" : "Save"}
            </span>
          </button>
        )}

        {/* Participant Count */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-gray-400">
          <Users className="w-3.5 h-3.5" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-semibold text-gray-300">
            {participantCount}<span className="hidden sm:inline"> Participant{participantCount !== 1 ? "s" : ""}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Loading Screen ─────────────────────────────────────────────────────────
function LoadingScreen({ message, sub }) {
  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 tech-grid-bg pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }} />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border border-white/[0.06] border-t-indigo-500 border-r-violet-500"
          />
          <VideoIcon className="w-5 h-5 text-indigo-400 absolute animate-pulse" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-sm font-bold tracking-widest text-gray-200 uppercase">{message}</h3>
          <p className="text-xs text-gray-600">{sub}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main MeetingRoom Component ─────────────────────────────────────────────
export default function MeetingRoom({ callId, onLeave, userId }) {
  const client = useStreamVideoClient();
  const [call, setCall] = useState(null);
  const [error, setError] = useState(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const [layout, setLayout] = useState("grid");
  const [transcript, setTranscript] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [activeReactions, setActiveReactions] = useState([]);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (!call) return;
    const unsubscribe = call.on("call.reaction_new", (event) => {
      if (event.type === "call.reaction_new" && event.reaction) {
        const reactionId = Math.random().toString(36).substring(2, 9);
        const participant = call.state.participants.find((p) => p.userId === event.reaction.user_id);
        const newReaction = {
          id: reactionId,
          emoji: event.reaction.emoji_code,
          userName: participant?.name || event.reaction.user_id,
          x: Math.random() * 80 + 10,
        };
        setActiveReactions((prev) => [...prev, newReaction]);
        setTimeout(() => setActiveReactions((prev) => prev.filter((r) => r.id !== reactionId)), 3000);
      }
    });
    return () => unsubscribe();
  }, [call]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const normalizedCallId = callId && callId !== "undefined" ? callId : null;
  const joinedRef = useRef(false);
  const leavingRef = useRef(false);
  const callRef = useRef(null);

  useEffect(() => {
    if (!client || !normalizedCallId) return;
    let isMounted = true;
    let myCall = null;
    const init = async () => {
      try {
        myCall = client.call("default", normalizedCallId);
        await myCall.join({ create: true });
        if (!isMounted) { myCall.leave().catch(() => {}); return; }
        myCall.startClosedCaptions({ language: "en" }).catch(() => {});
        myCall.on("call.session_ended", () => onLeave?.());
        callRef.current = myCall;
        setCall(myCall);
      } catch (err) {
        if (isMounted) setError(err.message);
      }
    };
    init();
    return () => {
      isMounted = false;
      if (myCall) myCall.leave().catch(() => {});
      else if (callRef.current) callRef.current.leave().catch(() => {});
    };
  }, [client, normalizedCallId, userId]);

  const handleLeaveClick = async () => {
    if (leavingRef.current) return onLeave?.();
    leavingRef.current = true;
    try {
      const c = callRef.current;
      if (c) {
        await c.stopClosedCaptions().catch(() => {});
        await c.leave().catch(() => {});
      }
    } finally {
      onLeave?.();
    }
  };

  const handleSaveMeeting = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const transcriptText = transcript.map((t) => `${t.speaker || "Unknown"} [${t.timestamp}]: ${t.text}`).join("\n");
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: normalizedCallId,
          title: `Meeting on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
          transcript: transcriptText,
        }),
      });
      let result;
      try { result = await response.json(); } catch { throw new Error(`Server returned ${response.status} ${response.statusText}`); }
      if (!response.ok) throw new Error(result.error || "Failed to save meeting");
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save meeting:", e);
      setSaveError(e.message);
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // ── States ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 tech-grid-bg pointer-events-none" />
        <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, transparent 70%)" }} />
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 rounded-2xl border border-red-500/20 bg-red-500/[0.04] backdrop-blur-xl px-8 py-8 text-center max-w-sm w-full"
          style={{ boxShadow: "0 0 60px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.06)" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent rounded-t-2xl" />
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Info className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all"
            style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  if (!call) {
    return <LoadingScreen message="Synchronizing Call" sub="Establishing connection with Stream servers…" />;
  }

  // ── Main Room UI ─────────────────────────────────────────────────────────
  return (
    <StreamTheme>
      <StreamCall call={call}>
        <AgentAutoJoiner callId={normalizedCallId} />

        <div className="min-h-screen lg:h-screen bg-[#050508] text-gray-100 relative overflow-y-auto lg:overflow-hidden flex flex-col p-3 md:p-4 lg:p-5 gap-3 md:gap-4">

          {/* Background system */}
          <div className="fixed inset-0 tech-grid-bg pointer-events-none z-0" />
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
              style={{ background: "rgba(99,102,241,0.07)" }} />
            <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
              style={{ background: "rgba(6,182,212,0.06)" }} />
          </div>

          {/* Header */}
          <div className="relative z-10">
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
          </div>

          {/* Save Error Notification */}
          <AnimatePresence>
            {saveError && (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="relative z-10 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm flex items-center gap-2"
              >
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{saveError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main area: video + transcript */}
          <div className="relative z-10 flex-1 min-h-0 flex flex-col lg:flex-row gap-3 md:gap-4">

            {/* Video column */}
            <div className="flex-1 flex flex-col gap-3 md:gap-4 min-h-[400px] lg:min-h-0">

              {/* Video tile */}
              <motion.div
                layout
                className="flex-1 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl relative"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(32px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
                }}
              >
                {layout === "grid" ? <PaginatedGridLayout /> : <SpeakerLayout participantsBarPosition="bottom" />}

                {/* Floating emoji reactions */}
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                  <AnimatePresence>
                    {activeReactions.map((reaction) => (
                      <motion.div
                        key={reaction.id}
                        initial={{ opacity: 0, y: 100, scale: 0.5 }}
                        animate={{ opacity: [0, 1, 1, 0], y: [0, -100, -200, -300], scale: [0.5, 1.2, 1, 0.8] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3, ease: "easeOut" }}
                        style={{ position: "absolute", left: `${reaction.x}%`, bottom: "10%", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
                      >
                        <span className="text-3xl filter drop-shadow-lg">{reaction.emoji}</span>
                        <span className="text-[10px] bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-white border border-white/10 whitespace-nowrap">
                          {reaction.userName}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Desktop transcript toggle button */}
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="hidden lg:flex absolute top-4 right-4 p-2.5 rounded-xl items-center gap-2 z-10 transition-all"
                  style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <ChevronRight className={`w-4 h-4 text-white transition-transform duration-300 ${showTranscript ? "rotate-180" : ""}`} />
                </button>
              </motion.div>

              {/* Controls bar */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex justify-center pb-1"
              >
                <div
                  className="px-4 md:px-8 py-2 md:py-2.5 rounded-[2rem] flex items-center gap-4 relative"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    backdropFilter: "blur(32px)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
                  }}
                >
                  <ToggleAudioPublishingButton />
                  <ToggleVideoPublishingButton />
                  <ScreenShareButton />

                  {/* Reaction picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowReactionMenu(!showReactionMenu)}
                      className="p-3 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/10 text-yellow-400 hover:text-yellow-300 transition-all flex items-center justify-center"
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
                          className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-2xl p-2.5 flex items-center gap-2 shadow-2xl z-50 whitespace-nowrap"
                          style={{ background: "rgba(5,5,15,0.95)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)" }}
                        >
                          {["👍", "❤️", "🎉", "😂", "😮", "👏", "🔥", "🚀"].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                if (call) call.sendReaction({ type: "reaction", emoji_code: emoji }).catch(console.error);
                                setShowReactionMenu(false);
                              }}
                              className="text-2xl hover:scale-125 active:scale-95 transition-transform p-1.5 hover:bg-white/[0.06] rounded-xl"
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

            {/* Desktop transcript sidebar */}
            <AnimatePresence>
              {showTranscript && isLargeScreen && (
                <motion.div
                  initial={{ x: 50, opacity: 0, width: 0 }}
                  animate={{ x: 0, opacity: 1, width: "100%", maxWidth: "320px" }}
                  exit={{ x: 50, opacity: 0, width: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="hidden lg:flex flex-col rounded-2xl md:rounded-3xl overflow-hidden flex-shrink-0"
                  style={{
                    background: "rgba(5,5,18,0.75)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.4)"
                  }}
                >
                  {/* Sidebar header */}
                  <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between bg-white/[0.03] relative">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                    <div className="flex items-center gap-2">
                      <Layout className="w-3.5 h-3.5 text-indigo-400" />
                      <h2 className="text-xs font-bold tracking-wider uppercase text-gray-200">Live Transcript</h2>
                    </div>
                    <button onClick={() => setShowTranscript(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
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

          {/* Mobile transcript drawer */}
          <AnimatePresence>
            {showTranscript && !isLargeScreen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowTranscript(false)}
                  className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 220 }}
                  className="lg:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/[0.09] shadow-2xl flex flex-col h-[65vh] overflow-hidden"
                  style={{ background: "rgba(8,8,20,0.97)", backdropFilter: "blur(24px)" }}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                  <div className="px-4 py-4 border-b border-white/[0.07] flex items-center justify-between bg-white/[0.03] flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">Live Transcript</h2>
                    </div>
                    <button
                      onClick={() => setShowTranscript(false)}
                      className="p-1.5 bg-white/[0.05] border border-white/[0.08] rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
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
