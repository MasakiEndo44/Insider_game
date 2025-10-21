"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PlayerChip } from "@/components/player-chip"
import { RoomInfoCard } from "@/components/room-info-card"
import { GameSettings } from "@/components/game-settings"
import { Users, Play, LogOut, Crown, Copy, Check } from "lucide-react"
import Image from "next/image"

// Mock player data
const generateMockPlayers = (count: number, hostName: string) => {
  const names = ["たろう", "はなこ", "けんた", "さくら", "ゆうき", "あい", "だいき", "みお"]
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: i === 0 ? hostName : names[i] || `プレイヤー${i + 1}`,
    isHost: i === 0,
    isReady: i === 0 ? true : Math.random() > 0.3,
    joinedAt: Date.now() - (count - i) * 10000,
  }))
}

function LobbyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const roomId = searchParams.get("roomId") || "DEMO01"
  const passphrase = searchParams.get("passphrase") || "sakura2024"
  const playerName = searchParams.get("playerName") || "ゲスト"
  const isHost = searchParams.get("isHost") === "true"

  const [players, setPlayers] = useState(generateMockPlayers(4, playerName))
  const [copied, setCopied] = useState(false)
  const [timeLimit, setTimeLimit] = useState(5)
  const [category, setCategory] = useState("general")

  // Simulate real-time player updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7 && players.length < 12) {
        const newPlayer = {
          id: `player-${players.length}`,
          name: `プレイヤー${players.length + 1}`,
          isHost: false,
          isReady: false,
          joinedAt: Date.now(),
        }
        setPlayers((prev) => [...prev, newPlayer])
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [players.length])

  const handleCopyPassphrase = async () => {
    await navigator.clipboard.writeText(passphrase)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = () => {
    // Navigate to role assignment screen
    router.push(`/game/role-assignment?roomId=${roomId}`)
  }

  const handleLeave = () => {
    router.push("/")
  }

  const readyCount = players.filter((p) => p.isReady).length
  const canStart = isHost && players.length >= 3 && readyCount === players.length

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <Image src="/images/insider-logo.png" alt="Insider Logo" width={48} height={48} className="opacity-90" />
            </div>
            <div>
              <h1 className="textopacity-90black text-white">ロビー</h1>
              <p className="text-sm text-muted-foreground">プレイヤーを待っています...</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLeave}
            className="text-muted-foreground hover:text-white hover:bg-card/50"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Room Info */}
        <RoomInfoCard
          roomId={roomId}
          passphrase={passphrase}
          playerCount={players.length}
          onCopyPassphrase={handleCopyPassphrase}
          copied={copied}
        />

        {/* Players Section */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#E50012]" />
              参加プレイヤー
              <span className="text-sm font-normal text-accent">({players.length}/12)</span>
            </h2>
            <div className="text-sm text-foreground">
              準備完了: <span className="text-[#E50012] font-bold">{readyCount}</span>/{players.length}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {players.map((player, index) => (
              <PlayerChip
                key={player.id}
                name={player.name}
                isHost={player.isHost}
                isReady={player.isReady}
                isCurrentPlayer={player.name === playerName}
                animationDelay={index * 100}
              />
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 12 - players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="h-16 rounded-lg border-2 border-dashed border-border/50 bg-background/30 flex items-center justify-center"
              >
                <span className="text-xs text-muted-foreground">空き</span>
              </div>
            ))}
          </div>

          {players.length < 3 && (
            <div className="bg-[#E50012]/10 border border-[#E50012]/30 rounded-lg p-3 text-center">
              <p className="text-sm text-[#E50012] font-medium">ゲームを開始するには最低3人必要です</p>
            </div>
          )}
        </div>

        {/* Game Settings (Host Only) */}
        {isHost && (
          <GameSettings
            timeLimit={timeLimit}
            category={category}
            onTimeLimitChange={setTimeLimit}
            onCategoryChange={setCategory}
          />
        )}

        {/* Share Info */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E50012]/10 flex items-center justify-center flex-shrink-0">
              <Copy className="w-5 h-5 text-[#E50012]" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-white">友達を招待しよう</p>
              <p className="text-xs leading-relaxed text-secondary-foreground">
                合言葉「<span className="text-[#E50012] font-bold">{passphrase}</span>
                」を共有してプレイヤーを招待できます
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleCopyPassphrase}
              className="bg-transparent hover:bg-white/5 border-2 border-white/50 text-white hover:border-white transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  コピー済み
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  コピー
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-2xl mx-auto">
          {isHost ? (
            <Button
              onClick={handleStartGame}
              disabled={!canStart}
              className="w-full h-14 text-lg font-bold bg-transparent hover:bg-[#E50012]/10 text-white border-2 border-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:border-[#E50012] hover:text-[#E50012] disabled:hover:border-white disabled:hover:text-white"
            >
              <Play className="w-5 h-5 mr-2" />
              ゲームを開始する
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-[#E50012]" />
                ホストがゲームを開始するまでお待ちください
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen circuit-bg flex items-center justify-center">
          <div className="text-white">読み込み中...</div>
        </div>
      }
    >
      <LobbyContent />
    </Suspense>
  )
}
