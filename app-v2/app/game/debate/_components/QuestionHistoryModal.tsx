"use client"

import { X, Check, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

export type Question = {
    id: string
    text: string
    answer: 'yes' | 'no' | 'pending'
    timestamp: number
    playerName: string
}

interface QuestionHistoryModalProps {
    questions: Question[]
    onClose: () => void
}

export function QuestionHistoryModal({ questions, onClose }: QuestionHistoryModalProps) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-game-red" />
                        <h2 className="text-lg font-bold text-foreground">質問履歴</h2>
                        <span className="text-xs text-foreground-secondary">
                            {questions.length}件
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {questions.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-foreground-secondary opacity-50 py-8">
                            <MessageSquare className="w-12 h-12 mb-2" />
                            <p>質問履歴がありません</p>
                        </div>
                    ) : (
                        questions.map((q) => (
                            <div key={q.id} className="animate-fade-in">
                                <div className={`p-3 rounded-lg border ${q.answer === 'yes' ? 'bg-success/10 border-success/30' :
                                        q.answer === 'no' ? 'bg-game-red/10 border-game-red/30' :
                                            'bg-card border-border'
                                    }`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs text-foreground-secondary font-mono">
                                            {q.playerName}
                                        </span>
                                        <span className="text-xs text-foreground-secondary opacity-50">
                                            {new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-foreground font-medium mb-2">{q.text}</p>

                                    {/* Answer Status */}
                                    <div className="flex items-center justify-end">
                                        {q.answer === 'pending' ? (
                                            <span className="text-xs text-foreground-secondary bg-background/50 px-2 py-1 rounded-full">
                                                回答なし
                                            </span>
                                        ) : (
                                            <div className={`flex items-center gap-1 text-sm font-bold ${q.answer === 'yes' ? 'text-success' : 'text-game-red'
                                                }`}>
                                                {q.answer === 'yes' ? (
                                                    <><Check className="w-4 h-4" /> はい</>
                                                ) : (
                                                    <><X className="w-4 h-4" /> いいえ</>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border">
                    <Button
                        onClick={onClose}
                        className="w-full h-12 bg-transparent hover:bg-foreground/10 text-foreground border-2 border-foreground rounded-xl transition-all"
                    >
                        閉じる
                    </Button>
                </div>
            </div>
        </div>
    )
}
