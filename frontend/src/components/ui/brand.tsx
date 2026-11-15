"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center", className)} aria-label="Tlaloc">
      <img src="/tlaloc-mascot.png" alt="Tlaloc" className="h-11 w-11" />
    </Link>
  );
}
