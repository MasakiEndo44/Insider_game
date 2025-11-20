"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { MessageSquare } from "lucide-react"

function TimerRing({ remaining, total, size = 200 }: { remaining: number; total: number; size?: number }) {
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const progress = remaining / total
  const offset = circumference * (1 - progress)

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={remaining <= 10 ? "#E50012" : "#ffffff"}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className={`text-5xl font-black ${remaining <= 10 ? "text-[#E50012]" : "text-white"}`}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </p>
        <p className="text-sm text-muted-foreground mt-2">残り時間</p>
      </div>
    </div>
  )
}

function QuestionPhaseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get("roomId") || "DEMO01"
  const role = (searchParams.get("role") || "common") as "master" | "insider" | "common"
  const topic = searchParams.get("topic") || "りんご"

  const [remaining, setRemaining] = useState(300) // 5分 = 300秒
  const total = 300
  const isMaster = role === "master"

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // 時間切れ → 全員敗北
          router.push(`/game/result?roomId=${roomId}&outcome=timeout`)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router, roomId])

  const handleCorrectAnswer = () => {
    // 討論フェーズへ（残り時間を引き継ぐ）
    router.push(`/game/debate?roomId=${roomId}&remaining=${remaining}`)
  }

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4">
      <div className="max-w-md mx-auto pt-12 pb-24 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Image src="/images/conversation-icon.png" alt="質問" width={32} height={32} />
            <h1 className="text-2xl font-black text-white">質問フェーズ</h1>
          </div>
          <p className="text-sm text-muted-foreground">マスターに質問してお題を当てよう</p>
        </div>

        {/* Timer */}
        <div className="flex justify-center">
          <TimerRing remaining={remaining} total={total} />
        </div>

        {/* Topic Card (Master Only) */}
        {isMaster && (
          <div className="bg-[#3B82F6]/10 border-2 border-[#3B82F6] backdrop-blur-sm rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Image src="/images/master-icon.png" alt="マスター" width={24} height={24} />
              <h2 className="text-lg font-bold text-[#3B82F6]">お題</h2>
            </div>
            <p className="text-3xl font-black text-white text-center">{topic}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#E50012]" />
            <h3 className="font-bold text-white">進行方法</h3>
          </div>
          <div className="text-sm text-white/90 leading-relaxed space-y-2">
            <p>• Discord/LINEで音声通話しながらプレイしてください</p>
            <p>• 庶民はマスターに質問してお題を推測します</p>
            <p>• マスターは「はい」「いいえ」で答えます</p>
            {isMaster && <p className="text-[#3B82F6]">• 正解が出たら下のボタンを押してください</p>}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action (Master Only) */}
      {isMaster && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
          <div className="max-w-md mx-auto">
            <Button
              onClick={handleCorrectAnswer}
              className="w-full h-14 text-lg font-bold bg-transparent hover:bg-[#10B981]/10 text-white border-2 border-white rounded-xl transition-all duration-200 hover:border-[#10B981] hover:text-[#10B981]"
            >
              正解が出ました
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function QuestionPhasePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
          <div className="text-white">読み込み中...</div>
        </div>
      }
    >
      <QuestionPhaseContent />
    </Suspense>
  )
}
