"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Clock, Tag } from "lucide-react"

interface GameSettingsProps {
    timeLimit: number
    category: string
    onTimeLimitChange: (value: number) => void
    onCategoryChange: (value: string) => void
}

export function GameSettings({ timeLimit, category, onTimeLimitChange, onCategoryChange }: GameSettingsProps) {
    return (
        <div className="bg-surface/50 backdrop-blur-sm border-2 border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-game-red" />
                <h2 className="text-lg font-bold text-foreground">ゲーム設定</h2>
                <span className="text-xs text-foreground/70 ml-auto">ホストのみ変更可能</span>
            </div>

            <div className="space-y-4">
                {/* Time Limit */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-foreground/80" />
                        質問フェーズの制限時間
                    </Label>
                    <Select value={timeLimit.toString()} onValueChange={(v) => onTimeLimitChange(Number(v))}>
                        <SelectTrigger className="bg-background/50 backdrop-blur-sm border-2 border-border h-12 hover:bg-background/70 text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-2 border-border">
                            <SelectItem value="3" className="text-foreground hover:bg-surface-hover">
                                3分
                            </SelectItem>
                            <SelectItem value="5" className="text-foreground hover:bg-surface-hover">
                                5分（推奨）
                            </SelectItem>
                            <SelectItem value="7" className="text-foreground hover:bg-surface-hover">
                                7分
                            </SelectItem>
                            <SelectItem value="10" className="text-foreground hover:bg-surface-hover">
                                10分
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Tag className="w-4 h-4 text-foreground/80" />
                        お題のカテゴリ
                    </Label>
                    <Select value={category} onValueChange={onCategoryChange}>
                        <SelectTrigger className="bg-background/50 backdrop-blur-sm border-2 border-border h-12 hover:bg-background/70 text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-2 border-border">
                            <SelectItem value="general" className="text-foreground hover:bg-surface-hover">
                                一般（推奨）
                            </SelectItem>
                            <SelectItem value="animals" className="text-foreground hover:bg-surface-hover">
                                動物
                            </SelectItem>
                            <SelectItem value="food" className="text-foreground hover:bg-surface-hover">
                                食べ物
                            </SelectItem>
                            <SelectItem value="places" className="text-foreground hover:bg-surface-hover">
                                場所
                            </SelectItem>
                            <SelectItem value="things" className="text-foreground hover:bg-surface-hover">
                                物
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-background/30 backdrop-blur-sm rounded-lg p-3 border-2 border-border">
                <p className="text-xs text-foreground/80 leading-relaxed">
                    設定はゲーム開始前にいつでも変更できます。推奨設定は5分・一般カテゴリです。
                </p>
            </div>
        </div>
    )
}
