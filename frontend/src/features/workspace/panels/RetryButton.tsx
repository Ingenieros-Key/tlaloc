"use client";

import { t } from "../strings";

/** Small text button for retrying a failed NASA request. */
export function RetryButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 max-lg:h-11 shrink-0 cursor-pointer items-center rounded-md px-2 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
    >
      {t.browser.precip.retry}
    </button>
  );
}
