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
    <div className="min-h-screen circuit-bg circuit-pattern p-4">
      <div className="max-w-md mx-auto pt-12 pb-24 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Vote className="w-8 h-8 text-[#E50012]" />
            <h1 className="text-2xl font-black text-white">第二投票</h1>
          </div>
          <p className="text-sm text-muted-foreground">インサイダー選択</p>
        </div>

        {/* Question */}
        {!voted ? (
          <>
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 text-center">
              <p className="text-lg font-bold text-white">インサイダーだと思う人を選んでください</p>
            </div>

            {/* Candidate List */}
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  onClick={() => handleVote(candidate.id)}
                  className="w-full p-5 bg-card/30 hover:bg-card/50 backdrop-blur-sm border-2 border-border hover:border-[#E50012] rounded-xl transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 border-2 border-white/30 group-hover:border-[#E50012] flex items-center justify-center font-bold text-white transition-all">
                      {candidate.name.charAt(0)}
                    </div>
                    <span className="text-lg font-bold text-white group-hover:text-[#E50012] transition-all">
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
            <div className="bg-[#10B981]/10 border-2 border-[#10B981] backdrop-blur-sm rounded-xl p-6 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#10B981]/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-[#10B981]" />
              </div>

              <div>
                <p className="text-lg font-bold text-white mb-1">投票しました</p>
                <p className="text-2xl font-black text-[#10B981]">
                  {candidates.find((c) => c.id === selectedPlayer)?.name}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">他のプレイヤーの投票を待っています...</p>
            </div>
          </>
        )}

        {/* Progress */}
        <div className="bg-card/30 backdrop-blur-sm border border-border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            投票済み: <span className="text-[#E50012] font-bold">{votedCount}</span> / {totalPlayers}
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
        <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
          <div className="text-white">読み込み中...</div>
        </div>
      }
    >
      <Vote2Content />
    </Suspense>
  )
}
