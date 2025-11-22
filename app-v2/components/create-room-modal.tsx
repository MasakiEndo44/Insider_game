"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, User } from "lucide-react"

interface CreateRoomModalProps {
    open: boolean
    onClose: () => void
}

export function CreateRoomModal({ open, onClose }: CreateRoomModalProps) {
    const router = useRouter()
    const [passphrase, setPassphrase] = useState("")
    const [playerName, setPlayerName] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleCreate = async () => {
        if (!passphrase.trim() || !playerName.trim()) return

        setIsLoading(true)

        // Mock: Generate room ID and navigate to lobby
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Navigate to lobby with room data
        router.push(`/lobby?roomId=${roomId}&passphrase=${passphrase}&playerName=${playerName}&isHost=true`)
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
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
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
                        disabled={!passphrase.trim() || !playerName.trim() || isLoading}
                        className="flex-1 h-12 font-bold"
                    >
                        {isLoading ? "作成中..." : "ルームを作る"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
