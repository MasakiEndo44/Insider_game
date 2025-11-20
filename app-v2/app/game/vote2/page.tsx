"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Vote, Check } from "lucide-react"

function Vote2Content() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const roomId = searchParams.get("roomId") || "DEMO01"

    const [voted, setVoted] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
    const [votedCount, setVotedCount] = useState(1)
    const totalPlayers = 6

    // デモ用プレイヤーリスト（マスター除く）
    const candidates = [
        { id: "2", name: "はなこ" },
        { id: "3", name: "けんた" },
        { id: "4", name: "さくら" },
        { id: "5", name: "ゆうき" },
        { id: "6", name: "あい" },
    ]

    const handleVote = (playerId: string) => {
        setSelectedPlayer(playerId)
        setVoted(true)

        // デモ用: 全員投票したら結果画面へ
        setTimeout(() => {
            // ランダムで勝敗を決定
            const outcomes = ["common_win", "insider_win"]
            const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]
            router.push(`/game/result?roomId=${roomId}&outcome=${outcome}`)
        }, 3000)
    }

    return (
        <div className="min-h-screen p-4 pt-12 flex flex-col items-center">
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
                        <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 text-center">
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
                                            {candidate.name.charAt(0)}
                                        </div>
                                        <span className="text-lg font-bold text-foreground group-hover:text-game-red transition-all">
                                            {candidate.name}
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
                                    {candidates.find((c) => c.id === selectedPlayer)?.name}
                                </p>
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
