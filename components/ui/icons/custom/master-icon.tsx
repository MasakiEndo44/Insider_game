import React from "react";
import { IconBase, IconProps } from "../icon-base";

/**
 * MasterIcon - Role indicator for Master player
 *
 * PLACEHOLDER: This component contains a temporary crown icon.
 * Replace the SVG path content with the optimized vector from master.svg
 * once proper SVG file is available.
 *
 * Expected visual: Crown shape with 3 peaks
 *
 * @example
 * ```tsx
 * <MasterIcon size={20} aria-label="マスター" className="text-blue-500" />
 * ```
 */
export function MasterIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* PLACEHOLDER: Replace with actual master.svg path */}
      {/* Temporary crown icon (3 triangular peaks) */}
      <path d="M2 20h20v-2H2v2zm2-8l4 4 4-4 4 4 4-4v8H4v-8z" />
      <path d="M12 2L8 10l4 4 4-4-4-8z" />
    </IconBase>
  );
}
