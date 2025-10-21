"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Eye } from "@/components/ui/icons"

export default function RoleAssignmentPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#E50012] mx-auto flex items-center justify-center animate-pulse-glow">
            <Eye className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">役職配布</h1>
          <p className="text-muted-foreground">この画面は実装予定です</p>
        </div>

        <Button
          onClick={() => router.push("/")}
          className="w-full h-12 bg-[#E50012] hover:bg-[#B30010] text-white font-bold"
        >
          トップに戻る
        </Button>
      </div>
    </div>
  )
}
