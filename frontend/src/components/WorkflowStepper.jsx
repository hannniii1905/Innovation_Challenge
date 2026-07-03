import { STAGE } from "../lib/format";

// The four user-facing pipeline steps, mapped to backend stages.
const STEPS = [
  { key: "upload", label: "Upload", stages: [STAGE.UPLOADED] },
  { key: "extraction", label: "Extraction", stages: [STAGE.EXTRACTING] },
  {
    key: "verification",
    label: "Verification",
    stages: [STAGE.AWAITING_VERIFICATION],
  },
  {
    key: "results",
    label: "Results",
    stages: [STAGE.ANALYZING, STAGE.COMPLETED],
  },
];

// Logical progression order used to decide which steps are complete.
const ORDER = [
  STAGE.UPLOADED,
  STAGE.EXTRACTING,
  STAGE.AWAITING_VERIFICATION,
  STAGE.ANALYZING,
  STAGE.COMPLETED,
];

function stageRank(stage) {
  const idx = ORDER.indexOf(stage);
  return idx === -1 ? 0 : idx;
}

/**
 * Horizontal pipeline tracker. Driven by the `stage` prop (the parent polls
 * GET /status). Highlights the active step, shows checkmarks for completed
 * steps, and renders a failed state when stage === "failed".
 *
 * Steps can be made clickable for backward navigation by passing
 * `navigableSteps` (an array of step keys) and an `onStepClick(key)` handler.
 * Only the listed steps render as interactive.
 */
export default function WorkflowStepper({
  stage = STAGE.UPLOADED,
  navigableSteps = [],
  onStepClick,
}) {
  const failed = stage === STAGE.FAILED;
  const currentRank = stageRank(stage);

  return (
    <nav className="card px-6 py-6" aria-label="Workflow progress">
      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const stepRank = ORDER.indexOf(step.stages[0]);
          const reachedEnd = stage === STAGE.COMPLETED;
          // When the pipeline is done, every step (including the final
          // "Results" step) is complete — so none should keep spinning.
          const isActive =
            !failed && !reachedEnd && step.stages.includes(stage);
          const isComplete =
            !failed && (stepRank < currentRank || reachedEnd);
          const isLast = index === STEPS.length - 1;

          const isNavigable =
            typeof onStepClick === "function" &&
            navigableSteps.includes(step.key);
          const handleClick = () => {
            if (isNavigable) onStepClick(step.key);
          };

          const StepTag = isNavigable ? "button" : "div";

          return (
            <li
              key={step.key}
              className={`flex items-center ${isLast ? "" : "flex-1"}`}
            >
              <StepTag
                type={isNavigable ? "button" : undefined}
                onClick={isNavigable ? handleClick : undefined}
                disabled={isNavigable ? false : undefined}
                aria-label={
                  isNavigable ? `Go back to ${step.label}` : undefined
                }
                title={isNavigable ? `Go back to ${step.label}` : undefined}
                className={[
                  "flex flex-col items-center text-center transition",
                  isNavigable
                    ? "cursor-pointer rounded-xl px-2 py-1 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    : "",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300",
                    isComplete
                      ? "border-brand-500 bg-brand-500 text-white"
                      : isActive
                        ? "border-brand-500 bg-white text-brand-600 animate-pulse-ring"
                        : "border-slate-200 bg-white text-slate-400",
                    isNavigable ? "group-hover:scale-105" : "",
                  ].join(" ")}
                >
                  {isComplete ? (
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : isActive ? (
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-90"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={[
                    "mt-2 text-xs font-semibold tracking-wide transition-colors",
                    isActive
                      ? "text-brand-600"
                      : isComplete
                        ? "text-slate-700"
                        : "text-slate-400",
                  ].join(" ")}
                >
                  {step.label}
                  {isNavigable && (
                    <span className="ml-1 text-[10px] font-medium text-brand-500">
                      ←
                    </span>
                  )}
                </span>
              </StepTag>

              {!isLast && (
                <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500"
                    style={{ width: isComplete ? "100%" : "0%" }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {failed && (
        <p className="mt-4 text-center text-sm font-medium text-red-600">
          Processing failed. Please start over with a different document.
        </p>
      )}
    </nav>
  );
}
