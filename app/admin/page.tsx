"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { EventRow } from "@/lib/types";
import LoginForm from "./LoginForm";
import { api, useSession } from "./useAdmin";

export default function AdminHome() {
  const { session, refresh } = useSession();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      setEvents((await api<{ events: EventRow[] }>("/api/admin/events")).events);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (session?.admin) load();
  }, [session?.admin, load]);

  if (!session) return <main className="admin"><p className="muted">불러오는 중…</p></main>;
  if (!session.admin) return <LoginForm onDone={refresh} devHint={session.mode === "memory"} />;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api("/api/admin/events", "POST", { title });
      setTitle("");
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function logout() {
    await api("/api/admin/logout", "POST");
    refresh();
  }

  return (
    <main className="admin">
      <header>
        <h1>행사 목록</h1>
        <button className="btn small" onClick={logout}>로그아웃</button>
      </header>

      {session.mode === "memory" && (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          메모리(테스트) 모드로 실행 중입니다. 서버를 다시 시작하면 행사와 사진이 모두 사라집니다. 실제 행사 전에는
          Supabase 환경변수를 설정하세요.
        </div>
      )}

      <form className="card toolbar" onSubmit={create} style={{ marginBottom: 20 }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="새 행사 이름 (예: 2026 가을 감사 예배)"
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="btn primary" disabled={!title.trim()}>행사 만들기</button>
      </form>
      {err && <div className="notice bad" style={{ marginBottom: 12 }}>{err}</div>}

      {events.length === 0 ? (
        <div className="empty">아직 행사가 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {events.map((ev) => (
            <div key={ev.code} className="card toolbar" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{ev.title}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  코드 <span className="code">{ev.code}</span> · {new Date(ev.created_at).toLocaleString("ko-KR")}
                </div>
              </div>
              <div className="toolbar">
                <Link className="btn primary small" href={`/admin/${ev.code}`}>승인 화면</Link>
                <a className="btn small" href={`/wall/${ev.code}`} target="_blank" rel="noreferrer">대형 화면</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
