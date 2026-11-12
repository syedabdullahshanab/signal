"use client";

import {
  useConnectionState,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Copy, X } from "lucide-react";
import { ConnectionState, Participant, RoomEvent } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "../theme/ThemeToggle";
import { MeetingControls } from "./MeetingControls";
import { MeetingDrawer, type MeetingPanel } from "./MeetingDrawer";
import { MeetingStage } from "./MeetingStage";

type SignalEvent =
  | { type: "reaction"; emoji: string; id: string }
  | { type: "hand"; raised: boolean };

type FloatingReaction = {
  id: string;
  emoji: string;
  name: string;
};

type MeetingCallProps = {
  roomId: string;
  name: string;
  copied: boolean;
  error: string;
  speakerDeviceId?: string;
  onCopyLink: () => void;
  onLeave: () => void;
};

function parseSignalEvent(payload: Uint8Array): SignalEvent | null {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(payload));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      parsed.type === "reaction" &&
      "emoji" in parsed &&
      typeof parsed.emoji === "string" &&
      "id" in parsed &&
      typeof parsed.id === "string"
    ) {
      return { type: "reaction", emoji: parsed.emoji, id: parsed.id };
    }
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      parsed.type === "hand" &&
      "raised" in parsed &&
      typeof parsed.raised === "boolean"
    ) {
      return { type: "hand", raised: parsed.raised };
    }
    console.warn("Ignored an unsupported meeting data message.", parsed);
  } catch (parseError) {
    console.warn("Ignored an invalid meeting data message.", parseError);
  }
  return null;
}

