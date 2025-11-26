"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Vote, Check } from "lucide-react"
import { useGame } from "@/context/game-context"
import { useRoom } from "@/context/room-context"
import { api } from '@/lib/api';
import { supabase } from "@/lib/supabase/client"

function Vote2Content() {
    const router = useRouter()
    const { topic, setPhase, setOutcome, roles } = useGame()
    const { roomId, playerId, players } = useRoom()

    const [voted, setVoted] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
    const [votedCount, setVotedCount] = useState(0)

    // Candidates are all other players except self and MASTER
    const candidates = players.filter(p => {
        if (p.id === playerId) return false; // Exclude self
        const role = roles[p.id];
        return role !== 'MASTER'; // Exclude MASTER
    })

    useEffect(() => {
        if (!roomId || !playerId) {
            router.push("/")
            return
        }
    }, [roomId, playerId, router])

    // Simulate other players voting
    useEffect(() => {
        if (!roomId) return
        const interval = setInterval(() => {
            setVotedCount((prev) => {
                if (prev < players.length) return prev + 1
                return prev
            })
        }, 1500)
        return () => clearInterval(interval)
    }, [roomId, players.length])

    const handleVote = async (targetPlayerId: string) => {
        if (!roomId || !playerId) return

        setSelectedPlayer(targetPlayerId)
        setVoted(true)

        try {
            await api.submitVote2(roomId!, playerId!, targetPlayerId)
        } catch (error) {
            console.error("Vote failed:", error)
            setVoted(false)
        }
    }

    // Subscribe to votes
    useEffect(() => {
        if (!roomId) return;
        const channel = supabase
            .channel(`votes2:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'votes',
                },
                async (payload: any) => {
                    setVotedCount(prev => prev + 1);
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel) }
    }, [roomId]);

    // Host Logic: Check votes and trigger result
    useEffect(() => {
        const checkVotes = async () => {
            if (!roomId || !players.length) return;
            const isHost = players.find(p => p.id === playerId)?.isHost;
            if (!isHost) return;

            const { data: session } = await supabase
                .from('game_sessions')
                .select('id')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!session) return;

            const { count } = await supabase
                .from('votes')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', session.id)
                .eq('vote_type', 'VOTE2');

            if (count === players.length) {
                // All voted. Calculate result.
                const { data: votes } = await supabase
                    .from('votes')
                    .select('vote_value')
                    .eq('session_id', session.id)
                    .eq('vote_type', 'VOTE2');

                if (!votes) return;

                // Count votes for each player
                const voteCounts: Record<string, number> = {};
                votes.forEach((v: { vote_value: string }) => {
                    voteCounts[v.vote_value] = (voteCounts[v.vote_value] || 0) + 1;
                });

                // Find max voted player
                let maxVotes = 0;
                let mostVotedPlayerId = '';
                Object.entries(voteCounts).forEach(([pid, count]) => {
                    if (count > maxVotes) {
                        maxVotes = count;
                        mostVotedPlayerId = pid;
                    }
                });

                // Check if most voted player is Insider
                const { data: roles } = await supabase
                    .from('roles')
                    .select('role, player_id')
                    .eq('session_id', session.id);

                const suspectedRole = roles?.find((r: { role: string; player_id: string }) => r.player_id === mostVotedPlayerId)?.role;
                const insiderRole = roles?.find((r: { role: string; player_id: string }) => r.role === 'INSIDER');

                let outcome = 'ALL_LOSE';
                if (suspectedRole === 'INSIDER') {
                    outcome = 'CITIZENS_WIN';
                } else {
                    outcome = 'INSIDER_WIN';
                }

                await supabase.from('results').insert({
                    session_id: session.id,
                    outcome,
                    revealed_player_id: insiderRole?.player_id
                });

                await api.updatePhase(roomId!, 'RESULT');
            }
        };

        const interval = setInterval(checkVotes, 3000);
        return () => clearInterval(interval);
    }, [roomId, playerId, players]);

    return (
        <div className="min-h-screen p-4 flex flex-col items-center" style={{ paddingTop: '64px' }}>
            <div className="max-w-md w-full pb-24 flex flex-col gap-8 animate-fade-in">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Vote className="w-8 h-8 text-game-red" />
                        <h1 className="text-2xl font-black text-foreground">第二投票</h1>
                    </div>
                    <p className="text-sm text-foreground-secondary">インサイダー選択</p>
                </div>

                {/* Question */}
                {!voted ? (
                    <>
                        <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col text-center" style={{ padding: '24px', gap: '12px' }}>
                            <p className="text-lg font-bold text-foreground">インサイダーだと思う人を選んでください</p>
                        </div>

                        {/* Candidate List */}
                        <div className="space-y-3">
                            {candidates.map((candidate) => (
                                <button
                                    key={candidate.id}
                                    onClick={() => handleVote(candidate.id)}
                                    className="w-full p-5 bg-surface/30 hover:bg-surface/50 backdrop-blur-sm border-2 border-border hover:border-game-red rounded-xl transition-all text-left group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-background/10 border-2 border-foreground/30 group-hover:border-game-red flex items-center justify-center font-bold text-foreground transition-all">
                                            {candidate.nickname.charAt(0)}
                                        </div>
                                        <span className="text-lg font-bold text-foreground group-hover:text-game-red transition-all">
                                            {candidate.nickname}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Voted State */}
                        <div className="bg-success/10 border-2 border-success backdrop-blur-sm rounded-xl p-6 space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                                <Check className="w-8 h-8 text-success" />
                            </div>

                            <div>
                                <p className="text-lg font-bold text-foreground mb-1">投票しました</p>
                                <p className="text-2xl font-black text-success">
                                    {candidates.find((c) => c.id === selectedPlayer)?.nickname}
                                </p>
                            </div>

                            <p className="text-sm text-foreground-secondary">他のプレイヤーの投票を待っています...</p>
                        </div>
                    </>
                )}

                {/* Progress */}
                <div className="bg-surface/30 backdrop-blur-sm border border-border rounded-lg p-4 text-center">
                    <p className="text-sm text-foreground-secondary">
                        投票済み: <span className="text-game-red font-bold">{votedCount}</span> / {players.length}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function Vote2Page() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-foreground">読み込み中...</div>
                </div>
            }
        >
            <Vote2Content />
        </Suspense>
    )
}
