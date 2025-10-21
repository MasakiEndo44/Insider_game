"use client"

import { Crown, Check } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface PlayerChipProps {
  name: string
  isHost: boolean
  isReady: boolean
  isCurrentPlayer?: boolean
  animationDelay?: number
}

export function PlayerChip({ name, isHost, isReady, isCurrentPlayer = false, animationDelay = 0 }: PlayerChipProps) {
  return (
    <div
      className={cn(
        "relative h-16 rounded-lg border-2 transition-all duration-300 animate-slide-in",
        isCurrentPlayer
          ? "bg-[#E50012]/10 border-[#E50012] backdrop-blur-sm"
          : "bg-card/30 border-border backdrop-blur-sm hover:border-white/30",
        isReady && "ring-2 ring-[#10B981]/30",
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="h-full flex items-center gap-3 px-4">
        {/* Avatar */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 border-2",
            isCurrentPlayer
              ? "bg-[#E50012]/20 text-[#E50012] border-[#E50012]"
              : "bg-transparent text-white border-white/30",
          )}
        >
          {name.charAt(0)}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className={cn("font-bold text-sm truncate text-foreground", isCurrentPlayer ? "text-white" : "text-white")}>{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isHost && (
              <span className="inline-flex items-center gap-1 text-xs text-[#E50012] font-medium">
                <Crown className="w-3 h-3" />
                ホスト
              </span>
            )}
            {!isHost && isReady && (
              <span className="inline-flex items-center gap-1 text-xs text-[#10B981] font-medium">
                <Check className="w-3 h-3" />
                準備完了
              </span>
            )}
            {!isHost && !isReady && <span className="text-xs text-muted-foreground">待機中...</span>}
          </div>
        </div>

        {/* Ready indicator */}
        {isReady && <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />}
      </div>
    </div>
  )
}
