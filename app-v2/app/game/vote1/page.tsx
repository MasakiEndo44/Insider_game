"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, Vote } from "lucide-react"
import { useGame } from "@/context/game-context"
import { useRoom } from "@/context/room-context"
import { api } from '@/lib/api';
import { supabase } from "@/lib/supabase/client"
import { ProgressIndicator } from "@/components/progress-indicator"

function Vote1Content() {
    const router = useRouter()
    const { topic, setPhase, setOutcome, roles } = useGame()
    const { roomId, playerId, players } = useRoom()

    const [voted, setVoted] = useState(false)
    const [myVote, setMyVote] = useState<"yes" | "no" | null>(null)
    const [votedCount, setVotedCount] = useState(0)
    const [answerer, setAnswerer] = useState<string | null>(null)
    const [answererRole, setAnswererRole] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!roomId || !playerId) {
            router.push("/")
            return
        }
    }, [roomId, playerId, router])

    // Fetch actual answerer and check if Master
    useEffect(() => {
        if (!roomId) return;

        const fetchAnswerer = async () => {
            const { data: session } = await supabase
                .from('game_sessions')
                .select('answerer_id')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (session?.answerer_id) {
                const player = players.find(p => p.id === session.answerer_id);
                if (player) {
                    setAnswerer(player.nickname);
                    const role = roles[session.answerer_id];
                    setAnswererRole(role);

                    // If answerer is MASTER, skip vote1
                    // Add defensive check to ensure role is defined
                    if (role && role === 'MASTER') {
                        await api.updatePhase(roomId, 'VOTE2');
                        router.push('/game/vote2');
                        return;
                    }
                }
            }
            setIsLoading(false);
        };

        if (players.length > 0 && Object.keys(roles).length > 0) {
            fetchAnswerer();
        }
    }, [roomId, players, roles, router])

    // Subscribe to votes to count them for UI display
    useEffect(() => {
        if (!roomId) return;

        // Initial fetch of vote count and my vote
        const fetchVoteCount = async () => {
            const { data: session } = await supabase
                .from('game_sessions')
                .select('id')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (session) {
                const { count } = await supabase
                    .from('votes')
                    .select('*', { count: 'exact', head: true })
                    .eq('session_id', session.id)
                    .eq('vote_type', 'VOTE1');

                if (count !== null) setVotedCount(count);

                // Check if I already voted
                if (playerId) {
                    const { data: myVoteData } = await supabase
                        .from('votes')
                        .select('vote_value')
                        .eq('session_id', session.id)
                        .eq('player_id', playerId)
                        .eq('vote_type', 'VOTE1')
                        .single();

                    if (myVoteData) {
                        setVoted(true);
                        setMyVote(myVoteData.vote_value as "yes" | "no");
                    }
                }
            }
        };
        fetchVoteCount();

        const channel = supabase
            .channel(`votes:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'votes',
                },
                () => {
                    fetchVoteCount();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel) }
    }, [roomId]);

    // Phase transitions are now handled by Database Trigger
    // No client-side polling needed!

    const handleVote = async (vote: "yes" | "no") => {
        if (!roomId || !playerId) return

        setMyVote(vote)
        setVoted(true)

        try {
            await api.submitVote1(roomId!, playerId!, vote);
        } catch (error) {
            console.error("Vote failed:", error)
            setVoted(false)
        }
    };

    return (
        <div className="min-h-screen p-4 flex flex-col items-center" style={{ paddingTop: '64px' }}>
            <div className="max-w-md w-full pb-24 flex flex-col gap-8 animate-fade-in">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Vote className="w-8 h-8 text-game-red" />
                        <h1 className="text-2xl font-black text-foreground">第一投票</h1>
                    </div>
                    <p className="text-sm text-foreground-secondary">告発投票</p>
                </div>

                {/* Loading or Master Skip */}
                {isLoading ? (
                    <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 text-center">
                        <p className="text-foreground">読み込み中...</p>
                    </div>
                ) : answererRole === 'MASTER' ? (
                    <div className="bg-blue-500/10 border-2 border-blue-500 backdrop-blur-sm rounded-xl p-6 text-center space-y-3">
                        <p className="text-lg font-bold text-blue-500">マスターが正解しました</p>
                        <p className="text-sm text-foreground">第一投票をスキップして第二投票に進みます...</p>
                    </div>
                ) : (
                    <>
                        {/* Question */}
                        {!voted ? (
                            <>
                                <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col text-center" style={{ padding: '24px', gap: '12px' }}>
                                    <div className="bg-game-red/10 border border-game-red/30 rounded-lg p-4">
                                        <p className="text-xl font-bold text-foreground mb-1">{answerer} さん</p>
                                        <p className="text-sm text-foreground-secondary">が正解しました</p>
                                    </div>

                                    <p className="text-lg font-bold text-foreground">
                                        {answerer} さんを
                                        <br />
                                        インサイダーだと思いますか？
                                    </p>
                                </div>

                                {/* Vote Buttons */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        onClick={() => handleVote("yes")}
                                        className="h-32 bg-game-red/20 hover:bg-game-red/30 border-2 border-game-red text-foreground rounded-xl flex flex-col items-center justify-center gap-3 text-2xl font-black transition-all"
                                    >
                                        <ThumbsUp className="w-12 h-12" />
                                        はい
                                    </Button>

                                    <Button
                                        onClick={() => handleVote("no")}
                                        className="h-32 bg-surface/10 hover:bg-surface/20 border-2 border-foreground/50 text-foreground rounded-xl flex flex-col items-center justify-center gap-3 text-2xl font-black transition-all"
                                    >
                                        <ThumbsDown className="w-12 h-12" />
                                        いいえ
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Voted State */}
                                <div className="bg-success/10 border-2 border-success backdrop-blur-sm rounded-xl p-6 space-y-4 text-center">
                                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                                        {myVote === "yes" ? (
                                            <ThumbsUp className="w-8 h-8 text-success" />
                                        ) : (
                                            <ThumbsDown className="w-8 h-8 text-success" />
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-lg font-bold text-foreground mb-1">投票しました</p>
                                        <p className="text-2xl font-black text-success">{myVote === "yes" ? "はい" : "いいえ"}</p>
                                    </div>

                                    <p className="text-sm text-foreground-secondary">他のプレイヤーの投票を待っています...</p>
                                </div>
                            </>
                        )}


                        {/* Progress */}
                        {!isLoading && answererRole !== 'MASTER' && (
                            <ProgressIndicator
                                current={votedCount}
                                total={players.length}
                                label="投票済みプレイヤー"
                                className="bg-surface/30 backdrop-blur-sm border border-border rounded-lg p-4"
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default function Vote1Page() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <Vote1Content />
        </Suspense>
    )
}
