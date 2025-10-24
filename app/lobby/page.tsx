"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PlayerChip } from "@/components/player-chip"
import { RoomInfoCard } from "@/components/room-info-card"
import { GameSettings } from "@/components/game-settings"
import { HostLeftOverlay } from "@/components/host-left-overlay"
import { useRoomPlayers } from "@/hooks/use-room-players"
import { useHostPresence } from "@/hooks/use-host-presence"
import { Users, Play, LogOut, Crown, Copy, Check, AlertCircle } from "lucide-react"
import Image from "next/image"
import { startGame } from "@/app/actions/game"
import { leaveRoom, togglePlayerReady } from "@/app/actions/rooms"
import { createClient } from "@/lib/supabase/client"

function LobbyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const roomId = searchParams.get("roomId") || "DEMO01"
  const passphrase = searchParams.get("passphrase") || "sakura2024"
  const playerName = searchParams.get("playerName") || "ゲスト"
  const playerId = searchParams.get("playerId") || ""
  const isHost = searchParams.get("isHost") === "true"

  // Realtime player data from Supabase
  const { players, loading, error } = useRoomPlayers(roomId)

  // Find host player ID for presence monitoring
  const hostPlayer = players.find((p) => p.is_host === true)
  const hostPlayerId = hostPlayer?.id || null

  // Monitor host presence (guests only)
  const { hostLeft } = useHostPresence(roomId, hostPlayerId, isHost)

  // Listen for room phase changes
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to room updates
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          console.log('[Lobby] Room update:', payload)
          const newPhase = (payload.new as any).phase

          if (newPhase === 'DEAL') {
            console.log('[Lobby] Phase changed to DEAL, navigating to role assignment...')
            router.push(`/game/role-assignment?roomId=${roomId}&playerId=${playerId}`)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, playerId, router])

  const [copied, setCopied] = useState(false)
  const [timeLimit, setTimeLimit] = useState(5)
  const [category, setCategory] = useState("general")
  const [startError, setStartError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const handleCopyPassphrase = async () => {
    await navigator.clipboard.writeText(passphrase)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = async () => {
    setIsStarting(true)
    setStartError(null)

    try {
      console.log('[Lobby] Starting game for room:', roomId)
      await startGame(roomId)
      console.log('[Lobby] Game started successfully, navigating...')

      // Navigate to role assignment screen
      router.push(`/game/role-assignment?roomId=${roomId}&playerId=${playerId}`)
    } catch (error) {
      console.error('[Lobby] Start game error:', error)
      setStartError(error instanceof Error ? error.message : 'ゲーム開始に失敗しました')
      setIsStarting(false)
    }
  }

  const handleLeave = async () => {
    try {
      console.log('[Lobby] Player leaving:', { roomId, playerId })

      if (roomId && playerId) {
        const result = await leaveRoom(roomId, playerId)
        console.log('[Lobby] Leave room result:', result)

        if (result.roomDeleted) {
          console.log('[Lobby] Room was deleted (last player left)')
        }
      }

      router.push("/")
    } catch (error) {
      console.error('[Lobby] Leave room error:', error)
      // Navigate anyway to avoid trapping user
      router.push("/")
    }
  }

  // Cleanup on page unload (browser close, navigation, etc.)
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (roomId && playerId) {
        try {
          await leaveRoom(roomId, playerId)
          console.log('[Lobby] Cleanup on unload completed')
        } catch (error) {
          console.error('[Lobby] Cleanup on unload failed:', error)
        }
      }
    }

    // Add event listener for browser close/refresh
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup when component unmounts (navigation)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Also cleanup on component unmount
      handleBeforeUnload()
    }
  }, [roomId, playerId])

  const readyCount = players.filter((p) => p.confirmed).length
  const canStart = isHost && players.length >= 3 && readyCount === players.length

  // Handle loading and error states
  if (loading) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold">読み込み中...</div>
          <div className="text-sm text-muted-foreground">プレイヤー情報を取得しています</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold text-[#E50012]">エラーが発生しました</div>
          <div className="text-sm text-muted-foreground">{error.message}</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Host Left Overlay */}
      <HostLeftOverlay isOpen={hostLeft} />

      <div className="min-h-screen circuit-bg circuit-pattern p-4 pb-24" data-testid="phase-LOBBY">
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

        {/* Error Message */}
        {startError && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-500">{startError}</p>
          </div>
        )}

        {/* Players Section */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-4" data-testid="player-list">
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
                name={player.nickname}
                isHost={player.is_host ?? false}
                isReady={player.confirmed ?? false}
                isCurrentPlayer={player.nickname === playerName}
                animationDelay={index * 100}
                onClick={player.nickname === playerName && !player.is_host ? async () => {
                  try {
                    await togglePlayerReady(roomId, playerId, !player.confirmed);
                  } catch (error) {
                    console.error('[Lobby] Ready toggle failed:', error);
                  }
                } : undefined}
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

          {/* Guest Instructions */}
          {!isHost && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-blue-400">ℹ️</span>
              </div>
              <p className="text-sm text-blue-300 font-medium">準備が完了したら、自分の名前を押してください</p>
            </div>
          )}

          {/* Minimum Players Warning */}
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
              disabled={!canStart || isStarting}
              className="w-full h-14 text-lg font-bold bg-transparent hover:bg-[#E50012]/10 text-white border-2 border-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:border-[#E50012] hover:text-[#E50012] disabled:hover:border-white disabled:hover:text-white"
            >
              <Play className="w-5 h-5 mr-2" />
              {isStarting ? 'ゲーム開始中...' : 'ゲームを開始する'}
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
    </>
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
