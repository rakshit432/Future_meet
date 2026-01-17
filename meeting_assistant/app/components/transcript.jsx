"use client";

import { useEffect, useState, useRef } from "react";
import { useCall } from "@stream-io/video-react-sdk";
import { useChatContext } from "stream-chat-react";

export function TranscriptPanel() {
  const { client } = useChatContext();
  const [transcripts, setTranscripts] = useState([]);
  const transcriptEndRef = useRef(null);
  const call = useCall();

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

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
          text: event.closed_caption.text,
          speaker:
            event.closed_caption.user?.name ||
            event.closed_caption.user?.id ||
            "Unknown",
          timestamp: new Date(
            event.closed_caption.start_time
          ).toLocaleTimeString(),
        },
      ]);
    };

    const handleNewMessage = (event) => {
      const message = event.message;
      if (message?.user?.id !== "meeting-assistant-bot") return;

      setTranscripts((prev) => [
        ...prev,
        {
          text: message.text,
          speaker: message.custom?.speaker || message.user?.name || "Assistant",
          timestamp: new Date(message.created_at).toLocaleTimeString(),
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
    <div className="h-full flex flex-col bg-[#0B0F19] text-gray-100">

      {/* HEADER */}
      <div className="sticky top-0 z-10 px-5 py-4 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-wide">
                Live Transcript
              </h3>
              <p className="text-[11px] text-gray-400">
                {transcripts.length} entries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">
              Live
            </span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 scroll-smooth">

        {/* EMPTY STATE */}
        {transcripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-400 font-medium">
              Waiting for conversation…
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Captions will appear in real-time
            </p>
          </div>
        ) : (
          <>
            {transcripts.map((t, idx) => {
              const isAssistant =
                t.speaker === "Assistant" ||
                t.speaker === "Meeting Assistant";

              return (
                <div
                  key={idx}
                  className={`group rounded-2xl p-4 transition-all border hover:-translate-y-[1px] ${
                    isAssistant
                      ? "bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/30"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                          isAssistant
                            ? "bg-indigo-600 text-white shadow-indigo-500/30"
                            : "bg-black/40 border border-white/10 text-gray-300"
                        }`}
                      >
                        {t.speaker.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <p
                          className={`text-sm font-medium ${
                            isAssistant
                              ? "text-indigo-300"
                              : "text-gray-200"
                          }`}
                        >
                          {t.speaker}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {t.timestamp}
                        </p>
                      </div>
                    </div>

                    {t.noteType && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10 uppercase tracking-wide text-gray-400">
                        {t.noteType.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  <p
                    className={`text-sm leading-relaxed pl-11 ${
                      isAssistant
                        ? "text-indigo-100/90"
                        : "text-gray-300"
                    }`}
                  >
                    {t.text}
                  </p>
                </div>
              );
            })}

            <div ref={transcriptEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
