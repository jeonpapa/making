"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Leaf, LEAF_COLORS, type LeafKind } from "@/app/components/Leaves";
import { prepareItems, runUploads, type UploadItem } from "@/lib/client/upload";
import { LIMITS } from "@/lib/types";

type EventInfo = { title: string; uploadEnabled: boolean };
type Load = { kind: "loading" } | { kind: "missing" } | { kind: "error" } | { kind: "ok"; event: EventInfo };

const NAME_KEY = "pw_name";

/** 썸네일 위에 띄우는 상태 표시 (ready는 표시 없음) */
const STATE_LABEL: Record<UploadItem["state"], string> = {
  waiting: "준비 중",
  converting: "준비 중",
  ready: "",
  uploading: "보내는 중",
  done: "✓ 완료",
  failed: "실패",
};

const KINDS: LeafKind[] = ["maple", "ginkgo", "oak"];

/** 미리보기 blob URL과 변환본을 놓아 메모리를 돌려준다 */
function release(it: UploadItem) {
  if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
}

export default function UploadClient({ code }: { code: string }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  // 미리보기 변환은 한 번에 한 장씩만 (휴대폰 메모리 보호)
  const prepChain = useRef<Promise<void>>(Promise.resolve());
  const itemsRef = useRef<UploadItem[]>([]);
  itemsRef.current = items;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(code)}`, { cache: "no-store" });
      if (res.status === 404) return setLoad({ kind: "missing" });
      if (!res.ok) return setLoad({ kind: "error" });
      setLoad({ kind: "ok", event: await res.json() });
    } catch {
      setLoad({ kind: "error" });
    }
  }, [code]);

  useEffect(() => {
    refresh();
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  }, [refresh]);

  const patch = useCallback((key: string, p: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...p } : it)));
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    setFinished(false);
    const added: UploadItem[] = files.map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      file,
      state: "waiting",
    }));
    setItems((prev) => {
      // 이미 보낸 사진은 새로 고를 때 목록에서 비운다
      prev.filter((it) => it.state === "done").forEach(release);
      return [...prev.filter((it) => it.state !== "done"), ...added];
    });
    // 고르자마자 미리보기를 만든다 (이미 지운 사진은 건너뜀)
    prepChain.current = prepChain.current.then(() =>
      prepareItems(added, (key, p) => {
        if (!itemsRef.current.some((it) => it.key === key)) {
          if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
          return;
        }
        patch(key, p);
      }),
    );
  }

  function remove(key: string) {
    setItems((prev) => {
      const it = prev.find((x) => x.key === key);
      if (it) release(it);
      return prev.filter((x) => x.key !== key);
    });
  }

  async function start(onlyFailed = false) {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {}
    setBusy(true);
    setFinished(false);
    // 아직 미리보기를 만드는 중이면 끝날 때까지 기다린 뒤 최신 목록으로 보낸다
    await prepChain.current;
    // 방금 끝난 미리보기 결과(setItems)가 화면에 반영될 때까지 한 박자 기다린다
    await new Promise((r) => setTimeout(r, 0));
    const queue = itemsRef.current.filter((it) =>
      onlyFailed
        ? it.state === "failed"
        : it.state === "ready" || it.state === "waiting" || it.state === "converting",
    );
    if (!queue.length) {
      setBusy(false);
      return;
    }
    await runUploads(queue, { code, name, caption }, patch);
    setBusy(false);
    setFinished(true);
    refresh();
  }

  if (load.kind === "loading") return <main className="guest"><p className="muted">불러오는 중…</p></main>;
  if (load.kind === "missing")
    return (
      <main className="guest">
        <h1 className="plain">행사를 찾을 수 없습니다</h1>
        <div className="notice bad">QR 코드를 다시 스캔해 주세요. 주소가 잘렸거나 행사가 끝났을 수 있습니다.</div>
      </main>
    );
  if (load.kind === "error")
    return (
      <main className="guest">
        <h1 className="plain">연결이 불안정합니다</h1>
        <div className="notice warn">와이파이가 느리면 모바일 데이터로 바꿔서 다시 시도해 주세요.</div>
        <p><button className="btn big primary" onClick={refresh}>다시 시도</button></p>
      </main>
    );

  const { event } = load;
  const total = items.length;
  const done = items.filter((i) => i.state === "done").length;
  const failed = items.filter((i) => i.state === "failed").length;
  const sendable = items.filter((i) => i.state === "ready" || i.state === "waiting" || i.state === "converting").length;
  const preparing = items.some((i) => i.state === "waiting" || i.state === "converting");

  return (
    <main className="guest">
      <header className="hero">
        <Leaf kind="maple" color="#f2c14e" size={96} rotate={-20} className="deco" style={{ top: -18, right: -14, opacity: 0.9 }} />
        <Leaf kind="ginkgo" color="#ffe08a" size={54} rotate={25} className="deco" style={{ top: 58, right: 64, opacity: 0.8 }} />
        <Leaf kind="oak" color="#7a2e12" size={70} rotate={150} className="deco" style={{ bottom: -24, right: 20, opacity: 0.55 }} />
        <div className="eyebrow">사진 보내기</div>
        <h1>{event.title}</h1>
        <p>우리 가족의 소중한 순간을 함께 나눠요</p>
      </header>

      <div className="steps"><span>① 사진 선택</span><span>② 한마디(선택)</span><span>③ 보내기</span></div>

      {!event.uploadEnabled ? (
        <div className="notice warn">지금은 사진 받기가 잠시 중단되었습니다. 잠시 후 다시 열어 주세요.</div>
      ) : (
        <>
          {total > 0 && (
            <section className="picked" aria-label="고른 사진">
              <div className="picked-head">
                <strong>고른 사진 {total}장</strong>
                {preparing && <span className="muted">미리보기 만드는 중…</span>}
              </div>
              <div className="thumbs">
                {items.map((it, i) => (
                  <figure key={it.key} className={`polaroid st-${it.state}`} title={it.error ?? it.file.name}>
                    {it.state === "done" && (
                      <Leaf
                        kind={KINDS[i % 3]}
                        color={LEAF_COLORS[i % LEAF_COLORS.length]}
                        size={26}
                        rotate={-30 + (i % 4) * 15}
                        className="corner"
                      />
                    )}
                    <div className="ph">
                      {it.thumbUrl ? (
                        <img src={it.thumbUrl} alt="" />
                      ) : (
                        <Leaf
                          kind={KINDS[i % 3]}
                          color="#d9b98c"
                          size="45%"
                          className={it.state === "failed" ? undefined : "spin"}
                        />
                      )}
                      {STATE_LABEL[it.state] && (
                        <span className={`ph-state ${it.state}`}>
                          {STATE_LABEL[it.state]}
                          {it.state === "failed" && it.error ? <small>{it.error}</small> : null}
                        </span>
                      )}
                    </div>
                    {!busy && it.state !== "done" && it.state !== "uploading" && (
                      <button type="button" className="ph-remove" onClick={() => remove(it.key)} aria-label="이 사진 빼기">
                        ✕
                      </button>
                    )}
                  </figure>
                ))}
                {!busy && (
                  <label className="polaroid add" htmlFor="file">
                    <div className="ph">
                      <span>＋</span>
                      <small>더 고르기</small>
                    </div>
                  </label>
                )}
              </div>
            </section>
          )}

          <label className={`picker${total > 0 ? " hidden" : ""}`} htmlFor="file">
            <Leaf kind="maple" color="#d35400" size={40} rotate={-12} />
            <strong>가족 사진 고르기</strong>
            <span className="muted">여러 장 선택 가능 · 큰 사진도 자동으로 줄여서 보냅니다</span>
          </label>
          <input
            id="file"
            className="file-input"
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            onChange={onPick}
            disabled={busy}
          />

          <div className="field">
            <label htmlFor="caption">이 사진에 대한 한마디 (선택)</label>
            <textarea
              id="caption"
              className="input"
              maxLength={LIMITS.captionMax}
              placeholder="예: 작년 추석, 할머니 댁 마당에서 다 같이 찍은 사진이에요"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="name">이름 (선택)</label>
            <input
              id="name"
              className="input"
              maxLength={LIMITS.nameMax}
              placeholder="예: 둘째네 민준이"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
            <span className="hint">화면에 사진과 함께 표시됩니다</span>
          </div>

          <button className="btn big primary" onClick={() => start()} disabled={busy || sendable === 0}>
            {busy
              ? `보내는 중… (${done}/${total})`
              : sendable
                ? `사진 ${sendable}장 보내기`
                : done > 0
                  ? "더 보내려면 ＋ 더 고르기"
                  : "사진을 먼저 골라 주세요"}
          </button>

          {(busy || finished) && total > 0 && (
            <section style={{ marginTop: 14 }}>
              <div className="progress" aria-label="진행률">
                <div style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                {done}/{total}장 완료{failed ? ` · 실패 ${failed}장` : ""}
              </p>
              {finished && done > 0 && failed === 0 && (
                <div className="notice ok" style={{ marginTop: 12 }}>
                  🍁 {done}장을 보냈습니다. <strong>운영자가 확인한 뒤 화면에 띄웁니다.</strong>
                </div>
              )}
              {finished && failed > 0 && (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div className="notice warn">일부 사진을 보내지 못했습니다. 연결이 느리면 모바일 데이터로 바꿔 보세요.</div>
                  <button className="btn big" onClick={() => start(true)} disabled={busy}>
                    실패한 {failed}장 다시 보내기
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <p className="consent">
        보낸 사진은 운영자 확인 후 이 행사의 화면에만 표시되며, 외부(SNS 등)에는 별도 동의 없이 공개하지 않습니다.
        다른 사람이 나온 사진은 본인 동의를 받은 사진만 보내 주세요. 사진의 위치 정보는 자동으로 지워집니다.
        삭제를 원하시면 행사 운영자에게 알려 주세요. 사진은 행사 후 정해진 기간이 지나면 삭제됩니다.
      </p>
    </main>
  );
}
