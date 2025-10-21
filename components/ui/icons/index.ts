/**
 * Unified Icon System
 *
 * This barrel file provides a single import point for all icons:
 * - IconBase: Base component for custom icons
 * - Custom icons: Game-specific vectors
 * - Lucide icons: Common UI icons
 *
 * Usage:
 * ```tsx
 * import { MasterIcon, InsiderIcon, Play, Clock } from "@/components/ui/icons";
 *
 * <MasterIcon size={20} aria-label="マスター" />
 * <Play size={24} aria-label="開始" />
 * ```
 *
 * Benefits:
 * - Consistent API across all icon sources
 * - Tree-shaking enabled (unused icons excluded from bundle)
 * - TypeScript type safety
 * - Unified accessibility patterns
 */

// Core
export { IconBase } from "./icon-base";
export type { IconProps } from "./icon-base";

// Custom icons
export * from "./custom";

// Lucide icons
export * from "./lucide";
