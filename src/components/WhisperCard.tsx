import type { Confession } from "@/types";
import { VeiledPhoto } from "@/components/VeiledPhoto";
import { VeiledVideo } from "@/components/VeiledVideo";
import { VeiledArt } from "@/components/VeiledArt";
import { Handle } from "@/components/Handle";
import { IdentityMeta } from "@/components/IdentityMeta";
import { VoteBar } from "@/components/VoteBar";
import { Gyro3D } from "@/components/Gyro3D";
import { fontClassFor, textFxClassFor } from "@/lib/expression";
import { proximityLabel } from "@/lib/geo";
import { cx, distanceMiles, paletteFor, timeAgo } from "@/lib/utils";

interface WhisperCardProps {
  confession: Confession;
  /** Display clarity 0..1 (community Veil + per-user NSFW). */
  level: number;
  nsfwHidden?: boolean;
  /** "tile" = mosaic cell, "full" = large card, "reader" = text-only. */
  variant?: "tile" | "full" | "reader";
  /** Pause video (off-screen in a mosaic). */
  paused?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * The signature MYVYB post: confession text set legibly over a background image
 * or video (uploaded or AI-generated) — Whisper's text-on-image soul, but with
 * MYVYB's twist that the *image* veils/unveils while the words stay readable.
 * The "reader" variant drops the image entirely for a calm, zine-like read.
 */
export function WhisperCard({
  confession,
  level,
  nsfwHidden = false,
  variant = "full",
  paused = false,
  onClick,
  className,
}: WhisperCardProps) {
  const palette = paletteFor(confession.seed);
  const hasMedia = !!confession.photo;
  const isVideo = confession.mediaKind === "video" && hasMedia;
  const tile = variant === "tile";
  const reader = variant === "reader";
  // Premium 3D gyroscopic media view — only worth it on the large card, and only
  // when there's real media to parallax (not the procedural fallback art).
  const gyro = !!confession.view3d && !reader && hasMedia && variant === "full";
  const textClass = cx(fontClassFor(confession.fontStyle), textFxClassFor(confession.textFx));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cx(
        "group relative block w-full cursor-pointer overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-veil-400/60",
        tile ? "rounded-2xl" : "rounded-3xl",
        "border border-white/8 active:scale-[0.99] transition",
        className
      )}
      style={{
        aspectRatio: tile ? "3 / 4" : reader ? undefined : "4 / 5",
        minHeight: reader ? 140 : undefined,
        background: reader
          ? `linear-gradient(155deg, ${palette[0]}22, ${palette[1]}14)`
          : "#191c22",
      }}
    >
      {/* Background layer. */}
      {!reader &&
        (() => {
          const media = isVideo ? (
            <VeiledVideo
              src={confession.photo as string}
              level={level}
              nsfw={nsfwHidden}
              clipStart={confession.clipStart}
              clipEnd={confession.clipEnd}
              paused={paused}
            />
          ) : hasMedia ? (
            <VeiledPhoto
              src={confession.photo as string}
              level={level}
              nsfw={nsfwHidden}
            />
          ) : (
            <VeiledArt seed={confession.seed} level={level} />
          );
          return gyro ? (
            <Gyro3D className="absolute inset-0" enabled>
              {media}
            </Gyro3D>
          ) : (
            media
          );
        })()}

      {/* Content overlay. */}
      <div
        className={cx(
          "relative flex h-full flex-col",
          reader ? "p-5" : "justify-end p-4"
        )}
      >
        {/* NSFW badge. */}
        {confession.nsfw && !reader && (
          <div className="absolute left-3 top-3 flex gap-1.5">
            <span className="rounded-full bg-wild/80 px-2 py-0.5 text-[10px] font-bold text-white">
              NSFW
            </span>
          </div>
        )}

        <p
          className={cx(
            textClass,
            "font-semibold text-white",
            reader
              ? "text-[15px] leading-relaxed"
              : tile
                ? "text-[13px] leading-snug line-clamp-4"
                : "text-lg leading-snug line-clamp-6",
            !reader && "drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
          )}
        >
          {confession.text}
        </p>

        <div
          className={cx(
            "mt-2 flex items-center justify-between gap-2",
            tile ? "text-[10px]" : "text-xs"
          )}
        >
          <div className="flex items-center gap-1.5 text-white/55">
            <Handle
              username={confession.username}
              emoji={confession.alias}
              size={tile ? 15 : 17}
            />
            {!tile && (
              <IdentityMeta
                gender={confession.gender}
                age={confession.age}
                location={confession.location}
                size="sm"
              />
            )}
          </div>
          <VoteBar confession={confession} size={tile ? "sm" : "md"} />
        </div>

        {!tile && (
          <span className="mt-1 text-[10px] text-white/35">
            {proximityLabel(distanceMiles(confession.distance))} · {timeAgo(confession.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
