"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Users } from "lucide-react"
import { useGame } from "@/context/game-context"
import { useRoom } from "@/context/room-context"
import { api } from '@/lib/api';
import { supabase } from "@/lib/supabase/client"
import { toast } from 'sonner'

function TimerRing({ remaining, total, size = 200 }: { remaining: number; total: number; size?: number }) {
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const progress = Math.max(0, remaining / total)
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
                <p className={`text-5xl font-black ${remaining <= 10 ? "text-game-red" : "text-foreground"}`}>
                    {minutes}:{seconds.toString().padStart(2, "0")}
                </p>
                <p className="text-sm text-foreground-secondary mt-2">残り時間</p>
            </div>
        </div>
    )
}

function DebatePhaseContent() {
    const router = useRouter()
    const { timer, setTimer, phase } = useGame()
    const { roomId, playerId, players } = useRoom()
    const isHost = players.find(p => p.id === playerId)?.isHost
    const [deadline, setDeadline] = useState<number | null>(null)
    const [initialTotal, setInitialTotal] = useState(300)

    useEffect(() => {
        if (!roomId) {
            router.push("/")
            return
        }
    }, [roomId, router])

    // Sync timer with server
    useEffect(() => {
        if (!roomId) return;

        const syncTimer = async () => {
            const { data: session } = await supabase
                .from('game_sessions')
                .select('id, created_at, time_limit')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (session) {
                const createdAt = new Date(session.created_at).getTime();
                const timeLimit = session.time_limit || 300;
                const calculatedDeadline = createdAt + timeLimit * 1000;
                setDeadline(calculatedDeadline);
                setInitialTotal(timeLimit);

                const now = Date.now();
                const remaining = Math.max(0, Math.floor((calculatedDeadline - now) / 1000));
                setTimer(remaining);
            }
        };

        syncTimer();
    }, [roomId, setTimer]);

    // Listen for phase change
    useEffect(() => {
        if (phase === 'VOTE1') {
            router.push("/game/vote1")
        }
    }, [phase, router])

    // Timer countdown based on deadline
    useEffect(() => {
        if (!deadline) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
            setTimer(remaining);

            if (remaining <= 0 && isHost) {
                clearInterval(interval);
                api.updatePhase(roomId!, 'VOTE1').catch(error => {
                    console.error("Failed to update phase:", error);
                    toast.error('フェーズの更新に失敗しました');
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [deadline, setTimer, isHost, roomId])

    return (
        <div className="min-h-screen p-4 flex flex-col items-center" style={{ paddingTop: '64px' }}>
            <div className="max-w-md w-full flex flex-col gap-8 animate-fade-in">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-game-red" />
                        <h1 className="text-2xl font-black text-foreground">討論フェーズ</h1>
                    </div>
                    <p className="text-sm text-foreground-secondary">誰がインサイダーか議論しよう</p>
                </div>

                {/* Timer */}
                <div className="flex justify-center">
                    <TimerRing remaining={timer} total={initialTotal} />
                </div>

                {/* Instructions */}
                <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col" style={{ padding: '24px', gap: '12px' }}>
                    <h3 className="font-bold text-foreground text-lg">討論の進め方</h3>
                    <div className="text-sm text-foreground leading-relaxed space-y-3">
                        <p>• 正解者をインサイダーとして告発するか議論します</p>
                        <p>• 怪しい発言や質問をした人を探しましょう</p>
                        <p>• インサイダーはバレないように振る舞いましょう</p>
                    </div>
                </div>

                {/* Next Phase Info */}
                <div className="bg-game-red/10 border border-game-red/30 backdrop-blur-sm rounded-xl p-4 text-center">
                    <p className="text-sm text-foreground">時間終了後、自動的に投票フェーズに進みます</p>
                </div>
            </div>
        </div>
    )
}

export default function DebatePhasePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <DebatePhaseContent />
        </Suspense>
    )
}
