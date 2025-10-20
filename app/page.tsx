import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Static optimization: Force static rendering for lobby page
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every 1 hour

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
          {/* Create Room Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="flex-1">
                ルームを作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新しいルームを作成</DialogTitle>
                <DialogDescription>
                  パスフレーズを設定してゲームルームを作成します
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="passphrase">パスフレーズ</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    placeholder="4文字以上の英数字"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-players">最大プレイヤー数</Label>
                  <Input
                    id="max-players"
                    type="number"
                    defaultValue="6"
                    min="4"
                    max="8"
                  />
                </div>
              </div>
              <Button className="w-full">作成</Button>
            </DialogContent>
          </Dialog>

          {/* Find Room Dialog - 修正：適切なコントラストを確保 */}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline" className="flex-1">
                ルームを探す
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ルームに参加</DialogTitle>
                <DialogDescription>
                  パスフレーズを入力してルームに参加します
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="join-passphrase">パスフレーズ</Label>
                  <Input
                    id="join-passphrase"
                    type="password"
                    placeholder="ルームのパスフレーズを入力"
                  />
                </div>
              </div>
              <Button className="w-full">参加</Button>
            </DialogContent>
          </Dialog>
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
