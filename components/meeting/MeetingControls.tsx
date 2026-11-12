"use client";

import {
  useMediaDeviceSelect,
  useTrackToggle,
} from "@livekit/components-react";
import {
  Camera,
  CameraOff,
  ChevronDown,
  Hand,
  LogOut,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Smile,
} from "lucide-react";
import { Track } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Button } from "../ui/Button";
import type { MeetingPanel } from "./MeetingDrawer";

type DeviceOption = { deviceId: string; label: string };

type MeetingControlsProps = {
  panel: MeetingPanel;
  unreadCount: number;
  raisedHand: boolean;
  speakerDeviceId?: string;
  onPanelChange: (panel: MeetingPanel) => void;
  onReaction: (emoji: string) => void;
  onToggleHand: () => void;
  onHelp: () => void;
  onLeave: () => void;
  onError: (message: string) => void;
};

function DevicePicker({
  label,
  icon,
  devices,
  activeDeviceId,
  onSelect,
}: {
  label: string;
  icon: ReactNode;
  devices: DeviceOption[];
  activeDeviceId: string;
  onSelect: (deviceId: string) => void;
}) {
  return (
    <div className="control-popover" role="menu" aria-label={`${label} devices`}>
      <p className="popover-heading">{label}</p>
      {devices.length ? devices.map((device, index) => (
        <button
          key={device.deviceId || `${label}-${index}`}
          role="menuitemradio"
          aria-checked={activeDeviceId === device.deviceId}
          className="device-option"
          onClick={() => onSelect(device.deviceId)}
        >
          {icon}<span>{device.label || `${label} ${index + 1}`}</span>
          {activeDeviceId === device.deviceId && <span className="device-check">✓</span>}
        </button>
      )) : <p className="popover-empty">No devices found</p>}
    </div>
  );
}

