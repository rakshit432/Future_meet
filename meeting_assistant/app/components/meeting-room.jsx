"use client";

import { useEffect, useState, useRef } from "react";
import {
  StreamCall,
  useStreamVideoClient,
  SpeakerLayout,
  PaginatedGridLayout,
  CallControls,
  StreamTheme,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  Video as VideoIcon, 
  LogOut, 
  Settings, 
  Users, 
  Layout, 
  Info,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  CircleDot,
  MessageSquare,
  Save,
  Check
} from "lucide-react";
import { useSession } from "next-auth/react";

import { TranscriptPanel } from "@/app/components/transcript";
import "@stream-io/video-react-sdk/dist/css/styles.css";

function MeetingHeader({ callId, showTranscript, setShowTranscript, layout, setLayout, onSaveMeeting, isSaving, isSaved, saveError }) {
  const { useParticipantCount, useParticipants } = useCallStateHooks();
  const participantCount = useParticipantCount();
  const participants = useParticipants();
  const { data: session } = useSession();

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl"
    >
      <div className="flex items-center gap-2 md:gap-4">
        <div className="w-8 h-8 md:w-10 h-10 md:rounded-xl rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <VideoIcon className="w-4 h-4 md:w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold tracking-tight text-white">
              <span className="hidden sm:inline">Room: </span><span className="text-indigo-400 font-mono uppercase text-xs sm:text-sm">{callId}</span>
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CircleDot className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 text-emerald-400 fill-emerald-400 animate-pulse" />
              <span className="text-[8px] md:text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
          </div>
          <p className="hidden md:block text-[10px] md:text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="w-2 h-2 md:w-3 md:h-3 text-indigo-400" />
            End-to-end encrypted • AI Captions active
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Layout Switcher */}
        <div className="hidden md:flex items-center p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => setLayout("grid")}
            className={`p-1.5 rounded-lg transition-all ${
              layout === "grid"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-gray-400 hover:text-gray-200"
            }`}
            title="Grid View"
          >
            <Layout className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLayout("speaker")}
            className={`p-1.5 rounded-lg transition-all ${
              layout === "speaker"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-gray-400 hover:text-gray-200"
            }`}
            title="Speaker View"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Header Transcript Toggle */}
        <button 
          onClick={() => setShowTranscript(!showTranscript)}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-gray-200">Transcript</span>
        </button>

        {/* Save Meeting Button */}
        {session && (
          <button 
            onClick={onSaveMeeting}
            disabled={isSaving || isSaved}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Save className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : isSaved ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-xs font-semibold text-gray-200">
              {isSaved ? 'Saved' : 'Save'}
            </span>
          </button>
        )}
        
        <div className="hidden md:flex items-center gap-3 px-2.5 md:px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <Users className="w-3 h-3 md:w-3.5 h-3.5 text-gray-400" />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-semibold text-gray-300">
                {participantCount} Participant{participantCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <button className="p-1.5 md:p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <Settings className="w-3.5 h-3.5 md:w-4 h-4 text-gray-400" />
        </button>
      </div>
    </motion.div>
  );
}

