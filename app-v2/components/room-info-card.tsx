"use client"

import { Button } from "@/components/ui/button"
import { Copy, Check, Lock, Hash } from "lucide-react"

interface RoomInfoCardProps {
    roomId: string
    passphrase: string
    playerCount: number
    onCopyPassphrase: () => void
    copied: boolean
}

export function RoomInfoCard({ roomId, passphrase, playerCount, onCopyPassphrase, copied }: RoomInfoCardProps) {
    return (
        <div className="bg-surface/50 backdrop-blur-sm border-2 border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">ルーム情報</h2>

            <div className="grid grid-cols-2 gap-4">
                {/* Room ID */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-foreground/90">
                        <Hash className="w-3.5 h-3.5" />
                        ルームID
                    </div>
                    <div className="bg-background/50 backdrop-blur-sm rounded-lg px-3 py-2 border-2 border-border">
                        <p className="text-sm font-mono font-bold text-foreground">{roomId}</p>
                    </div>
                </div>

                {/* Passphrase */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-foreground/90">
                        <Lock className="w-3.5 h-3.5" />
                        合言葉
                    </div>
                    <div className="bg-background/50 backdrop-blur-sm rounded-lg px-3 py-2 border-2 border-border flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate text-foreground">{passphrase}</p>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={onCopyPassphrase}
                            className="h-6 w-6 flex-shrink-0 hover:bg-foreground/10"
                        >
                            {copied ? (
                                <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 text-foreground/80" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-2 bg-background/50 backdrop-blur-sm rounded-full overflow-hidden border-2 border-border">
                    <div
                        className="h-full bg-game-red transition-all duration-500 rounded-full"
                        style={{ width: `${(playerCount / 12) * 100}%` }}
                    />
                </div>
                <span className="text-xs font-medium text-foreground/80 whitespace-nowrap">{playerCount}/12</span>
            </div>
        </div>
    )
}
