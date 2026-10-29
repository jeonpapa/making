"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventRow, PhotoDTO, PhotoStatus } from "@/lib/types";
import LoginForm from "../LoginForm";
import { api, useSession } from "../useAdmin";

const POLL_MS = 3000;
type Filter = "pending" | "approved" | "rejected" | "pinned" | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "대기" },
  { key: "approved", label: "승인" },
  { key: "pinned", label: "고정" },
  { key: "rejected", label: "거절" },
  { key: "all", label: "전체" },
];
const STATUS_LABEL: Record<PhotoStatus, string> = {
  uploading: "업로드 중",
  pending: "대기",
  approved: "승인",
  rejected: "거절",
};

export default function AdminEventClient({ code }: { code: string }) {
  const { session, refresh } = useSession();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [photos, setPhotos] = useState<PhotoDTO[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [err, setErr] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [zipping, setZipping] = useState<string | null>(null);

  const version = useRef<string | null>(null);
  /** force: 방금 직접 바꾼 경우. version 비교 없이 전체를 다시 받는다 */
  const load = useCallback(async (force = false) => {
    try {
      const v = !force && version.current ? `?v=${encodeURIComponent(version.current)}` : "";
      const data = await api<
        { unchanged: true; version: string } | { unchanged?: false; version: string; event: EventRow; photos: PhotoDTO[] }
      >(`/api/admin/events/${encodeURIComponent(code)}/photos${v}`);
      if (data.unchanged) return;
      version.current = data.version;
      setEvent(data.event);
      setPhotos(data.photos);
      setErr("");
    } catch (e) {
      if ((e as { status?: number }).status === 401) refresh();
      else setErr((e as Error).message);
    }
  }, [code, refresh]);

  useEffect(() => {
    if (!session?.admin) return;
    load(true);
    const t = setInterval(() => load(), POLL_MS);
    return () => clearInterval(t);
  }, [session?.admin, load]);

  useEffect(() => {
    const url = `${location.origin}/u/${code}`;
    setUploadUrl(url);
    QRCode.toDataURL(url, { margin: 1, width: 400 }).then(setQr).catch(() => {});
  }, [code]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, pinned: 0, all: photos.length };
    for (const p of photos) if (p.status in c) c[p.status as "pending" | "approved" | "rejected"]++;
    c.pinned = event?.pinned_photo_id && photos.some((p) => p.id === event.pinned_photo_id) ? 1 : 0;
    return c;
  }, [photos, event?.pinned_photo_id]);

  const visible = useMemo(() => {
    const list =
      filter === "all"
        ? photos
        : filter === "pinned"
          ? photos.filter((p) => p.id === event?.pinned_photo_id)
          : photos.filter((p) => p.status === filter);
    // 대기열은 먼저 온 순서, 나머지는 최신이 위
    return filter === "pending" ? list : [...list].reverse();
  }, [photos, filter, event?.pinned_photo_id]);

  if (!session) return <main className="admin"><p className="muted">불러오는 중…</p></main>;
  if (!session.admin) return <LoginForm onDone={refresh} devHint={session.mode === "memory"} />;

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
    load(true);
  }

  const setStatus = (id: string, status: PhotoStatus) =>
    act(async () => {
      setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, status } : p)));
      await api(`/api/admin/photos/${id}`, "PATCH", { status });
    });

  const remove = (p: PhotoDTO) => {
    if (!confirm("이 사진을 완전히 삭제할까요? 되돌릴 수 없습니다.")) return;
    act(async () => {
      setPhotos((ps) => ps.filter((x) => x.id !== p.id));
      await api(`/api/admin/photos/${p.id}`, "DELETE");
    });
  };

  const rename = () => {
    const next = prompt("행사 이름", event?.title ?? "")?.trim();
    if (next && next !== event?.title) patchEvent({ title: next });
  };

  const patchEvent = (body: { title?: string; uploadEnabled?: boolean; pinnedPhotoId?: string | null }) =>
    act(async () => {
      const { event } = await api<{ event: EventRow }>(`/api/admin/events/${encodeURIComponent(code)}`, "PATCH", body);
      setEvent(event);
    });

  const approveAll = () => {
    const pending = photos.filter((p) => p.status === "pending");
    if (!pending.length || !confirm(`대기 중인 ${pending.length}장을 모두 승인할까요?`)) return;
    act(async () => {
      for (const p of pending) await api(`/api/admin/photos/${p.id}`, "PATCH", { status: "approved" });
    });
  };

  /** 인쇄·공유용 고해상도 QR PNG (1200px, 여백 포함) */
  async function downloadQr() {
    try {
      const dataUrl = await QRCode.toDataURL(uploadUrl, { margin: 4, width: 1200, errorCorrectionLevel: "M" });
      const blob = await (await fetch(dataUrl)).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(event?.title ?? code).replace(/[\\/:*?"<>|]/g, "")}_사진보내기_QR.png`;
      // 문서에 붙여야 일부 브라우저가 파일 이름(download 속성)을 지킨다
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      setErr("QR 이미지를 만들지 못했습니다.");
    }
  }

  async function downloadZip(which: "approved" | "all") {
    const list = photos.filter((p) => (which === "all" ? true : p.status === "approved"));
    if (!list.length) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    let i = 0;
    for (const p of list) {
      i++;
      setZipping(`${i}/${list.length}`);
      try {
        const blob = await (await fetch(p.url)).blob();
        const who = (p.name ?? "").replace(/[\\/:*?"<>|]/g, "").slice(0, 20);
        zip.file(`${String(i).padStart(4, "0")}${who ? `_${who}` : ""}_${p.status}.jpg`, blob);
      } catch {
        /* 한 장 실패는 건너뛴다 */
      }
    }
    const captions = list
      .map((p, idx) => `${String(idx + 1).padStart(4, "0")}\t${p.status}\t${p.name ?? ""}\t${p.caption ?? ""}`)
      .join("\n");
    zip.file("captions.tsv", `번호\t상태\t이름\t캡션\n${captions}\n`);
    setZipping("압축 중…");
    const out = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(out);
    a.download = `${event?.title ?? code}_${which === "all" ? "전체" : "승인"}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    setZipping(null);
  }

  return (
    <main className="admin">
      <header>
        <div>
          <Link href="/admin" className="muted" style={{ fontSize: 14 }}>← 행사 목록</Link>
          <h1>
            {event?.title ?? "…"}{" "}
            <button className="btn small" onClick={rename} style={{ verticalAlign: "middle" }}>
              이름 수정
            </button>
          </h1>
        </div>
        <div className="toolbar">
          {event && (
            <button
              className={`switch${event.upload_enabled ? " on" : ""}`}
              onClick={() => patchEvent({ uploadEnabled: !event.upload_enabled })}
              aria-pressed={event.upload_enabled}
            >
              <span className="dot" />
              업로드 {event.upload_enabled ? "받는 중" : "중단됨"}
            </button>
          )}
          <a className="btn primary" href={`/wall/${code}`} target="_blank" rel="noreferrer">대형 화면 열기</a>
        </div>
      </header>

      {err && <div className="notice bad" style={{ marginBottom: 12 }}>{err}</div>}

      <section className="card qrbox">
        {qr && <img src={qr} alt="업로드 QR" />}
        <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 220 }}>
          <strong>게스트 업로드 주소</strong>
          <span className="code">{uploadUrl}</span>
          <div className="toolbar">
            <button className="btn small" onClick={() => navigator.clipboard?.writeText(uploadUrl)}>주소 복사</button>
            <button className="btn small" onClick={downloadQr} disabled={!uploadUrl}>QR 이미지 저장</button>
            <a className="btn small" href={`/admin/${code}/qr`} target="_blank" rel="noreferrer">QR 안내판 인쇄</a>
            <button className="btn small" disabled={!!zipping || !counts.approved} onClick={() => downloadZip("approved")}>
              {zipping ?? `승인 사진 ZIP (${counts.approved})`}
            </button>
            <button className="btn small" disabled={!!zipping || !counts.all} onClick={() => downloadZip("all")}>
              전체 ZIP ({counts.all})
            </button>
          </div>
        </div>
      </section>

      <div className="tabs" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.key} className="tab" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} {counts[f.key]}
          </button>
        ))}
        {filter === "pending" && counts.pending > 1 && (
          <button className="btn small ok" style={{ marginLeft: "auto" }} onClick={approveAll}>
            대기 {counts.pending}장 모두 승인
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="empty">{filter === "pending" ? "대기 중인 사진이 없습니다." : "사진이 없습니다."}</div>
      ) : (
        <div className="grid">
          {visible.map((p) => {
            const isPinned = event?.pinned_photo_id === p.id;
            return (
              <article key={p.id} className={`pcard${isPinned ? " pinned" : ""}`}>
                <a href={p.url} target="_blank" rel="noreferrer">
                  <img src={p.thumbUrl} alt={p.caption ?? ""} loading="lazy" />
                </a>
                <div className="body">
                  <div>
                    <span className={`badge ${p.status}`}>{STATUS_LABEL[p.status]}</span>
                    {isPinned && <span className="badge pending" style={{ marginLeft: 4 }}>📌 고정 중</span>}
                  </div>
                  {p.caption && <div className="cap">{p.caption}</div>}
                  <div className="meta">
                    {p.name ?? "이름 없음"} · {new Date(p.createdAt).toLocaleTimeString("ko-KR")}
                  </div>
                </div>
                <div className="actions">
                  {p.status !== "approved" && (
                    <button className="btn small ok" onClick={() => setStatus(p.id, "approved")}>승인</button>
                  )}
                  {p.status !== "rejected" && (
                    <button className="btn small bad" onClick={() => setStatus(p.id, "rejected")}>
                      {p.status === "approved" ? "화면에서 내리기" : "거절"}
                    </button>
                  )}
                  {p.status === "approved" &&
                    (isPinned ? (
                      <button className="btn small" onClick={() => patchEvent({ pinnedPhotoId: null })}>고정 해제</button>
                    ) : (
                      <button className="btn small" onClick={() => patchEvent({ pinnedPhotoId: p.id })}>📌 고정</button>
                    ))}
                  <button className="btn small bad" onClick={() => remove(p)}>삭제</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
