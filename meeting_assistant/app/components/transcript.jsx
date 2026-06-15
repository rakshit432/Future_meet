"use client";

import { useEffect, useState, useRef } from "react";
import { useCall } from "@stream-io/video-react-sdk";
import { useChatContext } from "stream-chat-react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Bot, Clock, Sparkles, Wifi } from "lucide-react";

export function TranscriptPanel({ onTranscriptUpdate }) {
  const { client } = useChatContext();
  const [transcripts, setTranscripts] = useState([]);
  const transcriptEndRef = useRef(null);
  const call = useCall();

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (onTranscriptUpdate) onTranscriptUpdate(transcripts);
  }, [transcripts, onTranscriptUpdate]);

  useEffect(() => {
    if (!call || !client || !client.userID) return;

    const callId = call?.id || call?.callId || process.env.NEXT_PUBLIC_CALL_ID;
    if (!callId) return;

    const channel = client.channel("messaging", callId);
    let cancelled = false;
    let retryTimer = null;

    const msgToTranscript = (m) => ({
      id: m.id,
      text: m.text,
      speaker: m.custom?.speaker || m.user?.name || "Assistant",
      timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      noteType: m.custom?.note_type,
    });

    const watchChannel = async (attempt = 0) => {
      try {
        try {
          const memberChannel = client.channel("messaging", callId, {
            created_by_id: client.userID,
            members: [client.userID],
          });
          await memberChannel.create();
        } catch (_) {}

        const state = await channel.watch();
        if (cancelled) return;

        const existing = (state?.messages ?? []).filter((m) => m.text).map(msgToTranscript);
        if (existing.length > 0) setTranscripts(existing);
      } catch (err) {
        if (cancelled) return;
        const delay = Math.min(2000 * 2 ** attempt, 30000);
        console.log(`[TranscriptPanel] Retry in ${delay / 1000}s…`, err?.message);
        retryTimer = setTimeout(() => watchChannel(attempt + 1), delay);
      }
    };

    watchChannel();

    const upsertTranscript = (message) => {
      setTranscripts((prev) => {
        const index = prev.findIndex((t) => t.id === message.id);
        const item = msgToTranscript(message);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = item;
          return updated;
        }
        return [...prev, item];
      });
    };

    const handleNewMessage = (event) => {
      if (!event.message?.text) return;
      upsertTranscript(event.message);
    };
    const handleUpdatedMessage = (event) => {
      if (!event.message?.text) return;
      upsertTranscript(event.message);
    };

    channel.on("message.new", handleNewMessage);
    channel.on("message.updated", handleUpdatedMessage);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      channel.off("message.new", handleNewMessage);
      channel.off("message.updated", handleUpdatedMessage);
    };
  }, [call, client, client?.userID]);

  return (
    <div className="h-full flex flex-col text-gray-100" style={{ background: "transparent" }}>

      {/* Transcript entries */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 custom-scrollbar">
        <AnimatePresence mode="wait">
          {transcripts.length === 0 ? (

            /* Empty / waiting state */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center h-full text-center py-12 px-4"
            >
              {/* Pulsing icon */}
              <div className="relative mb-5">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-indigo-400" />
                </div>
                {/* Ripple rings */}
                <div className="absolute inset-0 rounded-2xl border border-indigo-500/30 animate-pulse-ring" />
                <div className="absolute -inset-1.5 rounded-2xl border border-indigo-500/15 animate-pulse-ring" style={{ animationDelay: "0.4s" }} />
              </div>
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                Listening…
              </h3>
              <p className="text-[11px] text-gray-600 leading-relaxed max-w-[180px]">
                AI transcripts and notes will appear here live.
              </p>

              {/* Animated wave bars */}
              <div className="flex items-end gap-1 mt-5 h-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="wave-bar"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            </motion.div>

          ) : (

            /* Transcript list */
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {transcripts.map((t, idx) => {
                const isAssistant = t.speaker === "Assistant" || t.speaker === "Meeting Assistant";
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                    className={`relative rounded-xl p-2.5 transition-all border ${
                      isAssistant
                        ? "border-indigo-500/20 bg-indigo-500/[0.07]"
                        : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.055]"
                    }`}
                  >
                    {/* Top shimmer for AI messages */}
                    {isAssistant && (
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent rounded-t-xl" />
                    )}

                    {/* Header row */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {/* Avatar */}
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                          isAssistant
                            ? "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-500/30"
                            : "bg-white/[0.08] border border-white/[0.1]"
                        }`}>
                          {isAssistant ? (
                            <Bot className="w-2.5 h-2.5 text-white" />
                          ) : (
                            <span className="text-[8px] font-bold text-gray-300 uppercase">{t.speaker.charAt(0)}</span>
                          )}
                        </div>

                        {/* Speaker + time */}
                        <div>
                          <p className={`text-[10px] font-bold leading-none ${isAssistant ? "text-indigo-300" : "text-gray-200"}`}>
                            {t.speaker}
                          </p>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <Clock className="w-1.5 h-1.5 text-gray-700" />
                            <span className="text-[8px] text-gray-600">{t.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      {/* Note type badge */}
                      {t.noteType && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25">
                          <Sparkles className="w-1.5 h-1.5 text-indigo-400" />
                          <span className="text-[7px] uppercase tracking-tight font-bold text-indigo-300">
                            {t.noteType.replace("_", " ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Message text */}
                    <p className={`text-[11px] leading-relaxed ${
                      isAssistant ? "text-indigo-100/85 font-medium" : "text-gray-300"
                    }`}>
                      {t.text}
                    </p>
                  </motion.div>
                );
              })}
              <div ref={transcriptEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer status bar */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-2.5 h-2.5 text-indigo-500/60" />
            <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-700">Real-time Sync</p>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-gray-700">{transcripts.length} entries</span>
          </div>
        </div>
      </div>
    </div>
  );
}
