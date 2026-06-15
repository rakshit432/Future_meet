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
  Trash2
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
        method: "POST"
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate summary");
      }

      const data = await res.json();
      
      setSelectedMeeting((prev: any) => {
        if (prev && prev.id === meetingId) {
          return {
            ...prev,
            summary: data.summary,
            keyPoints: JSON.stringify(data.keyPoints)
          };
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
    const file = new Blob([meeting.transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    const dateStr = new Date(meeting.createdAt).toISOString().split('T')[0];
    element.download = `${meeting.title.replace(/\s+/g, '_') || 'Meeting'}_${dateStr}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm("Are you sure you want to permanently delete this meeting?")) return;
    setDeletingId(meetingId);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        throw new Error("Failed to delete meeting");
      }
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete the meeting.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="mt-4 text-gray-500">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Cool Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-cyan-600/10 rounded-full blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [0.8, 1, 0.8],
            opacity: [0.03, 0.08, 0.03],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-[30%] left-[25%] w-[40%] h-[40%] bg-fuchsia-500/10 rounded-full blur-[140px]"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-100 contrast-150" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 font-jakarta">
        <button
          onClick={() => router.push("/")}
          className="group flex items-center gap-2 text-gray-500 hover:text-white mb-8 transition-all duration-300 text-xs font-semibold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home</span>
        </button>

        <div className="mb-12 border-b border-white/5 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight font-outfit text-white mb-3">
              My Meetings
            </h1>
            <p className="text-gray-500 text-sm">
              An archive of your saved meeting dialogues, transcripts, and AI-powered context.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 font-mono bg-[#0B0C10] border border-white/5 px-4 py-2.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>{meetings.length} Total Sessions Saved</span>
          </div>
        </div>

        {meetings.length === 0 ? (
          <div className="text-center py-20 bg-[#0B0C10] border border-white/5 rounded-2xl">
            <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold font-outfit mb-1">No meetings archived</h2>
            <p className="text-gray-500 text-sm">Join a meeting and click save to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-jakarta">
            {meetings.map((meeting) => {
              const lineCount = meeting.transcript ? meeting.transcript.split("\n").filter(Boolean).length : 0;
              
              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    y: -4,
                    borderColor: "rgba(255, 255, 255, 0.15)"
                  }}
                  onClick={() => setSelectedMeeting(meeting)}
                  className="bg-[#0B0C10] border border-white/5 rounded-2xl p-6 cursor-pointer relative overflow-hidden group transition-all duration-300 flex flex-col justify-between min-h-[260px]"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] uppercase font-bold text-indigo-400 font-mono tracking-wider">
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
                        <h2 className="text-lg font-extrabold text-white line-clamp-2 font-outfit tracking-tight group-hover:text-indigo-400 transition-colors">
                          {meeting.title || "Untitled Meeting"}
                        </h2>
                      </div>
                      
                      {/* Quick Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeeting(meeting.id);
                        }}
                        disabled={deletingId === meeting.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-gray-500 border border-transparent hover:border-red-500/10"
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
                      <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 mb-6 font-sans">
                        {meeting.summary}
                      </p>
                    ) : (
                      <p className="text-gray-600 text-xs leading-relaxed italic line-clamp-3 mb-6">
                        No AI summary generated. Click to open and generate one.
                      </p>
                    )}
                  </div>

                  {/* Card Footer Info */}
                  <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-gray-500 font-mono">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{lineCount} lines</span>
                    </div>
                    {meeting.summary && (
                      <div className="flex items-center gap-1 text-yellow-500/80">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Summarized</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedMeeting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMeeting(null)}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto font-jakarta"
          >
            <motion.div
              initial={{ scale: 0.98, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 10, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#070709] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between bg-white/[0.02]">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-mono mb-1.5 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(selectedMeeting.createdAt).toLocaleDateString("en-US", {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white leading-tight font-outfit tracking-tight pr-8">
                    {selectedMeeting.title || "Untitled Meeting"}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                    disabled={deletingId === selectedMeeting.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/20 hover:border-red-500 text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-xl text-xs font-semibold"
                  >
                    {deletingId === selectedMeeting.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete Session</span>
                  </button>
                  <button
                    onClick={() => setSelectedMeeting(null)}
                    className="p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* On-Demand AI Summary Action / Result */}
                {selectedMeeting.summary ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-yellow-500/[0.02] border border-yellow-500/10 rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-yellow-500/[0.02] rounded-full blur-[40px] pointer-events-none" />
                      <div className="flex items-center gap-2 mb-3 text-yellow-500 font-outfit">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          AI Executive Summary
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {selectedMeeting.summary}
                      </p>
                    </div>

                    {/* Key Points */}
                    {JSON.parse(selectedMeeting.keyPoints || "[]").length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3 text-indigo-400 font-outfit">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Key Decisions & Actions
                          </span>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {JSON.parse(selectedMeeting.keyPoints).map((point: string, i: number) => (
                            <motion.li
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={i}
                              className="flex items-start gap-3 p-4 bg-[#0B0C10] border border-white/5 rounded-xl text-gray-300 text-sm leading-relaxed"
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
                  <div className="bg-[#0B0C10] border border-white/5 rounded-2xl p-8 text-center space-y-4">
                    <div className="p-3 bg-indigo-500/5 text-indigo-400 rounded-full w-fit mx-auto border border-indigo-500/10">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-lg font-bold text-white mb-1 font-outfit">Generate AI Summary</h3>
                      <p className="text-gray-500 text-xs mb-6 font-sans">
                        Use Gemini 2.5 Flash to automatically interpret this meeting's transcript, extract key points, action items, and create an executive summary.
                      </p>
                      {summarizeError && (
                        <p className="text-red-400 text-xs mb-3 font-mono">{summarizeError}</p>
                      )}
                      <button
                        onClick={() => handleGenerateSummary(selectedMeeting.id)}
                        disabled={summarizingId === selectedMeeting.id}
                        className="w-full sm:w-auto px-6 py-2.5 bg-white text-black hover:bg-white/95 disabled:bg-white/50 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mx-auto disabled:cursor-not-allowed"
                      >
                        {summarizingId === selectedMeeting.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Gemini is generating summary...</span>
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
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2 text-cyan-400 font-outfit">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Full Transcript
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyTranscript(selectedMeeting.transcript)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0C10] hover:bg-white/5 text-gray-400 hover:text-white rounded-lg border border-white/5 transition-all text-xs font-semibold"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" />
                              <span className="text-green-400">Copied!</span>
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
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0C10] hover:bg-white/5 text-gray-400 hover:text-white rounded-lg border border-white/5 transition-all text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export .txt</span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#0B0C10]/50 border border-white/5 rounded-2xl p-5 max-h-[350px] overflow-y-auto font-mono text-xs text-gray-400 space-y-4 custom-scrollbar">
                      {selectedMeeting.transcript.split("\n").map((line: string, i: number) => {
                        const match = line.match(/^([^\[]+)\s*\[([^\]]*)\]:(.*)$/);
                        if (match) {
                          const [_, speaker, timestamp, text] = match;
                          return (
                            <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-4 border-b border-white/[0.03] pb-3 last:border-b-0 last:pb-0 font-sans">
                              <span className="font-bold text-indigo-400 min-w-[140px] truncate font-outfit">{speaker.trim()}</span>
                              <span className="text-gray-600 text-[10px] font-mono">[{timestamp}]</span>
                              <span className="text-gray-300 flex-1 leading-relaxed text-xs">{text.trim()}</span>
                            </div>
                          );
                        }
                        return <p key={i} className="leading-relaxed whitespace-pre-wrap font-sans text-xs text-gray-300">{line}</p>;
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