"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { EyeOff, Clock } from "lucide-react"

function TopicContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const roomId = searchParams.get("roomId") || "DEMO01"
    const role = (searchParams.get("role") || "common") as "master" | "insider" | "common"

    const [topic, setTopic] = useState("りんご")
    const [difficulty, setDifficulty] = useState("Easy")
    const [confirmed, setConfirmed] = useState(false)
    const [confirmedCount, setConfirmedCount] = useState(1)
    const [insiderTimer, setInsiderTimer] = useState(10)
    const [topicVisible, setTopicVisible] = useState(true)
    const totalPlayers = 6

    useEffect(() => {
        // インサイダーの場合、10秒後にお題を非表示
        if (role === "insider") {
            const timer = setInterval(() => {
                setInsiderTimer((prev) => {
                    if (prev <= 1) {
                        setTopicVisible(false)
                        clearInterval(timer)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

            return () => clearInterval(timer)
        }
    }, [role])

    useEffect(() => {
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
        // 全員確認済みになったら質問フェーズへ
        setTimeout(() => {
            router.push(`/game/question?roomId=${roomId}&role=${role}&topic=${topic}`)
        }, 1500)
    }

    // 庶民の場合
    if (role === "common") {
        return (
            <div className="min-h-screen p-4 pt-12 flex flex-col items-center">
                <div className="max-w-md w-full pb-24 flex flex-col gap-8 animate-fade-in">
                    {/* Common Player Card */}
                    <div className="bg-surface/50 backdrop-blur-sm border-2 border-success rounded-2xl p-8 space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center">
                                <Image src="/images/common-icon.png" alt="庶民" width={60} height={60} />
                            </div>
                        </div>

                        <h1 className="text-2xl font-black text-foreground">あなたは庶民です</h1>

                        <div className="space-y-3 text-foreground">
                            <p className="text-base leading-relaxed">質問フェーズでマスターに質問して、お題を当てましょう。</p>
                            <p className="text-sm text-foreground-secondary">お題は知らされていません。</p>
                        </div>
                    </div>

                    {/* Confirm Button */}
                    <Button
                        onClick={handleConfirm}
                        disabled={confirmed}
                        className="w-full h-14 text-lg font-bold bg-transparent hover:bg-surface/5 text-foreground border-2 border-foreground rounded-xl transition-all duration-200 hover:border-success hover:text-success disabled:opacity-50"
                    >
                        {confirmed ? "確認済み" : "確認しました"}
                    </Button>

                    {/* Progress */}
                    <div className="bg-surface/30 backdrop-blur-sm border border-border rounded-lg p-4 text-center">
                        <p className="text-sm text-foreground-secondary">
                            確認済み: <span className="text-game-red font-bold">{confirmedCount}</span> / {totalPlayers}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // マスター・インサイダーの場合
    const isMaster = role === "master"
    const isInsider = role === "insider"
    const roleColor = isMaster ? "#3B82F6" : "#E50012" // Consider moving these to CSS variables or constants
    const roleIcon = isMaster ? "/images/master-icon.png" : "/images/insider-mark.png"

    return (
        <div className="min-h-screen p-4 pt-12 flex flex-col items-center">
            <div className="max-w-md w-full pb-24 flex flex-col gap-8 animate-fade-in">
                {/* Topic Card */}
                <div
                    className="bg-surface/50 backdrop-blur-sm border-2 rounded-2xl p-8 space-y-6 text-center relative"
                    style={{ borderColor: roleColor }}
                >
                    {/* Role Icon */}
                    <div className="flex justify-center">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${roleColor}20` }}
                        >
                            <Image
                                src={roleIcon || "/placeholder.svg"}
                                alt={isMaster ? "マスター" : "インサイダー"}
                                width={40}
                                height={40}
                            />
                        </div>
                    </div>

                    {/* Timer for Insider */}
                    {isInsider && topicVisible && (
                        <div className="absolute top-4 right-4">
                            <div className="flex items-center gap-2 bg-game-red/20 border border-game-red rounded-full px-3 py-1">
                                <Clock className="w-4 h-4 text-game-red" />
                                <span className="text-game-red font-bold text-sm">{insiderTimer}</span>
                            </div>
                        </div>
                    )}

                    <h2 className="text-xl font-bold text-foreground">お題</h2>

                    {/* Topic Display */}
                    {topicVisible ? (
                        <div className="bg-background/50 backdrop-blur-sm border-2 border-border rounded-xl p-6">
                            <p className="text-4xl font-black text-foreground mb-2">{topic}</p>
                            <p className="text-sm text-foreground/80">難易度: {difficulty}</p>
                        </div>
                    ) : (
                        <div className="bg-background/50 backdrop-blur-sm border-2 border-border rounded-xl p-6">
                            <EyeOff className="w-12 h-12 mx-auto text-foreground/60 mb-2" />
                            <p className="text-sm text-foreground/80">お題は非表示になりました</p>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="space-y-2 text-foreground text-sm leading-relaxed">
                        {isMaster ? (
                            <>
                                <p>質問に答えて、庶民がお題を当てられるように誘導してください。</p>
                                <p className="text-xs text-foreground-secondary">お題は常に表示されています</p>
                            </>
                        ) : (
                            <>
                                {topicVisible ? (
                                    <p className="text-game-red">10秒後に自動的にお題が消えます。覚えておいてください。</p>
                                ) : (
                                    <p>庶民のふりをして、バレないように正解へ誘導してください。</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Confirm Button */}
                <Button
                    onClick={handleConfirm}
                    disabled={confirmed || (isInsider && topicVisible)}
                    className="w-full h-14 text-lg font-bold bg-transparent hover:bg-surface/5 text-foreground border-2 border-foreground rounded-xl transition-all duration-200 hover:border-game-red hover:text-game-red disabled:opacity-50"
                >
                    {confirmed ? "確認済み" : isInsider && topicVisible ? `${insiderTimer}秒後に確認可能` : "確認しました"}
                </Button>

                {/* Progress */}
                <div className="bg-surface/30 backdrop-blur-sm border-2 border-border rounded-lg p-4 text-center">
                    <p className="text-sm text-foreground/90">
                        確認済み: <span className="text-game-red font-bold">{confirmedCount}</span> / {totalPlayers}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function TopicPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <TopicContent />
        </Suspense>
    )
}
