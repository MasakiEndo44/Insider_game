"use client"

import { useState, useEffect } from 'react'
import { useTopic } from '@/hooks/use-topic'
import { useCountdown } from '@/hooks/use-countdown'
import { Eye, Crown, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface TopicScreenProps {
  sessionId: string
  playerId: string
  playerName: string
  deadlineEpoch: number | null
  serverOffset: number
}

/**
 * TOPIC Screen - Topic Confirmation Phase
 *
 * Features:
 * - Shows topic only to MASTER and INSIDER (10 seconds)
 * - Auto-hide after countdown
 * - Toast-style slide-up animation
 * - CITIZEN sees waiting message
 */
export function TopicScreen({
  sessionId,
  deadlineEpoch,
  serverOffset,
}: TopicScreenProps) {
  const { topic, difficulty, loading, error, canViewTopic } = useTopic(sessionId)
  const [visible, setVisible] = useState(true)

  // 10-second countdown for auto-hide
  const { formatted, isComplete } = useCountdown({
    deadlineEpoch,
    serverOffset,
    onComplete: () => setVisible(false),
  })

  // Auto-hide after 10 seconds
  useEffect(() => {
    if (isComplete) {
      setVisible(false)
    }
  }, [isComplete])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold">読み込み中...</div>
          <div className="text-sm text-muted-foreground">トピック情報を取得しています</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold text-[#E50012]">エラー</div>
          <div className="text-sm text-muted-foreground">{error.message}</div>
        </div>
      </div>
    )
  }

  // CITIZEN view - cannot see topic
  if (!canViewTopic) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern p-4 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto flex items-center justify-center">
              <Image
                src="/images/insider-logo.png"
                alt="Insider Logo"
                width={48}
                height={48}
                className="opacity-90"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">トピック確認中</h1>
            <p className="text-sm text-muted-foreground">
              マスターとインサイダーがトピックを確認しています
            </p>
          </div>

          {/* Waiting animation */}
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-white/20 border-t-[#E50012] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="w-12 h-12 text-white/50" />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-white">あなたの役割</h2>
            <p className="text-sm text-secondary-foreground">
              あなたは<span className="text-blue-400 font-bold">市民</span>です。トピックは知りません。
            </p>
            <p className="text-sm text-secondary-foreground">
              質問フェーズでマスターに質問をして、トピックを当ててください。
            </p>
          </div>
        </div>
      </div>
    )
  }

  // MASTER/INSIDER view - can see topic
  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 flex flex-col items-center justify-center" data-testid="phase-TOPIC">
      <div className="max-w-2xl w-full space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto flex items-center justify-center">
            <Image
              src="/images/insider-logo.png"
              alt="Insider Logo"
              width={48}
              height={48}
              className="opacity-90"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">トピック確認</h1>
          <p className="text-sm text-muted-foreground">
            トピックを覚えてください（{formatted}後に非表示）
          </p>
        </div>

        {/* Topic Card - Slide up animation */}
        {visible ? (
          <div
            className={cn(
              "bg-gradient-to-br from-[#E50012] to-[#B00010] rounded-2xl p-8 shadow-2xl border-2 border-white/20",
              "animate-slide-up",
              "motion-reduce:animate-none"
            )}
          >
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-8 h-8 text-yellow-400" />
                <Eye className="w-8 h-8 text-white" />
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <p className="text-sm text-white/80 font-medium">トピック</p>
                <p className="text-3xl font-bold text-white break-words">{topic}</p>
              </div>

              {/* Difficulty */}
              <div className="inline-block px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                <p className="text-sm text-white font-medium">
                  難易度: {difficulty === 'Easy' ? '簡単' : difficulty === 'Normal' ? '普通' : '難しい'}
                </p>
              </div>

              {/* Countdown */}
              <div className="pt-4 border-t border-white/20">
                <div className="flex items-center justify-center gap-2 text-white/90">
                  <Clock className="w-5 h-5" />
                  <span className="text-lg font-mono font-bold">{formatted}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 text-center">
            <p className="text-white font-bold">トピックは非表示になりました</p>
            <p className="text-sm text-muted-foreground mt-2">
              質問フェーズの開始をお待ちください
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-white">注意事項</h2>
          <ul className="space-y-2 text-sm text-secondary-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">•</span>
              <span>トピックを周りの人に見られないように注意してください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">•</span>
              <span>このトピックは10秒後に自動的に非表示になります</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">•</span>
              <span>質問フェーズで市民を誘導してください</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
