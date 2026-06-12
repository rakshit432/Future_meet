"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import MeetingRoom from "../../components/meeting-room";
import StreamProvider from "../../components/stream-provider";
import { Loader2 } from "lucide-react";

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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      console.log("Pinging backend to wake up the agent...");
      fetch(backendUrl).catch((err) => {
        console.warn("Failed to ping backend agent:", err);
      });
    }
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
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