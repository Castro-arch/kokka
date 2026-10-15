import { CheckIcon } from "@/components/icons";
import type { Lifecycle, LifecycleStep } from "@/lib/lifecycle";

/** "Ciclo do evento": four steps on a line filled in green up to the current one. */
export function LifecycleSteps({ lifecycle }: { lifecycle: Lifecycle }) {
  const progress = `${String(Math.round(lifecycle.progress * 1000) / 10)}%`;
  return (
    <section
      aria-labelledby="lifecycle-title"
      className="flex flex-col gap-3.5 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5"
    >
      <h2 id="lifecycle-title" className="text-[19px] font-black">
        Ciclo do evento
      </h2>
      <div className="relative">
        {/* The line runs between the centers of the first and last circles. */}
        <div
          aria-hidden="true"
          className="absolute top-[21px] right-[12.5%] left-[12.5%] h-1.5 overflow-hidden rounded-full bg-line"
        >
          <div className="h-full rounded-full bg-ok" style={{ width: progress }} />
        </div>
        <ol className="relative grid grid-cols-4">
          {lifecycle.steps.map((step) => (
            <Step key={step.status} step={step} />
          ))}
        </ol>
      </div>
      <p className="text-sm font-bold text-ink-soft">{lifecycle.note}</p>
    </section>
  );
}

function Step({ step }: { step: LifecycleStep }) {
  const number = String(["draft", "active", "closed", "expired"].indexOf(step.status) + 1);
  return (
    <li
      aria-current={step.state === "current" ? "step" : undefined}
      className="flex flex-col items-center gap-2 text-center"
    >
      {step.state === "done" ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full border-b-[5px] border-ok-edge bg-ok text-white">
          <CheckIcon className="h-5.5 w-5.5" strokeWidth={3} />
          <span className="sr-only">Concluído:</span>
        </span>
      ) : step.state === "current" ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full border-b-[5px] border-brand-edge bg-brand-strong text-lg font-black text-white shadow-[0_0_0_6px_var(--color-active)]">
          {number}
        </span>
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-b-[5px] border-line bg-white text-lg font-black text-ink-soft">
          {number}
        </span>
      )}
      <span
        className={`text-sm font-black ${
          step.state === "current"
            ? "text-brand-edge"
            : step.state === "todo"
              ? "text-ink-soft"
              : ""
        }`}
      >
        {step.label}
      </span>
      <span className="text-xs font-extrabold text-ink-soft">{step.date}</span>
    </li>
  );
}
