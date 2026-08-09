import { useEffect, useState } from "react";
import { Bug } from "lucide-react";
import { ReportBugModal } from "@/components/ReportBugModal";
import { OPEN_FEEDBACK_EVENT, PULSE_FAB_EVENT } from "@/features/alpha/AlphaWelcomeTour";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Always-on Alpha feedback entry — glowing bug FAB + shared report modal.
 */
export function AlphaFeedbackFab() {
  const reduce = useReduceFx();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    function onPulse() {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 4200);
    }
    window.addEventListener(OPEN_FEEDBACK_EVENT, onOpen);
    window.addEventListener(PULSE_FAB_EVENT, onPulse);
    return () => {
      window.removeEventListener(OPEN_FEEDBACK_EVENT, onOpen);
      window.removeEventListener(PULSE_FAB_EVENT, onPulse);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          "alpha-feedback-fab",
          !reduce && "alpha-feedback-fab--glow",
          pulse && !reduce && "alpha-feedback-fab--pulse",
        )}
        aria-label="Report a bug or send feedback"
        data-testid="alpha-feedback-fab"
        title="Feedback / bug report"
      >
        <Bug className="h-5 w-5" aria-hidden />
      </button>
      <ReportBugModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
