"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Home } from "lucide-react"

interface HostLeftOverlayProps {
  /**
   * オーバーレイの表示状態
   */
  isOpen: boolean
  /**
   * 自動退出までのカウントダウン秒数（デフォルト: 5秒）
   */
  countdownSeconds?: number
  /**
   * 手動退出時のコールバック（オプション）
   */
  onExit?: () => void
}

/**
 * ホスト退出オーバーレイコンポーネント
 *
 * ホストがルームを退出した際に全画面モーダルを表示し、
 * 一定時間後（デフォルト5秒）に自動的にトップページへ遷移します。
 *
 * 機能:
 * - 全画面暗いオーバーレイ
 * - カウントダウンタイマー表示
 * - 手動退出ボタン
 * - 自動遷移
 *
 * @example
 * ```tsx
 * const [hostLeft, setHostLeft] = useState(false)
 *
 * <HostLeftOverlay isOpen={hostLeft} />
 * ```
 */
export function HostLeftOverlay({
  isOpen,
  countdownSeconds = 5,
  onExit,
}: HostLeftOverlayProps) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(countdownSeconds)

  const handleExit = () => {
    if (onExit) {
      onExit()
    } else {
      router.push("/")
    }
  }

  // カウントダウンロジック
  useEffect(() => {
    if (!isOpen) {
      setCountdown(countdownSeconds) // リセット
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleExit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, countdownSeconds])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="host-left-title"
      aria-describedby="host-left-description"
    >
      <div className="max-w-md w-full mx-4 bg-card/95 backdrop-blur-md border-2 border-[#E50012]/50 rounded-2xl p-8 space-y-6 animate-scale-in shadow-2xl">
        {/* アイコン */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-[#E50012]/20 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-[#E50012]" />
          </div>
        </div>

        {/* タイトル */}
        <div className="text-center space-y-2">
          <h2
            id="host-left-title"
            className="text-2xl font-bold text-white"
          >
            ホストが退出しました
          </h2>
          <p
            id="host-left-description"
            className="text-lg text-muted-foreground"
          >
            ルームを解散します...
          </p>
        </div>

        {/* カウントダウン */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#E50012]/10 border-2 border-[#E50012]/50">
            <span className="text-3xl font-bold text-[#E50012]">
              {countdown}
            </span>
          </div>
          <p className="mt-3 text-sm text-secondary-foreground">
            {countdown}秒後に自動的にトップページへ戻ります
          </p>
        </div>

        {/* 手動退出ボタン */}
        <Button
          onClick={handleExit}
          className="w-full h-12 bg-white hover:bg-white/90 text-black font-bold rounded-xl transition-all duration-200"
        >
          <Home className="w-5 h-5 mr-2" />
          今すぐ退出する
        </Button>
      </div>
    </div>
  )
}
