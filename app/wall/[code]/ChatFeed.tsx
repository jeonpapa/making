"use client";

import { Leaf, LEAF_COLORS, type LeafKind } from "@/app/components/Leaves";
import type { PhotoDTO } from "@/lib/types";

/** 한 말풍선에 넣는 최대 사진 수. 더 많으면 같은 사람의 다음 말풍선으로 이어진다. */
const MAX_PER_BUBBLE = 9;
/** 이 시간 이상 벌어지면 시간 구분선을 넣는다 */
const DIVIDER_GAP_MS = 20 * 60_000;

interface Group {
  key: string;
  sender: string;
  name: string | null;
  caption: string | null;
  at: string;
  photos: PhotoDTO[];
  /** 같은 사람이 이어서 보낸 말풍선 (이름·아바타 생략) */
  continued: boolean;
  side: "left" | "right";
  divider: string | null;
}

const timeFmt = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" });

/**
 * 승인 순서대로 사진을 '메시지'로 묶는다.
 * 같은 사람이 같은 캡션으로 연달아 보낸 사진 = 한 말풍선. 보낸 사람이 바뀔 때마다 좌우가 바뀐다.
 */
export function groupPhotos(photos: PhotoDTO[]): Group[] {
  const groups: Group[] = [];
  let side: Group["side"] = "left";
  let lastAt = 0;
  for (const p of photos) {
    const prev = groups[groups.length - 1];
    const sameMsg =
      prev && prev.sender === p.sender && prev.caption === p.caption && prev.name === p.name;
    if (sameMsg && prev.photos.length < MAX_PER_BUBBLE) {
      prev.photos.push(p);
      continue;
    }
    if (prev && prev.sender !== p.sender) side = side === "left" ? "right" : "left";
    const at = p.approvedAt ?? p.createdAt;
    const t = Date.parse(at);
    const divider = !prev || t - lastAt >= DIVIDER_GAP_MS ? timeFmt.format(t) : null;
    lastAt = t;
    groups.push({
      key: p.id,
      sender: p.sender,
      name: p.name,
      caption: p.caption,
      at,
      photos: [p],
      continued: !!sameMsg,
      side,
      divider,
    });
  }
  return groups;
}

/** 채팅 앱의 사진 묶음처럼 줄을 나눈다: 1 / 2 / 3 / 2+2 / 3+…+(3|2|2+2) */
function rowsFor(n: number): number[] {
  if (n <= 3) return [n];
  if (n === 4) return [2, 2];
  const rows: number[] = [];
  const r = n % 3;
  const threes = r === 1 ? (n - 4) / 3 : Math.floor(n / 3);
  for (let i = 0; i < threes; i++) rows.push(3);
  if (r === 1) rows.push(2, 2);
  if (r === 2) rows.push(2);
  return rows;
}

function hashNum(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const AVATAR_BG = ["#b8461e", "#d4a017", "#7a2e12", "#a0401c", "#c0392b", "#8a6d1f"];
const KINDS: LeafKind[] = ["maple", "ginkgo", "oak"];

export default function ChatFeed({
  photos,
  fresh,
  register,
  onOpen,
  pinnedId,
}: {
  photos: PhotoDTO[];
  fresh: Set<string>;
  register: (id: string, el: HTMLElement | null) => void;
  onOpen: (id: string) => void;
  pinnedId: string | null;
}) {
  const groups = groupPhotos(photos);

  return (
    <div className="chat">
      {groups.map((g, gi) => {
        const h = hashNum(g.sender);
        const isFresh = g.photos.some((p) => fresh.has(p.id));
        const rows = rowsFor(g.photos.length);
        let idx = 0;
        return (
          <div key={g.key} className="chat-block">
            {g.divider && (
              <div className="chat-divider">
                <Leaf kind="maple" color="#d4a017" size={18} rotate={-20} />
                <span>{g.divider}</span>
              </div>
            )}
            <div className={`chat-msg ${g.side}${g.continued ? " continued" : ""}`}>
              <div className="chat-avatar" style={{ background: AVATAR_BG[h % AVATAR_BG.length] }} aria-hidden="true">
                {g.continued ? null : g.name ? (
                  <span>{[...g.name][0]}</span>
                ) : (
                  <Leaf kind={KINDS[h % 3]} color="#fff3df" size={30} rotate={-15} />
                )}
              </div>
              <div className="chat-body">
                {!g.continued && <div className="chat-name">{g.name ?? "우리 가족"}</div>}
                <div className="chat-row">
                  <div className={`chat-bubble${isFresh ? " fresh" : ""}`}>
                    {gi % 3 === 0 && (
                      <Leaf
                        kind={KINDS[(h >> 3) % 3]}
                        color={LEAF_COLORS[h % LEAF_COLORS.length]}
                        size={44}
                        rotate={g.side === "left" ? -35 : 35}
                        className="chat-deco"
                      />
                    )}
                    <div className={`chat-photos n${Math.min(g.photos.length, 3)}`}>
                      {rows.map((cols, ri) => (
                        <div key={ri} className={`chat-prow c${cols}`}>
                          {g.photos.slice(idx, (idx += cols)).map((p, pi) => (
                            <button
                              key={p.id}
                              type="button"
                              className={`chat-tile${p.id === pinnedId ? " pinned" : ""}`}
                              style={{ animationDelay: `${(ri * 3 + pi) * 70}ms` }}
                              ref={(el) => register(p.id, el)}
                              onClick={() => onOpen(p.id)}
                              aria-label={p.caption ?? "사진 크게 보기"}
                            >
                              <img
                                src={g.photos.length === 1 ? p.url : p.thumbUrl}
                                alt=""
                                loading="lazy"
                                decoding="async"
                              />
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                    {g.caption && <p className="chat-caption">{g.caption}</p>}
                  </div>
                  <time className="chat-time">
                    {isFresh && <em className="chat-new">🍁 방금 도착</em>}
                    {g.photos.length > 1 && <span>{g.photos.length}장</span>}
                    {timeFmt.format(Date.parse(g.at))}
                  </time>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