export function MeetingCall({
  roomId,
  name,
  copied,
  error,
  speakerDeviceId,
  onCopyLink,
  onLeave,
}: MeetingCallProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [panel, setPanel] = useState<MeetingPanel>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [raisedHand, setRaisedHand] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [toast, setToast] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const panelRef = useRef<MeetingPanel>(null);
  const helpDialogRef = useRef<HTMLElement>(null);
  const panelReturnFocus = useRef<HTMLElement | null>(null);
  const helpReturnFocus = useRef<HTMLElement | null>(null);
  const previousMessageCount = useRef(0);
  const reactionTimeouts = useRef(new Map<string, number>());

  useEffect(() => { panelRef.current = panel; }, [panel]);

  const onMessagesChanged = useCallback((count: number) => {
    const difference = count - previousMessageCount.current;
    if (difference > 0 && panelRef.current !== "chat") {
      setUnreadCount((current) => current + difference);
    }
    previousMessageCount.current = count;
  }, []);

  const changePanel = useCallback((nextPanel: MeetingPanel) => {
    if (nextPanel && !panelRef.current) {
      panelReturnFocus.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }
    panelRef.current = nextPanel;
    setPanel(nextPanel);
    if (nextPanel === "chat") setUnreadCount(0);
    if (!nextPanel) {
      window.requestAnimationFrame(() => {
        panelReturnFocus.current?.focus();
        panelReturnFocus.current = null;
      });
    }
  }, []);

  const openHelp = useCallback(() => {
    helpReturnFocus.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    window.requestAnimationFrame(() => {
      helpReturnFocus.current?.focus();
      helpReturnFocus.current = null;
    });
  }, []);

  const addReaction = useCallback((reaction: FloatingReaction) => {
    setReactions((current) => [...current, reaction]);
    const timeout = window.setTimeout(() => {
      setReactions((current) => current.filter((item) => item.id !== reaction.id));
      reactionTimeouts.current.delete(reaction.id);
    }, 3200);
    reactionTimeouts.current.set(reaction.id, timeout);
  }, []);

  useEffect(() => () => {
    reactionTimeouts.current.forEach((timeout) => window.clearTimeout(timeout));
    reactionTimeouts.current.clear();
  }, []);

  const handleDataMessage = useCallback((message: { payload: Uint8Array; from?: Participant }) => {
    const event = parseSignalEvent(message.payload);
    const identity = message.from?.identity;
    if (!event || !identity) return;
    if (event.type === "reaction") {
      addReaction({
        id: `${identity}-${event.id}`,
        emoji: event.emoji,
        name: message.from?.name || identity,
      });
    } else {
      setRaisedHands((current) => ({ ...current, [identity]: event.raised }));
    }
  }, [addReaction]);

  const { send: sendDataMessage } = useDataChannel("signal-events", handleDataMessage);

  const publishEvent = useCallback(async (event: SignalEvent) => {
    const payload = new TextEncoder().encode(JSON.stringify(event));
    try {
      await sendDataMessage(payload, { topic: "signal-events", reliable: true });
    } catch (publishError) {
      console.error("Could not send meeting reaction.", publishError);
      setToast("Your reaction could not be sent.");
    }
  }, [sendDataMessage]);

  const sendReaction = useCallback((emoji: string) => {
    const id = crypto.randomUUID();
    addReaction({ id: `${localParticipant.identity}-${id}`, emoji, name });
    void publishEvent({ type: "reaction", emoji, id });
  }, [addReaction, localParticipant.identity, name, publishEvent]);

  const toggleRaisedHand = useCallback(() => {
    const nextRaised = !raisedHand;
    setRaisedHand(nextRaised);
    setRaisedHands((current) => ({ ...current, [localParticipant.identity]: nextRaised }));
    void publishEvent({ type: "hand", raised: nextRaised });
  }, [localParticipant.identity, publishEvent, raisedHand]);

  useEffect(() => {
    const onParticipantConnected = (participant: Participant) => {
      setToast(`${participant.name || participant.identity} joined`);
    };
    const onParticipantDisconnected = (participant: Participant) => {
      setToast(`${participant.name || participant.identity} left`);
      setRaisedHands((current) => {
        const next = { ...current };
        delete next[participant.identity];
        return next;
      });
    };
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    };
  }, [room]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!helpOpen) return;
    helpDialogRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    function handleHelpDialogKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeHelp();
        return;
      }
      if (event.key !== "Tab" || !helpDialogRef.current) return;
      const focusable = helpDialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleHelpDialogKeys);
    return () => window.removeEventListener("keydown", handleHelpDialogKeys);
  }, [closeHelp, helpOpen]);

  const reconnecting = connectionState === ConnectionState.Reconnecting;

  return (
    <div className="call-shell">
      <header className="meeting-topbar">
        <Link className="brand" href="/" aria-label="Back to Signal home">
          <span className="brand-mark" aria-hidden="true">S</span><span>signal</span>
        </Link>
        <div className="meeting-heading">
          <span className="room-code-chip"><span className="presence-dot" /> Room <strong>{roomId}</strong></span>
          <button
            className="meeting-participant-count"
            onClick={() => changePanel(panel === "participants" ? null : "participants")}
            aria-label={`Show ${participants.length} meeting participants`}
            aria-pressed={panel === "participants"}
            title="Participants (T)"
          >
            {participants.length} {participants.length === 1 ? "person" : "people"}
          </button>
        </div>
        <div className="meeting-header-actions">
          <button className="share-button" onClick={onCopyLink}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? "Copied" : "Copy invite"}</span>
            <ArrowUpRight size={14} className="share-arrow" />
          </button>
          <ThemeToggle showLabel />
        </div>
      </header>

      <div className="room-content">
        <main className="call-workspace">
          {reconnecting && (
            <div className="reconnecting-banner" role="status">
              <span className="reconnecting-spinner" /> Connection interrupted. Reconnecting…
            </div>
          )}
          <MeetingStage
            pinnedIdentity={pinnedIdentity}
            raisedHands={raisedHands}
            onPin={setPinnedIdentity}
          />
          <div className="reaction-layer" aria-live="polite" aria-label="Participant reactions">
            <AnimatePresence>
              {reactions.map((reaction) => (
                <motion.div
                  className="floating-reaction"
                  key={reaction.id}
                  initial={{ opacity: 0, y: 30, scale: 0.65 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -170, scale: [0.65, 1.15, 1, 0.9] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 3, ease: "easeOut" }}
                  aria-label={`${reaction.name} reacted ${reaction.emoji}`}
                >
                  {reaction.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <MeetingControls
            panel={panel}
            unreadCount={unreadCount}
            raisedHand={raisedHand}
            speakerDeviceId={speakerDeviceId}
            onPanelChange={changePanel}
            onReaction={sendReaction}
            onToggleHand={toggleRaisedHand}
            onHelp={openHelp}
            onLeave={onLeave}
            onError={setToast}
          />
          <button
            className="shortcut-hints"
            onClick={openHelp}
            aria-label="Keyboard shortcuts: microphone M, camera V, chat C, participants T. Open all shortcuts."
            title="Keyboard shortcuts"
          >
            <kbd>M</kbd><kbd>V</kbd><kbd>C</kbd><kbd>T</kbd>
          </button>
        </main>
        <MeetingDrawer
          panel={panel}
          onClose={() => changePanel(null)}
          onMessagesChanged={onMessagesChanged}
          onError={setToast}
        />
      </div>

      <AnimatePresence>
        {(toast || (copied ? "Invite link copied" : error)) && (
          <motion.div
            className="meeting-toast"
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <span className="presence-dot" />{toast || (copied ? "Invite link copied" : error)}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {helpOpen && (
          <motion.div
            className="modal-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeHelp();
            }}
          >
            <motion.section
              ref={helpDialogRef}
              className="shortcuts-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shortcuts-title"
              tabIndex={-1}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
            >
              <header className="drawer-header">
                <div><span className="drawer-kicker">A few useful keys</span><h2 id="shortcuts-title">Keyboard shortcuts</h2></div>
                <button className="icon-button" onClick={closeHelp} aria-label="Close keyboard shortcuts"><X size={18} /></button>
              </header>
              <dl className="shortcut-list">
                <div><dt>Mute or unmute microphone</dt><dd><kbd>M</kbd></dd></div>
                <div><dt>Turn camera on or off</dt><dd><kbd>V</kbd></dd></div>
                <div><dt>Open or close chat</dt><dd><kbd>C</kbd></dd></div>
                <div><dt>Show or hide participants</dt><dd><kbd>T</kbd></dd></div>
                <div><dt>Start or stop screen share</dt><dd><kbd>S</kbd></dd></div>
                <div><dt>Show this dialog</dt><dd><kbd>?</kbd></dd></div>
                <div><dt>Close the open panel</dt><dd><kbd>Esc</kbd></dd></div>
              </dl>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
