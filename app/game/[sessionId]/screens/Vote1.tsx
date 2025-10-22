"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useSupabase } from '@/app/providers'

interface Vote1ScreenProps {
  sessionId: string
  playerId: string
  playerName: string
  answererId: string | null
}

/**
 * VOTE1 Screen - First Vote Phase
 *
 * Features:
 * - Vote Yes/No on "Is the answerer the Insider?"
 * - Show voting progress
 * - Cannot change vote once submitted
 * - Wait for all players to vote
 */
export function Vote1Screen({
  sessionId,
  playerId,
  answererId,
}: Vote1ScreenProps) {
  const supabase = useSupabase()
  const [answererName, setAnswererName] = useState<string | null>(null)
  const [myVote, setMyVote] = useState<'yes' | 'no' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [votedCount, setVotedCount] = useState(0)

  // Fetch answerer's name
  useEffect(() => {
    if (!answererId) return

    async function fetchAnswerer() {
      if (!answererId) return // TypeScript guard

      const { data, error } = await supabase
        .from('players')
        .select('nickname')
        .eq('id', answererId)
        .single()

      if (error) {
        console.error('[Vote1Screen] Error fetching answerer:', error)
        return
      }

      setAnswererName(data.nickname)
    }

    fetchAnswerer()
  }, [answererId, supabase])

  // Fetch player count and voted count
  useEffect(() => {
    async function fetchVoteStatus() {
      // Get total players in session
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('room_id')
        .eq('id', sessionId)
        .single()

      if (sessionError) {
        console.error('[Vote1Screen] Error fetching session:', sessionError)
        return
      }

      const { count: playerCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', sessionData.room_id)

      setTotalPlayers(playerCount || 0)

      // Get voted count
      const { count: voteCount } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('vote_type', 'VOTE1')

      setVotedCount(voteCount || 0)

      // Check if current player has voted
      const { data: myVoteData } = await supabase
        .from('votes')
        .select('vote_value')
        .eq('session_id', sessionId)
        .eq('player_id', playerId)
        .eq('vote_type', 'VOTE1')
        .single()

      if (myVoteData) {
        setMyVote(myVoteData.vote_value as 'yes' | 'no')
      }
    }

    fetchVoteStatus()

    // Subscribe to vote updates
    const channel = supabase
      .channel(`votes:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchVoteStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, playerId, supabase])

  // Handle vote submission
  const handleVote = async (vote: 'yes' | 'no') => {
    if (myVote) return // Already voted

    setSubmitting(true)

    try {
      const { error } = await supabase.from('votes').insert({
        session_id: sessionId,
        player_id: playerId,
        vote_type: 'VOTE1',
        vote_value: vote,
        round: 1,
      })

      if (error) throw error

      setMyVote(vote)
    } catch (error) {
      console.error('[Vote1Screen] Error submitting vote:', error)
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
          console.error('[Vote1Screen] Failed to fetch session:', sessionError)
          return
        }

        console.log('[Vote1Screen] All votes received, calling tally-votes...')

        // Call tally-votes Edge Function
        const { data, error: tallyError } = await supabase.functions.invoke('tally-votes', {
          body: {
            session_id: sessionId,
            room_id: sessionData.room_id,
            vote_type: 'VOTE1',
          },
        })

        if (tallyError) {
          console.error('[Vote1Screen] Error tallying votes:', tallyError)
          return
        }

        console.log('[Vote1Screen] Votes tallied:', data)
        // Phase transition will be handled by Realtime broadcast
      } catch (error) {
        console.error('[Vote1Screen] Unexpected error:', error)
      }
    }

    // Small delay to ensure all clients have synced votes
    const timeoutId = setTimeout(tallyVotes, 1000)

    return () => clearTimeout(timeoutId)
  }, [allVoted, myVote, sessionId, supabase])

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 pb-24" data-testid="phase-VOTE1">
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
          <h1 className="text-2xl font-bold text-white">第1投票</h1>
          <p className="text-sm text-muted-foreground">
            正解者はインサイダーか投票してください
          </p>
        </div>

        {/* Question */}
        <div className="bg-gradient-to-br from-[#E50012]/20 to-[#B00010]/10 border border-[#E50012]/30 rounded-xl p-8">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">投票テーマ</p>
            <p className="text-2xl font-bold text-white break-words">
              「{answererName || '正解者'}」は<br />
              インサイダーですか？
            </p>
          </div>
        </div>

        {/* Vote Buttons */}
        {!myVote ? (
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleVote('yes')}
              disabled={submitting}
              className="h-32 flex flex-col gap-3 bg-[#E50012] hover:bg-[#B00010] text-white rounded-xl text-lg font-bold"
            >
              <ThumbsUp className="w-12 h-12" />
              はい
              <span className="text-xs font-normal opacity-80">インサイダーだと思う</span>
            </Button>

            <Button
              onClick={() => handleVote('no')}
              disabled={submitting}
              className="h-32 flex flex-col gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-bold"
            >
              <ThumbsDown className="w-12 h-12" />
              いいえ
              <span className="text-xs font-normal opacity-80">インサイダーではない</span>
            </Button>
          </div>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <div>
              <p className="text-white font-bold text-lg">投票完了</p>
              <p className="text-sm text-muted-foreground mt-2">
                あなたの投票: <span className="text-white font-bold">
                  {myVote === 'yes' ? 'はい（インサイダーだと思う）' : 'いいえ（インサイダーではない）'}
                </span>
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

        {/* Instructions */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-white">投票後の流れ</h3>
          <ul className="space-y-2 text-sm text-secondary-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">①</span>
              <span>過半数が「はい」→ 正解者の役職を公開 → 勝敗決定</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">②</span>
              <span>過半数が「いいえ」→ 第2投票で候補者からインサイダーを選出</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
