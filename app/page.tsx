
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function createRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeRoomId(value: string) {
  const cleaned = value.trim().replace(/.*\/room\//, "").replace(/[^a-zA-Z0-9-]/g, "");
  return cleaned.slice(0, 24).toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  function enterRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const roomId = normalizeRoomId(roomCode);

    if (!roomId) {
      setError("Enter a room code or meeting link.");
      return;
    }

    router.push(`/room/${roomId}`);
  }

  return (
    <main className="home-shell">
      <nav className="topbar">
        <Link className="brand" href="/" aria-label="Signal home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>signal</span>
        </Link>
        <span className="topbar-note">Conversation, in focus.</span>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> Video meetings, made human</p>
          <h1>Make room for a <em>good</em> conversation.</h1>
          <p className="hero-description">
            A quiet, reliable place to meet face to face. Start a room in seconds,
            share the link, and stay close wherever you are.
          </p>
          <div className="hero-meta">
            <span>Encrypted in transit</span>
            <span className="meta-divider" />
            <span>No account needed</span>
          </div>
        </div>

        <div className="entry-card">
          <div className="card-accent" />
          <div className="entry-card-content">
            <div className="card-heading">
              <span className="card-kicker">Your meeting room</span>
              <span className="live-pill"><span className="live-dot" /> Live</span>
            </div>
            <h2>Where should we meet?</h2>
            <p className="card-description">Create a fresh room or join one someone shared with you.</p>

            <button className="primary-button" onClick={() => router.push(`/room/${createRoomId()}`)}>
              <span>Start a new meeting</span>
              <span className="button-arrow" aria-hidden="true">-&gt;</span>
            </button>

            <div className="form-divider"><span>or join with a link</span></div>

            <form onSubmit={enterRoom}>
              <label className="field-label" htmlFor="room-code">Room code or link</label>
              <div className="join-field">
                <input
                  id="room-code"
                  value={roomCode}
                  onChange={(event) => { setRoomCode(event.target.value); setError(""); }}
                  placeholder="e.g. A7K9Q2"
                  autoComplete="off"
                />
                <button type="submit" aria-label="Join meeting">Join</button>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
            </form>

            <p className="privacy-note"><span aria-hidden="true">*</span> Your room is private. Only people with the link can join.</p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <span>Made for the moments that matter.</span>
        <span>signal / 2026</span>
      </footer>
    </main>
  );
}
