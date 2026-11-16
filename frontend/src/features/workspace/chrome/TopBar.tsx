"use client";

import { Menu, PanelRight, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { t } from "../strings";
import { inspectorVisible, useWorkspace, useWorkspaceDispatch, type PanelId } from "../store";
import { IconButton } from "../ui/IconButton";
import { Brand } from "@/components/ui/brand";
import { NavLinks } from "@/components/ui/nav-links";
import { AuthControl } from "@/components/ui/auth-control";
import { LangToggle, ThemeToggle } from "@/components/ui/toggles";

const s = t.chrome.topBar;

/**
 * App bar: shared site nav (brand + links + auth), project name and the Results drawer toggle (the
 * tool rail opens the left drawer). Below lg the
 * links, language, theme and sign-in fold into a menu so the bar fits a 375 px phone.
 */
export function TopBar() {
  const { plotSummary, plotName } = useWorkspace();
  // Only show a plot name once there's a plot that's been named (not the default placeholder).
  const named = plotSummary !== null && plotName.trim() !== "" && plotName !== t.browser.plotName;
  return (
    <header className="relative z-40 flex h-[var(--tl-topbar-h)] shrink-0 items-center gap-3 border-b border-line bg-bg px-4">
      <div className="flex items-center gap-8">
        <Brand />
        <NavLinks className="max-lg:hidden" />
      </div>
      {named && (
        <>
          <span aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-line xl:block" />
          <p className="hidden min-w-0 truncate text-sm text-muted xl:block">{plotName}</p>
        </>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="flex items-center lg:hidden">
          <InspectorToggle />
          <SiteMenu />
        </div>
        <div className="flex items-center gap-3 max-lg:hidden">
          <LangToggle />
          <ThemeToggle />
          <div className="flex min-w-[12.5rem] justify-end">
            <AuthControl />
          </div>
        </div>
      </div>
    </header>
  );
}

/** The Results drawer toggle, shown only while the Inspector has something to show. */
function InspectorToggle() {
  const state = useWorkspace();
  if (!inspectorVisible(state)) return null;
  return <DrawerToggle panel="inspector" other="browser" icon={PanelRight} label={s.openResults} />;
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
 * Phone and tablet menu: site links, language, theme and sign-in. Closes on Escape (returning focus
 * to the button), an outside pointer-down, or when focus leaves it.
 */
function SiteMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

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
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    if (e.relatedTarget) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative" onBlur={onBlur}>
      <IconButton
        ref={buttonRef}
        icon={Menu}
        label={s.menu}
        aria-expanded={open}
        aria-controls={menuId}
        className="aria-expanded:bg-accent/15 aria-expanded:text-accent"
        onClick={() => setOpen((value) => !value)}
      />
      <div
        id={menuId}
        hidden={!open}
        className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-black/30"
      >
        <NavLinks vertical />
        <div className="my-1.5 h-px bg-line" />
        <div className="flex h-11 items-center justify-between px-2.5">
          <span className="text-[13px] text-muted">{s.language}</span>
          {/* Touch-sized in the menu: 44 px rows on phones. */}
          <LangToggle className="[&>button]:min-h-11 [&>button]:min-w-11" />
        </div>
        <div className="flex h-11 items-center justify-between px-2.5">
          <span className="text-[13px] text-muted">{s.themeLabel}</span>
          <ThemeToggle className="h-11 w-11" />
        </div>
        <div className="flex justify-end px-1.5 pb-1 pt-1.5">
          <AuthControl className="min-h-11" />
        </div>
      </div>
    </div>
  );
}
