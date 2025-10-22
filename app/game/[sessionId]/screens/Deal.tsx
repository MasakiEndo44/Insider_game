"use client"

import { useState, useEffect } from 'react'
import { usePlayerRole, type PlayerRole } from '@/hooks/use-player-role'
import { MasterIcon, InsiderIcon, CommonIcon } from '@/components/ui/icons'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface DealScreenProps {
  sessionId: string
  playerId: string
  playerName: string
  deadlineEpoch: number | null
  serverOffset: number
}

// Role metadata
const ROLE_INFO: Record<PlayerRole, {
  label: string
  icon: React.ReactNode
  description: string
  color: string
}> = {
  MASTER: {
    label: 'マスター',
    icon: <MasterIcon size={64} aria-hidden />,
    description: 'トピックを知っている司会者',
    color: 'text-yellow-400',
  },
  INSIDER: {
    label: 'インサイダー',
    icon: <InsiderIcon size={64} aria-hidden />,
    description: 'トピックを知っている内通者',
    color: 'text-[#E50012]',
  },
  CITIZEN: {
    label: '市民',
    icon: <CommonIcon size={64} aria-hidden />,
    description: 'トピックを知らない一般市民',
    color: 'text-blue-400',
  },
}

/**
 * DEAL Screen - Role Assignment Phase
 *
 * Features:
 * - Card flip animation to reveal role
 * - Haptic feedback on flip
 * - prefers-reduced-motion support
 * - Accessible with aria-labels
 */
export function DealScreen({
  sessionId,
  playerId,
  playerName,
}: DealScreenProps) {
  const { role, loading, error } = usePlayerRole(sessionId, playerId)
  const [flipped, setFlipped] = useState(false)

  // Haptic feedback on flip
  const handleFlip = () => {
    setFlipped(!flipped)

    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold">役職を配布中...</div>
          <div className="text-sm text-muted-foreground">しばらくお待ちください</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !role) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold text-[#E50012]">エラー</div>
          <div className="text-sm text-muted-foreground">
            {error?.message || '役職が見つかりません'}
          </div>
        </div>
      </div>
    )
  }

  const roleInfo = ROLE_INFO[role]

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 flex flex-col items-center justify-center" data-testid="phase-DEAL">
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
          <h1 className="text-2xl font-bold text-white">役職配布</h1>
          <p className="text-sm text-muted-foreground">
            カードをタップして役職を確認してください
          </p>
        </div>

        {/* Card Flip */}
        <div className="flex items-center justify-center py-12">
          <button
            onClick={handleFlip}
            aria-label={flipped ? `あなたの役職: ${roleInfo.label}` : "役職を確認"}
            aria-pressed={flipped}
            className="relative h-64 w-48 [perspective:1000px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 focus-visible:outline-offset-4 rounded-xl"
          >
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-xl border-4 border-white/20 bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-sm shadow-2xl",
                "[transform-style:preserve-3d]",
                "transition-transform duration-700 ease-in-out",
                "motion-reduce:transition-none",
                flipped ? "[transform:rotateY(180deg)]" : ""
              )}
            >
              {/* FRONT - Hidden role */}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 [backface-visibility:hidden] text-white">
                <HelpCircle className="w-24 h-24 opacity-50" />
                <span className="text-xl font-bold">タップして確認</span>
              </span>

              {/* BACK - Revealed role */}
              <span
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center gap-4 [backface-visibility:hidden] [transform:rotateY(180deg)]",
                  roleInfo.color
                )}
              >
                {roleInfo.icon}
                <span className="text-2xl font-bold">{roleInfo.label}</span>
                <span className="text-sm text-white/80 px-4 text-center">
                  {roleInfo.description}
                </span>
              </span>
            </span>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-white">次のステップ</h2>
          <ul className="space-y-2 text-sm text-secondary-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">①</span>
              <span>役職を確認したら、周りの人に見られないように注意してください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">②</span>
              <span>全員の確認が完了すると、次のフェーズに進みます</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E50012] mt-0.5">③</span>
              <span>
                {role === 'MASTER' || role === 'INSIDER'
                  ? 'トピックが表示されます（10秒間）'
                  : '質問フェーズが開始されます'}
              </span>
            </li>
          </ul>
        </div>

        {/* Waiting message */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            他のプレイヤーの確認を待っています...
          </p>
        </div>
      </div>
    </div>
  )
}
