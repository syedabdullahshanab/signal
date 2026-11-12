"use client";

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import {
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  ScreenShare,
  Smile,
  Video,
  VideoOff,
} from "lucide-react";

export type ControlBarProps = {
  onChatClick: () => void;
  onReactionClick: () => void;
  onLeave?: () => void;
  chatOpen?: boolean;
  onError?: (message: string) => void;
};

export function ControlBar({
  onChatClick,
  onReactionClick,
  onLeave,
  chatOpen = false,
  onError,
}: ControlBarProps) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const room = useRoomContext();

  function reportFailure(action: string, error: unknown) {
    console.error(`${action} failed.`, error);
    onError?.(`${action} failed. Check your browser permissions and try again.`);
  }

  function toggleMicrophone() {
    localParticipant
      .setMicrophoneEnabled(!isMicrophoneEnabled)
      .catch((error: unknown) => reportFailure("Microphone", error));
  }

  function toggleCamera() {
    localParticipant
      .setCameraEnabled(!isCameraEnabled)
      .catch((error: unknown) => reportFailure("Camera", error));
  }

  function toggleScreenShare() {
    localParticipant
      .setScreenShareEnabled(!isScreenShareEnabled)
      .catch((error: unknown) => reportFailure("Screen sharing", error));
  }

  async function leaveMeeting() {
    try {
      await room.disconnect();
      onLeave?.();
    } catch (error) {
      reportFailure("Leaving the meeting", error);
    }
  }

  return (
    <nav className="signal-control-bar" aria-label="Meeting controls">
      <div className="signal-control-item">
        <button
          className={`signal-control-button${isMicrophoneEnabled ? " is-active" : " is-off"}`}
          type="button"
          aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={isMicrophoneEnabled}
          title={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
          onClick={toggleMicrophone}
        >
          {isMicrophoneEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </button>
        <span className="signal-control-tooltip" role="tooltip">
          {isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
        </span>
      </div>

      <div className="signal-control-item">
        <button
          className={`signal-control-button${isCameraEnabled ? " is-active" : " is-off"}`}
          type="button"
          aria-label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
          aria-pressed={isCameraEnabled}
          title={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
          onClick={toggleCamera}
        >
          {isCameraEnabled ? <Video size={22} /> : <VideoOff size={22} />}
        </button>
        <span className="signal-control-tooltip" role="tooltip">
          {isCameraEnabled ? "Turn camera off" : "Turn camera on"}
        </span>
      </div>

      <div className="signal-control-item">
        <button
          className={`signal-control-button${isScreenShareEnabled ? " is-active" : ""}`}
          type="button"
          aria-label={isScreenShareEnabled ? "Stop sharing screen" : "Share screen"}
          aria-pressed={isScreenShareEnabled}
          title={isScreenShareEnabled ? "Stop sharing screen" : "Share screen"}
          onClick={toggleScreenShare}
        >
          <ScreenShare size={22} />
        </button>
        <span className="signal-control-tooltip" role="tooltip">
          {isScreenShareEnabled ? "Stop sharing screen" : "Share screen"}
        </span>
      </div>

      <div className="signal-control-item">
        <button
          className={`signal-control-button${chatOpen ? " is-active" : ""}`}
          type="button"
          aria-label={chatOpen ? "Close chat" : "Open chat"}
          aria-pressed={chatOpen}
          title={chatOpen ? "Close chat" : "Open chat"}
          onClick={onChatClick}
        >
          <MessageSquare size={22} />
        </button>
        <span className="signal-control-tooltip" role="tooltip">
          {chatOpen ? "Close chat" : "Open chat"}
        </span>
      </div>

      <div className="signal-control-item">
        <button
          className="signal-control-button"
          type="button"
          aria-label="Send a reaction"
          title="Send a reaction"
          onClick={onReactionClick}
        >
          <Smile size={22} />
        </button>
        <span className="signal-control-tooltip" role="tooltip">Send a reaction</span>
      </div>

      <div className="signal-control-item">
        <button
          className="signal-control-button signal-control-leave"
          type="button"
          aria-label="Leave meeting"
          title="Leave meeting"
          onClick={() => void leaveMeeting()}
        >
          <LogOut size={20} />
          <span className="signal-control-leave-label">Leave</span>
        </button>
        <span className="signal-control-tooltip" role="tooltip">Leave meeting</span>
      </div>

      <style jsx>{`
        .signal-control-bar {
          position: fixed;
          z-index: 30;
          bottom: calc(8px + env(safe-area-inset-bottom));
          left: 50%;
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: calc(100vw - 16px);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-soft);
          transform: translateX(-50%);
        }

        .signal-control-item {
          position: relative;
          flex: 0 0 auto;
        }

        .signal-control-button {
          display: inline-flex;
          width: 46px;
          height: 46px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 999px;
          padding: 0;
          background: transparent;
          color: var(--foreground);
          transition: color 180ms ease, background-color 180ms ease;
        }

        .signal-control-button :global(svg) {
          width: 20px;
          height: 20px;
        }

        .signal-control-button:hover {
          background: var(--surface-muted);
        }

        .signal-control-button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .signal-control-button.is-active {
          background: var(--accent);
          color: var(--surface);
        }

        .signal-control-button.is-off {
          background: var(--danger-soft);
          color: var(--danger);
        }

        .signal-control-leave {
          min-width: 100px;
          height: 46px;
          min-height: 46px;
          padding: 0 18px;
          background: var(--danger);
          color: var(--foreground);
          font-weight: 600;
        }

        .signal-control-leave:hover {
          background: var(--danger);
          filter: brightness(1.08);
        }

        .signal-control-leave-label {
          font-size: 14px;
        }

        .signal-control-tooltip {
          position: absolute;
          z-index: 1;
          bottom: calc(100% + 10px);
          left: 50%;
          width: max-content;
          max-width: calc(100vw - 24px);
          border: 1px solid var(--line);
          border-radius: 7px;
          padding: 6px 9px;
          background: var(--surface-raised);
          box-shadow: var(--shadow-soft);
          color: var(--foreground);
          font-size: 12px;
          line-height: 1.2;
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, 3px);
          transition: opacity 150ms ease, transform 150ms ease;
          white-space: nowrap;
        }

        .signal-control-item:hover .signal-control-tooltip,
        .signal-control-item:focus-within .signal-control-tooltip {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        @media (max-width: 560px) {
          .signal-control-bar {
            gap: 4px;
            max-width: calc(100vw - 12px);
            overflow-x: auto;
            bottom: calc(8px + env(safe-area-inset-bottom));
            scrollbar-width: none;
          }

          .signal-control-button {
            width: 46px;
            height: 46px;
          }

          .signal-control-leave {
            min-width: 46px;
            padding: 0 18px;
          }

          .signal-control-leave-label,
          .signal-control-tooltip {
            display: none;
          }
        }

        @media (max-width: 340px) {
          .signal-control-bar {
            gap: 2px;
            padding: 6px;
          }

          .signal-control-button {
            width: 46px;
            height: 46px;
          }

          .signal-control-leave {
            min-width: 46px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .signal-control-button,
          .signal-control-tooltip {
            transition: none;
          }
        }
      `}</style>
    </nav>
  );
}
