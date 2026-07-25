import { useReduceFx } from "@/lib/display";
import { voiceSlotHex, type VoiceSlotColor } from "@/lib/voiceSlots";
import { cx } from "@/lib/utils";

/** Tricolor voice occupancy light (Green / Yellow / Pink). */
export function VoiceSlotDot({
  color,
  pulse = true,
  className,
  title,
}: {
  color: VoiceSlotColor;
  pulse?: boolean;
  className?: string;
  title?: string;
}) {
  const reduce = useReduceFx();
  const hex = voiceSlotHex(color);
  return (
    <span
      title={title}
      aria-label={title ?? `${color} voice slot`}
      className={cx(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        !reduce && pulse && "voice-slot-pulse",
        className,
      )}
      style={{
        backgroundColor: hex,
        boxShadow: reduce ? undefined : `0 0 8px -1px ${hex}`,
      }}
    />
  );
}
