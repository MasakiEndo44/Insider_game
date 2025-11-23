"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, User } from "lucide-react"
import { api } from '@/lib/api';
import { useRoom } from "@/context/room-context"
import { useGame } from "@/context/game-context"

interface JoinRoomModalProps {
    open: boolean
    onClose: () => void
}

export function JoinRoomModal({ open, onClose }: JoinRoomModalProps) {
    const router = useRouter()
    const { setRoomId, setPassphrase, setPlayers, setPlayerId } = useRoom()
    const { setPhase } = useGame()

    const [passphraseInput, setPassphraseInput] = useState("")
    const [playerName, setPlayerName] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleJoin = async () => {
        if (!passphraseInput.trim() || !playerName.trim()) return

        setIsLoading(true)

        try {
            const { roomId, player } = await api.joinRoom(passphraseInput, playerName)

            // Update Context
            setRoomId(roomId)
            setPassphrase(passphraseInput)
            setPlayers([player]) // In real app, we would get full list
            setPlayerId(player.id)
            setPhase('LOBBY')

            // Navigate to lobby
            router.push('/lobby')
        } catch (error) {
            console.error("Failed to join room:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">ルームに参加する</DialogTitle>
                    <DialogDescription className="text-foreground-secondary">
                        合言葉とプレイヤー名を入力してください
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="join-passphrase" className="text-sm font-medium">
                            合言葉
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                            <Input
                                id="join-passphrase"
                                placeholder="例: sakura2024"
                                value={passphraseInput}
                                onChange={(e) => setPassphraseInput(e.target.value)}
                                className="pl-11 h-12"
                                style={{ paddingLeft: '44px' }}
                                maxLength={20}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="join-playerName" className="text-sm font-medium">
                            プレイヤー名
                        </Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                            <Input
                                id="join-playerName"
                                placeholder="例: たろう"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="pl-11 h-12"
                                style={{ paddingLeft: '44px' }}
                                maxLength={10}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1 h-12"
                        disabled={isLoading}
                    >
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleJoin}
                        disabled={!passphraseInput.trim() || !playerName.trim() || isLoading}
                        className="flex-1 h-12 font-bold"
                    >
                        {isLoading ? "参加中..." : "参加する"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
