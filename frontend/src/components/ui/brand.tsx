"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="Tlaloc">
      <img src="/tlaloc-mascot.png" alt="" aria-hidden className="h-9 w-9" />
      <span className="font-display text-lg font-bold tracking-wide text-text">Tlaloc</span>
    </Link>
  );
}
