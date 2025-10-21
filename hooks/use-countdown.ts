"use client"

import { useState, useEffect, useRef } from 'react'

interface UseCountdownOptions {
  /**
   * Unix timestamp in seconds (deadline_epoch from server)
   */
  deadlineEpoch: number | null

  /**
   * Callback when countdown reaches zero
   */
  onComplete?: () => void

  /**
   * Update interval in milliseconds (default: 1000)
   */
  interval?: number

  /**
   * Server time offset for drift correction (optional)
   * Calculate as: serverNow - Date.now()
   */
  serverOffset?: number
}

interface CountdownState {
  /**
   * Remaining time in milliseconds
   */
  remaining: number

  /**
   * Whether the countdown has completed
   */
  isComplete: boolean

  /**
   * Formatted time display (MM:SS)
   */
  formatted: string

  /**
   * Progress percentage (0-100)
   */
  progress: number

  /**
   * Total duration in milliseconds (initial remaining time)
   */
  totalDuration: number
}

/**
 * Hook for server-synchronized countdown timer
 *
 * Uses deadline_epoch (Unix timestamp) from server as single source of truth
 * Compensates for client clock drift when serverOffset is provided
 *
 * @example
 * ```tsx
 * const { remaining, formatted, progress, isComplete } = useCountdown({
 *   deadlineEpoch: 1730000000,
 *   serverOffset: serverNow - Date.now(),
 *   onComplete: () => console.log('Time up!')
 * });
 * ```
 */
export function useCountdown({
  deadlineEpoch,
  onComplete,
  interval = 1000,
  serverOffset = 0,
}: UseCountdownOptions): CountdownState {
  const [now, setNow] = useState(() => Date.now())
  const onCompleteRef = useRef(onComplete)
  const hasCompletedRef = useRef(false)

  // Store initial total duration
  const [totalDuration] = useState(() => {
    if (!deadlineEpoch) return 0
    const deadline = deadlineEpoch * 1000
    const correctedNow = Date.now() + serverOffset
    return Math.max(0, deadline - correctedNow)
  })

  // Update callback ref
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Countdown timer
  useEffect(() => {
    if (!deadlineEpoch) return

    const intervalId = setInterval(() => {
      setNow(Date.now())
    }, interval)

    return () => clearInterval(intervalId)
  }, [deadlineEpoch, interval])

  // Calculate remaining time with drift correction
  const deadline = deadlineEpoch ? deadlineEpoch * 1000 : 0
  const correctedNow = now + serverOffset
  const remaining = Math.max(0, deadline - correctedNow)
  const isComplete = remaining === 0

  // Trigger onComplete callback (once)
  useEffect(() => {
    if (isComplete && !hasCompletedRef.current && onCompleteRef.current) {
      hasCompletedRef.current = true
      onCompleteRef.current()
    }
  }, [isComplete])

  // Format as MM:SS
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // Calculate progress percentage
  const progress = totalDuration > 0
    ? Math.round(((totalDuration - remaining) / totalDuration) * 100)
    : 100

  return {
    remaining,
    isComplete,
    formatted,
    progress,
    totalDuration,
  }
}
