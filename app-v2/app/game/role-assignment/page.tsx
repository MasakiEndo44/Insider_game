"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useGame, Role } from "@/context/game-context"
import { useRoom } from "@/context/room-context"

interface RoleInfo {
    type: Role
    name: string
    icon: string
    description: string
    color: string
}

const ROLES: Record<Role, RoleInfo> = {
    MASTER: {
        type: "MASTER",
        name: "マスター",
        icon: "/images/master-icon.png",
        description:
            "あなたはマスターです。お題を知っています。質問に答えて、庶民がお題を当てられるように誘導してください。",
        color: "#3B82F6",
    },
    INSIDER: {
        type: "INSIDER",
        name: "インサイダー",
        icon: "/images/insider-mark.png",
        description:
            "あなたはインサイダーです。お題を知っています。庶民のふりをして、バレないように正解へ誘導してください。",
        color: "#E50012",
    },
    CITIZEN: {
        type: "CITIZEN",
        name: "庶民",
        icon: "/images/common-icon.png",
        description: "あなたは庶民です。お題を知りません。マスターに質問して、お題を当てましょう。",
        color: "#10B981",
    },
}

function RoleAssignmentContent() {
    const router = useRouter()
    const { roles, setPhase } = useGame()
    const { playerId, players, roomId } = useRoom()

    const [confirmed, setConfirmed] = useState(false)
    // Mock confirmed count for now, or use real-time if available
    const [confirmedCount, setConfirmedCount] = useState(1)

    const assignedRole = playerId && roles[playerId] ? roles[playerId] : null

    useEffect(() => {
        if (!roomId || !playerId) {
            router.push("/")
            return
        }
        if (!assignedRole) {
            // If no role assigned, maybe go back to lobby?
            router.push("/lobby")
        }
    }, [roomId, playerId, assignedRole, router])

    // Simulate other players confirming
    useEffect(() => {
        if (!roomId) return
        const interval = setInterval(() => {
            setConfirmedCount((prev) => {
                if (prev < players.length) return prev + 1
                return prev
            })
        }, 2000)
        return () => clearInterval(interval)
    }, [roomId, players.length])

    const handleConfirm = () => {
        setConfirmed(true)
        // Navigate to topic screen
        setPhase('TOPIC')
        setTimeout(() => {
            router.push("/game/topic")
        }, 500)
    }

    if (!assignedRole) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-foreground">読み込み中...</div>
            </div>
        )
    }

    const roleInfo = ROLES[assignedRole]

    return (
        <div className="min-h-screen p-4 flex flex-col items-center" style={{ paddingTop: '64px' }}>
            <div className="max-w-md w-full pb-24 flex flex-col gap-8 animate-fade-in">
                {/* Role Card */}
                <div
                    className="bg-surface/50 backdrop-blur-sm border-2 rounded-2xl p-8 flex flex-col text-center"
                    style={{ borderColor: roleInfo.color, padding: '32px', gap: '12px' }}
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
                    <p className="text-foreground text-base leading-relaxed" style={{ lineHeight: '1.75' }}>{roleInfo.description}</p>
                </div>

                {/* Confirm Button */}
                <Button
                    onClick={handleConfirm}
                    disabled={confirmed}
                    className="w-full h-14 text-lg font-bold bg-transparent hover:bg-surface/5 text-foreground border-2 border-foreground rounded-xl transition-all duration-200 hover:border-game-red hover:text-game-red disabled:opacity-50"
                >
                    {confirmed ? "確認済み" : "確認しました"}
                </Button>

                {/* Progress */}
                <div className="bg-surface/30 backdrop-blur-sm border border-border rounded-lg p-4 text-center">
                    <p className="text-sm text-foreground-secondary">
                        確認済み: <span className="text-game-red font-bold">{confirmedCount}</span> / {players.length}
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
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <RoleAssignmentContent />
        </Suspense>
    )
}
