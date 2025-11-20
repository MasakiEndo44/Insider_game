"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreateRoomModal } from "@/components/create-room-modal"
import { JoinRoomModal } from "@/components/join-room-modal"
import { Users, Play } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 circuit-bg circuit-pattern">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-32 h-32 mb-4">
            <Image
              src="/images/insider-logo.png"
              alt="Insider Logo"
              width={128}
              height={128}
              className="animate-pulse-glow"
              priority
            />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">インサイダー</h1>
          <p className="text-white/90 text-lg font-medium">オンライン推理ゲーム</p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-xl p-6 space-y-2">
          <p className="text-sm leading-relaxed text-center text-white">
            マスター、インサイダー、庶民の3つの役職に分かれて遊ぶ推理ゲーム。
          </p>
          <p className="text-sm leading-relaxed text-center text-white/80">
            お題を当てた後、誰がインサイダーかを見つけ出そう。
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="w-full h-14 text-lg font-bold bg-transparent hover:bg-[#E50012]/10 text-white rounded-xl transition-all duration-200 hover:border-[#E50012] hover:text-[#E50012] border-2 border-white/80"
          >
            <Play className="w-5 h-5 mr-2" />
            PLAY
          </Button>

          <Button
            onClick={() => setShowJoinModal(true)}
            className="w-full h-14 text-lg font-bold bg-transparent hover:bg-white/5 text-white border-2 border-white/70 rounded-xl transition-all duration-200 hover:border-white"
          >
            <Users className="w-5 h-5 mr-2" />
            ルームに参加する
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-white/70 pt-4">
          <p>3〜12人で遊べます</p>
        </div>
      </div>

      {/* Modals */}
      <CreateRoomModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <JoinRoomModal open={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </div>
  )
}
