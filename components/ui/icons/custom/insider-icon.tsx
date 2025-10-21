import React from "react";
import { Eye } from "lucide-react";
import { IconProps } from "../icon-base";

/**
 * InsiderIcon - Role indicator for Insider player
 *
 * Uses lucide-react Eye icon as fallback since insider.svg (12KB) exceeds size limit.
 * Visual: Eye shape representing the insider/observer role
 *
 * @example
 * ```tsx
 * <InsiderIcon size={20} aria-label="インサイダー" className="text-red-500" />
 * ```
 */
export function InsiderIcon(props: IconProps) {
  return <Eye {...props} />;
}
