"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Crown, Eye, HelpCircle, Trophy, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useSupabase } from '@/app/providers'
import type { Database } from '@/lib/supabase/database.types'
import type { PlayerRole } from '@/hooks/use-player-role'

type Player = Database['public']['Tables']['players']['Row']

interface PlayerWithRole extends Player {
  role: PlayerRole
}

interface ResultScreenProps {
  sessionId: string
  playerId: string
  playerName: string
}

// Role icons and colors
const ROLE_CONFIG: Record<PlayerRole, {
  label: string
  icon: React.ReactNode
  color: string
}> = {
  MASTER: {
    label: 'マスター',
    icon: <Crown className="w-8 h-8" />,
    color: 'text-yellow-400',
  },
  INSIDER: {
    label: 'インサイダー',
    icon: <Eye className="w-8 h-8" />,
    color: 'text-[#E50012]',
  },
  CITIZEN: {
    label: '市民',
    icon: <HelpCircle className="w-8 h-8" />,
    color: 'text-blue-400',
  },
}

/**
 * RESULT Screen - Game Result Phase
 *
 * Features:
 * - Reveal all player roles with staggered animation
 * - Show game outcome (CITIZENS_WIN / INSIDER_WIN / ALL_LOSE)
 * - Highlight Insider
 * - New game button for host
 */
export function ResultScreen({
  sessionId,
  playerId,
}: ResultScreenProps) {
  const supabase = useSupabase()
  const [players, setPlayers] = useState<PlayerWithRole[]>([])
  const [outcome, setOutcome] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch results
  useEffect(() => {
    async function fetchResults() {
      try {
        // Get session and room info
        const { data: sessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .select('room_id')
          .eq('id', sessionId)
          .single()

        if (sessionError) throw sessionError

        // Get outcome
        const { data: resultData, error: resultError } = await supabase
          .from('results')
          .select('outcome')
          .eq('session_id', sessionId)
          .single()

        if (resultError) throw resultError

        setOutcome(resultData.outcome)

        // Get all players with roles
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', sessionData.room_id)

        if (playersError) throw playersError

        // Get roles for each player
        const playersWithRoles = await Promise.all(
          playersData.map(async (player) => {
            const { data: roleData } = await supabase
              .from('roles')
              .select('role')
              .eq('session_id', sessionId)
              .eq('player_id', player.id)
              .single()

            return {
              ...player,
              role: roleData?.role as PlayerRole,
            }
          })
        )

        setPlayers(playersWithRoles)

        // Check if current player is host
        const currentPlayer = playersData.find((p) => p.id === playerId)
        setIsHost(currentPlayer?.is_host ?? false)

        setLoading(false)
      } catch (error) {
        console.error('[ResultScreen] Error fetching results:', error)
        setLoading(false)
      }
    }

    fetchResults()
  }, [sessionId, playerId, supabase])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center">
        <div className="text-white text-center space-y-2">
          <div className="text-lg font-bold">結果を集計中...</div>
        </div>
      </div>
    )
  }

  // Determine winner message
  const getOutcomeMessage = () => {
    switch (outcome) {
      case 'CITIZENS_WIN':
        return {
          title: '市民の勝利！',
          description: 'インサイダーを見つけました',
          color: 'text-blue-400',
        }
      case 'INSIDER_WIN':
        return {
          title: 'インサイダーの勝利！',
          description: 'インサイダーが逃げ切りました',
          color: 'text-[#E50012]',
        }
      case 'ALL_LOSE':
        return {
          title: '全員敗北',
          description: '時間内にトピックを当てられませんでした',
          color: 'text-gray-400',
        }
      default:
        return {
          title: 'ゲーム終了',
          description: '',
          color: 'text-white',
        }
    }
  }

  const outcomeMessage = getOutcomeMessage()
  const insider = players.find((p) => p.role === 'INSIDER')

  return (
    <div className="min-h-screen circuit-bg circuit-pattern p-4 pb-24">
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
          <h1 className="text-2xl font-bold text-white">ゲーム結果</h1>
        </div>

        {/* Outcome Banner */}
        <div className="bg-gradient-to-br from-[#E50012]/20 to-[#B00010]/10 border border-[#E50012]/30 rounded-xl p-8">
          <div className="text-center space-y-4">
            <Trophy className={cn("w-16 h-16 mx-auto", outcomeMessage.color)} />
            <div>
              <h2 className={cn("text-3xl font-bold", outcomeMessage.color)}>
                {outcomeMessage.title}
              </h2>
              <p className="text-white/80 mt-2">{outcomeMessage.description}</p>
            </div>
          </div>
        </div>

        {/* Insider Reveal */}
        {insider && (
          <div className="bg-card/50 backdrop-blur-sm border border-[#E50012]/50 rounded-xl p-6">
            <div className="flex items-center justify-center gap-3">
              <Eye className="w-6 h-6 text-[#E50012]" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">インサイダーは...</p>
                <p className="text-2xl font-bold text-[#E50012] mt-1">{insider.nickname}</p>
              </div>
            </div>
          </div>
        )}

        {/* All Players with Roles */}
        <div className="space-y-4">
          <h3 className="text-white font-bold">全プレイヤーの役職</h3>
          <div className="grid grid-cols-1 gap-3">
            {players.map((player, index) => {
              const roleConfig = ROLE_CONFIG[player.role]
              return (
                <div
                  key={player.id}
                  className={cn(
                    "bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4",
                    "animate-slide-up",
                    player.role === 'INSIDER' && "border-[#E50012]/50 bg-[#E50012]/5"
                  )}
                  style={{
                    animationDelay: `${index * 150}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex items-center justify-center", roleConfig.color)}>
                        {roleConfig.icon}
                      </div>
                      <div>
                        <p className="text-white font-bold">{player.nickname}</p>
                        <p className={cn("text-sm", roleConfig.color)}>{roleConfig.label}</p>
                      </div>
                    </div>
                    {player.role === 'INSIDER' && (
                      <div className="px-3 py-1 rounded-full bg-[#E50012]/20 border border-[#E50012]/50">
                        <span className="text-xs text-[#E50012] font-bold">INSIDER</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Play Again (Host only) */}
        {isHost && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
            <div className="max-w-2xl mx-auto space-y-2">
              <Button
                onClick={() => {
                  // TODO: Implement new game logic
                  console.log('[ResultScreen] Starting new game...')
                }}
                className="w-full h-14 text-lg font-bold bg-[#E50012] hover:bg-[#B00010] text-white rounded-xl"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                新しいゲームを開始
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                同じメンバーで続けてプレイできます
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
