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
} from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";

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

  const handleStartNewMeeting = () => {
    router.push(`/meeting/${generateId()}`);
  };

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
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col relative overflow-x-hidden">

      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            Future<span className="text-indigo-400">Meet</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <button
                onClick={() => router.push("/profile")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-medium text-gray-300 hover:text-white cursor-pointer"
              >
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Avatar"
                    className="w-5 h-5 rounded-full"
                  />
                ) : null}
                {session.user?.name?.split(" ")[0] || "Profile"}
              </button>
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        {session ? (
          <div className="w-full max-w-lg space-y-6">

            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                Start or join a{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  meeting
                </span>
              </h1>
              <p className="text-sm text-gray-400 font-medium">
                AI-powered transcription and Q&amp;A, live in every room.
              </p>
            </motion.div>

            {/* Action Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-3"
            >
              {/* New Meeting Button */}
              <button
                onClick={handleStartNewMeeting}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 transition-all duration-200 shadow-lg shadow-indigo-600/20 group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">New meeting</p>
                    <p className="text-xs text-indigo-200/70">Start instantly, share the link</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/60 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Join with ID */}
              <div className="w-full flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinMeeting()}
                    placeholder="Enter a meeting ID"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
              transition={{ duration: 0.5, delay: 0.2 }}
              className="pt-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recent meetings
                </p>
                <button
                  onClick={() => router.push("/profile")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {isLoadingMeetings ? (
                <div className="flex items-center justify-center py-8 text-gray-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : recentMeetings.length > 0 ? (
                <div className="space-y-1.5">
                  {recentMeetings.map((meeting) => (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all"
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
                          onClick={() => copyToClipboard(meeting.meetingId)}
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
                          onClick={() =>
                            router.push(`/meeting/${meeting.meetingId}`)
                          }
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
                <div className="py-8 text-center text-xs text-gray-600 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  No meetings saved yet. Start one above!
                </div>
              )}
            </motion.div>

          </div>
        ) : (
          /* Sign-in state */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <Video className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Welcome to FutureMeet
            </h1>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              AI-powered meetings with live transcription and Q&amp;A. Sign in to get started.
            </p>
            <button
              onClick={() => signIn("google")}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-all shadow-lg cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center border-t border-white/[0.04]">
        <p className="text-xs text-gray-600">
          End-to-end encrypted · AI transcription · Powered by Stream
        </p>
      </footer>
    </div>
  );
}
