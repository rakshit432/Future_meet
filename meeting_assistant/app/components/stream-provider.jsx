"use client";

import { StreamVideo } from "@stream-io/video-react-sdk";
import { Chat } from "stream-chat-react";
import { useStreamClients } from "../hooks/use-stream-clients";
import { motion } from "framer-motion";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;

export default function StreamProvider({ children, user, token = undefined, serverTime = undefined, iatLeeway = undefined }) {
  const { videoClient, chatClient } = useStreamClients({ apiKey, user, token, serverTime, iatLeeway });

  if (!videoClient || !chatClient) {
    return (
      <div className="min-h-screen bg-[#020203] text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border border-white/[0.06] border-t-cyan-400 border-r-cyan-400 animate-spin" />
            <svg className="w-5 h-5 text-cyan-400 absolute animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold tracking-widest text-gray-200 uppercase">Connecting Stream SDK</h3>
            <p className="text-xs text-gray-500 font-medium">Handshaking with real-time video & chat channels...</p>
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