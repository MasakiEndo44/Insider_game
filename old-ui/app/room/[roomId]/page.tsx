'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRoom } from '@/providers/RoomProvider';
import { CheckCircle2, Circle, Crown, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RoomWaitingPage() {
  const { roomId, isConnected, gameState, sendEvent } = useRoom();
  const router = useRouter();
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isTogglingReady, setIsTogglingReady] = useState(false);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Normal' | 'Hard'>(
    'Normal'
  );
  const [isStarting, setIsStarting] = useState(false);

  // Get current player ID from Supabase auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentPlayerId(user.id);
      }
    });
  }, []);

  // Access players and status from XState machine context
  const players = gameState.context.players;
  const currentPhase = String(gameState.value); // Current game phase

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost ?? false;
  const readyCount = players.filter((p) => p.isReady).length;
  const canStart = players.length >= 4 && readyCount === players.length;

  const handleToggleReady = async () => {
    if (!currentPlayerId || !currentPlayer) return;

    setIsTogglingReady(true);
    try {
      const supabase = createClient();
      const newReadyState = !currentPlayer.isReady;

      const { error } = await supabase
        .from('players')
        .update({ confirmed: newReadyState })
        .eq('id', currentPlayerId);

      if (error) {
        console.error('Failed to toggle ready status:', error);
      }
    } catch (error) {
      console.error('Error toggling ready:', error);
    } finally {
      setIsTogglingReady(false);
    }
  };

  const handleStartGame = async () => {
    if (!canStart) return;

    setIsStarting(true);
    try {
      const supabase = createClient();

      // Create game session with selected difficulty
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          room_id: roomId,
          difficulty,
          start_time: new Date().toISOString(),
          // deadline_epoch will be set when question phase starts
        })
        .select()
        .single();

      if (sessionError || !session) {
        console.error('Failed to create game session:', sessionError);
        return;
      }

      // Update room phase to DEAL (role assignment)
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ phase: 'DEAL' })
        .eq('id', roomId);

      if (roomError) {
        console.error('Failed to update room phase:', roomError);
        return;
      }

      // Send game start event through XState
      sendEvent({ type: 'game.start' });

      // Navigate to play page
      router.push(`/room/${roomId}/play`);
    } catch (error) {
      console.error('Error starting game:', error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Room Status Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>待機室</CardTitle>
              <CardDescription>
                {isConnected ? (
                  <span className="text-green-600 dark:text-green-400">
                    ● 接続中
                  </span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    ● 接続を確立中...
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                フェーズ: {currentPhase}
              </div>
              <div className="text-sm font-medium">
                <Users className="inline w-4 h-4 mr-1" />
                {players.length} / 8 人
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Players List */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          プレイヤー一覧
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {players.map((player) => (
            <Card key={player.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {player.isHost && (
                      <Crown className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {player.nickname}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {player.isHost ? 'ホスト' : 'プレイヤー'}
                      </p>
                    </div>
                  </div>
                  <div>
                    {player.isReady ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">準備完了</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Circle className="w-5 h-5" />
                        <span className="text-sm">待機中</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 4 - players.length) }).map(
            (_, i) => (
              <Card key={`empty-${i}`} className="opacity-50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Circle className="w-5 h-5 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      空きスロット {i + 1}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>

      {/* Host Controls - Difficulty Selection */}
      {isHost && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">ゲーム設定</CardTitle>
            <CardDescription>お題の難易度を選択してください</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="difficulty">難易度</Label>
              <Select
                value={difficulty}
                onValueChange={(value) =>
                  setDifficulty(value as 'Easy' | 'Normal' | 'Hard')
                }
              >
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="難易度を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">やさしい（初心者向け）</SelectItem>
                  <SelectItem value="Normal">ふつう（推奨）</SelectItem>
                  <SelectItem value="Hard">むずかしい（上級者向け）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={handleToggleReady}
          disabled={isTogglingReady || !currentPlayer}
        >
          {isTogglingReady
            ? '処理中...'
            : currentPlayer?.isReady
              ? '準備解除'
              : '準備完了'}
        </Button>

        {isHost && (
          <Button
            size="lg"
            className="flex-1"
            disabled={!canStart || isStarting}
            onClick={handleStartGame}
          >
            {isStarting
              ? '開始中...'
              : canStart
                ? 'ゲーム開始'
                : `待機中 (${players.length}/4 人, ${readyCount}/${players.length} 準備完了)`}
          </Button>
        )}
      </div>

      {/* Info Messages */}
      {players.length < 4 && (
        <Card className="mt-4 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="py-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ℹ️ ゲーム開始には最低4人のプレイヤーが必要です
            </p>
          </CardContent>
        </Card>
      )}

      {players.length >= 4 && readyCount < players.length && isHost && (
        <Card className="mt-4 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="py-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ℹ️ 全員が準備完了するまで待機してください
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
