"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import type { FeedResponse, PhotoDTO, UnchangedResponse } from "@/lib/types";
import { FallingLeaves, Leaf, LEAF_COLORS, type LeafKind } from "@/app/components/Leaves";
import ChatFeed from "./ChatFeed";

const POLL_MS = 2500;
const SPEEDS = [
  { label: "느리게", pxPerSec: 25 },
  { label: "보통", pxPerSec: 50 },
  { label: "빠르게", pxPerSec: 90 },
];
const HOLD_AT_BOTTOM_MS = 5000;
const HOLD_AT_TOP_MS = 3000;
const MANUAL_PAUSE_MS = 10_000;
const IDLE_MS = 3000;
const FRESH_MS = 8000;

function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function savePref(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

export default function WallClient({ code }: { code: string }) {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [missing, setMissing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showQr, setShowQr] = useState(true);
  /** chat: 모아보기(채팅처럼 작은 사진 묶음) / big: 한 장씩 크게 */
  const [mode, setMode] = useState<"chat" | "big">("chat");
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [qr, setQr] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [idle, setIdle] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");

  const feedRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const knownIds = useRef<Set<string> | null>(null);
  const version = useRef<string | null>(null);
  const pinActionAt = useRef(0);
  const manualPauseUntil = useRef(0);
  const failures = useRef(0);

  // 저장된 화면 설정 불러오기
  useEffect(() => {
    setAutoScroll(loadPref("pw_auto", true));
    setMode(loadPref("pw_mode", "chat"));
    setSpeedIdx(loadPref("pw_speed", 1));
    setShowQr(loadPref("pw_qr", true));
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => setAdmin(!!s.admin))
      .catch(() => {});
    QRCode.toDataURL(`${location.origin}/u/${code}`, { margin: 1, width: 360 }).then(setQr).catch(() => {});
  }, [code]);

  const photos = feed?.photos ?? [];
  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const pinned = feed?.pinnedPhotoId ? byId.get(feed.pinnedPhotoId) ?? null : null;
  const lightbox = !pinned && lightboxId ? byId.get(lightboxId) ?? null : null;

  const scrollToPhoto = useCallback((id: string) => {
    itemRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next = m === "chat" ? "big" : "chat";
      savePref("pw_mode", next);
      return next;
    });
    manualPauseUntil.current = Date.now() + HOLD_AT_TOP_MS;
    feedRef.current?.scrollTo({ top: 0 });
  }, []);

  // ---- 승인 사진 폴링 (재연결·절전 복귀에도 자동으로 따라잡는다) ----
  const poll = useCallback(async () => {
    const startedAt = Date.now();
    try {
      const v = version.current ? `?v=${encodeURIComponent(version.current)}` : "";
      const res = await fetch(`/api/events/${encodeURIComponent(code)}/feed${v}`, { cache: "no-store" });
      if (res.status === 404) {
        setMissing(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as FeedResponse | UnchangedResponse;
      failures.current = 0;
      setOffline(false);
      if (data.unchanged) return;
      const next = data;

      // 방금 누른 고정/해제가 그 전에 출발한 응답으로 덮이지 않게 한다.
      // 이때는 version을 저장하지 않아 다음 폴링에서 전체를 다시 받는다.
      const stale = startedAt < pinActionAt.current;
      version.current = stale ? null : next.version;
      setFeed((prev) => {
        if (prev && stale) next.pinnedPhotoId = prev.pinnedPhotoId;
        return next;
      });

      const ids = new Set(next.photos.map((p) => p.id));
      if (knownIds.current) {
        const added = next.photos.filter((p) => !knownIds.current!.has(p.id));
        if (added.length) {
          window.dispatchEvent(new CustomEvent("pw:new", { detail: added.map((p) => p.id) }));
        }
      }
      knownIds.current = ids;
    } catch {
      failures.current++;
      if (failures.current >= 3) setOffline(true);
    }
  }, [code]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_MS);
    const wake = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", poll);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", poll);
    };
  }, [poll]);

  // 새 사진 도착: 자동 스크롤 중이면 그 사진으로 이동, 아니면 "새 사진 N장" 표시
  useEffect(() => {
    function onNew(e: Event) {
      const ids = (e as CustomEvent<string[]>).detail;
      // 방금 도착한 사진은 몇 초간 빛나게
      setFresh((prev) => new Set([...prev, ...ids]));
      setTimeout(
        () => setFresh((prev) => new Set([...prev].filter((id) => !ids.includes(id)))),
        FRESH_MS,
      );
      if (autoScroll) {
        // DOM 반영 후 이동
        requestAnimationFrame(() => requestAnimationFrame(() => scrollToPhoto(ids[ids.length - 1])));
        manualPauseUntil.current = Date.now() + HOLD_AT_BOTTOM_MS;
      } else {
        setNewCount((n) => n + ids.length);
      }
    }
    window.addEventListener("pw:new", onNew);
    return () => window.removeEventListener("pw:new", onNew);
  }, [autoScroll, scrollToPhoto]);

  // ---- 자동 스크롤: 천천히 아래로 → 맨 아래에서 잠시 멈춤 → 맨 위로 → 반복 ----
  const paused = !autoScroll || !!pinned || !!lightbox || loginOpen;
  useEffect(() => {
    if (paused) return;
    const el = feedRef.current;
    if (!el) return;
    let raf = 0;
    let last = performance.now();
    // scrollTop은 정수로 반올림되므로 실수 위치를 따로 들고 간다
    let pos = el.scrollTop;
    let phase: "scroll" | "holdBottom" | "holdTop" = "scroll";
    let phaseUntil = 0;
    const speed = SPEEDS[speedIdx]?.pxPerSec ?? 50;

    const step = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const t = Date.now();
      const max = el.scrollHeight - el.clientHeight;

      if (t < manualPauseUntil.current) {
        pos = el.scrollTop; // 사람이 움직인 위치에서 이어간다
      } else if (phase !== "scroll") {
        if (t >= phaseUntil) {
          if (phase === "holdBottom") {
            // 맨 아래에서 잠시 보여준 뒤 처음으로
            el.scrollTo({ top: 0, behavior: "smooth" });
            phase = "holdTop";
            phaseUntil = t + HOLD_AT_TOP_MS;
          } else {
            phase = "scroll";
            pos = el.scrollTop;
          }
        }
      } else if (max > 0 && pos >= max - 1) {
        phase = "holdBottom";
        phaseUntil = t + HOLD_AT_BOTTOM_MS;
      } else if (max > 0) {
        pos = Math.min(max, pos + (speed * dt) / 1000);
        el.scrollTop = pos;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused, speedIdx, photos.length]);

  // 사람이 직접 스크롤하면 자동 스크롤을 잠시 멈춘다
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const pause = () => (manualPauseUntil.current = Date.now() + MANUAL_PAUSE_MS);
    el.addEventListener("wheel", pause, { passive: true });
    el.addEventListener("touchmove", pause, { passive: true });
    return () => {
      el.removeEventListener("wheel", pause);
      el.removeEventListener("touchmove", pause);
    };
  }, []);

  // 맨 아래로 직접 내려오면 "새 사진" 표시를 지운다
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setNewCount(0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ---- 마우스를 멈추면 버튼과 커서 숨김 ----
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), IDLE_MS);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("mousedown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("mousedown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  // ---- 동작 ----
  const toggleAuto = useCallback(() => {
    setAutoScroll((v) => {
      savePref("pw_auto", !v);
      if (!v) manualPauseUntil.current = 0;
      return !v;
    });
  }, []);

  const setPinned = useCallback(
    async (id: string | null) => {
      if (!admin) return;
      pinActionAt.current = Date.now();
      setFeed((f) => (f ? { ...f, pinnedPhotoId: id } : f));
      if (id) setLightboxId(null);
      const res = await fetch(`/api/admin/events/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pinnedPhotoId: id }),
      }).catch(() => null);
      pinActionAt.current = Date.now();
      if (res?.status === 401) setAdmin(false);
      if (!id && feed?.pinnedPhotoId) scrollToPhoto(feed.pinnedPhotoId);
      poll();
    },
    [admin, code, feed?.pinnedPhotoId, poll, scrollToPhoto],
  );

  const neighbor = useCallback(
    (id: string, dir: 1 | -1): PhotoDTO | null => {
      const i = photos.findIndex((p) => p.id === id);
      if (i < 0 || !photos.length) return null;
      return photos[(i + dir + photos.length) % photos.length];
    },
    [photos],
  );

  const go = useCallback(
    (dir: 1 | -1) => {
      if (pinned) {
        const n = neighbor(pinned.id, dir);
        if (n && admin) setPinned(n.id);
      } else if (lightbox) {
        const n = neighbor(lightbox.id, dir);
        if (n) setLightboxId(n.id);
      }
    },
    [pinned, lightbox, neighbor, admin, setPinned],
  );

  const closeLightbox = useCallback(() => {
    if (lightboxId) scrollToPhoto(lightboxId);
    setLightboxId(null);
  }, [lightboxId, scrollToPhoto]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  // ---- 키보드 ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (loginOpen || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === " ") {
        e.preventDefault();
        toggleAuto();
      } else if (e.key === "Escape") {
        if (lightbox) closeLightbox();
      } else if (e.key === "ArrowRight") {
        go(1);
      } else if (e.key === "ArrowLeft") {
        go(-1);
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "g" || e.key === "G") {
        if (!pinned && !lightbox) toggleMode();
      } else if (e.key === "q" || e.key === "Q") {
        setShowQr((v) => (savePref("pw_qr", !v), !v));
      } else if ((e.key === "p" || e.key === "P") && admin) {
        if (pinned) setPinned(null);
        else if (lightbox) setPinned(lightbox.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loginOpen, lightbox, pinned, admin, toggleAuto, toggleMode, closeLightbox, go, toggleFullscreen, setPinned]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    }).catch(() => null);
    if (res?.ok) {
      setAdmin(true);
      setLoginOpen(false);
      setPin("");
    } else {
      setLoginError((await res?.json().catch(() => null))?.error ?? "로그인 실패");
    }
  }

  if (missing) {
    return (
      <div className="wall">
        <div className="wall-empty">
          <div className="s">행사를 찾을 수 없습니다.</div>
        </div>
      </div>
    );
  }

  const full = pinned ?? lightbox;

  return (
    <div className={`wall${idle ? " idle" : ""}`}>
      <FallingLeaves />
      <div className="wall-feed" ref={feedRef}>
        {feed && photos.length === 0 && (
          <div className="wall-empty">
            <div>
              <Leaf kind="maple" color="#d35400" size={90} rotate={-18} />
              <div className="t">{feed.title}</div>
              <div className="s">QR 코드를 찍어 우리 가족 사진을 보내 주세요</div>
            </div>
          </div>
        )}
        {mode === "chat" ? (
          <ChatFeed
            photos={photos}
            fresh={fresh}
            register={register}
            onOpen={setLightboxId}
            pinnedId={pinned?.id ?? null}
          />
        ) : (
          <div className="inner">
            {photos.map((p, i) => (
              <figure
                key={p.id}
                className="wall-item"
                ref={(el) => register(p.id, el)}
                onClick={() => setLightboxId(p.id)}
              >
                <FrameLeaves index={i} />
                <img src={p.url} alt={p.caption ?? ""} loading="lazy" decoding="async" />
                {(p.caption || p.name) && (
                  <figcaption>
                    {p.caption}
                    {p.name && <span className="who">— {p.name}</span>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>

      {full && (
        <div
          className={`wall-full${full.caption || full.name ? " has-cap" : ""}`}
          onClick={pinned ? undefined : closeLightbox}
        >
          {pinned && <div className="tag">📌 고정</div>}
          <Leaf kind="maple" color="#c0392b" size={120} rotate={-25} className="corner" style={{ top: -24, right: 40 }} />
          <Leaf kind="ginkgo" color="#d4a017" size={90} rotate={20} className="corner" style={{ top: 30, right: -10 }} />
          <Leaf kind="oak" color="#a0401c" size={100} rotate={160} className="corner" style={{ bottom: -20, left: -14 }} />
          <div className="frame">
            <img src={full.url} alt={full.caption ?? ""} />
          </div>
          {(full.caption || full.name) && (
            <div className="cap">
              {full.caption}
              {full.name && <span className="who">— {full.name}</span>}
            </div>
          )}
        </div>
      )}

      {/* 전체 화면(라이트박스·고정) 조작 */}
      {full && (pinned ? admin : true) && (
        <>
          <button className="wall-ui hide-idle wbtn wall-nav prev" onClick={() => go(-1)} aria-label="이전 사진">
            ◀
          </button>
          <button className="wall-ui hide-idle wbtn wall-nav next" onClick={() => go(1)} aria-label="다음 사진">
            ▶
          </button>
        </>
      )}
      {lightbox && (
        <button className="wall-ui hide-idle wbtn wall-close" onClick={closeLightbox}>
          ✕ 닫기 (Esc)
        </button>
      )}

      {newCount > 0 && !full && (
        <button
          className="wall-ui wbtn on wall-new"
          onClick={() => {
            const last = photos[photos.length - 1];
            if (last) scrollToPhoto(last.id);
            setNewCount(0);
          }}
        >
          새 사진 {newCount}장 ↓
        </button>
      )}

      {showQr && qr && !full && (
        <div className="wall-ui wall-qr">
          <Leaf kind="maple" color="#c0392b" size={36} rotate={25} className="corner" />
          <img src={qr} alt="사진 보내기 QR 코드" />
          사진 보내기
        </div>
      )}

      {offline && <div className="wall-ui wall-status">연결 끊김 · 다시 연결 중…</div>}

      <div className="wall-ui hide-idle wall-bar">
        {pinned && admin && (
          <button className="wbtn warn" onClick={() => setPinned(null)}>
            📌 고정 해제 (P)
          </button>
        )}
        {lightbox && admin && (
          <button className="wbtn warn" onClick={() => setPinned(lightbox.id)}>
            📌 이 사진 고정 (P)
          </button>
        )}
        {!full && (
          <>
            <button className={`wbtn${autoScroll ? " on" : ""}`} onClick={toggleAuto} aria-pressed={autoScroll}>
              {autoScroll ? "⏸ 자동 스크롤 끄기" : "▶ 자동 스크롤 켜기"} (Space)
            </button>
            <button
              className="wbtn"
              onClick={() =>
                setSpeedIdx((i) => {
                  const n = (i + 1) % SPEEDS.length;
                  savePref("pw_speed", n);
                  return n;
                })
              }
            >
              속도: {SPEEDS[speedIdx]?.label}
            </button>
            <button className="wbtn" onClick={toggleMode}>
              {mode === "chat" ? "🖼 한 장씩 크게" : "💬 모아보기"} (G)
            </button>
            <button className="wbtn" onClick={() => setShowQr((v) => (savePref("pw_qr", !v), !v))}>
              QR {showQr ? "숨기기" : "보이기"} (Q)
            </button>
          </>
        )}
        <button className="wbtn" onClick={toggleFullscreen}>
          ⛶ 전체 화면 (F)
        </button>
        {!admin && (
          <button className="wbtn" onClick={() => setLoginOpen(true)}>
            진행자 로그인
          </button>
        )}
      </div>

      {loginOpen && (
        <div className="wall-login" onClick={() => setLoginOpen(false)}>
          <form onSubmit={login} onClick={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 20 }}>진행자 로그인</strong>
            <span style={{ color: "#aaa", fontSize: 14 }}>로그인하면 사진 고정·다음/이전 조작을 할 수 있습니다.</span>
            <input
              className="input"
              type="password"
              inputMode="text"
              autoFocus
              placeholder="관리자 PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            {loginError && <span style={{ color: "#ff8a80" }}>{loginError}</span>}
            <button className="wbtn on" type="submit">
              로그인
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/** 액자 모서리 장식: 사진마다 잎 모양·색·각도를 바꿔 단조롭지 않게 */
function FrameLeaves({ index }: { index: number }) {
  const kinds: LeafKind[] = ["maple", "ginkgo", "oak"];
  const a = kinds[index % 3];
  const b = kinds[(index + 1) % 3];
  return (
    <>
      <Leaf
        kind={a}
        color={LEAF_COLORS[index % LEAF_COLORS.length]}
        size={64}
        rotate={-30 + (index % 4) * 12}
        className="deco tl"
      />
      <Leaf
        kind={b}
        color={LEAF_COLORS[(index + 3) % LEAF_COLORS.length]}
        size={48}
        rotate={140 + (index % 3) * 15}
        className="deco br"
      />
    </>
  );
}
