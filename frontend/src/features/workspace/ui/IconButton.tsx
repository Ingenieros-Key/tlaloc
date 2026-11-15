"use client";

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  readonly icon: LucideIcon;
  /** Accessible name; also shown as the native tooltip. Required: icon-only buttons need a label. */
  readonly label: string;
  /** Toggle buttons pass `pressed`; renders aria-pressed and the active style. */
  readonly pressed?: boolean;
  readonly size?: "sm" | "md";
};

/**
 * Square icon-only button. Hit area is 44px (md), or 36px (sm) in dense desktop panels; sm grows to
 * 44px below lg, where panels become touch drawers.
 */
export function IconButton({
  icon: Icon,
  label,
  pressed,
  size = "md",
  className = "",
  type = "button",
  ...rest
}: IconButtonProps) {
  const box = size === "sm" ? "size-9 max-lg:size-11" : "size-11";
  const state =
    pressed === true
      ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
      : "text-muted hover:bg-surface-3 hover:text-text";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`inline-flex ${box} shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${state} ${className}`}
      {...rest}
    >
      <Icon aria-hidden="true" className={size === "sm" ? "size-4" : "size-5"} strokeWidth={1.75} />
    </button>
  );
}
