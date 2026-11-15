import { CROP_COLORS, type RotationCrop } from "../data/rotation";

/** Color chip for a rotation crop. Decorative: the crop's name always sits beside it. */
export function CropSwatch({ crop, className = "size-3" }: { readonly crop: RotationCrop; readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-[3px] ring-1 ring-inset ring-black/15 ${className}`}
      style={{ backgroundColor: CROP_COLORS[crop] }}
    />
  );
}
