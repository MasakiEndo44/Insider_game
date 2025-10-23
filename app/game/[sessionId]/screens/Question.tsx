"use client"

import { useState } from 'react'
import { usePlayerRole } from '@/hooks/use-player-role'
import { useCountdown } from '@/hooks/use-countdown'
import { useSupabase } from '@/app/providers'
import { Clock, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface QuestionScreenProps {
  sessionId: string
  playerId: string
  playerName: string
  deadlineEpoch: number | null
  serverOffset: number
}

/**
 * QUESTION Screen - Question Phase
 *
 * Features:
 * - 5-minute countdown timer
 * - Circular progress bar + digital display
 * - MASTER can report correct answer
 * - Citizens ask questions to guess topic
 */
export function QuestionScreen({
  sessionId,
  playerId,
  deadlineEpoch,
  serverOffset,
}: QuestionScreenProps) {
  const supabase = useSupabase()
  const { role, loading: roleLoading } = usePlayerRole(sessionId, playerId)
  const { formatted, remaining, progress, isComplete } = useCountdown({
    deadlineEpoch,
    serverOffset,
  })

  const [reportingAnswer, setReportingAnswer] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle correct answer report (MASTER only)
  const handleReportAnswer = async () => {
    if (role !== 'MASTER') return

    setReportingAnswer(true)
    setError(null)

    try {
      // Get room_id from session
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('room_id')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        throw new Error('Failed to fetch session data')
      }

      // TODO: Add UI to select which player answered correctly
      // For now, using playerId as answerer_id (test implementation)
      const answererId = playerId

      // Call reportCorrectAnswer Server Action
      const { reportCorrectAnswer } = await import('@/app/actions/game')
      await reportCorrectAnswer(sessionId, answererId)

      console.log('[QuestionScreen] Answer reported successfully')
      // Phase transition will be handled by Realtime broadcast
    } catch (err) {
      console.error('[QuestionScreen] Error reporting answer:', err)
      setError(err instanceof Error ? err.message : 'Failed to report answer')
    } finally {
      setReportingAnswer(false)
    }
  }

  // Loading state
  if (roleLoading) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold">読み込み中...</div>
        </div>
      </div>
    )
  }

  const isMaster = role === 'MASTER'
  const timeWarning = remaining < 60000 // Less than 1 minute

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 pb-24" data-testid="phase-QUESTION">
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
          <h1 className="text-2xl font-bold text-white">質問フェーズ</h1>
          <p className="text-sm text-muted-foreground">
            {isMaster
              ? 'プレイヤーの質問に答えてください'
              : 'マスターに質問をしてトピックを当ててください'}
          </p>
        </div>

        {/* Circular Timer */}
        <div className="flex items-center justify-center py-8">
          <div className="relative w-48 h-48">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                className="fill-none stroke-white/10"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                className={cn(
                  "fill-none transition-all duration-1000",
                  timeWarning ? "stroke-[#E50012]" : "stroke-[#E50012]/80"
                )}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                strokeLinecap="round"
              />
            </svg>

            {/* Timer display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Clock className={cn("w-8 h-8 mb-2", timeWarning ? "text-[#E50012]" : "text-white/80")} />
              <span
                className={cn(
                  "text-4xl font-mono font-bold",
                  timeWarning ? "text-[#E50012] animate-pulse" : "text-white"
                )}
              >
                {formatted}
              </span>
              <span className="text-sm text-muted-foreground mt-1">残り時間</span>
            </div>
          </div>
        </div>

        {/* Phase instructions */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#E50012]" />
            <h2 className="text-lg font-bold text-white">
              {isMaster ? 'マスターの役割' : 'あなたの役割'}
            </h2>
          </div>

          {isMaster ? (
            <ul className="space-y-2 text-sm text-secondary-foreground">
              <li className="flex items-start gap-2">
                <span className="text-[#E50012] mt-0.5">①</span>
                <span>プレイヤーからの質問に「はい」「いいえ」で答えてください</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E50012] mt-0.5">②</span>
                <span>誰かが正解したら、下のボタンで報告してください</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E50012] mt-0.5">③</span>
                <span>時間内に正解が出なかった場合、全員が敗北します</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-secondary-foreground">
              <li className="flex items-start gap-2">
                <span className="text-[#E50012] mt-0.5">①</span>
                <span>マスターに質問をしてトピックを推測してください</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E50012] mt-0.5">②</span>
                <span>質問は「はい」「いいえ」で答えられる形式にしてください</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E50012] mt-0.5">③</span>
                <span>トピックが分かったら、マスターに伝えてください</span>
              </li>
            </ul>
          )}
        </div>

        {/* Time up warning */}
        {isComplete && (
          <div className="bg-[#E50012]/10 border border-[#E50012]/30 rounded-lg p-4 text-center animate-pulse">
            <p className="text-[#E50012] font-bold">時間切れ</p>
            <p className="text-sm text-secondary-foreground mt-1">
              次のフェーズへ移行します...
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-[#E50012]/10 border border-[#E50012]/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#E50012]">
              <AlertCircle className="w-5 h-5" />
              <p className="font-bold">エラー</p>
            </div>
            <p className="text-sm text-secondary-foreground mt-2">{error}</p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Action (MASTER only) */}
      {isMaster && !isComplete && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleReportAnswer}
              disabled={reportingAnswer}
              className="w-full h-14 text-lg font-bold bg-[#E50012] hover:bg-[#B00010] text-white rounded-xl"
            >
              {reportingAnswer ? (
                <>処理中...</>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  正解を報告する
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              誰かが正解したら、このボタンを押してください
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
