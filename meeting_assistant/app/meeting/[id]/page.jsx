"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import StreamProvider from "@/app/components/stream-provider";
import MeetingRoom from "@/app/components/meeting-room";
import { StreamTheme } from "@stream-io/video-react-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, ArrowLeft, ShieldCheck, Mic } from "lucide-react";

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const callId = params?.id;
  const normalizedCallId =
    callId && callId !== "undefined"
      ? callId
      : process.env.NEXT_PUBLIC_CALL_ID || "default_meeting_room";

  const name = searchParams.get("name") || "Guest";

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [serverTime, setServerTime] = useState(null);
  const [iatLeeway, setIatLeeway] = useState(30);
  const [error, setError] = useState(null);

  useEffect(() => {
    setUser({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
    });
  }, [name]);

  useEffect(() => {
    if (!user) return;

    fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setToken(data.token);
          if (data.server_time) setServerTime(data.server_time);
          if (data.iat_leeway) setIatLeeway(data.iat_leeway);
        } else {
          setError("No token returned from server");
        }
      })
      .catch((err) => setError(err.message));
  }, [user]);

  const handleLeave = () => {
    router.push("/");
  };

  /* ---------------- ERROR ---------------- */
  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/5 blur-[120px]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-sm md:max-w-md"
        >
          <div className="bg-[#0F1115]/80 backdrop-blur-2xl border border-red-500/20 rounded-[2rem] p-6 md:p-8 text-center shadow-2xl">
            <div className="w-12 h-12 md:w-16 h-16 bg-red-500/20 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
              <AlertCircle className="w-6 h-6 md:w-8 h-8 text-red-400" />
            </div>
            
            <h2 className="text-lg md:text-2xl font-bold mb-2">Failed to Join</h2>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-6 md:mb-8">
              {error}
            </p>

            <button
              onClick={() => router.push("/")}
              className="w-full py-3 md:py-4 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors text-sm md:text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Lobby
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---------------- LOADING / PRE-JOIN ---------------- */
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute inset-0 bg-indigo-500/10 blur-[120px] rounded-full"
        />

        <div className="relative z-10 w-full max-w-xs md:max-w-sm text-center">
          {/* Pulsing Avatar */}
          <div className="relative mx-auto mb-6 md:mb-8 w-16 h-16 md:w-24 h-24">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-indigo-500/30 rounded-[2rem] blur-xl"
            />
            <div className="relative w-full h-full rounded-[2rem] bg-gradient-to-tr from-indigo-600 to-cyan-500 border border-white/20 flex items-center justify-center text-2xl md:text-4xl font-bold shadow-2xl">
              {name.charAt(0).toUpperCase()}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
              Preparing Meeting
            </h1>
            <p className="text-gray-400 text-sm mb-8 md:mb-10">
              Joining as <span className="text-indigo-400 font-semibold">{name}</span>
            </p>

            {/* Status Steps */}
            <div className="space-y-3 text-left max-w-[200px] md:max-w-[240px] mx-auto">
              <div className="flex items-center gap-2 text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 md:w-4 h-4 text-emerald-400" />
                <span className="text-[10px] md:text-xs font-medium uppercase tracking-widest">Secure Token</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Mic className="w-3.5 h-3.5 md:w-4 h-4 text-indigo-400" />
                <span className="text-[10px] md:text-xs font-medium uppercase tracking-widest">Audio Stream</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 md:w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">Finalizing…</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Tip */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1 }}
          className="absolute bottom-6 md:bottom-12 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 text-center"
        >
          Ensure microphone access is allowed
        </motion.p>
      </div>
    );
  }

  /* ---------------- MEETING ---------------- */
  return (
    <StreamProvider
      user={user}
      token={token}
      serverTime={serverTime}
      iatLeeway={iatLeeway}
    >
      <StreamTheme>
        <MeetingRoom
          callId={normalizedCallId}
          onLeave={handleLeave}
          userId={user.id}
        />
      </StreamTheme>
    </StreamProvider>
  );
}
