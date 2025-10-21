import React from "react";
import { IconBase, IconProps } from "../icon-base";

/**
 * CommonIcon - Role indicator for Common (Citizen) player
 *
 * PLACEHOLDER: This component contains a temporary user icon.
 * Replace the SVG path content with the optimized vector from common.svg
 * once proper SVG file is available.
 *
 * Expected visual: Simple human silhouette (circle head + body)
 *
 * @example
 * ```tsx
 * <CommonIcon size={20} aria-label="庶民" className="text-gray-500" />
 * ```
 */
export function CommonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* PLACEHOLDER: Replace with actual common.svg path */}
      {/* Temporary user icon (circle + body) */}
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </IconBase>
  );
}
