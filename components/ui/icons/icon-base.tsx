import React from "react";
import { cn } from "@/lib/utils";

export interface IconProps extends React.SVGAttributes<SVGElement> {
  /**
   * Icon size in pixels (width and height)
   * @default 24
   */
  size?: number;

  /**
   * Stroke width in pixels
   * @default 2
   */
  strokeWidth?: number;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Accessible label for screen readers
   * Required for informational icons, omit for decorative icons
   */
  "aria-label"?: string;

  /**
   * Hide icon from screen readers
   * Auto-set to true if aria-label is not provided
   */
  "aria-hidden"?: boolean;
}

/**
 * IconBase - Unified interface for all icons (lucide-react + custom SVG)
 *
 * Features:
 * - Consistent size/strokeWidth API matching lucide-react
 * - Automatic aria-hidden for decorative icons
 * - currentColor support for theme integration
 * - Tailwind CSS className support
 *
 * @example
 * ```tsx
 * // Informational icon (requires aria-label)
 * <MasterIcon size={20} aria-label="マスター" />
 *
 * // Decorative icon (aria-hidden auto-applied)
 * <MasterIcon size={16} className="text-blue-500" />
 * ```
 */
export function IconBase({
  size = 24,
  strokeWidth = 2,
  className,
  children,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden = !ariaLabel,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block shrink-0", className)}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      focusable="false"
      role={ariaLabel ? "img" : undefined}
      {...rest}
    >
      {children}
    </svg>
  );
}
