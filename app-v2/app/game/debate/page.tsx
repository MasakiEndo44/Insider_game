"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Users, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGame } from "@/context/game-context"
import { useRoom } from "@/context/room-context"
import { api } from '@/lib/api';
import { supabase } from "@/lib/supabase/client"
import { toast } from 'sonner'
import { QuestionHistoryModal, type Question } from "./_components/QuestionHistoryModal"

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
    const isMaster = players.find(p => p.id === playerId)?.isHost // Master can skip debate
    const [deadline, setDeadline] = useState<number | null>(null)
    const [initialTotal, setInitialTotal] = useState(300)

    // New state for answerer display and Q&A history
    const [answererName, setAnswererName] = useState<string | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [showHistoryModal, setShowHistoryModal] = useState(false)

    useEffect(() => {
        if (!roomId) {
            router.push("/")
            return
        }
    }, [roomId, router])

    // Sync timer with server and fetch answerer + questions
    useEffect(() => {
        if (!roomId) return;

        const fetchDebateData = async () => {
            const { data: session } = await supabase
                .from('game_sessions')
                .select('id, created_at, time_limit, deadline_epoch, answerer_id')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (session) {
                const timeLimit = session.time_limit || 300;
                setInitialTotal(timeLimit);

                // Use deadline_epoch if available
                if (session.deadline_epoch) {
                    setDeadline(session.deadline_epoch);
                    const now = Date.now();
                    const remaining = Math.max(0, Math.floor((session.deadline_epoch - now) / 1000));
                    setTimer(remaining);
                } else {
                    // Fallback to old calculation if deadline_epoch is not set
                    const createdAt = new Date(session.created_at).getTime();
                    const calculatedDeadline = createdAt + timeLimit * 1000;
                    setDeadline(calculatedDeadline);
                    const now = Date.now();
                    const remaining = Math.max(0, Math.floor((calculatedDeadline - now) / 1000));
                    setTimer(remaining);
                }

                // Fetch answerer name
                if (session.answerer_id) {
                    const player = players.find(p => p.id === session.answerer_id);
                    if (player) {
                        setAnswererName(player.nickname);
                    }
                }

                // Fetch Q&A history
                const { data: questionsData } = await supabase
                    .from('questions')
                    .select('*, players(nickname)')
                    .eq('session_id', session.id)
                    .order('created_at', { ascending: true });

                if (questionsData) {
                    const mappedQuestions: Question[] = questionsData.map(q => ({
                        id: q.id,
                        text: q.text,
                        answer: q.answer as 'pending' | 'yes' | 'no',
                        timestamp: new Date(q.created_at).getTime(),
                        playerName: q.players?.nickname || '不明'
                    }));
                    setQuestions(mappedQuestions);
                }
            }
        };

        fetchDebateData();
    }, [roomId, setTimer, players]);

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
            const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
            setTimer(remaining);

            if (remaining <= 0 && isHost) {
                clearInterval(interval);
                console.log('[DEBUG] Timer reached 0, transitioning to VOTE1');

                api.updatePhase(roomId!, 'VOTE1')
                    .then(() => {
                        console.log('[DEBUG] Phase updated successfully, navigating...');
                        router.push('/game/vote1');
                    })
                    .catch(error => {
                        console.error("Failed to update phase:", error);
                        toast.error('フェーズの更新に失敗しました。画面を更新してください。');
                        // Fallback: force navigation anyway
                        router.push('/game/vote1');
                    });
            }
        }, 100); // Check every 100ms

        return () => clearInterval(interval);
    }, [deadline, setTimer, isHost, roomId, router])

    // Skip debate (Master only)
    const handleSkipDebate = async () => {
        try {
            await api.updatePhase(roomId!, 'VOTE1');
            router.push('/game/vote1');
        } catch (error) {
            console.error("Failed to skip debate:", error);
            toast.error('討論の終了に失敗しました');
        }
    };

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

                {/* Answerer Display (NEW) */}
                {answererName && (
                    <div className="bg-success/10 border border-success/30 backdrop-blur-sm rounded-xl p-4 text-center">
                        <p className="text-lg font-bold text-success">
                            🎉 {answererName} さんが正解しました
                        </p>
                    </div>
                )}

                {/* Q&A History Button (NEW) */}
                <Button
                    onClick={() => setShowHistoryModal(true)}
                    className="w-full h-12 bg-transparent hover:bg-foreground/10 text-foreground border border-border rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <MessageSquare className="w-5 h-5" />
                    質問履歴を見る ({questions.length}件)
                </Button>

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

            {/* Fixed Bottom Action (Master Only) */}
            {isMaster && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border flex justify-center">
                    <div className="max-w-md w-full">
                        <Button
                            onClick={handleSkipDebate}
                            className="w-full h-14 text-lg font-bold bg-transparent hover:bg-success/10 text-foreground border-2 border-foreground rounded-xl transition-all duration-200 hover:border-success hover:text-success"
                        >
                            討論を終了する
                        </Button>
                    </div>
                </div>
            )}

            {/* Q&A History Modal (NEW) */}
            {showHistoryModal && (
                <QuestionHistoryModal
                    questions={questions}
                    onClose={() => setShowHistoryModal(false)}
                />
            )}
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
