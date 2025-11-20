import type React from "react"
import type { Metadata } from "next"
import { Noto_Sans_JP } from "next/font/google"
import "./globals.css"

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "INSIDER - オンライン推理ゲーム",
  description: "マスター、インサイダー、庶民の3つの役職に分かれて遊ぶオンライン推理ゲーム",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={notoSansJP.variable}>{children}</body>
    </html>
  )
}