function ControlWithDeviceMenu({
  label,
  active,
  icon,
  onToggle,
  devices,
  selectedDeviceId,
  onSelectDevice,
  muted = false,
}: {
  label: string;
  active: boolean;
  icon: ReactNode;
  onToggle: () => void;
  devices: DeviceOption[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="control-device-group">
      <Button
        className={`meeting-control${muted ? " control-muted" : ""}`}
        size="icon"
        variant="outline"
        aria-label={`${active ? "Turn off" : "Turn on"} ${label.toLowerCase()}`}
        aria-pressed={active}
        title={`${active ? "Turn off" : "Turn on"} ${label.toLowerCase()}`}
        onClick={onToggle}
      >
        {icon}
      </Button>
      <Button
        className="device-menu-trigger"
        size="icon"
        variant="outline"
        aria-label={`Choose ${label.toLowerCase()} device`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown size={13} />
      </Button>
      {open && (
        <>
          <button className="popover-dismiss" onClick={() => setOpen(false)} aria-label="Close device menu" />
          <DevicePicker
            label={label}
            icon={icon}
            devices={devices}
            activeDeviceId={selectedDeviceId}
            onSelect={(deviceId) => {
              onSelectDevice(deviceId);
              setOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}

export function MeetingControls({
  panel,
  unreadCount,
  raisedHand,
  speakerDeviceId,
  onPanelChange,
  onReaction,
  onToggleHand,
  onHelp,
  onLeave,
  onError,
}: MeetingControlsProps) {
  const room = useRoomContext();
  const microphone = useTrackToggle({ source: Track.Source.Microphone });
  const camera = useTrackToggle({ source: Track.Source.Camera });
  const screenShare = useTrackToggle({ source: Track.Source.ScreenShare });
  const audioDevices = useMediaDeviceSelect({ kind: "audioinput" });
  const videoDevices = useMediaDeviceSelect({ kind: "videoinput" });
  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);

  const reportFailure = useCallback((action: string, failure: unknown) => {
    console.error(`${action} failed.`, failure);
    onError(`${action} failed. Check your browser permissions and try again.`);
  }, [onError]);

  useEffect(() => {
    if (!speakerDeviceId) return;
    room.switchActiveDevice("audiooutput", speakerDeviceId)
      .then((switched) => {
        if (!switched) onError("This browser could not switch the speaker device.");
      })
      .catch((failure: unknown) => reportFailure("Speaker selection", failure));
  }, [onError, reportFailure, room, speakerDeviceId]);

  const toggleMicrophone = useCallback(() => {
    microphone.toggle().catch((failure: unknown) => reportFailure("Microphone", failure));
  }, [microphone, reportFailure]);
  const toggleCamera = useCallback(() => {
    camera.toggle().catch((failure: unknown) => reportFailure("Camera", failure));
  }, [camera, reportFailure]);
  const toggleScreenShare = useCallback(() => {
    screenShare.toggle().catch((failure: unknown) => reportFailure("Screen sharing", failure));
  }, [reportFailure, screenShare]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;

      switch (event.key.toLowerCase()) {
        case "m":
          event.preventDefault();
          toggleMicrophone();
          break;
        case "v":
          event.preventDefault();
          toggleCamera();
          break;
        case "c":
          event.preventDefault();
          onPanelChange(panel === "chat" ? null : "chat");
          break;
        case "t":
          event.preventDefault();
          onPanelChange(panel === "participants" ? null : "participants");
          break;
        case "s":
          event.preventDefault();
          toggleScreenShare();
          break;
        case "?":
          event.preventDefault();
          onHelp();
          break;
        case "escape":
          onPanelChange(null);
          setReactionMenuOpen(false);
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onHelp, onPanelChange, panel, toggleCamera, toggleMicrophone, toggleScreenShare]);

  async function selectDevice(kind: MediaDeviceKind, deviceId: string) {
    try {
      const switched = await room.switchActiveDevice(kind, deviceId);
      if (!switched) onError("This browser could not switch to that device.");
    } catch (failure) {
      reportFailure("Device selection", failure);
    }
  }

  function toDeviceOptions(devices: MediaDeviceInfo[]): DeviceOption[] {
    return devices.map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Device ${index + 1}`,
    }));
  }

  return (
    <nav className="floating-controls" aria-label="Meeting controls">
      <ControlWithDeviceMenu
        label="Microphone"
        active={microphone.enabled}
        muted={!microphone.enabled}
        icon={microphone.enabled ? <Mic size={23} /> : <MicOff size={23} />}
        onToggle={toggleMicrophone}
        devices={toDeviceOptions(audioDevices.devices)}
        selectedDeviceId={audioDevices.activeDeviceId}
        onSelectDevice={(deviceId) => void selectDevice("audioinput", deviceId)}
      />
      <ControlWithDeviceMenu
        label="Camera"
        active={camera.enabled}
        muted={!camera.enabled}
        icon={camera.enabled ? <Camera size={23} /> : <CameraOff size={23} />}
        onToggle={toggleCamera}
        devices={toDeviceOptions(videoDevices.devices)}
        selectedDeviceId={videoDevices.activeDeviceId}
        onSelectDevice={(deviceId) => void selectDevice("videoinput", deviceId)}
      />
      <Button
        className={`meeting-control${screenShare.enabled ? " control-active" : ""}`}
        size="icon"
        variant="outline"
        aria-label={screenShare.enabled ? "Stop sharing screen" : "Share screen"}
        aria-pressed={screenShare.enabled}
        title="Share screen (S)"
        onClick={toggleScreenShare}
      >
        <MonitorUp size={23} />
      </Button>

      <Button
        className={`meeting-control panel-control${panel === "chat" ? " control-active" : ""}`}
        size="icon"
        variant="outline"
        aria-label={`Chat${unreadCount ? `, ${unreadCount} unread messages` : ""}`}
        aria-pressed={panel === "chat"}
        title="Chat (C)"
        onClick={() => onPanelChange(panel === "chat" ? null : "chat")}
      >
        <MessageCircle size={23} />
        {unreadCount > 0 && <span className="unread-badge" aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </Button>

      <div className="reaction-control-wrap">
        <Button
          className="meeting-control"
          size="icon"
          variant="outline"
          aria-label="Send a reaction or raise your hand"
          aria-expanded={reactionMenuOpen}
          title="Reactions"
          onClick={() => setReactionMenuOpen((open) => !open)}
        >
          <Smile size={23} />
        </Button>
        {reactionMenuOpen && (
          <>
            <button className="popover-dismiss" onClick={() => setReactionMenuOpen(false)} aria-label="Close reactions" />
            <div className="reaction-popover" role="menu" aria-label="Reactions">
              <div className="reaction-emoji-list">
                {["👏", "❤️", "😂", "🎉", "👍", "✨"].map((emoji) => (
                  <button
                    key={emoji}
                    role="menuitem"
                    aria-label={`React ${emoji}`}
                    onClick={() => {
                      onReaction(emoji);
                      setReactionMenuOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                className={`raise-hand-option${raisedHand ? " is-raised" : ""}`}
                role="menuitemcheckbox"
                aria-checked={raisedHand}
                onClick={() => {
                  onToggleHand();
                  setReactionMenuOpen(false);
                }}
              >
                <Hand size={17} /> {raisedHand ? "Lower hand" : "Raise hand"}
              </button>
            </div>
          </>
        )}
      </div>

      <Button
        className="meeting-control leave-control"
        variant="danger"
        aria-label="Leave meeting"
        title="Leave meeting"
        onClick={() => {
          room.disconnect()
            .then(onLeave)
            .catch((failure: unknown) => reportFailure("Leaving the meeting", failure));
        }}
      >
        <LogOut size={25} aria-hidden="true" />
        <span>Leave</span>
      </Button>
    </nav>
  );
}
