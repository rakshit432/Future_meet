/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import StreamProvider from "@/app/components/stream-provider";
import MeetingRoom from "@/app/components/meeting-room";
import { StreamTheme } from "@stream-io/video-react-sdk";

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const callId = params?.id;
  const normalizedCallId =
    callId && callId !== "undefined"
      ? callId
      : process.env.NEXT_PUBLIC_CALL_ID || "default_meeting_room";

  const name = searchParams.get("name") || "anonymous";

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
          setError("No token returned");
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
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-gray-100">
        <div className="relative w-full max-w-md p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-red-500/10 blur-2xl" />

          <div className="relative text-center">
            <h2 className="text-lg font-semibold text-red-400 mb-2">
              Unable to join meeting
            </h2>
            <p className="text-sm text-gray-400 mb-6">{error}</p>

            <button
              onClick={() => router.push("/")}
              className="w-full py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 transition text-white font-medium"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- LOADING / PRE-JOIN ---------------- */
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex items-center justify-center relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-cyan-500/10 to-transparent blur-3xl" />

        <div className="relative z-10 max-w-md w-full text-center px-6">
          {/* Avatar */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-semibold shadow-xl">
            {name.charAt(0).toUpperCase()}
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            Preparing your meeting
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Joining as <span className="text-gray-200">{name}</span>
          </p>

          {/* Loader */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-white/10 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl" />
            </div>
            <p className="text-xs text-gray-400">
              Establishing secure connection…
            </p>
          </div>

          {/* Footer hint */}
          <p className="mt-10 text-[11px] text-gray-500">
            Please allow microphone permissions when prompted
          </p>
        </div>
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
