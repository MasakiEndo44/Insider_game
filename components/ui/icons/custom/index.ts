/**
 * Custom Icon Components
 *
 * Game-specific icons for Insider Game:
 * - Role indicators: MasterIcon (lucide Crown), InsiderIcon (lucide Eye), CommonIcon (custom SVG 1.2KB)
 * - Status icons: TimerIcon (custom SVG 1.6KB), ConversationIcon (custom SVG 2.2KB)
 * - Network icon: Uses lucide-react Network as fallback (network.svg 88KB too large)
 * - Logo variants: Uses PNG files (not implemented as React components)
 *
 * SVG size constraints (5KB limit):
 * ✅ common.svg: 1.2KB
 * ✅ timer.svg: 1.6KB
 * ✅ conversation.svg: 2.2KB
 * ❌ master.svg: 11KB (using lucide Crown)
 * ❌ insider.svg: 12KB (using lucide Eye)
 * ❌ network.svg: 88KB (using lucide Network)
 */

// Role indicators
export { MasterIcon } from "./master-icon";
export { InsiderIcon } from "./insider-icon";
export { CommonIcon } from "./common-icon";

// Status icons
export { TimerIcon } from "./timer-icon";
export { ConversationIcon } from "./conversation-icon";
