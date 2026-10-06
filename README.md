# Signal

Signal is a link-shareable video meeting app built with Next.js and LiveKit Cloud. People can enter a display name, join a room, use camera and microphone, and chat during the meeting.

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

`LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are server-only credentials used by `/api/token`. `NEXT_PUBLIC_LIVEKIT_URL` is the public LiveKit WebSocket URL and is safe to expose to the browser.

## Checks

```bash
npm run lint
npm run build
```

Chat is realtime and ephemeral in this first version. Accounts, recording, moderation, persistent chat history, and screen sharing are intentionally not included.