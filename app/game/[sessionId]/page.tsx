import { Suspense } from 'react'
import { PhaseClient } from './PhaseClient'

interface GamePageProps {
  params: Promise<{
    sessionId: string
  }>
  searchParams: Promise<{
    playerId?: string
    playerName?: string
  }>
}

/**
 * Game Page - Server Component
 *
 * Handles routing for game session
 * Passes sessionId and player info to PhaseClient
 */
export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { sessionId } = await params
  const { playerId, playerName } = await searchParams

  // Validate required params
  if (!playerId || !playerName) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold text-[#E50012]">パラメータエラー</div>
          <div className="text-sm text-muted-foreground">
            プレイヤー情報が不足しています
          </div>
        </div>
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
          <div className="text-white">読み込み中...</div>
        </div>
      }
    >
      <PhaseClient
        sessionId={sessionId}
        playerId={playerId}
        playerName={playerName}
      />
    </Suspense>
  )
}
