-- QR 포토월 초기 스키마
-- 모든 테이블 접근은 서버(Next.js API, service role)를 통해서만 한다.
-- RLS는 켜되 정책을 두지 않아 anon/authenticated 키로는 아무것도 읽거나 쓸 수 없다.

create extension if not exists pgcrypto;

create table if not exists public.events (
  code            text primary key,            -- 추측 어려운 slug (10자)
  title           text not null,
  upload_enabled  boolean not null default true,
  pinned_photo_id uuid,                        -- 대형 화면 고정 사진 (0~1장)
  created_at      timestamptz not null default now()
);

create table if not exists public.photos (
  id             uuid primary key default gen_random_uuid(),
  event_code     text not null references public.events(code) on delete cascade,
  storage_path   text not null,                -- 원본(리사이즈본) 경로
  thumb_path     text not null,                -- 썸네일 경로
  caption        text,
  uploader_name  text,
  status         text not null default 'uploading'
                 check (status in ('uploading', 'pending', 'approved', 'rejected')),
  device_id      text,                         -- 기기당 업로드 제한용 (localStorage UUID)
  ip_hash        text,                         -- IP당 업로드 제한용 (해시만 저장)
  created_at     timestamptz not null default now(),
  approved_at    timestamptz                   -- 대형 화면 피드 정렬 기준
);

alter table public.events
  add constraint events_pinned_photo_fk
  foreign key (pinned_photo_id) references public.photos(id) on delete set null;

create index if not exists photos_event_status_idx on public.photos (event_code, status, approved_at);
create index if not exists photos_rate_device_idx on public.photos (event_code, device_id, created_at);
create index if not exists photos_rate_ip_idx on public.photos (event_code, ip_hash, created_at);

alter table public.events enable row level security;
alter table public.photos enable row level security;

-- 스토리지: 공개 읽기 버킷. 경로가 {행사코드}/{uuid}.jpg 라 추측 불가.
-- 업로드는 서버가 발급한 서명 URL로만 가능 (anon insert 정책 없음).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
