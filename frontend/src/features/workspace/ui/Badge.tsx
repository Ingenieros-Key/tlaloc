import type { ReactNode } from "react";
import type { Rating } from "../types";

type Tone = Rating | "neutral" | "accent";

const TONES: Readonly<Record<Tone, string>> = {
  good: "bg-good/15 text-good ring-good/40",
  fair: "bg-fair/15 text-fair ring-fair/40",
  poor: "bg-poor/15 text-poor ring-poor/40",
  neutral: "bg-surface-3 text-muted ring-line-strong",
  accent: "bg-accent/15 text-accent ring-accent/40",
};

/** Compact single-line status pill. Never relies on color alone: always pass a text label. */
export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  readonly tone?: Tone;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
