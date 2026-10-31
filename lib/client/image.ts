import { LIMITS } from "@/lib/types";

export interface PreparedImage {
  main: Blob;
  thumb: Blob;
}

export class ImageError extends Error {}

export function isHeic(file: File) {
  return /hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/**
 * 휴대폰 사진(5MB~50MB, HEIC 포함)을 대형 화면용 JPEG로 줄인다.
 * - 긴 변 1600px, 품질 0.8 → 보통 300~600KB
 * - canvas로 다시 그리므로 EXIF(GPS 위치 등)는 자동 제거되고 회전은 바로잡힌다.
 * 메모리 사용이 크므로 반드시 한 번에 한 장씩 호출한다.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size > LIMITS.rawFileBytes) {
    throw new ImageError(`사진이 너무 큽니다 (최대 ${LIMITS.rawFileBytes / 1024 / 1024}MB)`);
  }
  const source = await decode(file);
  try {
    const main = await render(source, LIMITS.mainMaxEdge, 0.8);
    const thumb = await render(source, LIMITS.thumbMaxEdge, 0.7);
    if (main.size > LIMITS.storedFileBytes) throw new ImageError("변환 후에도 파일이 너무 큽니다");
    return { main, thumb };
  } finally {
    if ("close" in source) source.close();
  }
}

type Source = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<Source> {
  // 1) 브라우저 기본 디코더 (JPEG/PNG/WebP, Safari는 HEIC도 가능)
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    /* 다음 방법 시도 */
  }
  // 2) <img> 디코더 (일부 Safari 버전은 이쪽만 HEIC를 읽는다)
  try {
    return await loadImg(file);
  } catch {
    /* 다음 방법 시도 */
  }
  // 3) HEIC → JPEG 변환 (WASM, 필요할 때만 불러온다)
  if (isHeic(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      const jpeg = Array.isArray(out) ? out[0] : out;
      return await createImageBitmap(jpeg, { imageOrientation: "from-image" });
    } catch {
      throw new ImageError("HEIC 사진을 변환하지 못했습니다");
    }
  }
  throw new ImageError("지원하지 않는 사진 형식입니다");
}

function loadImg(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function render(src: Source, maxEdge: number, quality: number): Promise<Blob> {
  const w = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h = "naturalHeight" in src ? src.naturalHeight : src.height;
  if (!w || !h) throw new ImageError("사진을 읽지 못했습니다");
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("사진을 처리하지 못했습니다");
  ctx.fillStyle = "#fff"; // 투명 PNG → 흰 배경
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, cw, ch);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // iOS 메모리 회수를 돕기 위해 즉시 비운다
        canvas.width = canvas.height = 0;
        blob ? resolve(blob) : reject(new ImageError("사진을 저장하지 못했습니다"));
      },
      "image/jpeg",
      quality,
    );
  });
}
