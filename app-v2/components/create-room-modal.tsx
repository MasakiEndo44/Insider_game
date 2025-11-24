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
import { toast } from 'sonner';
import { APIError } from '@/lib/errors';

interface CreateRoomModalProps {
    open: boolean
    onClose: () => void
}

export function CreateRoomModal({ open, onClose }: CreateRoomModalProps) {
    const router = useRouter()
    const { setRoomId, setPassphrase, setPlayers, setHostId, setPlayerId } = useRoom()
    const { setPhase } = useGame()

    const [passphraseInput, setPassphraseInput] = useState("")
    const [playerName, setPlayerName] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleCreate = async () => {
        if (!passphraseInput.trim() || !playerName.trim()) return

        setIsLoading(true)

        try {
            const { roomId, player } = await api.createRoom(passphraseInput, playerName)

            // Update Context
            setRoomId(roomId)
            setPassphrase(passphraseInput)
            setPlayers([player])
            setHostId(player.id)
            setPlayerId(player.id)
            setPhase('LOBBY')

            toast.success('ルームを作成しました')

            // Navigate to lobby (no params needed now)
            router.push('/lobby')
        } catch (error) {
            console.error("Failed to create room:", error)

            if (error instanceof APIError) {
                toast.error(error.message)
                console.error(error.message)
            } else {
                toast.error('ルーム作成に失敗しました')
                console.error('ルーム作成に失敗しました')
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">ルームを作る</DialogTitle>
                    <DialogDescription className="text-foreground-secondary">
                        合言葉とプレイヤー名を入力してください
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="passphrase" className="text-sm font-medium">
                            合言葉
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                            <Input
                                id="passphrase"
                                placeholder="例: sakura2024"
                                value={passphraseInput}
                                onChange={(e) => setPassphraseInput(e.target.value)}
                                className="pl-11 h-12"
                                style={{ paddingLeft: '44px' }}
                                maxLength={20}
                            />
                        </div>
                        <p className="text-xs text-foreground-secondary">他のプレイヤーが参加する際に必要です</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="playerName" className="text-sm font-medium">
                            プレイヤー名
                        </Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                            <Input
                                id="playerName"
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
                        onClick={handleCreate}
                        disabled={!passphraseInput.trim() || !playerName.trim() || isLoading}
                        className="flex-1 h-12 font-bold"
                    >
                        {isLoading ? "作成中..." : "ルームを作る"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
