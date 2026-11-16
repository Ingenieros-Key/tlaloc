"use client";

/**
 * Small segmented control: one button per option, the selected one raised. Each button reports
 * aria-pressed, and the group is labelled for screen readers.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  showLabel = false,
}: {
  readonly label: string;
  readonly options: readonly { readonly value: T; readonly label: string; readonly ariaLabel?: string }[];
  /** The selected option's value; one that matches no option leaves every button unpressed. */
  readonly value: T | "";
  readonly onChange: (value: T) => void;
  /** Show `label` to the left of the control (otherwise it is only announced). */
  readonly showLabel?: boolean;
}) {
  const control = (
    <div
      role="group"
      aria-label={label}
      className="grid flex-1 gap-0.5 rounded-md bg-surface-3 p-0.5"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={`h-7 max-lg:h-11 cursor-pointer truncate rounded px-2 text-xs font-medium transition-colors duration-150 ${
              selected ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
  if (!showLabel) return control;
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="shrink-0 text-xs text-muted">
        {label}
      </span>
      {control}
    </div>
  );
}
