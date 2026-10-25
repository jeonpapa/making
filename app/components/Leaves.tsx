/** 가을 장식: 단풍잎·은행잎 SVG와 떨어지는 낙엽 레이어 */

export type LeafKind = "maple" | "ginkgo" | "oak";

const PATHS: Record<LeafKind, string> = {
  maple:
    "M50 4 57 22 66 16 63 38 78 26 83 33 96 30 89 45 96 50 74 64 78 73 54 68 53 96H47L46 68 22 73 26 64 4 50 11 45 4 30 17 33 22 26 37 38 34 16 43 22Z",
  ginkgo: "M48 97V62C22 58 4 36 13 10 28 20 40 18 50 27 60 18 72 20 87 10 96 36 78 58 52 62V97Z",
  oak: "M50 4C64 14 60 22 70 26 82 30 70 40 78 48 88 56 72 62 70 72 66 82 56 80 52 90V98H48V90C44 80 34 82 30 72 28 62 12 56 22 48 30 40 18 30 30 26 40 22 36 14 50 4Z",
};

export const LEAF_COLORS = ["#c0392b", "#d35400", "#e67e22", "#d4a017", "#a0401c", "#b5651d"];

export function Leaf({
  kind = "maple",
  color = "#d35400",
  size = 32,
  rotate = 0,
  className,
  style,
}: {
  kind?: LeafKind;
  color?: string;
  size?: number | string;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[kind]} fill={color} />
      {kind !== "ginkgo" && <path d="M50 92V30" stroke="rgba(0,0,0,.18)" strokeWidth="2.5" fill="none" />}
    </svg>
  );
}

/** 결정적 의사난수: 서버·클라이언트 렌더 결과가 같도록 */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const KINDS: LeafKind[] = ["maple", "ginkgo", "oak", "maple"];

/** 화면 위에서 천천히 떨어지는 낙엽 (transform 애니메이션만 사용, 움직임 줄이기 설정 시 정지) */
export function FallingLeaves({ count = 14 }: { count?: number }) {
  return (
    <div className="leaves-layer" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const r = (k: number) => rand(i * 7 + k);
        const duration = 14 + r(1) * 14;
        return (
          <span
            key={i}
            className="leaf-fall"
            style={{
              left: `${r(2) * 100}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${-r(3) * duration}s`,
              opacity: 0.55 + r(4) * 0.35,
            }}
          >
            <span className="leaf-sway" style={{ animationDuration: `${3 + r(5) * 3}s` }}>
              <Leaf
                kind={KINDS[i % KINDS.length]}
                color={LEAF_COLORS[Math.floor(r(6) * LEAF_COLORS.length)]}
                size={26 + r(7) * 30}
                rotate={r(8) * 360}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}
