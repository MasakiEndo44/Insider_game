import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateRoomDialog } from '@/app/components/lobby/CreateRoomDialog';
import { JoinRoomDialog } from '@/app/components/lobby/JoinRoomDialog';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">
            インサイダーゲーム オンライン
          </h1>
          <p className="text-muted-foreground mt-1">
            リアルタイム対戦型推理ゲーム
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <CreateRoomDialog />
          <JoinRoomDialog />
        </div>

        {/* Room List Section */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            公開ルーム一覧
          </h2>

          {/* Sample Room Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Sample Room 1 */}
            <Card>
              <CardHeader>
                <CardTitle>ルーム #1</CardTitle>
                <CardDescription>プレイヤー: 3/6</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ステータス:</span>
                    <span className="font-medium text-foreground">
                      待機中
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">作成者:</span>
                    <span className="font-medium text-foreground">
                      Player123
                    </span>
                  </div>
                </div>
                <Button variant="secondary" className="w-full mt-4">
                  参加する
                </Button>
              </CardContent>
            </Card>

            {/* Sample Room 2 */}
            <Card>
              <CardHeader>
                <CardTitle>ルーム #2</CardTitle>
                <CardDescription>プレイヤー: 5/6</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ステータス:</span>
                    <span className="font-medium text-foreground">
                      待機中
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">作成者:</span>
                    <span className="font-medium text-foreground">
                      GameMaster
                    </span>
                  </div>
                </div>
                <Button variant="secondary" className="w-full mt-4">
                  参加する
                </Button>
              </CardContent>
            </Card>

            {/* Sample Room 3 */}
            <Card>
              <CardHeader>
                <CardTitle>ルーム #3</CardTitle>
                <CardDescription>プレイヤー: 6/6</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ステータス:</span>
                    <span className="font-medium text-destructive">
                      ゲーム中
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">作成者:</span>
                    <span className="font-medium text-foreground">
                      Insider99
                    </span>
                  </div>
                </div>
                <Button variant="secondary" className="w-full mt-4" disabled>
                  満室
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Empty State */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              公開ルームがありません。新しいルームを作成してゲームを始めましょう！
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
