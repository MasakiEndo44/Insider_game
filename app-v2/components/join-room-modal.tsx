"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, User } from "lucide-react"

interface JoinRoomModalProps {
    open: boolean
    onClose: () => void
}

export function JoinRoomModal({ open, onClose }: JoinRoomModalProps) {
    const router = useRouter()
    const [passphrase, setPassphrase] = useState("")
    const [playerName, setPlayerName] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleJoin = async () => {
        if (!passphrase.trim() || !playerName.trim()) return

        setIsLoading(true)

        // Mock: Find room by passphrase
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Navigate to lobby
        router.push(`/lobby?roomId=${roomId}&passphrase=${passphrase}&playerName=${playerName}&isHost=false`)
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
                                placeholder="ホストから共有された合言葉"
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                className="pl-10 h-12"
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
                                placeholder="例: はなこ"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="pl-10 h-12"
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
                        disabled={!passphrase.trim() || !playerName.trim() || isLoading}
                        className="flex-1 h-12 font-bold"
                    >
                        {isLoading ? "参加中..." : "参加する"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
