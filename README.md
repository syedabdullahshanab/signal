# Signal

Signal is a link-shareable video meeting app built with Next.js and LiveKit Cloud. The responsive meeting experience includes participant and screen-share layouts, device controls, chat and participant drawers, reactions, and persisted light/dark themes.

## Local setup

1. Create a project at [LiveKit Cloud](https://cloud.livekit.io/) and copy its API key, API secret, and WebSocket URL.
2. Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

3. Fill in the three LiveKit values in `.env.local`.
4. Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, create a room, and send the room URL to another browser or device. Camera and microphone access works on localhost during development; deployed environments must use HTTPS.

## Environment variables

`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` are server-only values used by `/api/token`. For existing setups, `NEXT_PUBLIC_LIVEKIT_URL` is also accepted as a fallback.

## Checks

```bash
npm run lint
npm run build
```

Chat and reactions are realtime and ephemeral. Accounts, recording, moderation, and persistent chat history are not included.