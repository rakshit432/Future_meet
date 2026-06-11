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
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);

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

      <div className="max-w-6xl mx-auto relative z-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">My Meetings</h1>
          <p className="text-gray-400">View and manage your saved meeting history.</p>
        </div>

        {meetings.length === 0 ? (
          <div className="text-center py-20 bg-[#0F1115]/80 backdrop-blur-xl border border-white/10 rounded-3xl">
            <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No meetings yet</h2>
            <p className="text-gray-400">Join a meeting and save it to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.map((meeting, index) => {
              const keyPoints = meeting.keyPoints ? JSON.parse(meeting.keyPoints) : [];
              
              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    y: -6, 
                    scale: 1.02, 
                    borderColor: "rgba(99, 102, 241, 0.4)",
                    boxShadow: "0 20px 40px -15px rgba(99, 102, 241, 0.15)"
                  }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                  onClick={() => setSelectedMeeting(meeting)}
                  className="bg-[#0F1115]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/5 cursor-pointer relative overflow-hidden group transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/0 via-indigo-500/0 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                        {meeting.title || "Untitled Meeting"}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(meeting.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {meeting.summary && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2 text-yellow-400">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          Summary
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                        {meeting.summary}
                      </p>
                    </div>
                  )}

                  {keyPoints.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2 text-indigo-400">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          Key Points
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {keyPoints.slice(0, 3).map((point: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-gray-300 text-sm line-clamp-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                        {keyPoints.length > 3 && (
                          <li className="text-xs text-indigo-400 font-semibold pl-3.5 pt-0.5">
                            + {keyPoints.length - 3} more items
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {meeting.transcript && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-cyan-400">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          Transcript Preview
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs line-clamp-2 italic">
                        "{meeting.transcript}"
                      </p>
                    </div>
                  )}
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
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0F1115] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between bg-white/5">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1 uppercase tracking-wider">
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
                  <h2 className="text-2xl font-bold text-white leading-tight pr-8">
                    {selectedMeeting.title || "Untitled Meeting"}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-red-400 transition-all text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Summary */}
                {selectedMeeting.summary && (
                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-yellow-500/5 rounded-full blur-[40px] pointer-events-none" />
                    <div className="flex items-center gap-2 mb-3 text-yellow-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        AI Summary
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed font-sans">
                      {selectedMeeting.summary}
                    </p>
                  </div>
                )}

                {/* Key Points */}
                {JSON.parse(selectedMeeting.keyPoints || "[]").length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-indigo-400">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Key Points & Actions
                      </span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {JSON.parse(selectedMeeting.keyPoints).map((point: string, i: number) => (
                        <motion.li
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={i}
                          className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-gray-300 text-sm leading-relaxed"
                        >
                          <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                          <span>{point}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Full Transcript */}
                {selectedMeeting.transcript && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-cyan-400">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Meeting Transcript
                      </span>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-5 max-h-[300px] overflow-y-auto font-mono text-xs text-gray-400 space-y-3 custom-scrollbar">
                      {selectedMeeting.transcript.split("\n").map((line: string, i: number) => {
                        const match = line.match(/^([^\[]+)\s*\[([^\]]*)\]:(.*)$/);
                        if (match) {
                          const [_, speaker, timestamp, text] = match;
                          return (
                            <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-3 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                              <span className="font-bold text-indigo-300 min-w-[120px]">{speaker.trim()}</span>
                              <span className="text-gray-600">[{timestamp}]</span>
                              <span className="text-gray-300 flex-1">{text.trim()}</span>
                            </div>
                          );
                        }
                        return <p key={i} className="leading-relaxed whitespace-pre-wrap">{line}</p>;
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