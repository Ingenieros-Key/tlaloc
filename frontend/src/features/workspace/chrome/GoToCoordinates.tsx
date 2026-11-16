"use client";

import { LocateFixed, MousePointerClick } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type FormEvent,
} from "react";
import { useMapController, useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import { IconButton } from "../ui/IconButton";

const s = t.chrome.nav.goTo;

type Field = "lat" | "lng";
const LIMIT: Readonly<Record<Field, number>> = { lat: 90, lng: 180 };

/** Parses one decimal-degree value; accepts a Unicode minus. Null when not a number in range. */
function parseDegrees(raw: string, field: Field): number | null {
  const text = raw.trim().replace(/−/g, "-");
  if (text === "") return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= LIMIT[field]
    ? value
    : null;
}

/** Field text for a pin coordinate: 5 decimals is about a metre. */
function formatDegrees(value: number): string {
  return value.toFixed(5);
}

/** "13.69, -89.21" or "13.69 -89.21" → ["13.69", "-89.21"]; null for anything else. */
function splitPair(text: string): [string, string] | null {
  const parts = text
    .trim()
    .replace(/−/g, "-")
    .split(/[\s,;]+/)
    .filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

/**
 * Nav bar button + popover form that flies the map to a latitude/longitude and drops a pin there.
 * The popover is positioned against the nav bar (its nearest positioned ancestor) so it stays
 * centred above the bar instead of overflowing small screens. Closes on Escape, outside
 * pointer-down or when focus leaves it.
 */
export function GoToCoordinates() {
  const { pin, picking } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const controller = useMapController();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<Field, string>>({
    lat: "",
    lng: "",
  });
  const [errors, setErrors] = useState<Record<Field, boolean>>({
    lat: false,
    lng: false,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const id = useId();

  // The pin can also move by dragging or "Pick on map"; mirror it into the fields when it does.
  const [shownPin, setShownPin] = useState(pin);
  if (pin !== shownPin) {
    setShownPin(pin);
    if (pin) {
      setValues({ lat: formatDegrees(pin[1]), lng: formatDegrees(pin[0]) });
      setErrors({ lat: false, lng: false });
    }
  }

  // While picking, Escape cancels it (the popover is closed then, so its own handler is idle).
  useEffect(() => {
    if (!picking) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      dispatch({ type: "setPicking", picking: false });
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [picking, dispatch]);

  useEffect(() => {
    if (!open) return;
    latRef.current?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && rootRef.current?.contains(e.target))
        return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (
      e.relatedTarget instanceof Node &&
      e.currentTarget.contains(e.relatedTarget)
    )
      return;
    if (e.relatedTarget) setOpen(false);
  };

  const setField = (field: Field, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pair = splitPair(e.clipboardData.getData("text"));
    if (!pair) return;
    e.preventDefault();
    setValues({ lat: pair[0], lng: pair[1] });
    setErrors({ lat: false, lng: false });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const lat = parseDegrees(values.lat, "lat");
    const lng = parseDegrees(values.lng, "lng");
    setErrors({ lat: lat === null, lng: lng === null });
    if (lat === null || lng === null) {
      (lat === null ? latRef : lngRef).current?.focus();
      return;
    }
    dispatch({ type: "setPin", pin: [lng, lat] });
    controller.get()?.goTo([lng, lat]);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const field = (
    name: Field,
    label: string,
    placeholder: string,
    error: string,
  ) => {
    const inputId = `${id}-${name}`;
    const errorId = `${inputId}-error`;
    return (
      <div className="min-w-0 flex-1">
        <label
          htmlFor={inputId}
          className="mb-1 block text-xs font-medium text-muted"
        >
          {label}
        </label>
        <input
          ref={name === "lat" ? latRef : lngRef}
          id={inputId}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={values[name]}
          onChange={(e) => setField(name, e.target.value)}
          onPaste={onPaste}
          aria-invalid={errors[name]}
          aria-describedby={errors[name] ? errorId : undefined}
          className="tabular h-9 w-full rounded-md border border-line-strong bg-surface px-2 font-mono text-sm text-text placeholder:text-muted/60 focus-visible:border-accent aria-invalid:border-poor max-lg:h-11"
        />
        {errors[name] ? (
          <p id={errorId} className="mt-1 text-xs text-poor">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div ref={rootRef} onBlur={onBlur} className="flex items-center gap-0.5">
      <IconButton
        ref={buttonRef}
        icon={LocateFixed}
        label={s.button}
        aria-expanded={open}
        aria-controls={`${id}-popover`}
        className="aria-expanded:bg-accent/15 aria-expanded:text-accent"
        onClick={() => {
          if (picking) dispatch({ type: "setPicking", picking: false });
          setOpen((value) => !value);
        }}
      />
      <IconButton
        icon={MousePointerClick}
        label={s.pick}
        pressed={picking}
        onClick={() => {
          dispatch({ type: "setPicking", picking: !picking });
          setOpen(false);
        }}
      />
      {picking ? (
        <div
          role="status"
          className="absolute bottom-full left-1/2 z-30 mb-2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-lg border border-line-strong bg-surface-2 py-1 pl-3 pr-1 text-[13px] text-text shadow-lg shadow-black/40"
        >
          <MousePointerClick
            aria-hidden="true"
            strokeWidth={1.75}
            className="size-4 shrink-0 text-accent"
          />
          <span>{s.pickHint}</span>
          <button
            type="button"
            onClick={() => dispatch({ type: "setPicking", picking: false })}
            className="inline-flex h-8 cursor-pointer items-center rounded-md px-2 text-xs font-medium text-muted transition-colors duration-150 hover:bg-surface-3 hover:text-text max-lg:h-11"
          >
            {s.cancelPick}
          </button>
        </div>
      ) : null}
      <div
        id={`${id}-popover`}
        role="dialog"
        aria-labelledby={`${id}-title`}
        hidden={!open}
        className="absolute bottom-full left-1/2 z-30 mb-2 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-line-strong bg-surface-2 p-3 shadow-lg shadow-black/40"
      >
        <div className="mb-2 flex h-6 items-center justify-between gap-2">
          <p id={`${id}-title`} className="text-sm font-semibold text-text">
            {s.title}
          </p>
          {pin ? (
            <button
              type="button"
              onClick={() => dispatch({ type: "setPin", pin: null })}
              className="-mr-1 cursor-pointer rounded px-1 text-xs font-medium text-muted transition-colors duration-150 hover:text-text max-lg:min-h-11"
            >
              {s.clearPin}
            </button>
          ) : null}
        </div>
        <form noValidate onSubmit={onSubmit} className="flex items-start gap-2">
          {field("lat", s.latitude, s.latitudePlaceholder, s.latitudeError)}
          {field("lng", s.longitude, s.longitudePlaceholder, s.longitudeError)}
          {/* Spacer label keeps the button level with the inputs, under their labels. */}
          <div className="shrink-0">
            <span aria-hidden="true" className="mb-1 block text-xs">
              &nbsp;
            </span>
            <button
              type="submit"
              className="inline-flex h-9 cursor-pointer items-center rounded-md bg-accent px-3 text-[13px] font-semibold text-on-accent transition-colors duration-150 hover:bg-accent/85 max-lg:h-11"
            >
              {s.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
