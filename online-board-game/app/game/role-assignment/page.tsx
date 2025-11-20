"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"

type Role = "master" | "insider" | "common"

interface RoleInfo {
  type: Role
  name: string
  icon: string
  description: string
  color: string
}

const ROLES: Record<Role, RoleInfo> = {
  master: {
    type: "master",
    name: "マスター",
    icon: "/images/master-icon.png",
    description:
      "あなたはマスターです。お題を知っています。質問に答えて、庶民がお題を当てられるように誘導してください。",
    color: "#3B82F6",
  },
  insider: {
    type: "insider",
    name: "インサイダー",
    icon: "/images/insider-mark.png",
    description:
      "あなたはインサイダーです。お題を知っています。庶民のふりをして、バレないように正解へ誘導してください。",
    color: "#E50012",
  },
  common: {
    type: "common",
    name: "庶民",
    icon: "/images/common-icon.png",
    description: "あなたは庶民です。お題を知りません。マスターに質問して、お題を当てましょう。",
    color: "#10B981",
  },
}

function RoleAssignmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get("roomId") || "DEMO01"

  const [assignedRole, setAssignedRole] = useState<Role | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedCount, setConfirmedCount] = useState(1)
  const totalPlayers = 6

  useEffect(() => {
    // デモ用: ランダムに役職を割り当て
    const roles: Role[] = ["master", "insider", "common"]
    const randomRole = roles[Math.floor(Math.random() * roles.length)]
    setAssignedRole(randomRole)

    // 確認済みプレイヤー数をシミュレート
    const interval = setInterval(() => {
      setConfirmedCount((prev) => {
        if (prev < totalPlayers) return prev + 1
        return prev
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleConfirm = () => {
    setConfirmed(true)
    // 全員確認済みになったらお題確認画面へ
    setTimeout(() => {
      router.push(`/game/topic?roomId=${roomId}&role=${assignedRole}`)
    }, 1500)
  }

  if (!assignedRole) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white">役職を配布中...</div>
      </div>
    )
  }

  const roleInfo = ROLES[assignedRole]

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-6 animate-fade-in">
        {/* Role Card */}
        <div
          className="bg-card/50 backdrop-blur-sm border-2 rounded-2xl p-8 space-y-6 text-center"
          style={{ borderColor: roleInfo.color }}
        >
          {/* Role Icon */}
          <div className="flex justify-center">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${roleInfo.color}20` }}
            >
              <Image
                src={roleInfo.icon || "/placeholder.svg"}
                alt={roleInfo.name}
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
          </div>

          {/* Role Name */}
          <h1 className="text-3xl font-black" style={{ color: roleInfo.color }}>
            {roleInfo.name}
          </h1>

          {/* Description */}
          <p className="text-white text-base leading-relaxed">{roleInfo.description}</p>
        </div>

        {/* Confirm Button */}
        <Button
          onClick={handleConfirm}
          disabled={confirmed}
          className="w-full h-14 text-lg font-bold bg-transparent hover:bg-white/5 text-white border-2 border-white rounded-xl transition-all duration-200 hover:border-[#E50012] hover:text-[#E50012] disabled:opacity-50"
        >
          {confirmed ? "確認済み" : "確認しました"}
        </Button>

        {/* Progress */}
        <div className="bg-card/30 backdrop-blur-sm border border-border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            確認済み: <span className="text-[#E50012] font-bold">{confirmedCount}</span> / {totalPlayers}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RoleAssignmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
          <div className="text-white">読み込み中...</div>
        </div>
      }
    >
      <RoleAssignmentContent />
    </Suspense>
  )
}
