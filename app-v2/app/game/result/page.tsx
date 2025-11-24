"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Trophy, Clock, RotateCcw, LogOut } from "lucide-react"
import { useGame } from "@/context/game-context"
import { useRoom } from "@/context/room-context"
import { api } from '@/lib/api';

const ROLE_INFO = {
    MASTER: {
        name: "マスター",
        icon: "/images/master-icon.png",
        color: "#3B82F6",
    },
    INSIDER: {
        name: "インサイダー",
        icon: "/images/insider-mark.png",
        color: "#E50012",
    },
    CITIZEN: {
        name: "庶民",
        icon: "/images/common-icon.png",
        color: "#10B981",
    },
}

function ResultContent() {
    const router = useRouter()
    const { outcome, topic, roles, setPhase, setRoles, setTopic, setOutcome, setTimer } = useGame()
    const { roomId, players, resetRoom, playerId } = useRoom()

    const isCommonWin = outcome === "CITIZENS_WIN"
    const isInsiderWin = outcome === "INSIDER_WIN"
    // const isTimeout = outcome === "ALL_LOSE" // or timeout specific if added

    useEffect(() => {
        if (!roomId) {
            router.push("/")
        }
    }, [roomId, router])

    const handleNextRound = async () => {
        // Host triggers new game
        // Reset game state locally
        setPhase('LOBBY')
        setRoles({})
        setTopic("")
        setOutcome(null)
        setTimer(300)

        // Host updates phase in DB
        if (roomId) {
            await api.updatePhase(roomId, 'LOBBY');
        }

        router.push("/lobby")
    }

    const handleLeave = async () => {
        if (roomId && playerId) {
            try {
                // Explicitly leave room in DB
                await api.leaveRoom(roomId, playerId);
            } catch (error) {
                console.error('Failed to leave room:', error);
            }
        }

        // Client side cleanup
        resetRoom()
        router.push("/")
    }

    return (
        <div className="min-h-screen p-4 pb-32 flex flex-col items-center" style={{ paddingTop: '64px' }}>
            <div className="max-w-md w-full flex flex-col gap-6 animate-fade-in">
                {/* Result Banner */}
                <div
                    className={`rounded-2xl p-8 text-center space-y-4 ${isCommonWin
                        ? "bg-success/20 border-2 border-success"
                        : isInsiderWin
                            ? "bg-game-red/20 border-2 border-game-red"
                            : "bg-surface/10 border-2 border-foreground/30"
                        }`}
                >
                    <div className="flex justify-center">
                        {isCommonWin ? (
                            <Trophy className="w-16 h-16 text-success" />
                        ) : isInsiderWin ? (
                            <Image src="/images/insider-mark.png" alt="インサイダー" width={64} height={64} />
                        ) : (
                            <Clock className="w-16 h-16 text-foreground/50" />
                        )}
                    </div>

                    <div>
                        <h1
                            className={`text-3xl font-black mb-2 ${isCommonWin ? "text-success" : isInsiderWin ? "text-game-red" : "text-foreground"}`}
                        >
                            {isCommonWin ? "庶民の勝利！" : isInsiderWin ? "インサイダーの勝利！" : "時間切れ"}
                        </h1>
                        <p className="text-foreground text-sm">
                            {isCommonWin
                                ? "インサイダーを見破りました"
                                : isInsiderWin
                                    ? "インサイダーは正体を隠し切りました"
                                    : "時間内にお題を当てられませんでした"}
                        </p>
                    </div>
                </div>

                {/* Topic Display */}
                <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 text-center space-y-2">
                    <p className="text-sm text-foreground-secondary">今回のお題</p>
                    <p className="text-3xl font-black text-foreground">{topic}</p>
                </div>

                {/* Role Reveal */}
                <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col" style={{ padding: '24px', gap: '12px' }}>
                    <h2 className="text-lg font-bold text-foreground">役職公開</h2>

                    <div className="space-y-3">
                        {players.map((player) => {
                            const role = roles[player.id] || "CITIZEN"
                            const roleInfo = ROLE_INFO[role]
                            return (
                                <div
                                    key={player.id}
                                    className="bg-background/50 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4"
                                >
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: `${roleInfo.color}20` }}
                                    >
                                        <Image src={roleInfo.icon || "/placeholder.svg"} alt={roleInfo.name} width={32} height={32} />
                                    </div>

                                    <div className="flex-1">
                                        <p className="font-bold text-foreground">{player.nickname}</p>
                                        <p className="text-sm" style={{ color: roleInfo.color }}>
                                            {roleInfo.name}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Game Stats */}
                <div className="bg-surface/30 backdrop-blur-sm border border-border rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-foreground-secondary">ゲーム時間</span>
                        <span className="text-foreground font-bold">3分42秒</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-foreground-secondary">質問回数</span>
                        <span className="text-foreground font-bold">12回</span>
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border space-y-3 flex justify-center">
                <div className="max-w-md w-full space-y-3">
                    <Button
                        onClick={handleNextRound}
                        className="w-full h-14 text-lg font-bold bg-transparent hover:bg-game-red/10 text-foreground border-2 border-foreground rounded-xl transition-all duration-200 hover:border-game-red hover:text-game-red"
                    >
                        <RotateCcw className="w-5 h-5 mr-2" />
                        次のラウンド
                    </Button>

                    <Button
                        onClick={handleLeave}
                        variant="ghost"
                        className="w-full h-12 text-base text-foreground-secondary hover:text-foreground"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        ホームへ戻る
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function ResultPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <ResultContent />
        </Suspense>
    )
}
