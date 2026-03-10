"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    const name = username.trim() === "" ? "Guest" : username.trim();
    // Use the CALL_ID from .env, fallback to default if missing
    const meetingId = process.env.NEXT_PUBLIC_CALL_ID || "default_meeting_room";
    router.push(`/meeting/${meetingId}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E1117] text-gray-100 relative overflow-hidden">

      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.10),transparent_45%)]" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="rounded-2xl bg-[#151A23] border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.45)] p-8">

          {/* Avatar */}
          <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-semibold shadow-inner">
            👋
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold tracking-tight text-center">
            Join the meeting
          </h1>
          <p className="mt-1 text-sm text-gray-400 text-center">
            Enter your name to continue
          </p>

          {/* Input */}
          <div className="mt-6">
            <input
              type="text"
              placeholder="Your name"
              onChange={(e) => setUsername(e.target.value)}
              className="
                w-full px-4 py-3 rounded-xl
                bg-[#0E1117]
                border border-white/10
                text-gray-100
                placeholder-gray-500
                focus:outline-none
                focus:ring-2 focus:ring-indigo-500/50
                transition
              "
            />
          </div>

          {/* Button */}
          <button
            onClick={handleJoin}
            className="
              mt-6 w-full py-3 rounded-xl
              bg-indigo-500 hover:bg-indigo-600
              text-white font-medium
              transition
              shadow-[0_10px_25px_rgba(99,102,241,0.35)]
            "
          >
            Join Meeting
          </button>

          {/* Footer */}
          <p className="mt-6 text-[11px] text-gray-500 text-center">
            You’ll join with microphone access enabled
          </p>
        </div>
      </div>
    </div>
  );
}
