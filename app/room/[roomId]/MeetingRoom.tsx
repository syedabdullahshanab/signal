"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useState } from "react";
import Link from "next/link";
import { MeetingCall } from "../../../components/meeting/MeetingCall";
import { MeetingLobby, type LobbyDevices } from "../../../components/meeting/MeetingLobby";
import { ThemeToggle } from "../../../components/theme/ThemeToggle";
import { Button } from "../../../components/ui/Button";

type MeetingRoomProps = { roomId: string };

export default function MeetingRoom({ roomId }: MeetingRoomProps) {
  const [name, setName] = useState("");
  const [token, setToken] = useState<string>();
  const [serverUrl, setServerUrl] = useState<string>();
  const [devices, setDevices] = useState<LobbyDevices>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);
  const [copied, setCopied] = useState(false);

  async function joinMeeting(displayName: string, selectedDevices: LobbyDevices) {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Tell everyone who is joining.");
      return;
    }

    setError("");
    setIsLoading(true);
    setName(trimmedName);
    setDevices(selectedDevices);
    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, name: trimmedName }),
      });
      const result = await response.json() as { token?: string; url?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not join this room.");
      if (!result.token || !result.url) throw new Error("The meeting service returned an incomplete response.");
      setToken(result.token);
      setServerUrl(result.url);
      setHasLeft(false);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not join this room.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (copyError) {
      console.warn("Could not copy the meeting invite.", copyError);
      setError("Copy failed. Share the room URL from your browser instead.");
    }
  }

  if (token && serverUrl && !hasLeft) {
    return (
      <main className="meeting-shell">
        <LiveKitRoom
          data-lk-theme="default"
          token={token}
          serverUrl={serverUrl}
          connect
          audio={devices.audioInputId ? { deviceId: devices.audioInputId } : true}
          video={devices.videoInputId ? { deviceId: devices.videoInputId } : true}
          options={{
            audioCaptureDefaults: devices.audioInputId ? { deviceId: devices.audioInputId } : undefined,
            videoCaptureDefaults: devices.videoInputId ? { deviceId: devices.videoInputId } : undefined,
          }}
          onError={(livekitError) => {
            setError(livekitError.message || "Could not connect to the meeting room.");
            setHasLeft(true);
          }}
          onDisconnected={() => setHasLeft(true)}
        >
          <MeetingCall
            roomId={roomId}
            name={name}
            copied={copied}
            error={error}
            speakerDeviceId={devices.audioOutputId}
            onCopyLink={copyLink}
            onLeave={() => setHasLeft(true)}
          />
          <RoomAudioRenderer />
          <StartAudio label="Enable audio" />
        </LiveKitRoom>
      </main>
    );
  }

  if (hasLeft) {
    return (
      <main className="left-shell">
        <header className="app-header">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">S</span><span>signal</span>
          </Link>
          <ThemeToggle />
        </header>
        <section className="left-card" aria-labelledby="left-title">
          <div className="left-mark"><Check size={23} /></div>
          <p className="eyebrow">Until next time</p>
          <h1 id="left-title">You left<br /><em>the room.</em></h1>
          <p>Your meeting is still here if you’d like to rejoin.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button
            className="join-button"
            variant="solid"
            disabled={isLoading}
            onClick={() => void joinMeeting(name, devices)}
          >
            <span>{isLoading ? "Reconnecting…" : "Rejoin meeting"}</span>
            <ArrowRight size={17} />
          </Button>
          <Link className="back-home" href="/"><ArrowLeft size={15} /> Back to Signal</Link>
        </section>
      </main>
    );
  }

  return (
    <MeetingLobby
      roomId={roomId}
      isLoading={isLoading}
      error={error}
      onJoin={(displayName, selectedDevices) => void joinMeeting(displayName, selectedDevices)}
    />
  );
}
