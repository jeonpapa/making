-- 대형 화면·운영자 화면 폴링 최적화
-- 사진·행사에 변경이 생길 때마다 서버가 changed_at을 갱신한다.
-- 화면은 이 값만 비교해서, 바뀌었을 때만 사진 목록 전체를 받는다.
alter table public.events
  add column if not exists changed_at timestamptz not null default now();
