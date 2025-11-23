"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Check, X, MessageSquare } from "lucide-react"

export type Question = {
    id: string
    text: string
    answer: 'yes' | 'no' | 'pending'
    timestamp: number
    playerName: string
}

interface QuestionChatProps {
    role: 'master' | 'insider' | 'common'
    questions: Question[]
    onAskQuestion: (text: string) => void
    onAnswerQuestion: (id: string, answer: 'yes' | 'no') => void
}

export function QuestionChat({ role, questions, onAskQuestion, onAnswerQuestion }: QuestionChatProps) {
    const [inputText, setInputText] = useState("")
    const scrollRef = useRef<HTMLDivElement>(null)
    const isMaster = role === "master"

    // Auto-scroll to bottom when new questions arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [questions])

    const handleSend = () => {
        if (!inputText.trim()) return
        onAskQuestion(inputText)
        setInputText("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex flex-col h-[500px] w-full max-w-md bg-surface/50 backdrop-blur-sm border-2 border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-game-red" />
                <h3 className="font-bold text-foreground">質問チャット</h3>
                <span className="text-xs text-foreground-secondary ml-auto">
                    {questions.length}件の質問
                </span>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
                {questions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-foreground-secondary opacity-50">
                        <MessageSquare className="w-12 h-12 mb-2" />
                        <p>まだ質問がありません</p>
                        {!isMaster && <p className="text-sm">最初の質問をしてみましょう！</p>}
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

                                {/* Answer Status / Controls */}
                                <div className="flex items-center justify-end gap-2">
                                    {q.answer === 'pending' ? (
                                        isMaster ? (
                                            <div className="flex gap-2 w-full mt-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => onAnswerQuestion(q.id, 'yes')}
                                                    className="flex-1 bg-success/20 hover:bg-success/30 text-success border border-success/50 h-8"
                                                >
                                                    <Check className="w-4 h-4 mr-1" />
                                                    はい
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => onAnswerQuestion(q.id, 'no')}
                                                    className="flex-1 bg-game-red/20 hover:bg-game-red/30 text-game-red border border-game-red/50 h-8"
                                                >
                                                    <X className="w-4 h-4 mr-1" />
                                                    いいえ
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-foreground-secondary bg-background/50 px-2 py-1 rounded-full">
                                                回答待ち...
                                            </span>
                                        )
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

            {/* Input Area (Non-Master only) */}
            {!isMaster && (
                <div className="p-4 border-t border-border bg-background/50">
                    <div className="flex gap-2">
                        <Input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="質問を入力..."
                            className="flex-1 bg-background border-border focus:border-game-red"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!inputText.trim()}
                            className="bg-game-red hover:bg-game-red-dark text-white w-12 px-0"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
