"use client"

import { Crown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlayerChipProps {
    name: string
    isHost: boolean
    isReady: boolean
    isCurrentPlayer?: boolean
    animationDelay?: number
    currentPage?: string
}

export function PlayerChip({ name, isHost, isReady, isCurrentPlayer = false, animationDelay = 0, currentPage = 'lobby' }: PlayerChipProps) {
    const isOnResultPage = currentPage === 'result';

    return (
        <div
            className={cn(
                "relative h-16 rounded-lg border transition-all duration-300 animate-slide-in",
                isCurrentPlayer
                    ? "bg-game-red/10 border-game-red/50 backdrop-blur-sm glow-red"
                    : "bg-surface/40 border-foreground/10 backdrop-blur-sm hover:border-foreground/20",
                isReady && !isOnResultPage && "ring-1 ring-success/40",
                isOnResultPage && "ring-1 ring-warning/40",
            )}
            style={{
                animationDelay: `${animationDelay}ms`,
                boxShadow: isCurrentPlayer ? 'var(--glow-red)' : 'none'
            }}
        >
            <div className="h-full flex items-center gap-3 px-4">
                {/* Avatar */}
                <div
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 border",
                        isCurrentPlayer
                            ? "bg-game-red/20 text-game-red border-game-red/60"
                            : "bg-transparent text-foreground border-foreground/20",
                    )}
                >
                    {name.charAt(0)}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <p className={cn("font-bold text-sm truncate", isCurrentPlayer ? "text-foreground" : "text-foreground")}>{name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {isHost && (
                            <span className="inline-flex items-center gap-1 text-xs text-game-red font-medium">
                                <Crown className="w-3 h-3" />
                                ホスト
                            </span>
                        )}
                        {!isHost && isOnResultPage && (
                            <span className="inline-flex items-center gap-1 text-xs text-warning font-medium">
                                結果確認中
                            </span>
                        )}
                        {!isHost && !isOnResultPage && isReady && (
                            <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                                <Check className="w-3 h-3" />
                                準備完了
                            </span>
                        )}
                        {!isHost && !isOnResultPage && !isReady && <span className="text-xs text-foreground-secondary">待機中...</span>}
                    </div>
                </div>

                {/* Ready indicator */}
                {isReady && <div className="w-2 h-2 rounded-full bg-success animate-pulse flex-shrink-0" />}
            </div>
        </div>
    )
}
