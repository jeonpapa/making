"use client";

import { useCallback, useEffect, useState } from "react";
import { Leaf, LEAF_COLORS, type LeafKind } from "@/app/components/Leaves";
import { runUploads, type UploadItem } from "@/lib/client/upload";
import { LIMITS } from "@/lib/types";

type EventInfo = { title: string; uploadEnabled: boolean };
type Load = { kind: "loading" } | { kind: "missing" } | { kind: "error" } | { kind: "ok"; event: EventInfo };

const NAME_KEY = "pw_name";

const STATE_LABEL: Record<UploadItem["state"], string> = {
  waiting: "대기",
  converting: "변환 중",
  uploading: "보내는 중",
  done: "완료",
  failed: "실패",
};

const KINDS: LeafKind[] = ["maple", "ginkgo", "oak"];

export default function UploadClient({ code }: { code: string }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

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
    setItems((prev) => [
      ...prev.filter((it) => it.state !== "done"),
      ...files.map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file, state: "waiting" as const })),
    ]);
  }

  async function start(onlyFailed = false) {
    const queue = items.filter((it) => (onlyFailed ? it.state === "failed" : it.state === "waiting"));
    if (!queue.length) return;
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {}
    setBusy(true);
    setFinished(false);
    queue.forEach((it) => patch(it.key, { state: "waiting", error: undefined }));
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
  const waiting = items.filter((i) => i.state === "waiting").length;

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
          <label className="picker" htmlFor="file">
            <Leaf kind="maple" color="#d35400" size={40} rotate={-12} />
            <strong>가족 사진 고르기</strong>
            <span className="muted">여러 장 선택 가능 · 큰 사진도 자동으로 줄여서 보냅니다</span>
            <input id="file" type="file" accept="image/*,.heic,.heif" multiple onChange={onPick} disabled={busy} />
          </label>

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

          <button className="btn big primary" onClick={() => start()} disabled={busy || waiting === 0}>
            {busy ? `보내는 중… (${done}/${total})` : waiting ? `사진 ${waiting}장 보내기` : "사진을 먼저 골라 주세요"}
          </button>
        </>
      )}

      {total > 0 && (
        <section style={{ marginTop: 18 }}>
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
              {event.uploadEnabled && (
                <button className="btn big" onClick={() => start(true)} disabled={busy}>
                  실패한 {failed}장 다시 보내기
                </button>
              )}
            </div>
          )}

          <div className="thumbs">
            {items.map((it, i) => (
              <figure key={it.key} className="polaroid" title={it.error ?? it.file.name}>
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
                      className={it.state === "converting" ? "spin" : undefined}
                    />
                  )}
                </div>
                <figcaption
                  className={
                    it.state === "done" ? "state-done" : it.state === "failed" ? "state-failed" : "state-busy"
                  }
                >
                  {STATE_LABEL[it.state]}
                  {it.state === "failed" && it.error ? ` · ${it.error}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <p className="consent">
        보낸 사진은 운영자 확인 후 이 행사의 화면에만 표시되며, 외부(SNS 등)에는 별도 동의 없이 공개하지 않습니다.
        다른 사람이 나온 사진은 본인 동의를 받은 사진만 보내 주세요. 사진의 위치 정보는 자동으로 지워집니다.
        삭제를 원하시면 행사 운영자에게 알려 주세요. 사진은 행사 후 정해진 기간이 지나면 삭제됩니다.
      </p>
    </main>
  );
}
