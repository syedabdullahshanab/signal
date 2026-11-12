"use client";

import {
  VideoTrack,
  isTrackReference,
  useIsSpeaking,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { MicOff, Pin, PinOff, Signal } from "lucide-react";
import type { Participant } from "livekit-client";
import { Track } from "livekit-client";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { useMemo } from "react";

type MeetingStageProps = {
  pinnedIdentity: string | null;
  raisedHands: Record<string, boolean>;
  onPin: (identity: string | null) => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function avatarColor(identity: string) {
  const colors = ["coral", "sage", "violet", "ochre", "blue", "rose"];
  let hash = 0;
  for (const character of identity) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return colors[hash % colors.length];
}

function ParticipantTileCard({
  participant,
  trackRef,
  pinned,
  handRaised,
  onPin,
  compact = false,
}: {
  participant: Participant;
  trackRef?: TrackReferenceOrPlaceholder;
  pinned: boolean;
  handRaised: boolean;
  onPin: () => void;
  compact?: boolean;
}) {
  const speaking = useIsSpeaking(participant);
  const name = participant.name || participant.identity;
  const hasVideo = Boolean(
    trackRef &&
    isTrackReference(trackRef) &&
    trackRef.publication.track &&
    !trackRef.publication.isMuted,
  );
  const quality = participant.connectionQuality.toLowerCase();

  return (
    <article
      className={`participant-tile${speaking ? " is-speaking" : ""}${pinned ? " is-pinned" : ""}${compact ? " is-compact" : ""}`}
      aria-label={`${name}${speaking ? ", speaking" : ""}${pinned ? ", pinned" : ""}`}
    >
      {hasVideo && trackRef && isTrackReference(trackRef) ? (
        <VideoTrack className="participant-video" trackRef={trackRef} playsInline />
      ) : (
        <div className={`participant-avatar avatar-${avatarColor(participant.identity)}`} aria-label={`${name}, camera off`}>
          <span>{initials(name).charAt(0)}</span>
        </div>
      )}
      {handRaised && <span className="hand-raised" title="Raised hand" aria-label="Raised hand">✋</span>}
      <div className="participant-name-chip">
        <span className="participant-name">{participant.isLocal ? "You" : name}</span>
        {!participant.isMicrophoneEnabled && <MicOff size={14} aria-label="Microphone muted" />}
      </div>
      <span
        className={`connection-quality quality-${quality}`}
        title={`Connection quality: ${quality}`}
        aria-label={`Connection quality: ${quality}`}
      >
        <Signal size={13} />
      </span>
      {!compact && (
        <button
          className="tile-pin-button"
          onClick={onPin}
          aria-label={pinned ? `Unpin ${name}` : `Pin ${name}`}
          title={pinned ? "Unpin participant" : "Pin participant"}
        >
          {pinned ? <PinOff size={15} /> : <Pin size={15} />}
        </button>
      )}
    </article>
  );
}

function ScreenShareTile({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
  const participant = trackRef.participant;
  return (
    <div className="screen-share-tile">
      {isTrackReference(trackRef) && trackRef.publication.track ? (
        <VideoTrack
          className="screen-share-video"
          trackRef={trackRef}
          playsInline
          autoPlay
        />
      ) : (
        <div className="screen-share-placeholder">Waiting for shared screen…</div>
      )}
      <span className="screen-share-label">{participant.name || participant.identity} is presenting</span>
    </div>
  );
}

export function MeetingStage({ pinnedIdentity, raisedHands, onPin }: MeetingStageProps) {
  const participants = useParticipants();
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenShares = useTracks([Track.Source.ScreenShare]);
  const cameraByIdentity = useMemo(
    () => new Map(cameraTracks.map((reference) => [reference.participant.identity, reference])),
    [cameraTracks],
  );
  const pinnedParticipant = participants.find((participant) => participant.identity === pinnedIdentity);
  const sideParticipants = participants.filter((participant) => participant.identity !== pinnedIdentity);
  const screenShare = screenShares[0];

  const renderTile = (participant: Participant, compact = false) => (
    <ParticipantTileCard
      key={participant.identity}
      participant={participant}
      trackRef={cameraByIdentity.get(participant.identity)}
      pinned={participant.identity === pinnedIdentity}
      handRaised={Boolean(raisedHands[participant.identity])}
      onPin={() => onPin(participant.identity === pinnedIdentity ? null : participant.identity)}
      compact={compact}
    />
  );

  if (screenShare) {
    return (
      <section className="meeting-stage stage-with-share" aria-label="Meeting participants and screen share">
        <ScreenShareTile trackRef={screenShare} />
        <aside className="share-participant-strip" aria-label="Participants">
          {participants.map((participant) => renderTile(participant, true))}
        </aside>
      </section>
    );
  }

  if (pinnedParticipant) {
    return (
      <section className="meeting-stage stage-with-pin" aria-label="Pinned participant and meeting participants">
        {renderTile(pinnedParticipant)}
        <aside className="pinned-participant-strip" aria-label="Other participants">
          {sideParticipants.map((participant) => renderTile(participant, true))}
        </aside>
      </section>
    );
  }

  return (
    <section
      className={`meeting-stage participant-grid participant-count-${Math.min(participants.length, 5)}`}
      aria-label="Meeting participants"
    >
      {participants.map((participant) => renderTile(participant))}
    </section>
  );
}
