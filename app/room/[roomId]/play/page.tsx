'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRoom } from '@/providers/RoomProvider';
import { useState } from 'react';

// 9つのゲームフェーズ
type GamePhase =
  | 'WAITING_FOR_PLAYERS'
  | 'ROLE_ASSIGNMENT'
  | 'THEME_SELECTION'
  | 'DISCUSSION'
  | 'INSIDER_GUESS'
  | 'WORD_GUESS'
  | 'VOTING'
  | 'RESULT'
  | 'GAME_END';

export default function GamePage() {
  const { gameState } = useRoom();
  const players = gameState.context.players;
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('ROLE_ASSIGNMENT');
  const [message, setMessage] = useState('');

  // Phase descriptions
  const phaseDescriptions: Record<GamePhase, string> = {
    WAITING_FOR_PLAYERS: 'プレイヤーを待っています...',
    ROLE_ASSIGNMENT: '役職が割り当てられました',
    THEME_SELECTION: 'マスターがテーマを選択中...',
    DISCUSSION: 'お題について質問してください',
    INSIDER_GUESS: 'インサイダーを推理中...',
    WORD_GUESS: 'お題を当ててください',
    VOTING: '投票タイム',
    RESULT: '結果発表',
    GAME_END: 'ゲーム終了',
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Game Phase Header */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>ゲーム進行中</CardTitle>
          <CardDescription>
            現在のフェーズ: <strong>{currentPhase}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (Object.keys(phaseDescriptions).indexOf(currentPhase) + 1) /
                    9 *
                    100
                  }%`,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {phaseDescriptions[currentPhase]}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Phase Content */}
      {currentPhase === 'ROLE_ASSIGNMENT' && (
        <Card>
          <CardHeader>
            <CardTitle>あなたの役職</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎭</div>
              <p className="text-2xl font-bold mb-2">インサイダー</p>
              <p className="text-muted-foreground">
                お題を知っています。バレないように議論を誘導しましょう
              </p>
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => setCurrentPhase('THEME_SELECTION')}
            >
              次へ
            </Button>
          </CardContent>
        </Card>
      )}

      {currentPhase === 'THEME_SELECTION' && (
        <Card>
          <CardHeader>
            <CardTitle>テーマ選択</CardTitle>
            <CardDescription>
              マスターがお題を選択中です...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-6xl mb-4 animate-pulse">⏳</div>
              <p className="text-muted-foreground">しばらくお待ちください</p>
            </div>
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => setCurrentPhase('DISCUSSION')}
            >
              デモ: 次のフェーズへ
            </Button>
          </CardContent>
        </Card>
      )}

      {currentPhase === 'DISCUSSION' && (
        <div className="space-y-6">
          {/* Theme Card */}
          <Card>
            <CardHeader>
              <CardTitle>お題</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-3xl font-bold">🍎 リンゴ</p>
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card>
            <CardHeader>
              <CardTitle>質問と回答</CardTitle>
              <CardDescription>
                残り時間: 5:00
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 h-64 overflow-y-auto border rounded-md p-4">
                <div className="bg-secondary p-3 rounded-lg">
                  <p className="text-sm font-medium">Player1</p>
                  <p className="text-sm">これは食べ物ですか？</p>
                </div>
                <div className="bg-secondary p-3 rounded-lg">
                  <p className="text-sm font-medium">Master</p>
                  <p className="text-sm">はい</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="質問を入力..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button onClick={() => setMessage('')}>送信</Button>
              </div>

              <Button
                className="w-full mt-4"
                onClick={() => setCurrentPhase('WORD_GUESS')}
              >
                議論を終了
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {currentPhase === 'WORD_GUESS' && (
        <Card>
          <CardHeader>
            <CardTitle>お題を当てる</CardTitle>
            <CardDescription>
              議論の結果からお題を推測してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input placeholder="お題を入力してください" />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => setCurrentPhase('VOTING')}
                >
                  回答する
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => setCurrentPhase('VOTING')}
                >
                  わからない
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentPhase === 'VOTING' && (
        <Card>
          <CardHeader>
            <CardTitle>投票タイム</CardTitle>
            <CardDescription>
              インサイダーだと思うプレイヤーに投票してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {players.map((player) => (
                <Button
                  key={player.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setCurrentPhase('RESULT')}
                >
                  {player.nickname}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentPhase === 'RESULT' && (
        <Card>
          <CardHeader>
            <CardTitle>結果発表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 space-y-4">
              <div className="text-6xl">🎉</div>
              <p className="text-2xl font-bold">市民チームの勝利！</p>
              <p className="text-muted-foreground">
                インサイダーを見つけました
              </p>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">役職公開:</p>
                <div className="space-y-2">
                  {players.map((player, i) => (
                    <div
                      key={player.id}
                      className="flex justify-between items-center p-2 bg-secondary rounded"
                    >
                      <span>{player.nickname}</span>
                      <span className="font-medium">
                        {i === 0 ? '🎭 インサイダー' : '👤 市民'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => setCurrentPhase('GAME_END')}
              >
                ゲーム終了画面へ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentPhase === 'GAME_END' && (
        <Card>
          <CardHeader>
            <CardTitle>ゲーム終了</CardTitle>
            <CardDescription>お疲れ様でした！</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button className="w-full" variant="outline">
                もう一度プレイ
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => (window.location.href = '/')}
              >
                ロビーに戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Phase Switcher (開発用) */}
      <Card className="mt-8 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">開発用: フェーズ切り替え</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(phaseDescriptions) as GamePhase[]).map((phase) => (
              <Button
                key={phase}
                size="sm"
                variant={currentPhase === phase ? 'default' : 'outline'}
                onClick={() => setCurrentPhase(phase)}
                className="text-xs"
              >
                {phase.split('_').slice(0, 2).join('_')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
