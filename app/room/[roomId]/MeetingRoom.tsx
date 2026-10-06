"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type MeetingRoomProps = { roomId: string };

export default function MeetingRoom({ roomId }: MeetingRoomProps) {
  const [name, setName] = useState("");
  const [token, setToken] = useState<string>();
  const [serverUrl, setServerUrl] = useState<string>();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [stream, setStream] = useState<MediaStream>();
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    let active = true;

    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream((currentStream) => {
          if (currentStream) {
            currentStream.getTracks().forEach((track) => track.stop());
          }
          return mediaStream;
        });
      })
      .catch(() => {
        if (active) {
          setPreviewError("Camera or microphone access is unavailable. You can still join and enable them later.");
        }
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  async function joinMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Tell everyone who is joining.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, name: trimmedName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not join this room.");
      setToken(result.token);
      setServerUrl(result.url);
      stream?.getTracks().forEach((track) => track.stop());
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
    } catch {
      setError("Copy failed. Share the room URL from your browser instead.");
    }
  }

  if (token && serverUrl) {
    return (
      <main className="meeting-shell">
        <header className="meeting-topbar">
          <Link className="brand" href="/"><span className="brand-mark">S</span><span>signal</span></Link>
          <div className="room-info"><span>Room</span><strong>{roomId}</strong></div>
          <button className="share-button" onClick={copyLink}>{copied ? "Link copied" : "Copy invite link"}</button>
        </header>
        <div className="conference-wrap">
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect
            audio
            video
            onError={(livekitError) => {
              const message = livekitError instanceof Error
                ? livekitError.message
                : "Could not connect to the meeting room.";
              setError(message);
              setToken(undefined);
            }}
            onDisconnected={() => {
              setError("The meeting disconnected. Check your LiveKit URL and credentials, then try again.");
              setToken(undefined);
            }}
          >
            <VideoConference />
            <RoomAudioRenderer />
            <StartAudio label="Enable audio" />
          </LiveKitRoom>
        </div>
      </main>
    );
  }

  return (
    <main className="prejoin-shell">
      <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">S</span><span>signal</span></Link><span className="topbar-note">Private room / {roomId}</span></header>
      <section className="prejoin-layout">
        <div className="prejoin-copy"><p className="eyebrow"><span className="status-dot" /> You are invited</p><h1>Ready when<br /><em>you are.</em></h1><p>Choose your name, check your camera, and step into the conversation.</p></div>
        <div className="prejoin-card">
          <div className="preview-frame">
            {stream ? <video ref={videoRef} autoPlay muted playsInline /> : <div className="preview-placeholder"><span>Camera preview</span><small>{previewError ? "No camera detected" : "Requesting access..."}</small></div>}
            <span className="preview-room">{roomId}</span>
          </div>
          <form className="prejoin-form" onSubmit={joinMeeting}>
            <label className="field-label" htmlFor="display-name">Your name</label>
            <input id="display-name" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="How should we call you?" maxLength={40} autoFocus />
            {previewError && <p className="form-hint">{previewError}</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={isLoading}><span>{isLoading ? "Connecting..." : "Join meeting"}</span><span className="button-arrow">-&gt;</span></button>
          </form>
          <p className="privacy-note"><span>*</span> By joining, your camera and microphone stay under your control.</p>
        </div>
      </section>
    </main>
  );
}