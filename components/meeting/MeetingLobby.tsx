"use client";

import { ArrowRight, Camera, CameraOff, Mic, MicOff, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Button } from "../ui/Button";

export type LobbyDevices = {
  audioInputId?: string;
  videoInputId?: string;
  audioOutputId?: string;
};

type MeetingLobbyProps = {
  roomId: string;
  isLoading: boolean;
  error: string;
  onJoin: (name: string, devices: LobbyDevices) => void;
};

type DeviceList = {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
};

function AudioLevelMeter({ stream, enabled }: { stream?: MediaStream; enabled: boolean }) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const audioTrack = stream?.getAudioTracks()[0];
    if (!audioTrack || !enabled) return;

    const context = new AudioContext();
    const source = context.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = context.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    let lastUpdate = 0;
    let active = true;

    const updateLevel = (timestamp: number) => {
      if (!active) return;
      analyser.getByteFrequencyData(samples);
      if (timestamp - lastUpdate >= 80) {
        const average = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
        setLevel(Math.min(1, average / 90));
        lastUpdate = timestamp;
      }
      frame = requestAnimationFrame(updateLevel);
    };

    void context.resume().then(() => {
      frame = requestAnimationFrame(updateLevel);
    }).catch((meterError: unknown) => {
      console.warn("Audio level meter could not start.", meterError);
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
      void context.close();
    };
  }, [enabled, stream]);

  const visibleLevel = enabled ? level : 0;
  return (
    <div
      className="audio-meter"
      role="meter"
      aria-label="Microphone input level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(visibleLevel * 100)}
    >
      {Array.from({ length: 20 }, (_, index) => (
        <span
          key={index}
          className={index / 20 < visibleLevel ? "audio-meter-bar is-active" : "audio-meter-bar"}
        />
      ))}
    </div>
  );
}

