"use client";

import { useState, useEffect, useRef } from "react";
import { StreamVideoClient } from "@stream-io/video-react-sdk";
import { StreamChat } from "stream-chat";

export function useStreamClients({ apiKey, user, token: initialToken, serverTime: initialServerTime = null, iatLeeway: initialIatLeeway = 120 }) {
  const [videoClient, setVideoClient] = useState(null);
  const [chatClient, setChatClient] = useState(null);
  const tokenRef = useRef(initialToken);
  const serverTimeOffsetRef = useRef(initialServerTime ? initialServerTime - Math.floor(Date.now() / 1000) : 0);
  const iatLeewayRef = useRef(initialIatLeeway);

  useEffect(() => {
    tokenRef.current = initialToken;
  }, [initialToken]);
  // Update server time offset and leeway when props change
  useEffect(() => {
    if (initialServerTime) {
      const now = Math.floor(Date.now() / 1000);
      serverTimeOffsetRef.current = initialServerTime - now;
    }
    if (initialIatLeeway) {
      iatLeewayRef.current = initialIatLeeway;
    }
  }, [initialServerTime, initialIatLeeway]);

  useEffect(() => {
    if (!user || !apiKey) return;

    let isMounted = true;

    const decodeJwt = (jwt) => {
      try {
        const payload = jwt.split(".")[1];
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        return JSON.parse(json);
      } catch (e) {
        return null;
      }
    };

    const fetchTokenFromServer = async () => {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.token) {
        tokenRef.current = data.token;
        // Debug logs: print token, payload, server time and leeway
        try {
          const parts = data.token.split('.');
          let payload = null;
          if (parts.length === 3) {
            const b = parts[1];
            const padded = b.padEnd(b.length + (4 - (b.length % 4)) % 4, '=');
            const decoded = decodeURIComponent(atob(padded).split("").map(function(c){
              return '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            payload = JSON.parse(decoded);
          }
          console.info('[useStreamClients] fetched token', { token: data.token, token_payload: payload, server_time: data.server_time, iat_leeway: data.iat_leeway });
        } catch (e) {
          console.info('[useStreamClients] fetched token (could not decode payload)');
        }
        const now = Math.floor(Date.now() / 1000);
        if (data.server_time) {
          serverTimeOffsetRef.current = data.server_time - now;
        }
        if (data.iat_leeway) {
          iatLeewayRef.current = data.iat_leeway;
        }
        return data.token;
      }
      throw new Error("No token returned from server");
    };

    const tokenProvider = async () => {
      const current = tokenRef.current;
      if (!current) return await fetchTokenFromServer();

      const payload = decodeJwt(current);
      const now = Math.floor(Date.now() / 1000);
      const leeway = iatLeewayRef.current || 30; // seconds
      const serverAlignedNow = now + (serverTimeOffsetRef.current || 0);

      if (!payload) return await fetchTokenFromServer();

      if (payload.exp && payload.exp <= serverAlignedNow + leeway) {
        return await fetchTokenFromServer();
      }

      if (payload.iat && payload.iat > serverAlignedNow + leeway) {
        // token appears to be issued in the future relative to server time — refresh
        return await fetchTokenFromServer();
      }

      return current;
    };

    const initClients = async () => {
      try {
        // Prefer reusing an existing StreamVideoClient instance if available
        let myVideoClient;
        if (typeof StreamVideoClient.getOrCreateInstance === "function") {
          myVideoClient = StreamVideoClient.getOrCreateInstance({ apiKey, user, tokenProvider });
        } else {
          myVideoClient = new StreamVideoClient({ apiKey, user, tokenProvider });
        }

        const myChatClient = StreamChat.getInstance(apiKey);
        const chatToken = await tokenProvider();

        // Avoid consecutive connectUser calls in dev double-invoke scenarios
        const alreadyConnected = myChatClient?.user?.id || myChatClient?.userID;
        if (!alreadyConnected) {
          await myChatClient.connectUser(user, chatToken);
        } else {
          // If connected as a different user, reconnect
          if (myChatClient.user && myChatClient.user.id !== user.id) {
            await myChatClient.disconnectUser?.();
            await myChatClient.connectUser(user, chatToken);
          }
        }

        if (isMounted) {
          setVideoClient(myVideoClient);
          setChatClient(myChatClient);
        }
      } catch (error) {
        console.error("Client initialization error:", error);
      }
    };

    initClients();

    return () => {
      isMounted = false;
      (async () => {
        try {
          if (chatClient) {
            await chatClient.disconnectUser?.();
            await chatClient.disconnect?.();
          }
        } catch (e) {
          // ignore cleanup errors
        }

        try {
          if (videoClient) {
            await videoClient.disconnect?.();
          }
        } catch (e) {
          // ignore cleanup errors
        }
      })();
    };
  }, [apiKey, user]);

  return { videoClient, chatClient };
}