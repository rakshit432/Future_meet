"use client";

import { useEffect, useState, useRef } from "react";
import {
  StreamCall,
  useStreamVideoClient,
  SpeakerLayout,
  CallControls,
  StreamTheme,
} from "@stream-io/video-react-sdk";

import { TranscriptPanel } from "@/app/components/transcript";
import "@stream-io/video-react-sdk/dist/css/styles.css";

export default function MeetingRoom({ callId, onLeave, userId }) {
  const client = useStreamVideoClient();
  const [call, setCall] = useState(null);
  const [error, setError] = useState(null);

  const normalizedCallId =
    callId && callId !== "undefined"
      ? callId
      : process.env.NEXT_PUBLIC_CALL_ID || "default_meeting_room";

  const joinedRef = useRef(false);
  const leavingRef = useRef(false);
  const callType = "default";

  useEffect(() => {
    if (!client) return;
    if (joinedRef.current) return;
    joinedRef.current = true;

    const init = async () => {
      try {
        const myCall = client.call(callType, normalizedCallId);

        await myCall.getOrCreate({
          data: {
            created_by_id: userId,
            members: [{ user_id: userId, role: "call_member" }],
          },
        });

        await myCall.join();
        await myCall.startClosedCaptions({ language: "en" });

        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          if (mediaStream && typeof myCall.publishAudioStream === "function") {
            await myCall.publishAudioStream(mediaStream);
          }
        } catch {}

        myCall.on("call.session_ended", () => onLeave?.());
        setCall(myCall);
      } catch (err) {
        setError(err.message);
      }
    };

    init();

    return () => {
      if (call && !leavingRef.current) {
        leavingRef.current = true;
        call.stopClosedCaptions().catch(() => {});
        call.leave().catch(() => {});
      }
    };
  }, [client, normalizedCallId, userId]);

  const handleLeaveClick = async () => {
    if (leavingRef.current) return onLeave?.();
    leavingRef.current = true;

    try {
      if (call) {
        await call.stopClosedCaptions().catch(() => {});
        await call.leave().catch(() => {});
      }
    } finally {
      onLeave?.();
    }
  };

  /* -------------------- ERROR -------------------- */
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0F19] text-white">
        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4">
          <p className="text-sm text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  /* -------------------- LOADING -------------------- */
  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0F19] text-white">
        <div className="h-14 w-14 rounded-full border-2 border-white/10 border-t-indigo-500 animate-spin" />
        <p className="mt-4 text-sm text-gray-400">
          Joining secure meeting…
        </p>
      </div>
    );
  }

  /* -------------------- UI -------------------- */
  return (
    <StreamTheme>
      <StreamCall call={call}>
        <div className="min-h-screen bg-[#0B0F19] text-gray-100 relative">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-cyan-500/5 to-transparent pointer-events-none" />

          <div className="relative max-w-[1400px] mx-auto px-6 py-6 h-screen">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 h-full">

              {/* LEFT: VIDEO */}
              <div className="flex flex-col gap-4">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                  <div>
                    <h1 className="text-lg font-medium tracking-tight">
                      Meeting Room
                    </h1>
                    <p className="text-xs text-gray-400">
                      Live • Captions Enabled
                    </p>
                  </div>

                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    Connected
                  </span>
                </div>

                {/* Video Area */}
                <div className="flex-1 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                  <SpeakerLayout />
                </div>

                {/* Controls */}
                <div className="flex justify-center pb-4">
                  <div className="rounded-full bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 shadow-xl">
                    <CallControls onLeave={handleLeaveClick} />
                  </div>
                </div>
              </div>

              {/* RIGHT: TRANSCRIPT */}
              <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h2 className="text-sm font-medium tracking-wide">
                    Live Transcript
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <TranscriptPanel />
                </div>
              </div>

            </div>
          </div>
        </div>
      </StreamCall>
    </StreamTheme>
  );
}
