"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, Vote } from "lucide-react"
import { useGame } from "@/context/game-context"
import { useRoom } from "@/context/room-context"
import { api } from '@/lib/api';
import { supabase } from "@/lib/supabase/client"

function Vote1Content() {
    const router = useRouter()
    const { topic, setPhase, setOutcome } = useGame()
    const { roomId, playerId, players } = useRoom()

    const [voted, setVoted] = useState(false)
    const [myVote, setMyVote] = useState<"yes" | "no" | null>(null)
    const [votedCount, setVotedCount] = useState(0)

    // Mock answerer for now (in real app, this comes from who answered correctly)
    const answerer = players.length > 0 ? players[0].nickname : "正解者"

    useEffect(() => {
        if (!roomId || !playerId) {
            router.push("/")
            return
        }
    }, [roomId, playerId, router])

    // Subscribe to votes to count them (Host only needs this really, but good for UI)
    useEffect(() => {
        if (!roomId) return;

        // Initial fetch of vote count
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

    // Host Logic: Check votes and trigger next phase
    useEffect(() => {
        const checkVotes = async () => {
            console.log('Checking votes...', { roomId, playerId, playersLength: players.length });
            if (!roomId || !playerId) return;

            // Check if I am host
            const { data: player } = await supabase
                .from('players')
                .select('is_host')
                .eq('id', playerId)
                .single();

            console.log('Is host check:', player);
            if (!player?.is_host) return;

            // Get Session
            const { data: session } = await supabase
                .from('game_sessions')
                .select('id')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!session) return;

            // Get Player Count from DB to be safe
            const { count: playerCount } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', roomId);

            if (!playerCount) return;

            const { count: voteCount } = await supabase
                .from('votes')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', session.id)
                .eq('vote_type', 'VOTE1');

            if (voteCount === playerCount) {
                // All voted. Calculate result.
                // Fetch votes
                const { data: votes } = await supabase
                    .from('votes')
                    .select('vote_value')
                    .eq('session_id', session.id)
                    .eq('vote_type', 'VOTE1');

                if (!votes) return;

                const yesVotes = votes.filter((v: any) => v.vote_value === 'yes').length;
                const noVotes = votes.filter((v: any) => v.vote_value === 'no').length;

                if (yesVotes > noVotes) {
                    // Majority YES: Suspect Answerer
                    // Check if Answerer is Insider
                    const { data: roles } = await supabase
                        .from('roles')
                        .select('role, player_id')
                        .eq('session_id', session.id);

                    // We need to know who is answerer.
                    // session.answerer_id is needed.
                    // We need to fetch session with answerer_id.
                    const { data: sessionFull } = await supabase
                        .from('game_sessions')
                        .select('answerer_id')
                        .eq('id', session.id)
                        .single();

                    const answererId = sessionFull?.answerer_id;
                    const answererRole = roles?.find((r: any) => r.player_id === answererId)?.role;
                    const insiderRole = roles?.find((r: any) => r.role === 'INSIDER');

                    let outcome = 'ALL_LOSE';
                    if (answererRole === 'INSIDER') {
                        outcome = 'CITIZENS_WIN'; // Commons win
                    } else {
                        outcome = 'INSIDER_WIN'; // Insider wins
                    }

                    // Insert Result
                    await supabase.from('results').insert({
                        session_id: session.id,
                        outcome,
                        revealed_player_id: insiderRole?.player_id
                    });

                    // Update Phase
                    await api.updatePhase(roomId!, 'RESULT');

                } else {
                    // Majority NO: Go to Vote 2
                    await api.updatePhase(roomId!, 'VOTE2');
                }
            }
        };

        // Poll every few seconds if Host
        const interval = setInterval(checkVotes, 3000);
        return () => clearInterval(interval);
    }, [roomId, players.length])

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
                <div className="bg-surface/30 backdrop-blur-sm border border-border rounded-lg p-4 text-center">
                    <p className="text-sm text-foreground-secondary">
                        投票済み: <span className="text-game-red font-bold">{votedCount}</span> / {players.length}
                    </p>
                </div>
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
