"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { MessageSquare } from "lucide-react"
import { QuestionChat, type Question } from "./_components/QuestionChat"
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

function QuestionPhaseContent() {
    const router = useRouter()
    const { roles, topic, timer, setTimer, setPhase, setOutcome, phase } = useGame()
    const { playerId, roomId, players } = useRoom()

    const assignedRole = playerId && roles[playerId] ? roles[playerId] : null
    const role = assignedRole?.toLowerCase() || "common"
    const isMaster = role === "master"

    // Chat State
    const [questions, setQuestions] = useState<Question[]>([])
    const [deadline, setDeadline] = useState<number | null>(null)

    useEffect(() => {
        if (!roomId || !playerId) {
            router.push("/")
            return
        }
    }, [roomId, playerId, router])

    // Subscribe to questions and sync timer
    useEffect(() => {
        if (!roomId) return;

        const fetchQuestions = async () => {
            // Get latest session
            const { data: session } = await supabase
                .from('game_sessions')
                .select('id, created_at, time_limit, deadline_epoch')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (session) {
                const timeLimit = session.time_limit || 300;

                // Reset timer at question phase start (Option A)
                // Check if deadline_epoch needs to be reset for question phase
                const shouldResetTimer = !session.deadline_epoch ||
                    (session.deadline_epoch < Date.now()); // If expired, reset

                if (shouldResetTimer) {
                    // Calculate new deadline from now
                    const newDeadline = Date.now() + (timeLimit * 1000);

                    // Update deadline_epoch in database
                    await supabase
                        .from('game_sessions')
                        .update({ deadline_epoch: newDeadline })
                        .eq('id', session.id);

                    setDeadline(newDeadline);
                    setTimer(timeLimit);
                } else {
                    // Use existing deadline_epoch
                    setDeadline(session.deadline_epoch);
                    const now = Date.now();
                    const remaining = Math.max(0, Math.floor((session.deadline_epoch - now) / 1000));
                    setTimer(remaining);
                }

                const { data } = await supabase
                    .from('questions')
                    .select('*, players(nickname)')
                    .eq('session_id', session.id)
                    .order('created_at', { ascending: true });

                if (data) {
                    const mappedQuestions: Question[] = data.map(q => ({
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

        fetchQuestions();

        const channel = supabase
            .channel(`questions:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'questions',
                },
                () => {
                    fetchQuestions();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel) }
    }, [roomId, setTimer]);

    // Navigate when phase changes
    useEffect(() => {
        if (phase === 'DEBATE') {
            router.push("/game/debate")
        } else if (phase === 'RESULT') {
            router.push("/game/result")
        }
    }, [phase, router])

    // Timer countdown based on deadline
    useEffect(() => {
        if (!deadline) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));

            // Only update state if changed to avoid re-renders, but for smooth ring we might want more frequent updates?
            // Actually TimerRing takes seconds.
            setTimer(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                // Timeout logic - Transition to VOTE1
                if (isMaster && phase === 'QUESTION') {
                    api.updatePhase(roomId!, 'VOTE1')
                        .catch(err => console.error("Failed to auto-transition to VOTE1:", err));
                }
            }
        }, 100); // Check every 100ms for better precision

        return () => clearInterval(interval);
    }, [deadline, setTimer, isMaster, phase, roomId]);

    const handleCorrectAnswer = async () => {
        // 討論フェーズへ（残り時間を引き継ぐ）
        if (isMaster) {
            try {
                await api.updatePhase(roomId!, 'DEBATE')
            } catch (error) {
                console.error("Failed to update phase:", error)
                toast.error('フェーズの更新に失敗しました')
            }
        }
    }

    const handleAskQuestion = async (text: string) => {
        if (!roomId || !playerId) return;
        try {
            await api.askQuestion(roomId, playerId, text);
        } catch (error) {
            console.error("Failed to ask question:", error);
            toast.error('質問の送信に失敗しました')
        }
    }

    const handleAnswerQuestion = async (id: string, answer: 'yes' | 'no') => {
        if (!isMaster) return;
        try {
            await api.answerQuestion(id, answer);
        } catch (error) {
            console.error("Failed to answer question:", error);
            toast.error('回答の送信に失敗しました')
        }
    }
    const [showAnswererModal, setShowAnswererModal] = useState(false)
    const [selectedAnswerer, setSelectedAnswerer] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Filter potential answerers (exclude Master)
    const potentialAnswerers = players.filter(p => roles[p.id] !== 'MASTER')

    const handleCorrectAnswerClick = () => {
        setShowAnswererModal(true)
    }

    const handleConfirmAnswerer = async () => {
        if (!selectedAnswerer || !roomId || isSubmitting) {
            return;
        }

        setIsSubmitting(true)
        try {
            await api.resolveQuestionPhase(roomId, selectedAnswerer)
            setShowAnswererModal(false)
        } catch (error) {
            console.error("Failed to resolve question phase:", error)
            toast.error('正解者の登録に失敗しました')
            setIsSubmitting(false)
        }
    }

    if (!assignedRole) return null

    return (
        <div className="min-h-screen p-4 flex flex-col items-center" style={{ paddingTop: '64px', paddingBottom: '128px' }}>
            <div className="max-w-md w-full flex flex-col gap-8 animate-fade-in">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Image src="/images/conversation-icon.png" alt="質問" width={32} height={32} />
                        <h1 className="text-2xl font-black text-foreground">質問フェーズ</h1>
                    </div>
                    <p className="text-sm text-foreground-secondary">マスターに質問してお題を当てよう</p>
                </div>

                {/* Timer */}
                <div className="flex justify-center">
                    <TimerRing remaining={timer} total={300} />
                </div>

                {/* Topic Card (Master Only) */}
                {isMaster && (
                    <div className="bg-blue-500/10 border-2 border-blue-500 backdrop-blur-sm rounded-xl p-6 space-y-3">
                        <div className="flex items-center gap-2">
                            <Image src="/images/master-icon.png" alt="マスター" width={24} height={24} />
                            <h2 className="text-lg font-bold text-blue-500">お題</h2>
                        </div>
                        <p className="text-3xl font-black text-foreground text-center">{topic}</p>
                    </div>
                )}

                {/* Chat Interface */}
                <QuestionChat
                    role={role as any}
                    questions={questions}
                    onAskQuestion={handleAskQuestion}
                    onAnswerQuestion={handleAnswerQuestion}
                />

                {/* Instructions */}
                <div className="bg-surface/50 backdrop-blur-sm border-2 border-border rounded-xl p-6 flex flex-col" style={{ padding: '24px', gap: '12px' }}>
                    <div className="flex items-center gap-2" style={{ gap: '8px' }}>
                        <MessageSquare className="w-5 h-5 text-game-red" />
                        <h3 className="font-bold text-foreground">進行方法</h3>
                    </div>
                    <div className="text-sm text-foreground/90 leading-relaxed flex flex-col" style={{ gap: '8px', lineHeight: '1.75' }}>
                        <p>• Discord/LINEで音声通話しながらプレイしてください</p>
                        <p>• 庶民はマスターに質問してお題を推測します</p>
                        <p>• マスターは「はい」「いいえ」で答えます</p>
                        {isMaster && <p className="text-blue-500">• 正解が出たら下のボタンを押してください</p>}
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Action (Master Only) */}
            {isMaster && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border flex justify-center">
                    <div className="max-w-md w-full">
                        <Button
                            onClick={handleCorrectAnswerClick}
                            className="w-full h-14 text-lg font-bold bg-transparent hover:bg-success/10 text-foreground border-2 border-foreground rounded-xl transition-all duration-200 hover:border-success hover:text-success"
                        >
                            正解が出ました
                        </Button>
                    </div>
                </div>
            )}

            {/* Answerer Selection Modal */}
            {showAnswererModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-black">正解者を選択</h2>
                            <p className="text-sm text-foreground-secondary">誰がお題を当てましたか？</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto">
                            {potentialAnswerers.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => setSelectedAnswerer(player.id)}
                                    className={`p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between ${selectedAnswerer === player.id
                                        ? 'border-success bg-success/10 text-success'
                                        : 'border-border hover:border-foreground/50 text-foreground'
                                        }`}
                                >
                                    <span className="font-bold">{player.nickname}</span>
                                    {selectedAnswerer === player.id && (
                                        <div className="w-4 h-4 rounded-full bg-success" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowAnswererModal(false)}
                                disabled={isSubmitting}
                            >
                                キャンセル
                            </Button>
                            <Button
                                className="flex-1 bg-success hover:bg-success/90 text-white"
                                onClick={handleConfirmAnswerer}
                                disabled={!selectedAnswerer || isSubmitting}
                            >
                                {isSubmitting ? '送信中...' : '決定'}
                            </Button>
                        </div>
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
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <QuestionPhaseContent />
        </Suspense>
    )
}
