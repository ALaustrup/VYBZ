import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

export type ForgeAtmosphereIntensity = "subtle" | "normal" | "hero";

type ForgeAtmosphereProps = {
  intensity?: ForgeAtmosphereIntensity;
  /** Include oscilloscope ribbon (tool stages / home). */
  wave?: boolean;
  className?: string;
};

/**
 * Shared cyber / synthwave atmosphere — conduits + optional sound-wave ribbon.
 * Pointer-events none; opacity kept low for readability.
 */
export function ForgeAtmosphere({
  intensity = "subtle",
  wave = false,
  className,
}: ForgeAtmosphereProps) {
  const reduce = useReduceFx();

  return (
    <div
      className={cx(
        "forge-atmosphere",
        intensity === "subtle" && "forge-atmosphere--subtle",
        intensity === "hero" && "forge-atmosphere--hero",
        className,
      )}
      aria-hidden
      data-testid="forge-atmosphere"
    >
      <div className="forge-atmosphere__hex" />
      <svg className="forge-atmosphere__pipelines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="forge-atmosphere__pipe forge-atmosphere__pipe--dim" d="M0 22 H100" />
        <path className="forge-atmosphere__pipe forge-atmosphere__pipe--dim" d="M0 78 H100" />
        <path className="forge-atmosphere__pipe" d="M8 0 V100" />
        <path className="forge-atmosphere__pipe" d="M92 0 V100" />
        <path className="forge-atmosphere__pipe forge-atmosphere__pipe--dim" d="M0 48 H42 L48 42 H100" />
        <path className="forge-atmosphere__pipe forge-atmosphere__pipe--dim" d="M0 58 H55 L62 65 H100" />
        {!reduce && (
          <>
            <path className="forge-atmosphere__energy" d="M0 22 H100" />
            <path className="forge-atmosphere__energy forge-atmosphere__energy--slow" d="M8 0 V100" />
            <path className="forge-atmosphere__energy" d="M0 48 H42 L48 42 H100" />
          </>
        )}
      </svg>
      {wave && (
        <svg className="forge-atmosphere__wave" viewBox="0 0 400 64" preserveAspectRatio="none">
          <path d="M0 32 Q25 8 50 32 T100 32 T150 32 T200 32 T250 32 T300 32 T350 32 T400 32" />
          <path d="M0 40 Q30 20 60 40 T120 40 T180 40 T240 40 T300 40 T360 40 T400 40" />
        </svg>
      )}
      <div className="forge-atmosphere__veil" />
    </div>
  );
}
