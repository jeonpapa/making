"use client";

import QRCode from "qrcode";
import { use, useEffect, useState } from "react";
import { Leaf } from "@/app/components/Leaves";

/** 입구·좌석에 붙일 인쇄용 QR 안내판 (A4 세로, 가을 테마) */
export default function QrPoster({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [qr, setQr] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    QRCode.toDataURL(`${location.origin}/u/${code}`, { margin: 1, width: 900, color: { dark: "#3b2416", light: "#fffaf1" } })
      .then(setQr)
      .catch(() => {});
    fetch(`/api/events/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => setTitle(d.title ?? ""))
      .catch(() => {});
  }, [code]);

  return (
    <main
      style={{
        position: "relative", overflow: "hidden", maxWidth: 720, margin: "0 auto", padding: "48px 32px",
        textAlign: "center", minHeight: "100dvh", background: "#fffaf1", color: "#3b2416",
        border: "14px solid #b8461e", boxShadow: "inset 0 0 0 4px #e9b949",
        WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
      }}
    >
      <style>{`@media print { .noprint { display: none } @page { size: A4; margin: 8mm } }`}</style>
      <Leaf kind="maple" color="#c0392b" size={130} rotate={-20} style={{ position: "absolute", top: -20, left: -24 }} />
      <Leaf kind="ginkgo" color="#d4a017" size={70} rotate={30} style={{ position: "absolute", top: 120, left: 14 }} />
      <Leaf kind="oak" color="#a0401c" size={120} rotate={200} style={{ position: "absolute", bottom: -24, right: -20 }} />
      <Leaf kind="maple" color="#e67e22" size={80} rotate={40} style={{ position: "absolute", bottom: 80, right: 80 }} />

      <h1 style={{ fontFamily: "var(--serif)", fontSize: 52, margin: "10px 0 8px" }}>{title || "가족 사진관"}</h1>
      <p style={{ fontSize: 22, margin: "0 0 28px", color: "#80654f" }}>우리 가족의 소중한 순간을 화면에 함께 띄워 드려요</p>
      {qr && (
        <img
          src={qr}
          alt="QR 코드"
          style={{ width: "66%", maxWidth: 400, aspectRatio: "1", padding: 14, background: "#fffaf1", border: "3px solid #e8d6bb", borderRadius: 16 }}
        />
      )}
      <ol style={{ fontSize: 26, textAlign: "left", display: "inline-block", lineHeight: 1.8, margin: "28px 0" }}>
        <li>휴대폰 카메라로 QR 코드를 찍습니다</li>
        <li>가족 사진을 고르고, 한마디를 적습니다 (선택)</li>
        <li>&lsquo;보내기&rsquo;를 누릅니다</li>
      </ol>
      <p style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--serif)" }}>운영자가 확인한 뒤 화면에 띄웁니다</p>
      <p style={{ fontSize: 16, color: "#80654f" }}>와이파이가 느리면 모바일 데이터로도 보낼 수 있습니다</p>
      <p className="noprint" style={{ marginTop: 30 }}>
        <button className="btn primary" onClick={() => window.print()}>인쇄하기</button>
      </p>
    </main>
  );
}
