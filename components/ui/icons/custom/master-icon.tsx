import React from "react";
import { Crown } from "lucide-react";
import { IconProps } from "../icon-base";

/**
 * MasterIcon - Role indicator for Master player
 *
 * Uses lucide-react Crown icon as fallback since master.svg (11KB) exceeds size limit.
 * Visual: Crown shape representing the master/leader role
 *
 * @example
 * ```tsx
 * <MasterIcon size={20} aria-label="マスター" className="text-blue-500" />
 * ```
 */
export function MasterIcon(props: IconProps) {
  return <Crown {...props} />;
}
