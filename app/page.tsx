import Link from "next/link";

export default function Home() {
  return (
    <main className="guest">
      <h1 className="plain">가족 사진관</h1>
      <p className="muted">행사 화면의 QR 코드를 휴대폰 카메라로 찍으면 가족 사진을 보낼 수 있습니다.</p>
      <p>
        <Link className="btn" href="/admin">
          운영자 화면
        </Link>
      </p>
    </main>
  );
}
