import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { MapPin, Maximize2, MessagesSquare, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { CONFESSIONS, OWN_CONFESSIONS } from "@/data/confessions";
import { VeiledArt } from "@/components/VeiledArt";
import { VeiledPhoto } from "@/components/VeiledPhoto";
import { VeiledVideo } from "@/components/VeiledVideo";
import { Handle } from "@/components/Handle";
import { IdentityMeta } from "@/components/IdentityMeta";
import { SafetyMenu } from "@/components/SafetyMenu";
import { VoteBar } from "@/components/VoteBar";
import { Gyro3D } from "@/components/Gyro3D";
import { fontClassFor, textFxClassFor } from "@/lib/expression";
import { proximityLabel } from "@/lib/geo";
import { cx, distanceMiles } from "@/lib/utils";
import type { Confession } from "@/types";

/**
 * Single-post viewer, opened from a notification. Shows the confession with a
 * Comment action and a Message action (a direct line to the poster).
 */
export function PostSheet() {
  const {
    activePostId,
    closePost,
    backendConfessions,
    userConfessions,
    openConnection,
    openMedia,
  } = useApp();
  const navigate = useNavigate();
  const dragControls = useDragControls();

  const confession: Confession | undefined = useMemo(() => {
    if (!activePostId) return undefined;
    return (
      [
        ...backendConfessions,
        ...userConfessions,
        ...CONFESSIONS,
        ...OWN_CONFESSIONS,
      ].find((c) => c.id === activePostId) ?? undefined
    );
  }, [activePostId, backendConfessions, userConfessions]);

  function comment() {
    if (!confession) return;
    closePost();
    openConnection(confession.id, "comments");
  }

  return (
    <AnimatePresence>
      {confession && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePost}
            className="fixed inset-0 z-[57] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) closePost();
            }}
            className="fixed inset-x-0 bottom-0 z-[57] mx-auto flex max-h-[92%] max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900"
          >
            {/* Drag handle — swipe down to dismiss. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex shrink-0 cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
            >
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>
            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
              <SafetyMenu confession={confession} />
              <button
                onClick={closePost}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="no-scrollbar overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
              {/* Fully-revealed artwork. One tap opens the fitted media viewer. */}
              <div
                onClick={() => confession.photo && openMedia(confession.id)}
                className={cx(
                  "relative h-64 w-full overflow-hidden rounded-2xl border border-white/10",
                  confession.photo && "cursor-pointer"
                )}
              >
                {confession.view3d && confession.photo ? (
                  <Gyro3D className="absolute inset-0" enabled>
                    {confession.mediaKind === "video" ? (
                      <VeiledVideo
                        src={confession.photo}
                        level={1}
                        scrim={false}
                        clipStart={confession.clipStart}
                        clipEnd={confession.clipEnd}
                      />
                    ) : (
                      <VeiledPhoto src={confession.photo} level={1} scrim={false} />
                    )}
                  </Gyro3D>
                ) : confession.mediaKind === "video" && confession.photo ? (
                  <VeiledVideo
                    src={confession.photo}
                    level={1}
                    scrim={false}
                    clipStart={confession.clipStart}
                    clipEnd={confession.clipEnd}
                  />
                ) : confession.photo ? (
                  <VeiledPhoto src={confession.photo} level={1} scrim={false} />
                ) : (
                  <VeiledArt seed={confession.seed} level={0.95} />
                )}
                {confession.photo && (
                  <>
                    {confession.nsfw && (
                      <span className="absolute left-3 top-3 rounded-full bg-wild/85 px-2 py-0.5 text-[10px] font-bold text-white">
                        NSFW
                      </span>
                    )}
                    <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
                      <Maximize2 className="h-3 w-3" />
                      Tap to view
                    </span>
                  </>
                )}
              </div>

              <p
                className={cx(
                  fontClassFor(confession.fontStyle),
                  textFxClassFor(confession.textFx),
                  "mt-4 text-xl leading-snug text-white"
                )}
              >
                {confession.text}
              </p>

              <div className="mt-3 flex items-center justify-between text-sm text-white/70">
                {confession.authorId ? (
                  <button
                    onClick={() => {
                      closePost();
                      navigate(`/u/${confession.authorId}`);
                    }}
                    className="active:scale-95"
                    aria-label="View profile"
                  >
                    <Handle
                      username={confession.username}
                      emoji={confession.alias}
                      size={18}
                    />
                  </button>
                ) : (
                  <Handle
                    username={confession.username}
                    emoji={confession.alias}
                    size={18}
                  />
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {proximityLabel(distanceMiles(confession.distance))}
                </span>
              </div>
              <IdentityMeta
                gender={confession.gender}
                age={confession.age}
                location={confession.location}
                className="mt-2"
              />

              {/* Core mechanic — Vyb / Fail, front and center on the post. */}
              <div className="mt-4">
                <VoteBar confession={confession} size="lg" />
              </div>

              {/* Action — comment publicly (DMing posters from the feed is off). */}
              <div className="mt-4">
                <button onClick={comment} className="btn btn-primary w-full py-3.5">
                  <MessagesSquare className="h-4 w-4" />
                  Comment
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
