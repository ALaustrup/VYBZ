// Thin LiveKit wrapper for MYVYB Live.
//
// Two flows:
//   - publish(): the streamer connects, enables camera + mic, and stays "live"
//     until end() is called.
//   - watch(): the viewer connects to a room and attaches the first remote
//     video/audio tracks to provided <video>/<audio> elements.
//
// Tokens come from our `live-token` Edge Function (server-signed; the LiveKit
// API secret never reaches the client). All eligibility (age layer, NSFW,
// stream ownership, banned) is enforced server-side before a token is minted.

import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";

export interface LiveConnect {
  room: Room;
  disconnect: () => Promise<void>;
}

export type LiveStatus =
  | "connecting"
  | "live"
  | "ended"
  | "kicked"
  | "error";

/**
 * Publisher: connect, enable camera + mic, signal "live" once tracks publish.
 * Returns a handle the caller uses to disconnect when the streamer ends.
 */
export async function publish(opts: {
  url: string;
  token: string;
  onStatus?: (s: LiveStatus) => void;
}): Promise<LiveConnect> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    // Mobile-first capture: portrait HD with the front camera so the publish
    // matches a phone's display, and simulcast so viewers on weak networks
    // automatically drop to a lighter layer instead of buffering.
    videoCaptureDefaults: {
      resolution: { width: 720, height: 1280, frameRate: 30 },
      facingMode: "user",
    },
    publishDefaults: { simulcast: true, videoCodec: "vp8" },
  });
  room.on(RoomEvent.Disconnected, () => opts.onStatus?.("ended"));
  room.on(RoomEvent.MediaDevicesError, () => opts.onStatus?.("error"));
  opts.onStatus?.("connecting");
  await room.connect(opts.url, opts.token);
  await room.localParticipant.enableCameraAndMicrophone();
  opts.onStatus?.("live");
  return {
    room,
    disconnect: async () => {
      try {
        await room.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Lifelines voice — both parties join, both publish audio, no video, no
 * recording. Returns a handle plus a `setMuted(bool)` so the UI can mute the
 * mic without dropping the call.
 */
export async function voiceJoin(opts: {
  url: string;
  token: string;
  remoteAudioEl: HTMLAudioElement;
  onStatus?: (s: LiveStatus) => void;
}): Promise<LiveConnect & { setMuted: (m: boolean) => Promise<void> }> {
  const room = new Room({ adaptiveStream: true });
  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) track.attach(opts.remoteAudioEl);
    }
  );
  room.on(RoomEvent.Disconnected, () => opts.onStatus?.("ended"));
  room.on(RoomEvent.ParticipantDisconnected, () => opts.onStatus?.("ended"));

  opts.onStatus?.("connecting");
  await room.connect(opts.url, opts.token);
  await room.localParticipant.setMicrophoneEnabled(true);
  opts.onStatus?.("live");

  // Attach any already-published remote audio (in case we joined second).
  room.remoteParticipants.forEach((p) =>
    p.trackPublications.forEach((pub) => {
      if (pub.track?.kind === Track.Kind.Audio) pub.track.attach(opts.remoteAudioEl);
    })
  );

  return {
    room,
    setMuted: async (m: boolean) => {
      try {
        await room.localParticipant.setMicrophoneEnabled(!m);
      } catch {
        /* ignore */
      }
    },
    disconnect: async () => {
      try {
        await room.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Viewer: connect subscribe-only, attach the first incoming camera + mic to the
 * provided media elements. Returns a handle to disconnect on next-swipe.
 */
export async function watch(opts: {
  url: string;
  token: string;
  videoEl: HTMLVideoElement;
  audioEl?: HTMLAudioElement;
  onStatus?: (s: LiveStatus) => void;
}): Promise<LiveConnect> {
  const room = new Room({ adaptiveStream: true });

  const attach = (track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video) track.attach(opts.videoEl);
    else if (track.kind === Track.Kind.Audio && opts.audioEl) track.attach(opts.audioEl);
  };

  room.on(
    RoomEvent.TrackSubscribed,
    (
      track: RemoteTrack,
      _pub: RemoteTrackPublication,
      _participant: RemoteParticipant
    ) => {
      attach(track);
      opts.onStatus?.("live");
    }
  );
  room.on(RoomEvent.Disconnected, () => opts.onStatus?.("ended"));
  room.on(RoomEvent.ParticipantDisconnected, (p) => {
    // If the streamer leaves, the stream is over for viewers.
    if (p.permissions?.canPublish) opts.onStatus?.("ended");
  });

  opts.onStatus?.("connecting");
  await room.connect(opts.url, opts.token);

  // The streamer's tracks may have already published before we joined.
  room.remoteParticipants.forEach((p) => {
    p.trackPublications.forEach((pub) => {
      if (pub.track) attach(pub.track);
    });
  });

  return {
    room,
    disconnect: async () => {
      try {
        await room.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}
