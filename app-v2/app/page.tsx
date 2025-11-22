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
    <div className="min-h-screen flex flex-col items-center p-4" style={{ paddingTop: '64px' }}>
      <div className="w-full max-w-md flex flex-col gap-8 animate-fade-in">
        <div className="text-center flex flex-col gap-4 items-center">
          <div className="inline-flex items-center justify-center w-32 h-32 mb-4 mx-auto">
            <Image
              src="/images/insider-logo.png"
              alt="Insider Logo"
              width={128}
              height={128}
              className="animate-pulse-glow"
              priority
            />
          </div>
          <h1 className="text-5xl font-black text-foreground tracking-tight">インサイダー</h1>
          <p className="text-foreground/90 text-lg font-medium">オンライン推理ゲーム</p>
        </div>

        <div className="bg-surface/50 backdrop-blur-sm border-2 border-border rounded-xl p-6 flex flex-col" style={{ padding: '24px', gap: '8px' }}>
          <p className="text-sm leading-relaxed text-center text-foreground" style={{ lineHeight: '1.75' }}>
            マスター、インサイダー、庶民の3つの役職に分かれて遊ぶ推理ゲーム。
          </p>
          <p className="text-sm leading-relaxed text-center text-foreground/80" style={{ lineHeight: '1.75' }}>
            お題を当てた後、誰がインサイダーかを見つけ出そう。
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            className="w-full h-14 text-lg font-bold bg-transparent hover:bg-game-red/10 text-foreground rounded-xl transition-all duration-200 hover:border-game-red hover:text-game-red border-2"
          >
            <Play className="w-5 h-5 mr-2" />
            PLAY
          </Button>

          <Button
            onClick={() => setShowJoinModal(true)}
            variant="outline"
            className="w-full h-14 text-lg font-bold bg-transparent hover:bg-foreground/5 text-foreground border-2 rounded-xl transition-all duration-200"
          >
            <Users className="w-5 h-5 mr-2" />
            ルームに参加する
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-foreground/70 pt-4">
          <p>3〜12人で遊べます</p>
        </div>
      </div>

      {/* Modals */}
      <CreateRoomModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <JoinRoomModal open={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </div>
  )
}
