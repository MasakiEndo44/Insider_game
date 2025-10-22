"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Eye, Crown, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function RoleAssignmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get("roomId")
  const playerId = searchParams.get("playerId")

  const [role, setRole] = useState<string | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch role from database when revealed
  const handleRevealRole = async () => {
    if (!roomId) {
      setError("ルームIDが見つかりません")
      return
    }

    if (!playerId) {
      setError("プレイヤーIDが見つかりません")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get the most recent game session for this room
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sessionError || !session) {
        console.error('[RoleAssignment] Session fetch error:', sessionError)
        setError('ゲームセッションが見つかりません')
        setLoading(false)
        return
      }

      // Get role for this specific player
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('role')
        .eq('session_id', session.id)
        .eq('player_id', playerId)
        .single()

      if (roleError || !roleData) {
        console.error('[RoleAssignment] Role fetch error:', roleError)
        setError('役割情報が見つかりません')
        setLoading(false)
        return
      }

      setRole(roleData.role)
      setIsRevealed(true)
      setLoading(false)
    } catch (err) {
      console.error('[RoleAssignment] Error:', err)
      setError('役割の取得に失敗しました')
      setLoading(false)
    }
  }

  const getRoleDisplay = () => {
    switch (role) {
      case 'MASTER':
        return {
          title: 'マスター',
          icon: <Crown className="w-16 h-16 text-[#E50012]" />,
          description: 'あなたはマスターです。お題を知り、参加者の質問に答えてください。'
        }
      case 'INSIDER':
        return {
          title: 'インサイダー',
          icon: <Eye className="w-16 h-16 text-[#E50012]" />,
          description: 'あなたはインサイダーです。お題を知っていますが、市民のふりをしてください。'
        }
      case 'CITIZEN':
        return {
          title: '庶民',
          icon: <AlertCircle className="w-16 h-16 text-blue-500" />,
          description: 'あなたは庶民です。質問をしてお題を当ててください。'
        }
      default:
        return {
          title: '不明',
          icon: <AlertCircle className="w-16 h-16 text-gray-500" />,
          description: '役割情報が取得できませんでした。'
        }
    }
  }

  const roleDisplay = role ? getRoleDisplay() : null

  return (
    <div
      className="min-h-screen circuit-bg circuit-pattern flex items-center justify-center p-4"
      data-testid="phase-DEAL"
    >
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {!isRevealed ? (
          // Before reveal
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#E50012] mx-auto flex items-center justify-center animate-pulse-glow">
              <Eye className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white">役職配布</h1>
              <p className="text-muted-foreground">
                あなたの役割が割り当てられました
              </p>
            </div>
            <Button
              onClick={handleRevealRole}
              disabled={loading}
              className="w-full h-14 bg-[#E50012] hover:bg-[#B30010] text-white font-bold text-lg"
            >
              {loading ? "読み込み中..." : "役割を確認"}
            </Button>
          </div>
        ) : (
          // After reveal
          <div className="space-y-6 bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8">
            <div className="space-y-4">
              <div className="mx-auto flex items-center justify-center">
                {roleDisplay?.icon}
              </div>
              <div className="space-y-2">
                <h2
                  className="text-4xl font-black text-white"
                  data-testid="player-role"
                >
                  {roleDisplay?.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {roleDisplay?.description}
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/lobby?roomId=${roomId}`)}
              className="w-full h-12 bg-transparent hover:bg-white/5 border-2 border-white/50 text-white hover:border-white"
            >
              ロビーに戻る
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RoleAssignmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen circuit-bg flex items-center justify-center">
          <div className="text-white">読み込み中...</div>
        </div>
      }
    >
      <RoleAssignmentContent />
    </Suspense>
  )
}
