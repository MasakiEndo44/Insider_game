"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useRoom } from "@/context/room-context"

function ExecutionContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { players } = useRoom()

    const executedId = searchParams.get("executedId")
    const executedPlayer = players.find(p => p.id === executedId)
    const executedName = executedPlayer?.nickname || "???"

    const [showName, setShowName] = useState(false)
    const [countdown, setCountdown] = useState(8)

    // Show name after 2 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowName(true), 2000)
        return () => clearTimeout(timer)
    }, [])

    // Countdown timer - 8 seconds for the video
    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval)
                    router.push('/game/result')
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [router])

    return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Video Container with margins */}
            <div className="absolute inset-0 flex items-center justify-center px-8 md:px-16">
                <video
                    autoPlay
                    muted
                    playsInline
                    className="w-full max-w-md md:max-w-lg rounded-lg shadow-[0_0_60px_rgba(229,0,18,0.4)]"
                >
                    <source src="/images/処刑台アニメーション生成.mp4" type="video/mp4" />
                </video>
            </div>

            {/* Floating Name Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center z-10 transition-all duration-1000 ${showName ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-center animate-name-reveal">
                    <p className="text-xl text-game-red font-bold mb-4 tracking-[0.3em] uppercase drop-shadow-[0_0_20px_rgba(229,0,18,0.8)]">
                        処刑
                    </p>
                    <h1 className="text-6xl md:text-8xl font-black text-white drop-shadow-[0_0_40px_rgba(229,0,18,0.9)] animate-pulse">
                        {executedName}
                    </h1>
                </div>
            </div>

            {/* Vignette effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_30%,rgba(0,0,0,0.7)_100%)] pointer-events-none z-5" />

            {/* Countdown indicator */}
            <div className="absolute bottom-8 left-0 right-0 text-center z-20">
                <p className="text-foreground-secondary/70 text-sm">
                    結果表示まで <span className="text-game-red font-bold">{countdown}</span> 秒
                </p>
            </div>
        </div>
    )
}

export default function ExecutionPage() {
    return (
        <Suspense
            fallback={
                <div className="fixed inset-0 bg-black flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <ExecutionContent />
        </Suspense>
    )
}
