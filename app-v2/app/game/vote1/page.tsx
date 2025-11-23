"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, Vote } from "lucide-react"
import { useGame } from "@/context/game-context"
import { useRoom } from "@/context/room-context"
import { mockAPI } from "@/lib/mock-api"

function Vote1Content() {
    const router = useRouter()
    const { topic, setPhase, setOutcome } = useGame()
    const { roomId, playerId, players } = useRoom()

    const [voted, setVoted] = useState(false)
    const [myVote, setMyVote] = useState<"yes" | "no" | null>(null)
    const [votedCount, setVotedCount] = useState(0)

    // Mock answerer for now (in real app, this comes from who answered correctly)
    const answerer = players.length > 0 ? players[0].nickname : "正解者"

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

    const handleVote = async (vote: "yes" | "no") => {
        if (!roomId || !playerId) return

        setMyVote(vote)
        setVoted(true)

        try {
            await mockAPI.submitVote1(roomId, playerId, vote)

            // Wait for others (mock) then proceed
            setTimeout(() => {
                // Mock result logic: 
                // If majority YES -> Vote 2 (Decide who is insider among others? No, Vote 1 is "Is the answerer the insider?")
                // If YES majority -> Answerer is suspected. If Answerer IS Insider -> Common Win. If Answerer is NOT Insider -> Insider Win (because common guessed wrong).
                // Actually, the rules are:
                // 1. Vote: Is the answerer the Insider?
                // If Majority YES:
                //    - If Answerer IS Insider: Commons WIN.
                //    - If Answerer IS NOT Insider: Insider WINS (Commons lose).
                // If Majority NO:
                //    - Go to Vote 2 (Who is the Insider?)

                // For mock, let's randomize or force a path.
                // Let's say 50/50 chance to go to Vote 2.
                const goToVote2 = Math.random() > 0.5

                if (goToVote2) {
                    setPhase('VOTE2')
                    router.push("/game/vote2")
                } else {
                    // Result
                    // Random outcome for mock
                    const outcomes = ['CITIZENS_WIN', 'INSIDER_WIN'] as const
                    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]
                    setOutcome(outcome)
                    setPhase('RESULT')
                    router.push("/game/result")
                }
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
                        <h1 className="text-2xl font-black text-foreground">第一投票</h1>
                    </div>
                    <p className="text-sm text-foreground-secondary">告発投票</p>
                </div>

                {/* Question */}
                {!voted ? (
                    <>
                        <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col text-center" style={{ padding: '24px', gap: '12px' }}>
                            <div className="bg-game-red/10 border border-game-red/30 rounded-lg p-4">
                                <p className="text-xl font-bold text-foreground mb-1">{answerer} さん</p>
                                <p className="text-sm text-foreground-secondary">が正解しました</p>
                            </div>

                            <p className="text-lg font-bold text-foreground">
                                {answerer} さんを
                                <br />
                                インサイダーだと思いますか？
                            </p>
                        </div>

                        {/* Vote Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                onClick={() => handleVote("yes")}
                                className="h-32 bg-game-red/20 hover:bg-game-red/30 border-2 border-game-red text-foreground rounded-xl flex flex-col items-center justify-center gap-3 text-2xl font-black transition-all"
                            >
                                <ThumbsUp className="w-12 h-12" />
                                はい
                            </Button>

                            <Button
                                onClick={() => handleVote("no")}
                                className="h-32 bg-surface/10 hover:bg-surface/20 border-2 border-foreground/50 text-foreground rounded-xl flex flex-col items-center justify-center gap-3 text-2xl font-black transition-all"
                            >
                                <ThumbsDown className="w-12 h-12" />
                                いいえ
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Voted State */}
                        <div className="bg-success/10 border-2 border-success backdrop-blur-sm rounded-xl p-6 space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                                {myVote === "yes" ? (
                                    <ThumbsUp className="w-8 h-8 text-success" />
                                ) : (
                                    <ThumbsDown className="w-8 h-8 text-success" />
                                )}
                            </div>

                            <div>
                                <p className="text-lg font-bold text-foreground mb-1">投票しました</p>
                                <p className="text-2xl font-black text-success">{myVote === "yes" ? "はい" : "いいえ"}</p>
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

export default function Vote1Page() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <Vote1Content />
        </Suspense>
    )
}
