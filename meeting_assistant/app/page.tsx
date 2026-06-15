"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Plus,
  ArrowRight,
  LogOut,
  LogIn,
  Loader2,
  Hash,
  Clock,
  Clipboard,
  Check,
  ChevronRight,
  Mic,
  Brain,
  Zap,
  Shield,
  Users,
  Sparkles,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";

// ── Animated transcript lines for the hero demo ──────────────────────────────
const TRANSCRIPT_LINES = [
  { speaker: "Alex", color: "#818cf8", text: "Let's review the Q3 roadmap." },
  { speaker: "Jordan", color: "#34d399", text: "The backend migration is 80% done." },
  { speaker: "AI", color: "#f472b6", text: "📝 Action item: finalize backend by Friday." },
  { speaker: "Casey", color: "#60a5fa", text: "I'll handle the client presentation." },
  { speaker: "AI", color: "#f472b6", text: "✅ Summary updated with 2 action items." },
];

function TranscriptDemo() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= TRANSCRIPT_LINES.length) return;
    const t = setTimeout(() => setVisibleLines((v) => v + 1), 1400);
    return () => clearTimeout(t);
  }, [visibleLines]);

  // Loop
  useEffect(() => {
    if (visibleLines === TRANSCRIPT_LINES.length) {
      const t = setTimeout(() => setVisibleLines(0), 2500);
      return () => clearTimeout(t);
    }
  }, [visibleLines]);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden p-5 space-y-3">
      {/* Window chrome */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-3 text-[10px] text-gray-500 font-mono">live_transcript.ai</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400">LIVE</span>
        </div>
      </div>

      <AnimatePresence>
        {TRANSCRIPT_LINES.slice(0, visibleLines).map((line, i) => (
          <motion.div
            key={`${line.speaker}-${i}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-start gap-2.5"
          >
            <span
              className="text-[11px] font-bold shrink-0 mt-0.5"
              style={{ color: line.color }}
            >
              {line.speaker}
            </span>
            <span className="text-[11px] text-gray-300 transcript-line">{line.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Cursor blink */}
      {visibleLines < TRANSCRIPT_LINES.length && (
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[11px] text-gray-600">Listening</span>
          <span className="inline-flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-indigo-400"
                style={{ animation: `wave-bounce 1s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Feature pill component ────────────────────────────────────────────────────
function FeaturePill({
  icon: Icon,
  label,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm"
    >
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="text-xs font-medium text-gray-300">{label}</span>
    </motion.div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 flex flex-col gap-2"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${color}18` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [recentMeetings, setRecentMeetings] = useState<any[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session) {
      setIsLoadingMeetings(true);
      fetch("/api/meetings")
        .then((res) => res.json())
        .then((data) => {
          if (data.meetings) setRecentMeetings(data.meetings.slice(0, 5));
        })
        .catch(console.error)
        .finally(() => setIsLoadingMeetings(false));
    }
  }, [session]);

  const generateId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const part = (len: number) =>
      Array.from({ length: len }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join("");
    return `meet-${part(4)}-${part(4)}`;
  };

  const handleStartNewMeeting = () => router.push(`/meeting/${generateId()}`);
  const handleJoinMeeting = () => {
    if (!roomId.trim()) return;
    router.push(`/meeting/${roomId.trim()}`);
  };
  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl animate-pulse-ring border-2 border-indigo-500/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col relative overflow-x-hidden">

      {/* ── Background: Tech Grid + Glowing Orbs ── */}
      <div className="fixed inset-0 tech-grid-bg pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary glow */}
        <div className="absolute top-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full animate-float-slow animate-glow-pulse"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        {/* Secondary glow */}
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full animate-float-medium"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)" }} />
        {/* Accent glow */}
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 70%)" }} />
        {/* Top edge gradient fade */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#050508] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050508] to-transparent" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-white/[0.05] backdrop-blur-sm bg-[#050508]/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 opacity-20 blur-sm" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white leading-none">
              Future<span className="text-indigo-400">Meet</span>
            </span>
            <span className="text-[9px] text-gray-600 font-medium tracking-widest uppercase">AI Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <button
                onClick={() => router.push("/profile")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all text-xs font-medium text-gray-300 hover:text-white cursor-pointer"
              >
                {session.user?.image ? (
                  <img src={session.user.image} alt="Avatar" className="w-5 h-5 rounded-full ring-1 ring-indigo-500/30" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center">
                    <span className="text-[9px] text-indigo-300">{session.user?.name?.[0]}</span>
                  </div>
                )}
                {session.user?.name?.split(" ")[0] || "Profile"}
              </button>
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/20 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 flex flex-col">
        {session ? (
          /* ── AUTHENTICATED VIEW ── */
          <div className="flex flex-col items-center px-4 py-10 w-full max-w-2xl mx-auto">

            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-4">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span className="text-xs font-medium text-indigo-300">AI Meeting Assistant</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                Good to see you,{" "}
                <span
                  className="animate-shimmer-text bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #818cf8, #c084fc, #f472b6, #818cf8)" }}
                >
                  {session.user?.name?.split(" ")[0] || "there"}
                </span>{" "}
                👋
              </h1>
              <p className="text-sm text-gray-400">
                Start a new meeting or jump back into an existing one.
              </p>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-full flex gap-3 mb-6"
            >
              <StatCard icon={Video} label="Total Meetings" value={recentMeetings.length > 0 ? `${recentMeetings.length}+` : "—"} color="#818cf8" delay={0.12} />
              <StatCard icon={Brain} label="AI Summaries" value={recentMeetings.length > 0 ? `${recentMeetings.length}` : "—"} color="#c084fc" delay={0.18} />
              <StatCard icon={TrendingUp} label="This Week" value="Active" color="#34d399" delay={0.24} />
            </motion.div>

            {/* Action Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full space-y-3 mb-6"
            >
              {/* New Meeting */}
              <button
                onClick={handleStartNewMeeting}
                id="btn-new-meeting"
                className="w-full relative group flex items-center justify-between px-5 py-4 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(135deg, #4338ca, #6d28d9)" }} />
                <div className="absolute inset-0 rounded-2xl"
                  style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(79,70,229,0.3)" }} />
                <div className="relative flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">New meeting</p>
                    <p className="text-xs text-indigo-200/70">Start instantly, AI joins automatically</p>
                  </div>
                </div>
                <ChevronRight className="relative w-4 h-4 text-white/60 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Join with ID */}
              <div className="w-full flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    id="input-meeting-id"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinMeeting()}
                    placeholder="Enter meeting ID  (e.g. meet-abcd-efgh)"
                    className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  id="btn-join-meeting"
                  onClick={handleJoinMeeting}
                  disabled={!roomId.trim()}
                  className="px-5 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] disabled:opacity-30 disabled:pointer-events-none text-white text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  Join
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>

            {/* Recent Meetings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent meetings</p>
                </div>
                <button
                  onClick={() => router.push("/profile")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {isLoadingMeetings ? (
                <div className="flex items-center justify-center py-10 text-gray-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : recentMeetings.length > 0 ? (
                <div className="space-y-1.5">
                  {recentMeetings.map((meeting, idx) => (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.35 + idx * 0.06 }}
                      className="group flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.09] transition-all cursor-pointer"
                      onClick={() => router.push(`/meeting/${meeting.meetingId}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <Video className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {meeting.title || "Untitled Meeting"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-gray-600" />
                            <p className="text-[10px] text-gray-500">
                              {new Date(meeting.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(meeting.meetingId); }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all cursor-pointer"
                          title="Copy ID"
                        >
                          {copiedId === meeting.meetingId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Clipboard className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/meeting/${meeting.meetingId}`); }}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-gray-500 hover:text-indigo-400 transition-all cursor-pointer"
                          title="Rejoin"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.01]">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-indigo-400/60" />
                  </div>
                  <p className="text-sm text-gray-500 mb-1">No meetings yet</p>
                  <p className="text-xs text-gray-600">Start your first AI-powered meeting above.</p>
                </div>
              )}
            </motion.div>
          </div>

        ) : (
          /* ── LANDING PAGE (Signed-out) ── */
          <div className="flex flex-col">

            {/* ── Hero Section ── */}
            <section className="flex flex-col lg:flex-row items-center justify-center gap-16 px-6 py-20 max-w-6xl mx-auto w-full">

              {/* Left: Hero Text */}
              <div className="flex-1 text-center lg:text-left max-w-xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-6"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-xs font-medium text-indigo-300 tracking-wide">Powered by Gemini Live AI</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
                >
                  Meetings that{" "}
                  <span
                    className="animate-shimmer-text bg-clip-text text-transparent block"
                    style={{ backgroundImage: "linear-gradient(135deg, #818cf8 0%, #c084fc 40%, #f472b6 70%, #818cf8 100%)" }}
                  >
                    think for you.
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-base text-gray-400 leading-relaxed mb-8 max-w-md mx-auto lg:mx-0"
                >
                  FutureMeet brings a real-time AI assistant to every call — transcribing, summarizing, and answering questions so your team stays focused.
                </motion.p>

                {/* Feature pills */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-wrap gap-2 justify-center lg:justify-start mb-10"
                >
                  <FeaturePill icon={Mic} label="Live Transcription" color="#818cf8" delay={0.32} />
                  <FeaturePill icon={Brain} label="AI Summaries" color="#c084fc" delay={0.38} />
                  <FeaturePill icon={MessageSquare} label="Ask AI Anything" color="#f472b6" delay={0.44} />
                  <FeaturePill icon={Zap} label="Instant Setup" color="#fbbf24" delay={0.50} />
                  <FeaturePill icon={Shield} label="Secure & Private" color="#34d399" delay={0.56} />
                </motion.div>

                {/* CTA button */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
                >
                  <button
                    id="btn-sign-in-hero"
                    onClick={() => signIn("google")}
                    className="relative group flex items-center justify-center gap-3 w-full sm:w-auto px-7 py-3.5 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-xl shadow-indigo-500/20"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: "linear-gradient(135deg, #4338ca, #6d28d9)" }} />
                    <svg className="relative w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#fff" fillOpacity=".9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#fff" fillOpacity=".7" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#fff" fillOpacity=".5" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#fff" fillOpacity=".4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="relative text-sm font-semibold text-white">Continue with Google</span>
                    <ArrowRight className="relative w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <span className="text-xs text-gray-600">Free to use · No credit card</span>
                </motion.div>
              </div>

              {/* Right: Live Demo Card */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex-1 w-full max-w-sm lg:max-w-md"
              >
                <div className="relative">
                  {/* Glow behind card */}
                  <div className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl"
                    style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.4) 0%, transparent 70%)" }} />

                  {/* Card */}
                  <div className="relative rounded-2xl border border-white/[0.08] bg-[#0a0a14]/80 backdrop-blur-xl overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                          <Video className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-white">meeting-demo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs text-gray-500">4 participants</span>
                      </div>
                    </div>

                    {/* Transcript demo */}
                    <div className="p-5">
                      <TranscriptDemo />
                    </div>

                    {/* Bottom: AI badge */}
                    <div className="px-5 pb-4">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                        <Brain className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-xs text-violet-300 font-medium">Gemini AI is listening and taking notes…</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* ── Feature Cards Section ── */}
            <section className="px-6 py-16 max-w-5xl mx-auto w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-center mb-10"
              >
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">Everything you need</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Built for modern teams</h2>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    icon: Mic,
                    color: "#818cf8",
                    bg: "rgba(129,140,248,0.08)",
                    title: "Real-time Transcription",
                    desc: "Every word captured instantly — no more frantic note-taking during calls.",
                    delay: 0.55,
                  },
                  {
                    icon: Brain,
                    color: "#c084fc",
                    bg: "rgba(192,132,252,0.08)",
                    title: "AI Meeting Summaries",
                    desc: "Get concise summaries and action items auto-generated at the end of every meeting.",
                    delay: 0.62,
                  },
                  {
                    icon: MessageSquare,
                    color: "#f472b6",
                    bg: "rgba(244,114,182,0.08)",
                    title: "Ask AI Anything",
                    desc: "Forgot something? Ask the AI assistant about any part of your meeting, live.",
                    delay: 0.69,
                  },
                  {
                    icon: Zap,
                    color: "#fbbf24",
                    bg: "rgba(251,191,36,0.08)",
                    title: "One-click Start",
                    desc: "No downloads, no plugins. Just sign in and start a meeting in seconds.",
                    delay: 0.76,
                  },
                  {
                    icon: Shield,
                    color: "#34d399",
                    bg: "rgba(52,211,153,0.08)",
                    title: "End-to-end Encrypted",
                    desc: "Your conversations stay private with enterprise-grade encryption on every call.",
                    delay: 0.83,
                  },
                  {
                    icon: TrendingUp,
                    color: "#60a5fa",
                    bg: "rgba(96,165,250,0.08)",
                    title: "Meeting History",
                    desc: "All your past meetings, transcripts, and summaries — searchable and organized.",
                    delay: 0.90,
                  },
                ].map((f) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: f.delay }}
                    className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 p-5 flex flex-col gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
                      style={{ background: f.bg, border: `1px solid ${f.color}25` }}
                    >
                      <f.icon className="w-5 h-5" style={{ color: f.color }} />
                    </div>
                    <h3 className="text-sm font-bold text-white">{f.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="px-6 py-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="max-w-2xl mx-auto text-center"
              >
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                    <Video className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 opacity-20 blur-md" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Ready to run smarter meetings?
                </h2>
                <p className="text-sm text-gray-400 mb-8">
                  Join thousands of teams using FutureMeet to stay focused and productive.
                </p>
                <button
                  id="btn-sign-in-cta"
                  onClick={() => signIn("google")}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold text-white cursor-pointer transition-all duration-300 shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed, #be185d)" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="rgba(255,255,255,0.9)" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="rgba(255,255,255,0.7)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="rgba(255,255,255,0.5)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="rgba(255,255,255,0.4)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Get started for free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            </section>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 py-5 text-center border-t border-white/[0.04]">
        <p className="text-xs text-gray-700">
          End-to-end encrypted · AI transcription by Gemini · Video powered by Stream
        </p>
      </footer>
    </div>
  );
}
