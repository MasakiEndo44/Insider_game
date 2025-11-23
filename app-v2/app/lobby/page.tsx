"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PlayerChip } from "@/components/player-chip"
import { RoomInfoCard } from "@/components/room-info-card"
import { GameSettings } from "@/components/game-settings"
import { Users, Play, LogOut, Crown, Copy, Check } from "lucide-react"
import Image from "next/image"
import { useRoom } from "@/context/room-context"
import { useGame } from "@/context/game-context"
import { mockAPI } from "@/lib/mock-api"

function LobbyContent() {
    const router = useRouter()
    const { roomId, passphrase, players, hostId, playerId, addPlayer, resetRoom } = useRoom()
    const { setPhase, setRoles, setTopic } = useGame()

    const [copied, setCopied] = useState(false)
    const [timeLimit, setTimeLimit] = useState(5)
    const [category, setCategory] = useState("general")
    const [isStarting, setIsStarting] = useState(false)

    const isHost = hostId === playerId

    // Redirect if no room data (e.g. refresh)
    useEffect(() => {
        if (!roomId) {
            router.push("/")
        }
    }, [roomId, router])

    // Simulate real-time player updates (Mock)
    useEffect(() => {
        if (!roomId) return

        const interval = setInterval(() => {
            if (Math.random() > 0.7 && players.length < 12) {
                const id = `player-${Date.now()}`
                const newPlayer = {
                    id,
                    nickname: `プレイヤー${players.length + 1}`,
                    isHost: false,
                    isReady: true, // Auto ready for mock
                    isConnected: true,
                }
                addPlayer(newPlayer)
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [roomId, players.length, addPlayer])

    const handleCopyPassphrase = async () => {
        if (passphrase) {
            await navigator.clipboard.writeText(passphrase)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleStartGame = async () => {
        if (!roomId || !isHost) return

        setIsStarting(true)
        try {
            await mockAPI.startGame(roomId)

            // Assign Roles
            const roles = await mockAPI.assignRoles(players)
            setRoles(roles)

            // Select Topic
            const topic = await mockAPI.getTopic(category)
            setTopic(topic)

            // Update Phase
            setPhase('ROLE_ASSIGNMENT')

            // Navigate
            router.push('/game/role-assignment')
        } catch (error) {
            console.error("Failed to start game:", error)
            setIsStarting(false)
        }
    }

    const handleLeave = () => {
        resetRoom()
        router.push("/")
    }

    if (!roomId) return null

    const readyCount = players.filter((p) => p.isReady).length
    // For dev/mock, allow starting with fewer players if needed, but UI says 3
    const canStart = isHost && players.length >= 3 && readyCount === players.length

    return (
        <div className="min-h-screen p-4 flex flex-col items-center" style={{ paddingTop: '64px', paddingBottom: '128px' }}>
            <div className="max-w-2xl w-full flex flex-col gap-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <Image src="/images/insider-logo.png" alt="Insider Logo" width={48} height={48} className="opacity-90" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-foreground">ロビー</h1>
                            <p className="text-sm text-foreground/80">プレイヤーを待っています...</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLeave}
                        className="text-foreground/70 hover:text-foreground hover:bg-surface/50"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>

                {/* Room Info */}
                <RoomInfoCard
                    roomId={roomId}
                    passphrase={passphrase || ""}
                    playerCount={players.length}
                    onCopyPassphrase={handleCopyPassphrase}
                    copied={copied}
                />

                {/* Players Section */}
                <div className="bg-surface/50 backdrop-blur-sm border-2 border-border rounded-xl p-6 flex flex-col" style={{ padding: '24px', gap: '12px' }}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2" style={{ gap: '8px' }}>
                            <Users className="w-5 h-5 text-game-red" />
                            参加プレイヤー
                            <span className="text-sm font-normal text-foreground/70">({players.length}/12)</span>
                        </h2>
                        <div className="text-sm text-foreground/90">
                            準備完了: <span className="text-game-red font-bold">{readyCount}</span>/{players.length}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {players.map((player, index) => (
                            <PlayerChip
                                key={player.id}
                                name={player.nickname}
                                isHost={player.isHost}
                                isReady={player.isReady}
                                isCurrentPlayer={player.id === playerId}
                                animationDelay={index * 100}
                            />
                        ))}

                        {/* Empty slots */}
                        {Array.from({ length: Math.max(0, 12 - players.length) }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="h-16 rounded-lg border-2 border-dashed border-border bg-background/30 flex items-center justify-center"
                            >
                                <span className="text-xs text-foreground/60">空き</span>
                            </div>
                        ))}
                    </div>

                    {players.length < 3 && (
                        <div className="bg-game-red/10 border border-game-red/30 rounded-lg p-3 text-center">
                            <p className="text-sm text-game-red font-medium" style={{ lineHeight: '1.6' }}>ゲームを開始するには最低3人必要です</p>
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

                {isHost && (
                    <div className="bg-surface/50 backdrop-blur-sm border-2 border-border rounded-xl p-6" style={{ padding: '24px' }}>
                        <Button
                            onClick={handleStartGame}
                            disabled={!canStart || isStarting}
                            className="w-full h-16 text-lg font-bold bg-transparent hover:bg-game-red/10 text-foreground border-2 border-foreground rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:border-game-red hover:text-game-red disabled:hover:border-foreground disabled:hover:text-foreground"
                        >
                            <Play className="w-6 h-6 mr-2" />
                            {isStarting ? "開始中..." : "ゲームを開始する"}
                        </Button>
                        {!canStart && players.length >= 3 && (
                            <p className="text-xs text-foreground-secondary text-center mt-3" style={{ lineHeight: '1.6' }}>全員が準備完了するまでお待ちください</p>
                        )}
                    </div>
                )}

                {/* Share Info */}
                <div className="bg-surface/50 backdrop-blur-sm border-2 border-border rounded-xl p-4" style={{ padding: '24px' }}>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-game-red/10 flex items-center justify-center flex-shrink-0">
                            <Copy className="w-5 h-5 text-game-red" />
                        </div>
                        <div className="flex-1 flex flex-col" style={{ gap: '4px' }}>
                            <p className="text-sm font-medium text-foreground" style={{ lineHeight: '1.6' }}>友達を招待しよう</p>
                            <p className="text-xs leading-relaxed text-foreground/80" style={{ lineHeight: '1.75' }}>
                                合言葉「<span className="text-game-red font-bold">{passphrase}</span>
                                」を共有してプレイヤーを招待できます
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleCopyPassphrase}
                            className="bg-transparent hover:bg-foreground/5 border-2 border-foreground/70 text-foreground hover:border-foreground transition-all"
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
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border flex justify-center">
                <div className="max-w-2xl mx-auto">
                    {isHost ? (
                        <Button
                            onClick={handleStartGame}
                            disabled={!canStart || isStarting}
                            className="w-full h-14 text-lg font-bold bg-transparent hover:bg-game-red/10 border-2 border-foreground/80 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:border-game-red hover:text-game-red disabled:hover:border-foreground/80 disabled:hover:text-foreground text-foreground"
                        >
                            <Play className="w-5 h-5 mr-2" />
                            {isStarting ? "開始中..." : "ゲームを開始する"}
                        </Button>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm text-foreground/80 flex items-center justify-center gap-2">
                                <Crown className="w-4 h-4 text-game-red" />
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
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <LobbyContent />
        </Suspense>
    )
}
