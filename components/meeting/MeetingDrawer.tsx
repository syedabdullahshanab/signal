"use client";

import { MessageCircle, MicOff, Users, X } from "lucide-react";
import { useChat, useParticipants } from "@livekit/components-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

export type MeetingPanel = "chat" | "participants" | null;

type MeetingDrawerProps = {
  panel: MeetingPanel;
  onClose: () => void;
  onMessagesChanged: (count: number) => void;
  onError: (message: string) => void;
};

function nameInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export function MeetingDrawer({
  panel,
  onClose,
  onMessagesChanged,
  onError,
}: MeetingDrawerProps) {
  const { chatMessages, send, isSending } = useChat();
  const participants = useParticipants();
  const [draft, setDraft] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => onMessagesChanged(chatMessages.length), [chatMessages.length, onMessagesChanged]);
  useEffect(() => {
    if (!panel) return;
    function keepFocusInDrawer(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), textarea, select, input, [tabindex]:not([tabindex="-1"])',
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
    window.addEventListener("keydown", keepFocusInDrawer);
    return () => window.removeEventListener("keydown", keepFocusInDrawer);
  }, [onClose, panel]);
  useEffect(() => {
    if (panel === "chat") messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight });
  }, [chatMessages, panel]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;
    try {
      await send(message);
      setDraft("");
    } catch (sendError) {
      console.error("Could not send chat message.", sendError);
      onError("Your message could not be sent. Check your connection and try again.");
    }
  }

  return (
    <aside
      ref={drawerRef}
      className={`meeting-drawer${panel ? " is-open" : ""}`}
      role={panel ? "dialog" : undefined}
      aria-modal={panel ? "false" : undefined}
      aria-hidden={!panel}
      aria-labelledby={panel ? "meeting-drawer-title" : undefined}
    >
      {panel && (
        <>
            <header className="drawer-header">
              <div>
                <span className="drawer-kicker">{panel === "chat" ? "The conversation" : "In this room"}</span>
                <h2 id="meeting-drawer-title">
                  {panel === "chat" ? <><MessageCircle size={19} /> Chat</> : <><Users size={19} /> Participants <span className="drawer-count">{participants.length}</span></>}
                </h2>
                {panel === "chat" && <p>Messages are shared with everyone in the room.</p>}
              </div>
              <button className="icon-button" onClick={onClose} aria-label="Close panel">
                <X size={18} />
              </button>
            </header>

            {panel === "chat" ? (
              <>
                <div className="chat-messages" ref={messageListRef} aria-live="polite">
                  {chatMessages.length === 0 ? (
                    <div className="empty-panel">
                      <span className="empty-panel-icon"><MessageCircle size={19} /></span>
                      <strong>Start the conversation</strong>
                      <p>Send a message to everyone here.</p>
                    </div>
                  ) : chatMessages.map((message) => (
                    <article
                      className={`chat-message${message.from?.isLocal ? " is-local" : ""}`}
                      key={message.id}
                    >
                      <span className="chat-avatar" aria-hidden="true">
                        {nameInitials(message.from?.name || message.from?.identity || "?")}
                      </span>
                      <div className="chat-message-content">
                        <div className="chat-message-meta">
                          <strong>{message.from?.name || message.from?.identity || "Someone"}</strong>
                          <time dateTime={new Date(message.timestamp).toISOString()}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </time>
                        </div>
                        <p>{message.message}</p>
                      </div>
                    </article>
                  ))}
                </div>
                <form className="chat-composer" onSubmit={sendMessage}>
                  <label className="sr-only" htmlFor="meeting-message">Write a message</label>
                  <textarea
                    id="meeting-message"
                    rows={2}
                    maxLength={1000}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Write a message…"
                  />
                  <button className="composer-send" type="submit" disabled={!draft.trim() || isSending}>
                    {isSending ? "Sending…" : "Send"}
                  </button>
                </form>
              </>
            ) : (
              <div className="participant-list">
                {participants.map((participant) => {
                  const name = participant.name || participant.identity;
                  return (
                    <div className="participant-row" key={participant.identity}>
                      <span className="chat-avatar participant-list-avatar">{nameInitials(name)}</span>
                      <span className="participant-row-name">{name}{participant.isLocal ? " (you)" : ""}</span>
                      <span className="participant-row-status">
                        {participant.isMicrophoneEnabled
                          ? <span className="participant-live-dot" aria-label="Microphone on" />
                          : <MicOff size={15} aria-label="Microphone muted" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
        </>
      )}
    </aside>
  );
}
