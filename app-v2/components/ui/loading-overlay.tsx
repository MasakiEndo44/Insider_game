import { LoadingSpinner } from './loading-spinner';

interface LoadingOverlayProps {
    message?: string;
}

export function LoadingOverlay({ message = '読み込み中...' }: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-lg bg-card p-6 shadow-lg border border-border">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-foreground-secondary">{message}</p>
            </div>
        </div>
    );
}
