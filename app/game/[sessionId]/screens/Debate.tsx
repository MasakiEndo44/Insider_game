"use client"

import { useEffect, useState } from 'react'
import { useCountdown } from '@/hooks/use-countdown'
import { Clock, Users, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useSupabase } from '@/app/providers'

interface DebateScreenProps {
  sessionId: string
  playerId: string
  playerName: string
  deadlineEpoch: number | null
  serverOffset: number
  answererId: string | null
}

/**
 * DEBATE Screen - Debate Phase
 *
 * Features:
 * - Inherited time from QUESTION phase
 * - Show who answered correctly
 * - Discuss to find the Insider
 * - Countdown timer display
 */
export function DebateScreen({
  sessionId,
  answererId,
  deadlineEpoch,
  serverOffset,
}: DebateScreenProps) {
  const supabase = useSupabase()
  const [answererName, setAnswererName] = useState<string | null>(null)

  const { formatted, remaining, progress, isComplete } = useCountdown({
    deadlineEpoch,
    serverOffset,
  })

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
        console.error('[DebateScreen] Error fetching answerer:', error)
        return
      }

      setAnswererName(data.nickname)
    }

    fetchAnswerer()
  }, [answererId, supabase])

  const timeWarning = remaining < 60000 // Less than 1 minute

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 pb-24" data-testid="phase-DEBATE">
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
          <h1 className="text-2xl font-bold text-white">議論フェーズ</h1>
          <p className="text-sm text-muted-foreground">
            インサイダーを見つけ出してください
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

        {/* Answerer Info */}
        {answererName && (
          <div className="bg-gradient-to-br from-[#E50012]/20 to-[#B00010]/10 border border-[#E50012]/30 rounded-xl p-6">
            <div className="flex items-center justify-center gap-3">
              <Target className="w-6 h-6 text-[#E50012]" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">トピックを当てた人</p>
                <p className="text-2xl font-bold text-white mt-1">{answererName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#E50012]" />
            <h2 className="text-lg font-bold text-white">議論の目的</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-background/30 rounded-lg p-4">
              <p className="text-sm font-bold text-white mb-2">質問:</p>
              <p className="text-lg text-[#E50012] font-bold">
                「{answererName || '正解者'}はインサイダーか？」
              </p>
            </div>

            <ul className="space-y-2 text-sm text-secondary-foreground">
              <li className="flex items-start gap-2">
                <span className="text-[#E50012] mt-0.5">①</span>
                <span>
                  正解者の発言や質問の仕方を振り返り、インサイダーかどうか議論してください
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E50012] mt-0.5">②</span>
                <span>
                  時間終了後、投票フェーズで「{answererName || '正解者'}がインサイダーか」を投票します
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E50012] mt-0.5">③</span>
                <span>
                  インサイダーは自分の正体がバレないように振る舞いましょう
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Voting preview */}
        <div className="bg-card/30 backdrop-blur-sm border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-2">次のフェーズ</h3>
          <div className="flex items-start gap-2 text-sm text-secondary-foreground">
            <span className="text-[#E50012] mt-0.5">→</span>
            <div>
              <p className="font-medium text-white">第1投票</p>
              <p className="text-xs">
                「{answererName || '正解者'}はインサイダーか？」を全員で投票
              </p>
            </div>
          </div>
        </div>

        {/* Time up warning */}
        {isComplete && (
          <div className="bg-[#E50012]/10 border border-[#E50012]/30 rounded-lg p-4 text-center animate-pulse">
            <p className="text-[#E50012] font-bold">議論時間終了</p>
            <p className="text-sm text-secondary-foreground mt-1">
              投票フェーズへ移行します...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
