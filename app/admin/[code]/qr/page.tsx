"use client";

import QRCode from "qrcode";
import { use, useEffect, useState } from "react";

/** 입구·좌석에 붙일 인쇄용 QR 안내판 (A4 세로) */
export default function QrPoster({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [qr, setQr] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    QRCode.toDataURL(`${location.origin}/u/${code}`, { margin: 1, width: 900 }).then(setQr).catch(() => {});
    fetch(`/api/events/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => setTitle(d.title ?? ""))
      .catch(() => {});
  }, [code]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", textAlign: "center", background: "#fff", minHeight: "100dvh" }}>
      <style>{`@media print { .noprint { display: none } @page { size: A4; margin: 14mm } }`}</style>
      <h1 style={{ fontSize: 40, margin: "0 0 8px" }}>{title || "사진을 보내 주세요"}</h1>
      <p style={{ fontSize: 22, margin: "0 0 28px", color: "#555" }}>함께 나누고 싶은 사진을 화면에 띄워 드립니다</p>
      {qr && <img src={qr} alt="QR 코드" style={{ width: "70%", maxWidth: 420, aspectRatio: "1" }} />}
      <ol style={{ fontSize: 26, textAlign: "left", display: "inline-block", lineHeight: 1.8, margin: "28px 0" }}>
        <li>휴대폰 카메라로 QR 코드를 찍습니다</li>
        <li>사진을 고르고, 한마디를 적습니다 (선택)</li>
        <li>&lsquo;보내기&rsquo;를 누릅니다</li>
      </ol>
      <p style={{ fontSize: 22, fontWeight: 700 }}>운영자가 확인한 뒤 화면에 띄웁니다</p>
      <p style={{ fontSize: 16, color: "#666" }}>와이파이가 느리면 모바일 데이터로도 보낼 수 있습니다</p>
      <p className="noprint" style={{ marginTop: 30 }}>
        <button className="btn primary" onClick={() => window.print()}>인쇄하기</button>
      </p>
    </main>
  );
}
