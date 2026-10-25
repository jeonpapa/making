import type { Metadata, Viewport } from "next";
import { Gowun_Batang } from "next/font/google";
import "./globals.css";

/** 제목·캡션용 손글씨 느낌의 명조 */
const serif = Gowun_Batang({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "가족 사진관",
  description: "QR로 가족 사진을 보내면 행사 화면에 함께 띄우는 사진 공유",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7a2e12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={serif.variable}>
      <body>{children}</body>
    </html>
  );
}
