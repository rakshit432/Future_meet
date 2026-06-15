"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageSquare,
  Sparkles,
  Loader2,
  FileText,
  X,
  Copy,
  Download,
  Check,
  Trash2,
  Video,
  Brain,
  Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleGenerateSummary = async (meetingId: string) => {
    setSummarizingId(meetingId);
    setSummarizeError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/summarize`, {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate summary");
      }
      const data = await res.json();
      setSelectedMeeting((prev: any) => {
        if (prev && prev.id === meetingId) {
          return { ...prev, summary: data.summary, keyPoints: JSON.stringify(data.keyPoints) };
        }
        return prev;
      });
      setMeetings((prevMeetings) =>
        prevMeetings.map((m) =>
          m.id === meetingId
            ? { ...m, summary: data.summary, keyPoints: JSON.stringify(data.keyPoints) }
            : m
        )
      );
    } catch (err: any) {
      console.error(err);
      setSummarizeError(err.message || "An error occurred while summarizing.");
    } finally {
      setSummarizingId(null);
    }
  };

  const handleCopyTranscript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTranscript = (meeting: any) => {
    const element = document.createElement("a");
    const file = new Blob([meeting.transcript], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    const dateStr = new Date(meeting.createdAt).toISOString().split("T")[0];
    element.download = `${meeting.title.replace(/\s+/g, "_") || "Meeting"}_${dateStr}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm("Are you sure you want to permanently delete this meeting?")) return;
    setDeletingId(meetingId);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete meeting");
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      if (selectedMeeting?.id === meetingId) setSelectedMeeting(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete the meeting.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const fetchMeetings = async () => {
      try {
        const res = await fetch("/api/meetings");
        if (res.ok) {
          const data = await res.json();
          setMeetings(data.meetings || []);
        }
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, [status]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 tech-grid-bg pointer-events-none" />
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full animate-float-slow"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full animate-float-medium"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 rounded-full border border-white/[0.06] border-t-indigo-500 border-r-violet-500"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold tracking-widest text-gray-200 uppercase">Loading Profile</p>
            <p className="text-xs text-gray-600">Fetching your meeting history…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-x-hidden">

      {/* Background System */}
      <div className="fixed inset-0 tech-grid-bg pointer-events-none z-0" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[55%] h-[55%] rounded-full blur-[120px]"
          style={{ background: "rgba(99,102,241,0.10)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[140px]"
          style={{ background: "rgba(139,92,246,0.08)" }}
        />
        <motion.div
          animate={{ scale: [0.8, 1, 0.8], opacity: [0.03, 0.07, 0.03] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-[30%] left-[25%] w-[40%] h-[40%] rounded-full blur-[140px]"
          style={{ background: "rgba(236,72,153,0.08)" }}
        />
        {/* Top/bottom fade */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#050508] to-transparent" />
      </div>

      {/* Header / Nav */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-white/[0.05] backdrop-blur-sm bg-[#050508]/60 sticky top-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Video className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 opacity-20 blur-sm" />
            </div>
            <span className="text-sm font-bold text-white hidden sm:block">
              Future<span className="text-indigo-400">Meet</span>
            </span>
          </button>

          <div className="w-px h-5 bg-white/10" />

          {/* Back */}
          <button
            onClick={() => router.push("/")}
            className="group flex items-center gap-1.5 text-gray-500 hover:text-white transition-all duration-300 text-xs font-semibold uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:block">Home</span>
          </button>
        </div>

        {/* Session badge */}
        {session?.user && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            {session.user.image ? (
              <img src={session.user.image} alt="Avatar" className="w-5 h-5 rounded-full ring-1 ring-indigo-500/30" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center">
                <span className="text-[9px] text-indigo-300">{session.user.name?.[0]}</span>
              </div>
            )}
            <span className="text-xs font-medium text-gray-300 hidden sm:block">{session.user.name?.split(" ")[0]}</span>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-8 border-b border-white/[0.06]"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-4">
              <Brain className="w-3 h-3 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-300">Meeting Archive</span>
            </div>
            <h1
              className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 animate-shimmer-text bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #ffffff 0%, #818cf8 50%, #c084fc 100%)", backgroundSize: "200% 200%" }}
            >
              My Meetings
            </h1>
            <p className="text-gray-500 text-sm">
              Your saved sessions, AI summaries, and full transcripts.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>{meetings.length} session{meetings.length !== 1 ? "s" : ""} saved</span>
          </div>
        </motion.div>

        {/* Empty state */}
        {meetings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center py-24 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01]"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Calendar className="w-7 h-7 text-indigo-400/60" />
            </div>
            <h2 className="text-lg font-bold mb-2">No meetings archived yet</h2>
            <p className="text-gray-500 text-sm mb-6">
              Join a meeting, save it, and it will appear here with AI summaries.
            </p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
              Start a Meeting
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {meetings.map((meeting, idx) => {
              const lineCount = meeting.transcript
                ? meeting.transcript.split("\n").filter(Boolean).length
                : 0;
              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                  whileHover={{ y: -4, borderColor: "rgba(99,102,241,0.3)" }}
                  onClick={() => setSelectedMeeting(meeting)}
                  className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04] cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  style={{ minHeight: "260px" }}
                >
                  {/* Top glow on hover */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="p-6 flex flex-col flex-1 justify-between">
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] uppercase font-bold text-indigo-400 tracking-wider">
                              Session
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {new Date(meeting.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <h2 className="text-base font-extrabold text-white line-clamp-2 tracking-tight group-hover:text-indigo-300 transition-colors duration-200">
                            {meeting.title || "Untitled Meeting"}
                          </h2>
                        </div>

                        {/* Quick Delete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(meeting.id); }}
                          disabled={deletingId === meeting.id}
                          className="opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-gray-600 border border-transparent hover:border-red-500/20"
                          title="Delete Session"
                        >
                          {deletingId === meeting.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Summary snippet */}
                      {meeting.summary ? (
                        <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 mb-4">
                          {meeting.summary}
                        </p>
                      ) : (
                        <p className="text-gray-600 text-xs leading-relaxed italic line-clamp-3 mb-4">
                          No AI summary yet — click to open and generate one.
                        </p>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500/70" />
                        <span>{lineCount} lines</span>
                      </div>
                      {meeting.summary && (
                        <div className="flex items-center gap-1 text-amber-400/80">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Summarized</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedMeeting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMeeting(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.97, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: 12, opacity: 0 }}
              transition={{ type: "spring", duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-[#08080f] border border-white/[0.09] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
            >
              {/* Modal top glow */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-white/[0.07] flex items-start justify-between bg-white/[0.02]">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-mono mb-2 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(selectedMeeting.createdAt).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white leading-tight tracking-tight pr-8">
                    {selectedMeeting.title || "Untitled Meeting"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                    disabled={deletingId === selectedMeeting.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-all rounded-xl text-xs font-semibold"
                  >
                    {deletingId === selectedMeeting.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                  <button
                    onClick={() => setSelectedMeeting(null)}
                    className="p-2 bg-white/[0.05] border border-white/[0.08] rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                {/* AI Summary block */}
                {selectedMeeting.summary ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-amber-500/[0.04] border border-amber-500/[0.15] rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-[160px] h-[160px] rounded-full blur-[50px] pointer-events-none"
                        style={{ background: "rgba(245,158,11,0.04)" }} />
                      <div className="flex items-center gap-2 mb-3 text-amber-400">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">AI Executive Summary</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{selectedMeeting.summary}</p>
                    </div>

                    {/* Key Points */}
                    {JSON.parse(selectedMeeting.keyPoints || "[]").length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3 text-indigo-400">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Key Decisions & Actions</span>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {JSON.parse(selectedMeeting.keyPoints).map((point: string, i: number) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-start gap-3 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl text-gray-300 text-sm leading-relaxed"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                              <span>{point}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-8 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-base font-bold text-white mb-1">Generate AI Summary</h3>
                      <p className="text-gray-500 text-xs mb-5 leading-relaxed">
                        Use Gemini 2.5 Flash to extract key points, action items, and create an executive summary from this meeting.
                      </p>
                      {summarizeError && (
                        <p className="text-red-400 text-xs mb-3 font-mono">{summarizeError}</p>
                      )}
                      <button
                        onClick={() => handleGenerateSummary(selectedMeeting.id)}
                        disabled={summarizingId === selectedMeeting.id}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff" }}
                      >
                        {summarizingId === selectedMeeting.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Gemini is working…</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Summarize with Gemini 2.5</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Full Transcript */}
                {selectedMeeting.transcript && (
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Full Transcript</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyTranscript(selectedMeeting.transcript)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg border border-white/[0.07] transition-all text-xs font-semibold"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleExportTranscript(selectedMeeting)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg border border-white/[0.07] transition-all text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export .txt</span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 max-h-[350px] overflow-y-auto font-mono text-xs text-gray-400 space-y-4 custom-scrollbar">
                      {selectedMeeting.transcript.split("\n").map((line: string, i: number) => {
                        const match = line.match(/^([^\[]+)\s*\[([^\]]*)\]:(.*)$/);
                        if (match) {
                          const [_, speaker, timestamp, text] = match;
                          return (
                            <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-4 border-b border-white/[0.04] pb-3 last:border-b-0 last:pb-0">
                              <span className="font-bold text-indigo-400 min-w-[140px] truncate">{speaker.trim()}</span>
                              <span className="text-gray-600 text-[10px] font-mono">[{timestamp}]</span>
                              <span className="text-gray-300 flex-1 leading-relaxed text-xs">{text.trim()}</span>
                            </div>
                          );
                        }
                        return <p key={i} className="leading-relaxed whitespace-pre-wrap text-xs text-gray-300">{line}</p>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}