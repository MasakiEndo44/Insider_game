"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, User, AlertCircle } from "lucide-react"
import { joinRoom } from "@/app/actions/rooms"

interface JoinRoomModalProps {
  open: boolean
  onClose: () => void
}

export function JoinRoomModal({ open, onClose }: JoinRoomModalProps) {
  const router = useRouter()
  const [passphrase, setPassphrase] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    if (!passphrase.trim() || !playerName.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // Call Server Action to join room
      const result = await joinRoom(passphrase, playerName)

      // Check if the operation was successful
      if (!result.ok) {
        // User-friendly error message from server
        setError(result.message)
        setIsLoading(false)
        return
      }

      // Success: Navigate to lobby with proper UUIDs
      router.push(
        `/lobby?roomId=${result.roomId}&passphrase=${encodeURIComponent(passphrase)}&playerName=${encodeURIComponent(result.nickname)}&playerId=${result.playerId}&isHost=false`
      )
    } catch (err) {
      // System errors (database down, network failure, etc.)
      console.error('[JoinRoomModal] Unexpected error:', err)
      setError('サーバーエラーが発生しました。しばらくしてからもう一度お試しください。')
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">ルームに参加する</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            合言葉とプレイヤー名を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="join-passphrase" className="text-sm font-medium text-foreground">
              合言葉
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="join-passphrase"
                placeholder="ホストから共有された合言葉"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="pl-10 bg-input border-border placeholder:text-muted-foreground h-12 text-foreground"
                maxLength={10}
                minLength={3}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="join-playerName" className="text-sm font-medium text-foreground">
              プレイヤー名
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="join-playerName"
                placeholder="例: はなこ"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="pl-10 bg-input border-border placeholder:text-muted-foreground h-12 text-foreground"
                maxLength={20}
                disabled={isLoading}
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
            onClick={handleJoin}
            disabled={!passphrase.trim() || !playerName.trim() || isLoading}
            className="flex-1 h-12 bg-[#E50012] hover:bg-[#B30010] text-white font-bold"
          >
            {isLoading ? "参加中..." : "参加する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
