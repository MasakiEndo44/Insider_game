"use client"

import { useGamePhase } from '@/hooks/use-game-phase'
import type { ReactNode } from 'react'

// Import phase screens (will be created)
import { DealScreen } from './screens/Deal'
import { TopicScreen } from './screens/Topic'
import { QuestionScreen } from './screens/Question'
import { DebateScreen } from './screens/Debate'
import { Vote1Screen } from './screens/Vote1'
import { Vote2Screen } from './screens/Vote2'
import { ResultScreen } from './screens/Result'

interface PhaseClientProps {
  sessionId: string
  playerId: string
  playerName: string
}

/**
 * Client-side wrapper for game phase rendering
 *
 * Subscribes to Supabase Realtime for phase updates
 * Renders appropriate screen based on current phase
 *
 * Phase flow:
 * LOBBY → DEAL → TOPIC → QUESTION → DEBATE → VOTE1 → VOTE2 → RESULT
 */
export function PhaseClient({ sessionId, playerId, playerName }: PhaseClientProps) {
  const { phase, deadlineEpoch, serverOffset, answererId, loading, error } = useGamePhase(sessionId)

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold">読み込み中...</div>
          <div className="text-sm text-muted-foreground">ゲーム情報を取得しています</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold text-[#E50012]">エラーが発生しました</div>
          <div className="text-sm text-muted-foreground">{error.message}</div>
        </div>
      </div>
    )
  }

  // Render phase-specific screen
  const commonProps = {
    sessionId,
    playerId,
    playerName,
    deadlineEpoch,
    serverOffset,
  }

  switch (phase) {
    case 'DEAL':
      return <DealScreen {...commonProps} />

    case 'TOPIC':
      return <TopicScreen {...commonProps} />

    case 'QUESTION':
      return <QuestionScreen {...commonProps} />

    case 'DEBATE':
      return <DebateScreen {...commonProps} answererId={answererId} />

    case 'VOTE1':
      return <Vote1Screen {...commonProps} answererId={answererId} />

    case 'VOTE2':
      return <Vote2Screen {...commonProps} />

    case 'RESULT':
      return <ResultScreen {...commonProps} />

    case 'LOBBY':
    default:
      return (
        <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
          <div className="text-white text-center space-y-2">
            <div className="text-lg font-bold">ロビーで待機中...</div>
            <div className="text-sm text-muted-foreground">ホストがゲームを開始するまでお待ちください</div>
          </div>
        </div>
      )
  }
}
