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
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">ルームを作る</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            合言葉とプレイヤー名を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="passphrase" className="text-sm font-medium text-foreground">
              合言葉
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="passphrase"
                placeholder="例: sakura2024"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="pl-10 bg-input border-border placeholder:text-muted-foreground h-12 text-foreground"
                maxLength={20}
              />
            </div>
            <p className="text-xs text-muted-foreground">他のプレイヤーが参加する際に必要です</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerName" className="text-sm font-medium text-foreground">
              プレイヤー名
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="playerName"
                placeholder="例: たろう"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="pl-10 bg-input border-border placeholder:text-muted-foreground h-12 text-foreground"
                maxLength={10}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border"
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!passphrase.trim() || !playerName.trim() || isLoading}
            className="flex-1 h-12 bg-[#E50012] hover:bg-[#B30010] text-white font-bold"
          >
            {isLoading ? "作成中..." : "ルームを作る"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
