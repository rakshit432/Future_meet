import { StreamClient } from "@stream-io/node-sdk";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

export async function POST(request) {
  try {
    const { userId, userName, userImage } = await request.json();

    if (!apiKey || !apiSecret) {
      return Response.json(
        { error: "Missing API credentials" },
        { status: 500 }
      );
    }

    const serverClient = new StreamClient(apiKey, apiSecret);

    // Upsert the user with their real display name (not just the ID)
    const newUser = {
      id: userId,
      role: "admin",
      name: userName || userId,           // Use real name, fall back to ID
      image: userImage || undefined,       // Set profile picture if available
    };
    await serverClient.upsertUsers([newUser]);

    // Generate token using server SDK helper, set iat in the past to avoid clock skew issues
    const validity = 24 * 60 * 60;
    const iatLeeway = 120; // seconds leeway for token iat
    const iat = Math.floor(Date.now() / 1000) - iatLeeway; // issue in the past
    let token;
    try {
      token = serverClient.generateUserToken({
        user_id: userId,
        validity_in_seconds: validity,
        iat,
      });
    } catch (e) {
      // fallback to createToken if generateUserToken is not supported
      token = serverClient.createToken(userId);
    }

    // Log a masked token for debugging
    try {
      console.info("Generated token (masked):", token.slice(0, 8) + "..." + token.slice(-8));
    } catch (e) {
      console.info("Generated token for user", userId);
    }

    // Return token plus server time and recommended leeway to help clients
    const serverTime = Math.floor(Date.now() / 1000);

    // Decode payload for debugging (do not expose in production)
    let tokenPayload = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = parts[1];
        const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
        const decoded = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        tokenPayload = JSON.parse(decoded);
      }
    } catch (e) {
      // ignore
    }

    try {
      console.info('Token payload:', tokenPayload);
    } catch (e) {}

    return Response.json({ token, server_time: serverTime, iat_leeway: iatLeeway, token_payload: tokenPayload });
  } catch (error) {
    console.error("Token generation error:", error);
    return Response.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}