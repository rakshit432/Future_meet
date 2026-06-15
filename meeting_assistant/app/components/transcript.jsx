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
    if (!call || !client || !client.userID) return;

    const callId = call?.id || call?.callId || process.env.NEXT_PUBLIC_CALL_ID;
    if (!callId) return;

    const channel = client.channel("messaging", callId);
    let cancelled = false;
    let retryTimer = null;

    // Helper: turn a raw Stream message into our transcript shape
    const msgToTranscript = (m) => ({
      id: m.id,
      text: m.text,
      speaker: m.custom?.speaker || m.user?.name || "Assistant",
      timestamp: new Date(m.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      noteType: m.custom?.note_type,
    });

    // Watch channel with exponential-backoff retry.
    // IMPORTANT: The bot creates the channel server-side without adding the user as
    // a member. Stream "messaging" channels require membership to receive events.
    // Fix: try to create the channel with ourselves as a member first (idempotent).
    // The backend also calls add_members() when participants join — so eventually one
    // of these two paths will grant membership and watch() will succeed.
    const watchChannel = async (attempt = 0) => {
      try {
        // Step 1: Ensure we are a member by creating the channel with ourselves.
        // If the channel already exists, this will fail — that is fine, we catch it.
        try {
          const memberChannel = client.channel("messaging", callId, {
            created_by_id: client.userID,
            members: [client.userID],
          });
          await memberChannel.create();
          console.log("[TranscriptPanel] Channel created/ensured with user as member");
        } catch (_) {
          // Channel already exists (created by the bot) — rely on backend add_members
        }

        // Step 2: Watch the channel (subscribe to real-time events)
        const state = await channel.watch();
        if (cancelled) return;

        console.log("[TranscriptPanel] Channel watch successful. Raw messages:", state?.messages);

        // Back-fill any messages that were already in the channel
        const existing = (state?.messages ?? [])
          .filter((m) => m.text)
          .map(msgToTranscript);

        if (existing.length > 0) {
          console.log("[TranscriptPanel] Backfilled transcripts:", existing);
          setTranscripts(existing);
        }

        console.log("[TranscriptPanel] Channel ready, watching for new messages");
      } catch (err) {
        if (cancelled) return;
        // Exponential backoff: 2 s, 4 s, 8 s … capped at 30 s
        const delay = Math.min(2000 * 2 ** attempt, 30000);
        console.log(
          `[TranscriptPanel] channel.watch() failed (attempt ${attempt + 1}), retrying in ${delay / 1000}s…`,
          err?.message
        );
        retryTimer = setTimeout(() => watchChannel(attempt + 1), delay);
      }
    };

    watchChannel();

    // Stream native closed-caption events (when Stream's own transcription fires)
    const handleClosedCaption = (event) => {
      if (!event || !event.text) return;
      setTranscripts((prev) => [
        ...prev,
        {
          id: event.id || Math.random().toString(36).substr(2, 9),
          text: event.text,
          speaker:
            event.user?.name || event.user?.id || event.speaker_id || "Unknown",
          timestamp: new Date(
            event.start_time || Date.now()
          ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    };

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

    // Chat channel messages (transcripts + AI notes + human messages)
    const handleNewMessage = (event) => {
      const message = event.message;
      console.log("[TranscriptPanel] New message event received:", event);
      if (!message?.text) return;
      upsertTranscript(message);
    };

    const handleUpdatedMessage = (event) => {
      const message = event.message;
      console.log("[TranscriptPanel] Updated message event received:", event);
      if (!message?.text) return;
      upsertTranscript(message);
    };

    // Disabled Stream native closed-caption listener to avoid duplicates and improve accuracy.
    // Transcripts are now fully generated on the backend via Gemini and pushed to the channel.
    // call.on("call.closed_caption", handleClosedCaption);
    channel.on("message.new", handleNewMessage);
    channel.on("message.updated", handleUpdatedMessage);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      // call.off("call.closed_caption", handleClosedCaption);
      channel.off("message.new", handleNewMessage);
      channel.off("message.updated", handleUpdatedMessage);
    };
  }, [call, client, client?.userID]);

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
