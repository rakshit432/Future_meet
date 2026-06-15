"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import MeetingRoom from "../../components/meeting-room";
import StreamProvider from "../../components/stream-provider";
import { Video } from "lucide-react";
import { motion } from "framer-motion";

export default function LiveMeetingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    // Auto-detect local development to ping local python server
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      backendUrl = "http://127.0.0.1:10000";
    }
    
    if (backendUrl && id && session?.user) {
      const userName = encodeURIComponent(
        session.user.name || session.user.email || session.user.id || ""
      );
      const uid = encodeURIComponent(session.user.id || "");
      console.log(`Pinging backend to join call ${id} as ${session.user.name}`);
      fetch(`${backendUrl}/join?call_id=${id}&user_name=${userName}&user_id=${uid}`).catch((err) => {
        console.warn("Failed to ping backend agent:", err);
      });
    }
  }, [id]);

  if (status === "loading" || !id || id === "undefined") {
    return (
      <div className="min-h-screen bg-[#020203] text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border border-white/[0.06] border-t-indigo-500 border-r-indigo-500"
            />
            <Video className="w-5 h-5 text-indigo-400 absolute animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold tracking-widest text-gray-200 uppercase">Verifying Session</h3>
            <p className="text-xs text-gray-500 font-medium">Preparing secure connection credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !session.user || !session.user.id) return null;

  const streamUser = {
    id: session.user.id,
    name: session.user.name || session.user.email || session.user.id,
    image: session.user.image || undefined,
  };

  return (
    <StreamProvider user={streamUser}>
      <MeetingRoom callId={id} userId={session.user.id} onLeave={() => router.push("/profile")} />
    </StreamProvider>
  );
}