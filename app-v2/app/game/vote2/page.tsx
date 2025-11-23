"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Vote, Check } from "lucide-react"
import { useGame } from "@/context/game-context"
import { useRoom } from "@/context/room-context"
import { mockAPI } from "@/lib/mock-api"

function Vote2Content() {
    const router = useRouter()
    const { topic, setPhase, setOutcome } = useGame()
    const { roomId, playerId, players } = useRoom()

    const [voted, setVoted] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
    const [votedCount, setVotedCount] = useState(0)

    // Candidates are all other players
    const candidates = players.filter(p => p.id !== playerId)

    useEffect(() => {
        if (!roomId || !playerId) {
            router.push("/")
            return
        }
    }, [roomId, playerId, router])

    // Simulate other players voting
    useEffect(() => {
        if (!roomId) return
        const interval = setInterval(() => {
            setVotedCount((prev) => {
                if (prev < players.length) return prev + 1
                return prev
            })
        }, 1500)
        return () => clearInterval(interval)
    }, [roomId, players.length])

    const handleVote = async (targetPlayerId: string) => {
        if (!roomId || !playerId) return

        setSelectedPlayer(targetPlayerId)
        setVoted(true)

        try {
            await mockAPI.submitVote2(roomId, playerId, targetPlayerId)

            // Wait for others (mock) then proceed
            setTimeout(() => {
                // Random result for mock
                const outcomes = ["CITIZENS_WIN", "INSIDER_WIN"] as const
                const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]
                setOutcome(outcome)
                setPhase('RESULT')
                router.push("/game/result")
            }, 3000)
        } catch (error) {
            console.error("Vote failed:", error)
            setVoted(false)
        }
    }

    return (
        <div className="min-h-screen p-4 flex flex-col items-center" style={{ paddingTop: '64px' }}>
            <div className="max-w-md w-full pb-24 flex flex-col gap-8 animate-fade-in">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Vote className="w-8 h-8 text-game-red" />
                        <h1 className="text-2xl font-black text-foreground">第二投票</h1>
                    </div>
                    <p className="text-sm text-foreground-secondary">インサイダー選択</p>
                </div>

                {/* Question */}
                {!voted ? (
                    <>
                        <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col text-center" style={{ padding: '24px', gap: '12px' }}>
                            <p className="text-lg font-bold text-foreground">インサイダーだと思う人を選んでください</p>
                        </div>

                        {/* Candidate List */}
                        <div className="space-y-3">
                            {candidates.map((candidate) => (
                                <button
                                    key={candidate.id}
                                    onClick={() => handleVote(candidate.id)}
                                    className="w-full p-5 bg-surface/30 hover:bg-surface/50 backdrop-blur-sm border-2 border-border hover:border-game-red rounded-xl transition-all text-left group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-background/10 border-2 border-foreground/30 group-hover:border-game-red flex items-center justify-center font-bold text-foreground transition-all">
                                            {candidate.nickname.charAt(0)}
                                        </div>
                                        <span className="text-lg font-bold text-foreground group-hover:text-game-red transition-all">
                                            {candidate.nickname}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Voted State */}
                        <div className="bg-success/10 border-2 border-success backdrop-blur-sm rounded-xl p-6 space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                                <Check className="w-8 h-8 text-success" />
                            </div>

                            <div>
                                <p className="text-lg font-bold text-foreground mb-1">投票しました</p>
                                <p className="text-2xl font-black text-success">
                                    {candidates.find((c) => c.id === selectedPlayer)?.nickname}
                                </p>
                            </div>

                            <p className="text-sm text-foreground-secondary">他のプレイヤーの投票を待っています...</p>
                        </div>
                    </>
                )}

                {/* Progress */}
                <div className="bg-surface/30 backdrop-blur-sm border border-border rounded-lg p-4 text-center">
                    <p className="text-sm text-foreground-secondary">
                        投票済み: <span className="text-game-red font-bold">{votedCount}</span> / {players.length}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function Vote2Page() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <Vote2Content />
        </Suspense>
    )
}
