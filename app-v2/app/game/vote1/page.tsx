"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, Vote } from "lucide-react"

function Vote1Content() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const roomId = searchParams.get("roomId") || "DEMO01"

    const [voted, setVoted] = useState(false)
    const [myVote, setMyVote] = useState<"yes" | "no" | null>(null)
    const [votedCount, setVotedCount] = useState(1)
    const totalPlayers = 6
    const answerer = "たろう" // 実際はサーバーから取得

    const handleVote = (vote: "yes" | "no") => {
        setMyVote(vote)
        setVoted(true)

        // デモ用: 全員投票したら第二投票へ
        setTimeout(() => {
            // yes過半数の場合は第二投票へ、no過半数なら結果画面へ
            const yesWins = Math.random() > 0.5
            if (yesWins) {
                router.push(`/game/vote2?roomId=${roomId}`)
            } else {
                router.push(`/game/result?roomId=${roomId}&outcome=insider_win`)
            }
        }, 3000)
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
                        投票済み: <span className="text-game-red font-bold">{votedCount}</span> / {totalPlayers}
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
