"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Trophy, Clock, RotateCcw, LogOut } from "lucide-react"

type Player = {
  id: string
  name: string
  role: "master" | "insider" | "common"
}

const DEMO_PLAYERS: Player[] = [
  { id: "1", name: "たろう", role: "master" },
  { id: "2", name: "はなこ", role: "common" },
  { id: "3", name: "けんた", role: "insider" },
  { id: "4", name: "さくら", role: "common" },
  { id: "5", name: "ゆうき", role: "common" },
  { id: "6", name: "あい", role: "common" },
]

const ROLE_INFO = {
  master: {
    name: "マスター",
    icon: "/images/master-icon.png",
    color: "#3B82F6",
  },
  insider: {
    name: "インサイダー",
    icon: "/images/insider-mark.png",
    color: "#E50012",
  },
  common: {
    name: "庶民",
    icon: "/images/common-icon.png",
    color: "#10B981",
  },
}

function ResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get("roomId") || "DEMO01"
  const outcome = searchParams.get("outcome") || "common_win" // common_win | insider_win | timeout

  const isCommonWin = outcome === "common_win"
  const isInsiderWin = outcome === "insider_win"
  const isTimeout = outcome === "timeout"

  const handleNextRound = () => {
    router.push(`/lobby?roomId=${roomId}`)
  }

  const handleLeave = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 pb-32">
      <div className="max-w-md mx-auto pt-12 space-y-6 animate-fade-in">
        {/* Result Banner */}
        <div
          className={`rounded-2xl p-8 text-center space-y-4 ${
            isCommonWin
              ? "bg-[#10B981]/20 border-2 border-[#10B981]"
              : isInsiderWin
                ? "bg-[#E50012]/20 border-2 border-[#E50012]"
                : "bg-white/10 border-2 border-white/30"
          }`}
        >
          <div className="flex justify-center">
            {isCommonWin ? (
              <Trophy className="w-16 h-16 text-[#10B981]" />
            ) : isInsiderWin ? (
              <Image src="/images/insider-mark.png" alt="インサイダー" width={64} height={64} />
            ) : (
              <Clock className="w-16 h-16 text-white/50" />
            )}
          </div>

          <div>
            <h1
              className={`text-3xl font-black mb-2 ${isCommonWin ? "text-[#10B981]" : isInsiderWin ? "text-[#E50012]" : "text-white"}`}
            >
              {isCommonWin ? "庶民の勝利！" : isInsiderWin ? "インサイダーの勝利！" : "時間切れ"}
            </h1>
            <p className="text-white text-sm">
              {isCommonWin
                ? "インサイダーを見破りました"
                : isInsiderWin
                  ? "インサイダーは正体を隠し切りました"
                  : "時間内にお題を当てられませんでした"}
            </p>
          </div>
        </div>

        {/* Role Reveal */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">役職公開</h2>

          <div className="space-y-3">
            {DEMO_PLAYERS.map((player) => {
              const roleInfo = ROLE_INFO[player.role]
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
                    <p className="font-bold text-white">{player.name}</p>
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
        <div className="bg-card/30 backdrop-blur-sm border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ゲーム時間</span>
            <span className="text-white font-bold">3分42秒</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">質問回数</span>
            <span className="text-white font-bold">12回</span>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border space-y-3">
        <div className="max-w-md mx-auto space-y-3">
          <Button
            onClick={handleNextRound}
            className="w-full h-14 text-lg font-bold bg-transparent hover:bg-[#E50012]/10 text-white border-2 border-white rounded-xl transition-all duration-200 hover:border-[#E50012] hover:text-[#E50012]"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            次のラウンド
          </Button>

          <Button
            onClick={handleLeave}
            variant="ghost"
            className="w-full h-12 text-base text-muted-foreground hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            ルームから退出
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
        <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
          <div className="text-white">読み込み中...</div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  )
}
