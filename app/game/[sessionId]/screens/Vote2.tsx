"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Users, CheckCircle, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useSupabase } from '@/app/providers'
import type { Database } from '@/lib/supabase/database.types'

type Player = Database['public']['Tables']['players']['Row']

interface Vote2ScreenProps {
  sessionId: string
  playerId: string
  playerName: string
}

/**
 * VOTE2 Screen - Second Vote Phase
 *
 * Features:
 * - Vote for suspected Insider from candidates
 * - Exclude Master and correct answerer
 * - Grid layout of player cards
 * - Show voting progress
 */
export function Vote2Screen({
  sessionId,
  playerId,
}: Vote2ScreenProps) {
  const supabase = useSupabase()
  const [candidates, setCandidates] = useState<Player[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [myVote, setMyVote] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [votedCount, setVotedCount] = useState(0)

  // Fetch candidates (exclude Master and answerer)
  useEffect(() => {
    async function fetchCandidates() {
      try {
        // Get session info
        const { data: sessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .select('room_id, answerer_id')
          .eq('id', sessionId)
          .single()

        if (sessionError) throw sessionError

        // Get Master ID
        const { data: masterData, error: masterError } = await supabase
          .from('roles')
          .select('player_id')
          .eq('session_id', sessionId)
          .eq('role', 'MASTER')
          .single()

        if (masterError) throw masterError

        const masterId = masterData.player_id
        const answererId = sessionData.answerer_id

        // Get all players except Master and answerer
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', sessionData.room_id)
          .neq('id', masterId)
          .neq('id', answererId || '')

        if (playersError) throw playersError

        setCandidates(playersData)

        // Get total player count
        const { count: playerCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', sessionData.room_id)

        setTotalPlayers(playerCount || 0)

        // Check if current player has voted
        const { data: myVoteData } = await supabase
          .from('votes')
          .select('vote_value')
          .eq('session_id', sessionId)
          .eq('player_id', playerId)
          .eq('vote_type', 'VOTE2')
          .single()

        if (myVoteData) {
          setMyVote(myVoteData.vote_value)
        }

        // Get voted count
        const { count: voteCount } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('vote_type', 'VOTE2')

        setVotedCount(voteCount || 0)
      } catch (error) {
        console.error('[Vote2Screen] Error fetching candidates:', error)
      }
    }

    fetchCandidates()

    // Subscribe to vote updates
    const channel = supabase
      .channel(`votes:${sessionId}:vote2`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchCandidates()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, playerId, supabase])

  // Handle vote submission
  const handleSubmitVote = async () => {
    if (!selectedCandidate || myVote) return

    setSubmitting(true)

    try {
      const { submitVote } = await import('@/app/actions/game')
      await submitVote(sessionId, playerId, 'VOTE2', selectedCandidate, 1)

      setMyVote(selectedCandidate)
    } catch (error) {
      console.error('[Vote2Screen] Error submitting vote:', error)
      alert('投票に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const allVoted = votedCount === totalPlayers
  const votingProgress = totalPlayers > 0 ? Math.round((votedCount / totalPlayers) * 100) : 0

  // Auto-call tally-votes when all players have voted
  useEffect(() => {
    if (!allVoted || !myVote) return

    async function tallyVotes() {
      try {
        // Get room_id from session
        const { data: sessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .select('room_id')
          .eq('id', sessionId)
          .single()

        if (sessionError || !sessionData) {
          console.error('[Vote2Screen] Failed to fetch session:', sessionError)
          return
        }

        console.log('[Vote2Screen] All votes received, calling tally-votes...')

        // Call tally-votes Edge Function
        const { data, error: tallyError } = await supabase.functions.invoke('tally-votes', {
          body: {
            session_id: sessionId,
            room_id: sessionData.room_id,
            vote_type: 'VOTE2',
          },
        })

        if (tallyError) {
          console.error('[Vote2Screen] Error tallying votes:', tallyError)
          return
        }

        console.log('[Vote2Screen] Votes tallied:', data)
        // Phase transition or runoff will be handled by Realtime broadcast
      } catch (error) {
        console.error('[Vote2Screen] Unexpected error:', error)
      }
    }

    // Small delay to ensure all clients have synced votes
    const timeoutId = setTimeout(tallyVotes, 1000)

    return () => clearTimeout(timeoutId)
  }, [allVoted, myVote, sessionId, supabase])

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 pb-24" data-testid="phase-VOTE2">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="w-12 h-12 mx-auto flex items-center justify-center">
            <Image
              src="/images/insider-logo.png"
              alt="Insider Logo"
              width={48}
              height={48}
              className="opacity-90"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">第2投票</h1>
          <p className="text-sm text-muted-foreground">
            インサイダーだと思う人を選んでください
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-br from-[#E50012]/20 to-[#B00010]/10 border border-[#E50012]/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-[#E50012]" />
            <h2 className="text-lg font-bold text-white">投票ルール</h2>
          </div>
          <ul className="space-y-2 text-sm text-secondary-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">•</span>
              <span>候補者の中からインサイダーだと思う人を1人選んでください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">•</span>
              <span>マスターと正解者は候補から除外されています</span>
            </li>
          </ul>
        </div>

        {/* Candidate Grid */}
        {!myVote ? (
          <div className="space-y-4">
            <h3 className="text-white font-bold">候補者</h3>
            <div className="grid grid-cols-2 gap-3">
              {candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  onClick={() => setSelectedCandidate(candidate.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    "hover:border-[#E50012]/50 hover:bg-card/50",
                    selectedCandidate === candidate.id
                      ? "border-[#E50012] bg-[#E50012]/10"
                      : "border-border bg-card/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        selectedCandidate === candidate.id
                          ? "border-[#E50012] bg-[#E50012]"
                          : "border-white/30"
                      )}
                    >
                      {selectedCandidate === candidate.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-white font-medium">{candidate.nickname}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <div>
              <p className="text-white font-bold text-lg">投票完了</p>
              <p className="text-sm text-muted-foreground mt-2">
                投票が完了しました
              </p>
            </div>
          </div>
        )}

        {/* Voting Progress */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#E50012]" />
              <span className="text-white font-bold">投票状況</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {votedCount}/{totalPlayers}人
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-background/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 left-0 bg-[#E50012] transition-all duration-500 rounded-full",
                allVoted && "bg-green-500"
              )}
              style={{ width: `${votingProgress}%` }}
            />
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {allVoted
              ? '全員が投票しました。結果を集計中...'
              : '他のプレイヤーの投票をお待ちください'}
          </p>
        </div>
      </div>

      {/* Fixed Bottom Action */}
      {!myVote && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSubmitVote}
              disabled={!selectedCandidate || submitting}
              className="w-full h-14 text-lg font-bold bg-[#E50012] hover:bg-[#B00010] text-white rounded-xl disabled:opacity-30"
            >
              {submitting ? '投票中...' : '投票する'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
