import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
    current: number;
    total: number;
    label: string;
    className?: string;
}

export function ProgressIndicator({ current, total, label, className }: ProgressIndicatorProps) {
    const percentage = total > 0 ? (current / total) * 100 : 0;

    return (
        <div className={cn('space-y-2', className)}>
            <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">{label}</span>
                <span className="font-medium text-foreground">
                    {current} / {total}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-game-red/20">
                <div
                    className="h-full bg-game-red transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
