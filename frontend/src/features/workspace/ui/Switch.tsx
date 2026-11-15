"use client";

/**
 * Full-row on/off switch: the whole row is the control (44px tall below lg, 40px in dense desktop
 * panels), with the label, an optional description and a track that is never color-only (the thumb
 * moves too).
 */
export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-surface-3 max-lg:min-h-11"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-text">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 ${
          checked ? "bg-accent" : "bg-line-strong"
        }`}
      >
        <span
          className={`absolute left-0.5 size-4 rounded-full bg-surface shadow transition-transform duration-150 ease-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
