"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Mic, Shield, Users, ArrowRight, Sparkles, User, LogOut, LogIn, Calendar, Loader2 } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleJoin = () => {
    const name = username.trim() === "" ? (session?.user?.name || "Guest") : username.trim();
    const meetingId = process.env.NEXT_PUBLIC_CALL_ID || "default_meeting_room";
    router.push(`/meeting/${meetingId}?name=${encodeURIComponent(name)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Header with User Info */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20">
        {session ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300"
            >
              {session.user?.image ? (
                <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="text-sm font-medium text-gray-300">Profile</span>
            </button>
            <button
              onClick={() => signOut()}
              className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-red-400 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300"
          >
            <LogIn className="w-4 h-4" />
            <span className="text-sm font-medium text-gray-300">Sign in with Google</span>
          </button>
        )}
      </div>

      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Futuristic Grid */}
        <div 
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 90%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 90%)',
          }}
        />

        {/* Drifting Nebula Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            x: [0, 40, 0],
            y: [0, -30, 0],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[15%] -left-[15%] w-[70%] md:w-[50%] h-[70%] md:h-[50%] bg-indigo-600/20 rounded-full blur-[130px]"
        />
        
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, 40, 0],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[15%] -right-[15%] w-[80%] md:w-[60%] h-[80%] md:h-[60%] bg-cyan-600/15 rounded-full blur-[160px]"
        />

        <motion.div
          animate={{
            scale: [0.7, 1.1, 0.7],
            x: [0, -20, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-[25%] right-[20%] w-[35%] h-[35%] bg-purple-600/10 rounded-full blur-[120px]"
        />

        {/* Grainy Noise Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center py-8 md:py-0">
        {/* Left Side: Branding & Info */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 md:space-y-8"
        >
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 md:w-12 h-12 md:rounded-2xl rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
              <Video className="w-5 h-5 md:w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              FUTURE-MEET
            </h2>
          </div>

          <div className="space-y-3 md:space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Next-Gen <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
                AI Meetings
              </span>
            </h1>
            <p className="text-base md:text-lg text-gray-400 max-w-md leading-relaxed">
              Experience crystalline audio and real-time AI transcription in a
              seamless, modern workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {[
              { icon: Shield, label: "Secure", color: "text-emerald-400" },
              { icon: Sparkles, label: "AI Powered", color: "text-indigo-400" },
              { icon: Calendar, label: "Saved Meetings", color: "text-cyan-400" },
              { icon: Mic, label: "Live Captions", color: "text-amber-400" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <item.icon className={`w-3.5 h-3.5 md:w-4 h-4 ${item.color}`} />
                <span className="text-xs md:text-sm font-medium text-gray-300">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: Join Card or Login Prompt */}
        {session ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative group w-full"
          >
            {/* Card Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-[2rem] md:rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <div className="relative bg-[#0F1115]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 lg:p-10 shadow-2xl">
              <div className="space-y-5 md:space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Live Meeting Ready
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold">Ready to join?</h3>
                  <p className="text-gray-400 text-sm">
                    Welcome back, {session.user?.name?.split(' ')[0] || 'User'}!
                  </p>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                      <Users className="h-4 w-4 md:h-5 md:w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={session.user?.name || "Display name"}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 md:py-4 pl-10 md:pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300 text-sm md:text-base"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onHoverStart={() => setIsHovered(true)}
                    onHoverEnd={() => setIsHovered(false)}
                    onClick={handleJoin}
                    className="w-full group relative overflow-hidden bg-white text-black font-bold py-3 md:py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  >
                    <span className="relative z-10">Join Now</span>
                    <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 relative z-10 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {isHovered && (
                      <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 flex items-center justify-center text-white">
                        Join Now <ArrowRight className="w-4 h-4 md:w-5 md:h-5 translate-x-1" />
                      </span>
                    )}
                  </motion.button>
                </div>

                <div className="pt-3 md:pt-4 flex items-center justify-center gap-4 md:gap-6 text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-wider">Audio Enabled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-wider">Encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative group w-full"
          >
            <div className="relative bg-[#0F1115]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 lg:p-10 shadow-2xl text-center">
              <div className="space-y-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-[2rem] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2">Welcome to FUTURE-MEET</h3>
                  <p className="text-gray-400 text-sm">
                    Sign in to join meetings and save your meeting history
                  </p>
                </div>
                <button
                  onClick={() => signIn("google")}
                  className="w-full bg-white text-black font-bold py-3 md:py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                >
                  <span>Sign in with Google</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-4 md:bottom-8 text-[10px] md:text-[11px] text-gray-600 font-medium tracking-[0.2em] uppercase text-center"
      >
        Powered by Stream SDK & Next.js
      </motion.div>
    </div>
  );
}
