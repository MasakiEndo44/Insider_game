import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RoomProvider } from "@/context/room-context";
import { GameProvider } from "@/context/game-context";
import { ToasterProvider } from "@/components/toaster";
import { ReturnToTitleButton } from "@/components/return-to-title-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Insider Game",
  description: "Online social deduction game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RoomProvider>
          <GameProvider>
            {children}
            <ReturnToTitleButton />
          </GameProvider>
        </RoomProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
