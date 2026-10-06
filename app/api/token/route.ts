import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    const missing = [
      !apiKey && "LIVEKIT_API_KEY",
      !apiSecret && "LIVEKIT_API_SECRET",
      !livekitUrl && "NEXT_PUBLIC_LIVEKIT_URL",
    ].filter(Boolean);

    return NextResponse.json({
      error: `Meeting service setup is incomplete. Add ${missing.join(", ")} to .env.local using your LiveKit Cloud project settings, then restart the server.`,
    }, { status: 503 });
  }

  let body: { room?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const room = typeof body.room === "string" ? body.room.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!room || room.length > 48 || !/^[a-zA-Z0-9_-]+$/.test(room)) {
    return NextResponse.json({ error: "Enter a valid room code." }, { status: 400 });
  }

  if (!name || name.length > 40) {
    return NextResponse.json({ error: "Enter a name under 40 characters." }, { status: 400 });
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: `${name}-${crypto.randomUUID().slice(0, 8)}`,
    name,
    ttl: "2h",
  });

  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({ token: await token.toJwt(), url: livekitUrl });
}