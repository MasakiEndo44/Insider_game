"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useRoom } from "@/context/room-context"
import { api } from "@/lib/api"

export function ReturnToTitleButton() {
    const router = useRouter()
    const pathname = usePathname()
    const { roomId, playerId, resetRoom } = useRoom()
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Don't show on title screen
    // Also avoid hydration mismatch by checking mounted
    if (!mounted) return null
    if (pathname === "/") return null

    const handleLeave = async () => {
        if (roomId && playerId) {
            try {
                await api.leaveRoom(roomId, playerId)
            } catch (error) {
                console.error("Failed to leave room:", error)
            }
        }
        resetRoom()
        setIsOpen(false)
        router.push("/")
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="fixed top-4 right-4 z-50 rounded-full bg-background/50 backdrop-blur-sm border border-border shadow-sm hover:bg-background/80"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">タイトルへ戻る</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>タイトルへ戻りますか？</DialogTitle>
                    <DialogDescription>
                        現在のルームから退出することになります。
                        進行中のゲームは中断される可能性があります。
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        キャンセル
                    </Button>
                    <Button variant="destructive" onClick={handleLeave}>
                        退出する
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