export default function MeetingRoom({ callId, onLeave, userId }) {
  const client = useStreamVideoClient();
  const [call, setCall] = useState(null);
  const [error, setError] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [layout, setLayout] = useState("grid"); // "grid" or "speaker"
  const [mobileTranscriptOpen, setMobileTranscriptOpen] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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

        await myCall.join({
          create: true,
        });
        
        // Start closed captions
        try {
          await myCall.startClosedCaptions({ language: "en" });
        } catch (e) {
          console.warn("Failed to start closed captions:", e);
        }
        
        // Start transcription
        try {
          await myCall.startTranscription();
        } catch (e) {
          console.warn("Failed to start transcription:", e);
        }

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

  const [saveError, setSaveError] = useState(null);

  const handleSaveMeeting = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // Generate better key points from transcript
      const keyPoints = transcript
        .map(t => t.text)
        .filter(t => {
          const hasActionWords = /action|todo|need|should|must|important|key|decided|agreed|next step/i.test(t);
          const isLongEnough = t.length > 30;
          const isNotDuplicate = !t.toLowerCase().includes("i don't know") && !t.toLowerCase().includes("wait");
          return hasActionWords || (isLongEnough && isNotDuplicate);
        })
        .slice(-15); // Keep up to 15 key points

      // Generate a simple summary
      const summary = transcript.length > 0 
        ? `This meeting covered ${transcript.length} topics with participants speaking. Key points included ${keyPoints.slice(0,3).map(kp => kp.substring(0, 60)).join(", ")}...` 
        : "Meeting transcript available.";

      const transcriptText = transcript.map(t => `${t.speaker || 'Unknown'} [${t.timestamp}]: ${t.text}`).join('\n');

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: normalizedCallId,
          title: `Meeting on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
          keyPoints,
          transcript: transcriptText,
          summary
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save meeting');
      }

      console.log('Meeting saved successfully:', result);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save meeting:', e);
      setSaveError(e.message);
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl bg-red-500/10 backdrop-blur-xl border border-red-500/20 px-6 md:px-8 py-6 md:py-8 text-center max-w-sm w-full"
        >
          <div className="w-10 h-10 md:w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Info className="w-5 h-5 md:w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-sm md:text-base text-gray-400 leading-relaxed mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2.5 md:py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors text-sm md:text-base"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-4">
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-16 w-16 md:h-20 md:w-20 rounded-full border-2 border-white/5 border-t-indigo-500"
          />
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
        </div>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 md:mt-8 text-sm md:text-base font-medium text-gray-400 tracking-widest uppercase"
        >
          Syncing with server…
        </motion.p>
      </div>
    );
  }

  return (
    <StreamTheme>
      <StreamCall call={call}>
        <div className="h-screen bg-[#050505] text-gray-100 relative overflow-hidden flex flex-col p-3 md:p-4 lg:p-6 gap-3 md:gap-4">
          {/* Background Glows */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-600/10 rounded-full blur-[120px]" />
          </div>

          <MeetingHeader 
            callId={normalizedCallId} 
            showTranscript={showTranscript} 
            setShowTranscript={setShowTranscript} 
            layout={layout}
            setLayout={setLayout}
            onSaveMeeting={handleSaveMeeting}
            isSaving={isSaving}
            isSaved={isSaved}
            saveError={saveError}
          />

          {/* Save Error Notification */}
          <AnimatePresence>
            {saveError && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span>{saveError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 min-h-0 relative flex flex-col lg:flex-row gap-3 md:gap-6">
            {/* VIDEO AREA */}
            <div className="flex-1 flex flex-col gap-3 md:gap-4 min-h-0">
              <motion.div 
                layout
                className="flex-1 rounded-2xl md:rounded-3xl bg-black/60 backdrop-blur-3xl border border-white/10 overflow-hidden shadow-2xl relative"
              >
                {layout === "grid" ? (
                  <PaginatedGridLayout />
                ) : (
                  <SpeakerLayout participantsBarPosition="bottom" />
                )}
                
                {/* Desktop Transcript Toggle */}
                <button 
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="hidden lg:flex absolute top-4 right-4 p-3 rounded-2xl bg-black/70 border border-white/20 backdrop-blur-xl shadow-xl hover:bg-black/90 transition-all z-10"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <ChevronRight className={`w-4 h-4 text-white transition-transform duration-300 ${showTranscript ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              </motion.div>

              {/* CONTROLS */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex justify-center pb-1"
              >
                <div className="px-4 md:px-8 py-2.5 md:py-3 rounded-[2rem] bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-2">
                  <CallControls onLeave={handleLeaveClick} />
                </div>
              </motion.div>
            </div>

            {/* DESKTOP TRANSCRIPT SIDEBAR */}
            <AnimatePresence>
              {showTranscript && (
                <motion.div 
                  initial={{ x: 50, opacity: 0, width: 0 }}
                  animate={{ x: 0, opacity: 1, width: '100%', maxWidth: '320px' }}
                  exit={{ x: 50, opacity: 0, width: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="hidden lg:flex flex-col rounded-2xl md:rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex-shrink-0"
                >
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                      <Layout className="w-3.5 h-3.5 text-indigo-400" />
                      <h2 className="text-xs font-bold tracking-wider uppercase text-gray-200">
                        Live Transcript
                      </h2>
                    </div>
                    <button onClick={() => setShowTranscript(false)} className="p-1 rounded-full hover:bg-white/10">
                      <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <TranscriptPanel onTranscriptUpdate={setTranscript} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* MOBILE TRANSCRIPT TOGGLE & PANEL */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileTranscriptOpen(!mobileTranscriptOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">Live Transcript</span>
              </div>
              {mobileTranscriptOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            <AnimatePresence>
              {mobileTranscriptOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '250px', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl"
                >
                  <div className="h-full overflow-hidden">
                    <TranscriptPanel onTranscriptUpdate={setTranscript} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </StreamCall>
    </StreamTheme>
  );
}
