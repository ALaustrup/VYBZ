import { useCamCall } from "@/lib/camCall";
import { VideoMessageSheet } from "@/components/VideoMessageSheet";

/** Opens HQ ≤30s video message when cam is attempted with an offline peer. */
export function VideoMessageHost() {
  const { videoMessage, clearVideoMessage } = useCamCall();
  if (!videoMessage) return null;
  return (
    <VideoMessageSheet
      open
      threadId={videoMessage.threadId}
      peerName={videoMessage.peerName}
      onClose={clearVideoMessage}
    />
  );
}
