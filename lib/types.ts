export type PhotoStatus = "uploading" | "pending" | "approved" | "rejected";

export interface EventRow {
  code: string;
  title: string;
  upload_enabled: boolean;
  pinned_photo_id: string | null;
  created_at: string;
}

export interface PhotoRow {
  id: string;
  event_code: string;
  storage_path: string;
  thumb_path: string;
  caption: string | null;
  uploader_name: string | null;
  status: PhotoStatus;
  device_id: string | null;
  ip_hash: string | null;
  created_at: string;
  approved_at: string | null;
}

/** 클라이언트에 내려보내는 사진 (경로 대신 URL, 내부 식별값 제외) */
export interface PhotoDTO {
  id: string;
  url: string;
  thumbUrl: string;
  caption: string | null;
  name: string | null;
  status: PhotoStatus;
  createdAt: string;
  approvedAt: string | null;
}

export interface FeedResponse {
  title: string;
  uploadEnabled: boolean;
  pinnedPhotoId: string | null;
  photos: PhotoDTO[];
}

export type UploadTarget =
  | { kind: "supabase"; path: string; token: string }
  | { kind: "put"; url: string };

export interface UploadInitResponse {
  photoId: string;
  main: UploadTarget;
  thumb: UploadTarget;
}

/** 업로드 제한값 */
export const LIMITS = {
  /** 휴대폰에서 고를 수 있는 원본 파일 최대 크기. 브라우저에서 줄인 뒤 전송한다. */
  rawFileBytes: 50 * 1024 * 1024,
  /** 서버(스토리지)에 저장되는 파일 최대 크기 */
  storedFileBytes: 10 * 1024 * 1024,
  mainMaxEdge: 1600,
  thumbMaxEdge: 480,
  /** 기기당 분당 업로드 수 */
  perDevicePerMinute: 60,
  /** IP당 분당 업로드 수. 교회 와이파이는 다수가 같은 IP를 쓰므로 넉넉하게 */
  perIpPerMinute: 300,
  captionMax: 200,
  nameMax: 30,
  titleMax: 60,
} as const;
