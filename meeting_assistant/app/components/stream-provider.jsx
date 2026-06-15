"use client";

import { StreamVideo } from "@stream-io/video-react-sdk";
import { Chat } from "stream-chat-react";
import { useStreamClients } from "../hooks/use-stream-clients";
import { motion } from "framer-motion";
import { Video } from "lucide-react";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;

export default function StreamProvider({ children, user, token = undefined, serverTime = undefined, iatLeeway = undefined }) {
  const { videoClient, chatClient } = useStreamClients({ apiKey, user, token, serverTime, iatLeeway });

  if (!videoClient || !chatClient) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 tech-grid-bg pointer-events-none" />
        <div className="fixed inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(6,182,212,0.07) 0%, rgba(99,102,241,0.05) 40%, transparent 70%)" }} />

        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Spinner with logo */}
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border border-white/[0.06] border-t-cyan-400 border-r-indigo-500"
            />
            <div className="absolute w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Video className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-1.5">
            <h3 className="text-sm font-bold tracking-widest text-gray-200 uppercase">Connecting Stream SDK</h3>
            <p className="text-xs text-gray-600">Handshaking with real-time video &amp; chat channels…</p>
          </div>

          {/* Animated dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-cyan-500/60"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <StreamVideo client={videoClient}>
      <Chat client={chatClient}>{children}</Chat>
    </StreamVideo>
  );
}