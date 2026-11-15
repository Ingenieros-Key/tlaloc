"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Info, Map } from "lucide-react";
import { useLang } from "@/lib/i18n-store";
import { navCopy } from "./i18n";
import { cn } from "@/lib/utils";

/** Site links. `vertical` stacks them as full-width 44 px rows (used in the workspace phone menu). */
export function NavLinks({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  const pathname = usePathname();
  const t = navCopy[useLang()];
  const items = [
    { href: "/", label: t.home, icon: Home },
    { href: "/about", label: t.about, icon: Info },
    { href: "/workspace", label: t.workspace, icon: Map },
  ];
  return (
    <nav className={cn(vertical ? "flex flex-col gap-0.5" : "flex items-center gap-6", className)}>
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              vertical
                ? "flex h-11 items-center gap-2 rounded-md px-2.5 font-mono text-sm transition-colors"
                : "group relative inline-flex items-center gap-2 py-1 font-mono text-sm transition-colors",
              vertical
                ? active
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-text hover:bg-surface-3"
                : active
                  ? "text-text"
                  : "text-muted hover:text-text",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>{item.label}</span>
            {vertical ? null : <span
              aria-hidden
              className={cn(
                "absolute inset-x-0 -bottom-0.5 h-[2px] origin-left bg-accent transition-transform duration-200",
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
              )}
            />}
          </Link>
        );
      })}
    </nav>
  );
}
