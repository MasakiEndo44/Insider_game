import { RoomProvider } from '@/providers/RoomProvider';

interface RoomLayoutProps {
  children: React.ReactNode;
  params: Promise<{ roomId: string }>;
}

export default async function RoomLayout({ children, params }: RoomLayoutProps) {
  const { roomId } = await params;

  return (
    <div className="min-h-screen bg-background">
      {/* Room Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              インサイダーゲーム
            </h1>
            <p className="text-sm text-muted-foreground">
              ルーム: {roomId}
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← ロビーに戻る
          </a>
        </div>
      </header>

      {/* Room Content with Provider */}
      <RoomProvider roomId={roomId}>{children}</RoomProvider>
    </div>
  );
}