export function MeetingLobby({ roomId, isLoading, error, onJoin }: MeetingLobbyProps) {
  const [name, setName] = useState("");
  const [stream, setStream] = useState<MediaStream>();
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [devices, setDevices] = useState<DeviceList>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });
  const [deviceIds, setDeviceIds] = useState<LobbyDevices>({});
  const [previewError, setPreviewError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Media devices are unavailable.");
        return navigator.mediaDevices.getUserMedia({
          audio: deviceIds.audioInputId ? { deviceId: { exact: deviceIds.audioInputId } } : true,
          video: deviceIds.videoInputId ? { deviceId: { exact: deviceIds.videoInputId } } : true,
        });
      })
      .then(async (mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream((current) => {
          current?.getTracks().forEach((track) => track.stop());
          streamRef.current = mediaStream;
          return mediaStream;
        });
        try {
          const listedDevices = await navigator.mediaDevices.enumerateDevices();
          if (active) {
            setDevices({
              audioInputs: listedDevices.filter((device) => device.kind === "audioinput"),
              videoInputs: listedDevices.filter((device) => device.kind === "videoinput"),
              audioOutputs: listedDevices.filter((device) => device.kind === "audiooutput"),
            });
            setPreviewError("");
          }
        } catch (enumerateError) {
          if (active) setPreviewError("Device names are unavailable. You can still join the meeting.");
          console.warn("Could not list media devices.", enumerateError);
        }
      })
      .catch((mediaError: unknown) => {
        if (active) {
          setPreviewError("Camera or microphone access is unavailable. You can still join and enable them later.");
        }
        console.info("Lobby media preview is unavailable.", mediaError);
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [deviceIds.audioInputId, deviceIds.videoInputId]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((track) => { track.enabled = microphoneEnabled; });
  }, [microphoneEnabled, stream]);

  useEffect(() => {
    stream?.getVideoTracks().forEach((track) => { track.enabled = cameraEnabled; });
  }, [cameraEnabled, stream]);

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onJoin(name.trim(), deviceIds);
  }

  return (
    <main className="lobby-shell">
      <header className="app-header lobby-header">
        <Link className="brand" href="/" aria-label="Signal home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>signal</span>
        </Link>
        <div className="lobby-header-actions">
          <span className="room-code-chip"><span className="presence-dot" /> Room {roomId}</span>
          <ThemeToggle />
        </div>
      </header>

      <section className="lobby-layout">
        <div className="lobby-copy">
          <p className="eyebrow"><span className="presence-dot" /> Your room is ready</p>
          <h1>Ready when<br /><em>you are.</em></h1>
          <p className="lobby-description">
            Take a moment to check your setup. Your camera and microphone stay under your control.
          </p>
          <div className="lobby-note"><span className="lobby-note-mark">✳</span> A quieter place for a good conversation.</div>
        </div>

        <section className="lobby-card" aria-label="Meeting setup">
          <div className="preview-frame">
            {cameraEnabled && stream?.getVideoTracks().length ? (
              <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" />
            ) : (
              <div className="preview-avatar" aria-label="Camera is off">
                <span>{name.trim().charAt(0).toUpperCase() || "S"}</span>
                <small>{cameraEnabled ? "Camera unavailable" : "Camera is off"}</small>
              </div>
            )}
            <div className="preview-status"><span className="presence-dot" /> Preview</div>
            <div className="preview-controls">
              <Button
                size="icon"
                variant={microphoneEnabled ? "outline" : "danger"}
                onClick={() => setMicrophoneEnabled((enabled) => !enabled)}
                aria-label={microphoneEnabled ? "Mute microphone" : "Unmute microphone"}
                title={microphoneEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {microphoneEnabled ? <Mic size={17} /> : <MicOff size={17} />}
              </Button>
              <Button
                size="icon"
                variant={cameraEnabled ? "outline" : "danger"}
                onClick={() => setCameraEnabled((enabled) => !enabled)}
                aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
              >
                {cameraEnabled ? <Camera size={17} /> : <CameraOff size={17} />}
              </Button>
            </div>
          </div>

          <form className="lobby-form" onSubmit={submitJoin}>
            <label htmlFor="display-name">Your name</label>
            <input
              id="display-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="How should we call you?"
              maxLength={40}
              autoComplete="name"
              required
            />
            <div className="setup-devices">
              <label className="device-field">
                <span><Mic size={14} /> Microphone</span>
                <select
                  aria-label="Select microphone"
                  value={deviceIds.audioInputId ?? ""}
                  onChange={(event) => setDeviceIds((current) => ({ ...current, audioInputId: event.target.value || undefined }))}
                >
                  <option value="">Default microphone</option>
                  {devices.audioInputs.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Microphone ${index + 1}`}
                    </option>
                  ))}
                </select>
                <AudioLevelMeter stream={stream} enabled={microphoneEnabled} />
              </label>
              <label className="device-field">
                <span><Camera size={14} /> Camera</span>
                <select
                  aria-label="Select camera"
                  value={deviceIds.videoInputId ?? ""}
                  onChange={(event) => setDeviceIds((current) => ({ ...current, videoInputId: event.target.value || undefined }))}
                >
                  <option value="">Default camera</option>
                  {devices.videoInputs.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="device-field">
                <span><Volume2 size={14} /> Speaker</span>
                <select
                  aria-label="Select speaker"
                  value={deviceIds.audioOutputId ?? ""}
                  onChange={(event) => setDeviceIds((current) => ({ ...current, audioOutputId: event.target.value || undefined }))}
                >
                  <option value="">Default speaker</option>
                  {devices.audioOutputs.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Speaker ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {previewError && <p className="form-hint" role="status">{previewError}</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button className="join-button" variant="solid" type="submit" disabled={isLoading || !name.trim()}>
              <span>{isLoading ? "Connecting…" : "Join meeting"}</span>
              <ArrowRight size={17} />
            </Button>
            <p className="privacy-note">Joining means you agree to keep the conversation kind.</p>
          </form>
        </section>
      </section>
      <footer className="lobby-footer"><span>signal / private by design</span><span>Room {roomId}</span></footer>
    </main>
  );
}
