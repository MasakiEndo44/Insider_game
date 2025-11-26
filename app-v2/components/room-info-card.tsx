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
        <div className="glass-card rounded-xl p-6 flex flex-col border border-foreground/10" style={{ padding: '24px', gap: '16px' }}>
            <h2 className="text-base font-bold text-foreground">ルーム情報</h2>

            <div className="grid grid-cols-2 gap-4">
                {/* Room ID */}
                <div className="flex flex-col" style={{ gap: '6px' }}>
                    <div className="flex items-center gap-2 text-xs text-foreground/60" style={{ gap: '6px' }}>
                        <Hash className="w-3 h-3" />
                        ルームID
                    </div>
                    <div className="bg-background/40 backdrop-blur-sm rounded-lg py-2.5 border border-foreground/10" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
                        <p className="text-sm font-mono font-bold text-foreground tracking-wide">{roomId}</p>
                    </div>
                </div>

                {/* Passphrase */}
                <div className="flex flex-col" style={{ gap: '6px' }}>
                    <div className="flex items-center gap-2 text-xs text-foreground/60" style={{ gap: '6px' }}>
                        <Lock className="w-3 h-3" />
                        合言葉
                    </div>
                    <div className="bg-background/40 backdrop-blur-sm rounded-lg py-2.5 border border-foreground/10 flex items-center justify-between gap-2" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
                        <p className="text-sm font-mono font-bold truncate text-foreground tracking-wide">{passphrase}</p>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={onCopyPassphrase}
                            className="h-6 w-6 flex-shrink-0 hover:bg-foreground/10 transition-all"
                        >
                            {copied ? (
                                <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 text-foreground/70 hover:text-foreground" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-2 bg-background/40 backdrop-blur-sm rounded-full overflow-hidden border border-foreground/10">
                    <div
                        className="h-full bg-game-red transition-all duration-500 rounded-full"
                        style={{ width: `${(playerCount / 12) * 100}%`, boxShadow: playerCount > 0 ? 'var(--glow-red)' : 'none' }}
                    />
                </div>
                <span className="text-xs font-medium text-foreground/80 whitespace-nowrap">{playerCount}/12</span>
            </div>
        </div>
    )
}
