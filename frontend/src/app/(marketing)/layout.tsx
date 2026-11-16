"use client";

import { SiteNav } from "@/components/ui/site-nav";

/** Persistent marketing chrome: the nav stays mounted across home/about so it never reloads. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-x-0 top-0 z-40">
        <SiteNav />
      </div>
      {children}
    </div>
  );
}
