"use client";

import { useState } from "react";
import { api } from "./useAdmin";

export default function LoginForm({ onDone, devHint }: { onDone: () => void; devHint?: boolean }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/admin/login", "POST", { pin });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="guest">
      <h1>운영자 로그인</h1>
      <form className="card" onSubmit={submit}>
        <div className="field">
          <label htmlFor="pin">관리자 PIN</label>
          <input id="pin" className="input" type="password" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} />
          {devHint && <span className="hint">메모리(테스트) 모드: ADMIN_PIN 미설정 시 기본값 0000</span>}
        </div>
        {err && <div className="notice bad" style={{ marginBottom: 12 }}>{err}</div>}
        <button className="btn big primary" disabled={busy || !pin}>
          로그인
        </button>
      </form>
    </main>
  );
}
