'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRoom } from '@/providers/RoomProvider';
import { CheckCircle2, Circle, Crown, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RoomWaitingPage() {
  const { roomId, isConnected, players, roomStatus } = useRoom();
  const router = useRouter();

  const currentPlayer = players[0]; // Simplified: first player is current
  const isHost = currentPlayer?.isHost ?? false;
  const readyCount = players.filter((p) => p.isReady).length;
  const canStart = players.length >= 4 && readyCount === players.length;

  const handleStartGame = () => {
    router.push(`/room/${roomId}/play`);
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
                ステータス: {roomStatus}
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
                        {player.displayName}
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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => {
            // Toggle ready status (TODO: implement Supabase update)
            console.log('Toggle ready');
          }}
        >
          {currentPlayer?.isReady ? '準備解除' : '準備完了'}
        </Button>

        {isHost && (
          <Button
            size="lg"
            className="flex-1"
            disabled={!canStart}
            onClick={handleStartGame}
          >
            {canStart
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
