"use client";

import { useEffect, useState, useRef } from "react";
import { useCall } from "@stream-io/video-react-sdk";
import { useChatContext } from "stream-chat-react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Bot, User, Clock, Sparkles } from "lucide-react";

export function TranscriptPanel({ onTranscriptUpdate }) {
  const { client } = useChatContext();
  const [transcripts, setTranscripts] = useState([]);
  const transcriptEndRef = useRef(null);
  const call = useCall();

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (onTranscriptUpdate) {
      onTranscriptUpdate(transcripts);
    }
  }, [transcripts, onTranscriptUpdate]);

  useEffect(() => {
    if (!call) return;

    const callId =
      call?.id || call?.callId || process.env.NEXT_PUBLIC_CALL_ID;
    if (!callId) return;

    const channel = client.channel("messaging", callId);
    let cancelled = false;

    const watchChannel = async () => {
      try {
        await channel.watch();
        if (cancelled) return;
      } catch {
        return;
      }
    };

    watchChannel();

    const handleClosedCaption = (event) => {
      if (!event.closed_caption) return;

      setTranscripts((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          text: event.closed_caption.text,
          speaker:
            event.closed_caption.user?.name ||
            event.closed_caption.user?.id ||
            "Unknown",
          timestamp: new Date(
            event.closed_caption.start_time
          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    };

    const handleNewMessage = (event) => {
      const message = event.message;
      if (message?.user?.id !== "meeting-assistant-bot") return;

      setTranscripts((prev) => [
        ...prev,
        {
          id: message.id,
          text: message.text,
          speaker: message.custom?.speaker || message.user?.name || "Assistant",
          timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          noteType: message.custom?.note_type,
        },
      ]);
    };

    call.on("call.closed_caption", handleClosedCaption);
    channel.on("message.new", handleNewMessage);

    return () => {
      cancelled = true;
      call.off("call.closed_caption", handleClosedCaption);
      channel.off("message.new", handleNewMessage);
    };
  }, [call]);

  return (
    <div className="h-full flex flex-col bg-transparent text-gray-100">
      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-3 md:py-6 space-y-2 md:space-y-4 scroll-smooth custom-scrollbar">
        {/* EMPTY STATE */}
        <AnimatePresence mode="wait">
          {transcripts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center h-full text-center py-8 md:py-12"
            >
              <div className="w-14 h-14 md:w-20 h-20 mb-3 md:mb-6 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full" />
                <MessageSquare className="w-6 h-6 md:w-8 h-8 text-indigo-400 relative z-10" />
              </div>
              <h3 className="text-xs md:text-sm font-bold text-gray-200 uppercase tracking-widest mb-1 md:mb-2">
                Listening…
              </h3>
              <p className="text-[11px] md:text-xs text-gray-500 max-w-[180px] md:max-w-[200px] leading-relaxed">
                Captions and AI notes will appear here as the meeting progresses.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2 md:space-y-4">
              {transcripts.map((t, idx) => {
            const isAssistant =
              t.speaker === "Assistant" ||
              t.speaker === "Meeting Assistant";

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`group relative rounded-lg p-2 transition-all border ${
                  isAssistant
                    ? "bg-indigo-500/10 border-indigo-500/20"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shadow-inner ${
                        isAssistant
                          ? "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white"
                          : "bg-black/40 border border-white/10 text-gray-400"
                      }`}
                    >
                      {isAssistant ? (
                        <Bot className="w-2.5 h-2.5" />
                      ) : (
                        <span className="text-[9px] font-bold uppercase">{t.speaker.charAt(0)}</span>
                      )}
                    </div>

                    <div>
                      <p
                        className={`text-[10px] font-bold tracking-tight ${
                          isAssistant
                            ? "text-indigo-300"
                            : "text-gray-200"
                        }`}
                      >
                        {t.speaker}
                      </p>
                      <div className="flex items-center gap-1">
                        <Clock className="w-1.5 h-1.5 text-gray-600" />
                        <span className="text-[8px] text-gray-500 font-medium">
                          {t.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>

                  {t.noteType && (
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                      <Sparkles className="w-1.5 h-1.5 text-indigo-400" />
                      <span className="text-[6px] uppercase tracking-tighter font-bold text-indigo-300">
                        {t.noteType.replace("_", " ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <p className={`text-[10px] leading-relaxed ${
                  isAssistant ? "text-indigo-100/90 font-medium" : "text-gray-300"
                }`}>
                  {t.text}
                </p>
              </motion.div>
            );
          })}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER INFO */}
      <div className="px-3 md:px-6 py-2 md:py-3 border-t border-white/10 bg-black/20">
        <div className="flex items-center justify-between opacity-50">
          <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Real-time Sync
          </p>
          <div className="flex gap-1.5 md:gap-2">
             <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-indigo-500" />
             <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-indigo-500/50" />
             <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-indigo-500/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
