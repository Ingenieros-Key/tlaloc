import type { CropId } from "../types";

/** Line icons for the three crops, drawn in currentColor so they take the rating color. */
export function CropIcon({ crop, className = "" }: { readonly crop: CropId; readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {crop === "corn" ? (
        <>
          {/* Cob with kernel rows and two husk leaves. */}
          <path d="M12 3c2.2 0 3.5 2.6 3.5 6.5S14.2 17 12 17s-3.5-3.6-3.5-7.5S9.8 3 12 3z" />
          <path d="M12 3v14M9 8h6M9 12h6" />
          <path d="M12 21c-1.5-2-4.5-3-6.5-6.5M12 21c1.5-2 4.5-3 6.5-6.5" />
        </>
      ) : crop === "beans" ? (
        <>
          {/* Two beans side by side. */}
          <path d="M8.5 4.5c2.5 0 3.5 2 2.8 4.2-.5 1.6-.2 2.8.6 4.2 1.2 2.2-.2 5.6-3.4 5.6S4 15.8 4 11.5 5.6 4.5 8.5 4.5z" />
          <path d="M16 6c2.6 0 4 2.6 4 6s-1.4 6-4 6c-2 0-3.2-1.6-2.8-3.4.3-1.2 1-2 1-3.4 0-1.6-1.4-2.4-1-3.6.3-.9 1.4-1.6 2.8-1.6z" />
        </>
      ) : (
        <>
          {/* Sorghum: stalk with a grain head and a leaf. */}
          <path d="M12 21V10" />
          <path d="M12 10c-2 0-3-1.6-3-3.5S10.4 3 12 3s3 1.6 3 3.5S14 10 12 10z" />
          <path d="M10 6.5h4M12 15c-2.5-.5-4.5-2-5.5-4M12 17c2.5-.5 4.5-2 5.5-4" />
        </>
      )}
    </svg>
  );
}
