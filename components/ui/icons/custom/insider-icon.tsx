import React from "react";
import { IconBase, IconProps } from "../icon-base";

/**
 * InsiderIcon - Role indicator for Insider player
 *
 * PLACEHOLDER: This component contains a temporary eye icon.
 * Replace the SVG path content with the optimized vector from insider.svg
 * once proper SVG file is available.
 *
 * Expected visual: Eye shape with pupil (ellipse + circle)
 *
 * @example
 * ```tsx
 * <InsiderIcon size={20} aria-label="インサイダー" className="text-red-500" />
 * ```
 */
export function InsiderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* PLACEHOLDER: Replace with actual insider.svg path */}
      {/* Temporary eye icon (ellipse + pupil) */}
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}
