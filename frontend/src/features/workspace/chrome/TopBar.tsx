"use client";

import { Home, Info, LogIn, LogOut, Moon, PanelLeft, PanelRight, Sun, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { t } from "../strings";
import { useWorkspace, useWorkspaceDispatch, type PanelId } from "../store";
import { Badge } from "../ui/Badge";
import { IconButton } from "../ui/IconButton";
import { AuthModal } from "@/components/ui/auth-modal";
import { applyTheme, readStoredTheme, type Theme } from "@/lib/theme";
import "@/lib/amplify";

const s = t.chrome.topBar;

const barBtn =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-line px-3 text-sm font-medium text-text transition-colors duration-150 hover:border-line-strong hover:bg-surface-3 max-sm:size-11 max-sm:px-0";

/** App bar: brand, project name, sample-data notice, drawer toggles (below lg) and sign-in. */
export function TopBar() {
  const [modalOpen, setModalOpen] = useState(false);
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [theme, setTheme] = useState<Theme>("dark");

  const refresh = () =>
    getCurrentUser().then(() => setAuth("in")).catch(() => setAuth("out"));

  useEffect(() => {
    refresh();
    const saved = readStoredTheme();
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const toggleTheme = () =>
    setTheme((p) => {
      const next: Theme = p === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });

  return (
    <header className="relative z-40 flex h-[var(--tl-topbar-h)] shrink-0 items-center gap-2 border-b border-line bg-bg px-3">
      <div className="flex shrink-0 items-center gap-2">
        <Image src="/favicon.svg" alt="" width={22} height={22} className="size-[22px]" unoptimized />
        <h1 className="font-display text-base font-semibold tracking-wide text-text max-[359px]:sr-only">{t.common.appName}</h1>
      </div>
      <span aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-line sm:block" />
      <p className="hidden min-w-0 truncate text-sm text-muted sm:block">
        <span className="sr-only">{s.projectLabel} </span>
        {s.projectName}
      </p>
      <SampleDataNotice />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <div className="flex items-center lg:hidden">
          <DrawerToggle panel="browser" other="inspector" icon={PanelLeft} label={s.openLayers} />
          <DrawerToggle panel="inspector" other="browser" icon={PanelRight} label={s.openResults} />
        </div>
        <Link href="/" className={`${barBtn} max-sm:px-0 sm:px-0 sm:w-9`} title={s.home} aria-label={s.home}>
          <Home aria-hidden="true" className="size-4" strokeWidth={1.75} />
          <span className="sr-only">{s.home}</span>
        </Link>
        <button type="button" onClick={toggleTheme} className={`${barBtn} sm:px-0 sm:w-9`} title={s.theme} aria-label={s.theme}>
          {theme === "dark" ? (
            <Sun aria-hidden="true" className="size-4" strokeWidth={1.75} />
          ) : (
            <Moon aria-hidden="true" className="size-4" strokeWidth={1.75} />
          )}
        </button>
        {auth === "in" ? (
          <button
            type="button"
            onClick={() => signOut().then(() => setAuth("out")).catch(() => setAuth("out"))}
            className={barBtn}
            title={s.signOut}
            aria-label={s.signOut}
          >
            <LogOut aria-hidden="true" className="size-4 sm:hidden" strokeWidth={1.75} />
            <span className="max-sm:sr-only">{s.signedIn}</span>
          </button>
        ) : (
          <button type="button" onClick={() => setModalOpen(true)} className={barBtn}>
            <LogIn aria-hidden="true" className="size-4 sm:hidden" strokeWidth={1.75} />
            <span className="max-sm:sr-only">{s.signIn}</span>
          </button>
        )}
      </div>
      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} lang="en" onAuthed={refresh} />
    </header>
  );
}

function DrawerToggle({
  panel,
  other,
  icon,
  label,
}: {
  readonly panel: PanelId;
  readonly other: PanelId;
  readonly icon: LucideIcon;
  readonly label: string;
}) {
  const { panels } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const open = panels[panel];
  return (
    <IconButton
      icon={icon}
      label={label}
      aria-expanded={open}
      aria-controls={`dock-${panel}`}
      className="aria-expanded:bg-accent/15 aria-expanded:text-accent"
      onClick={() => {
        dispatch({ type: "setPanel", panel, open: !open });
        if (!open) dispatch({ type: "setPanel", panel: other, open: false });
      }}
    />
  );
}

/**
 * "Sample data" badge as a disclosure button: the explanation is reachable by click, tap and
 * keyboard (not hover-only). Closes on Escape, outside pointer-down or when focus leaves it.
 */
function SampleDataNotice() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && rootRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      if (rootRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    if (e.relatedTarget) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0" onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((value) => !value)}
        className="-mx-1 inline-flex h-9 cursor-pointer max-lg:h-11 items-center rounded-md px-1 transition-opacity duration-150 hover:opacity-85"
      >
        <Badge tone="accent">
          <Info aria-hidden="true" className="size-3.5" strokeWidth={2} />
          {t.common.sampleData}
        </Badge>
      </button>
      <div
        id={popoverId}
        role="region"
        aria-labelledby={titleId}
        hidden={!open}
        className="z-50 rounded-lg border border-line-strong bg-surface-2 p-3 shadow-lg shadow-black/40 max-sm:fixed max-sm:inset-x-4 max-sm:top-[calc(var(--tl-topbar-h)+0.25rem)] sm:absolute sm:left-0 sm:top-full sm:mt-1 sm:w-72"
      >
        <p id={titleId} className="text-sm font-semibold text-text">
          {s.sampleDataTitle}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{t.common.sampleDataHint}</p>
      </div>
    </div>
  );
}
