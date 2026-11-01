# 핸드오프: 라이브 밴드 공연 배경 영상 「종이비행기, 서울의 하루」

> 다음 담당 에이전트용 인수인계 문서. 이 문서만 읽고 바로 **영상 생성 단계(Seedance via Dreamina CLI)** 를 이어갈 수 있도록 작성했다.
> 작성 시점: 2026-11-01 · 진행 상태: **키프레임 이미지 28장 확정 완료 → 영상 클립 생성 착수 전**

---

## 0. 한눈에 보기 (TL;DR)

| 항목 | 내용 |
|---|---|
| 목적 | 가족 관객 대상 라이브 밴드 공연의 LED 배경 영상. 스토리 없이 곡의 밝고 희망찬 분위기를 지원 |
| 곡 | 사용자가 제공한 유튜브 링크 `https://www.youtube.com/watch?v=URRimPZBHf8` (가사 기준 추정: 이한철 「슈퍼스타」 — **미확인**, 링크는 이 세션에서 열지 못함) |
| 제작 방식 | 키프레임 이미지(완료) → 8초 단위 영상 클립(첫/끝 프레임 지정) → 섹션별 큐 재생 |
| 키프레임 | **28장 확정**, Google Drive 폴더에 `K00~K26` 이름으로 정리됨 (§4) |
| 영상 도구 | **Dreamina CLI + Seedance 2.x** (사용자 PC에 설치·로그인 완료). 사용자가 "A안(Dreamina)"으로 결정 |
| 다음 할 일 | ① 사용자 PC 폴더 Remote Control 연결 → ② CLI 동작/권한 확인 → ③ 시험 클립 C01 1개 → ④ **사용자 승인 후** 나머지 일괄 생성 → ⑤ QA → ⑥ Drive 업로드 |
| 절대 규칙 | 크레딧 소모 작업은 시험 1개 이후 반드시 사용자 승인. 워터마크는 제거하지 않기로 결정됨 |

---

## 1. 사용자 & 커뮤니케이션

- 사용자는 한국어로 소통. 답변은 한국어, **생성 프롬프트는 영어**로 작성(모델 준수율이 높음).
- 사용자는 "전문 영상 디렉터 관점"의 기획·판단을 기대함. 결과물을 보여주면 장면별로 **확정 / 편집 지시 / 재생성** 판정을 내려주는 방식으로 진행해 왔음.
- 사용자 계정의 개인 선호(프로필)는 제약·마케팅 실무용 포맷이지만, 이 프로젝트는 영상 제작이므로 그 포맷은 적용하지 않았음.
- 가사 전문을 문서/프롬프트에 복제하지 말 것(저작권). 섹션 지칭 시 짧은 요약만 사용.

---

## 2. 확정된 연출 원칙 (변경 금지 — 사용자 합의 완료)

### 2.1 공연·무대 조건
1. **관객: 가족(아이 포함)** — 실제 조건으로 사용자 확인.
2. **화면 하단 1/5(20%)는 자막기 영역** — 실제 조건. 모든 이미지/영상에서 하단 20%는 어둡고 비어 있어야 함. 하단에는 별도 **마스크 PNG**(§7)를 재생 툴 최상단 레이어로 덮음.
3. **간주(악기 솔로) 구간이 실제로 있음** — 사용자 확인. 위치(몇 분 몇 초)는 미확인.
4. **곡 길이 = 원곡 길이**. 정확한 길이/BPM은 미확인(§10 미결 사항).
5. 운영 방식: **섹션별 큐 트리거(Resolume/QLab)** — 오퍼레이터가 섹션 전환 시 다음 열을 누르고, 각 열은 "연결 클립 → 루프 클립" 구조. 라이브 템포 변동·떼창 반복에 대응하기 위함.

### 2.2 비주얼 규칙
- **주인공 = 흰 종이비행기 하나** (인물 얼굴 클로즈업 금지, AI 일관성 문제 + 관객 시선이 밴드에서 이탈).
- **비행/이동 방향은 항상 화면 왼쪽 → 오른쪽** (스크린 디렉션 일관성). 구름 기차도 오른쪽을 향함.
- 인물은 뒷모습·실루엣·손/다리만.
- **AI로 글자 생성 금지** (깨짐). 떼창 자막 등은 편집/자막기에서 처리.
- 카메라는 느리게(dolly / tilt / crane / drone 수준). 빠른 컷 전환 금지.
- 하얀 화면 장시간 금지(밴드가 실루엣으로만 보임). 플래시 화이트는 1초 이내.
- 가족 공연이므로 **술 대신 레모네이드 건배**, 교차선 오각성(펜타그램) 금지 → **윤곽선 별**만 사용.
- 도시 장면은 **서울**임을 명시(아파트 단지, 빌라, 한옥 지붕, 화강암 산, 남산타워 실루엣). 모델이 기본적으로 유럽 도시를 그리는 경향이 있었음.

### 2.3 화풍 (Style Lock)
- **기준 이미지: `K08_balloon_sky.jpg`** (몽환적 파스텔 반실사 일러스트). 모든 생성에 화풍 참조로 사용.
- 스타일 문구 [S]:
  ```
  soft dreamy painterly realism, pastel cinematic storybook illustration, warm hazy glow, floating light orbs, gentle lens flare, slightly soft focus, not photorealistic, 16:9
  ```
- 네거티브(이미지 단계에서 사용):
  ```
  text, letters, watermark, logo, signature, close-up human face, detailed facial features, realistic photo, horror, dark gloomy mood, clutter in the bottom of the frame, deformed hands, extra fingers, blurry, low resolution
  ```
- 예외: 간주의 구름 기차(K16/K16b)는 동화풍 그대로 허용(앞뒤 디졸브로 분리되는 판타지 구간).

### 2.4 색·시간 흐름 (곡 진행 = 하루의 흐름)
새벽(인트로) → 아침(1절) → 맑은 낮(1차 후렴) → 노을(2절) → 밤·은하수(2차 후렴) → 비 오는 밤(브리지) → 밤 축제(후렴 반복) → **우주에서 본 일출**(마지막 후렴) → 금빛 컨페티·황금별(아웃트로/엔딩).
모티프 체인: **땀방울 → 빛 입자 → 별 → 불꽃 → 황금별 왕관(슈퍼스타)**.

---

## 3. 곡 구조 ↔ 큐 매핑

| 큐 | 섹션 | 가사 내용 요약(복제 금지) | 사용 키프레임 |
|---|---|---|---|
| 1 | 인트로 | (전주) | K01, K02 |
| 2 | 1절 앞 | 계획 없이 서울에 온 너, 어리둥절함 | K02→K03 |
| 3 | 1절 뒤 | 운동만 해온 스포츠맨, 두려움과 설렘 | K03, K04, K05, K06 |
| 4 | 1차 후렴 | 괜찮아 잘 될 거야 / 눈부신 미래 / 우린 널 믿어 | K06, K07, K08, K09 |
| 5 | "오, 오" 연결 | — | K10 |
| 6 | 간주 | (악기 솔로) | K16, K16b |
| 7 | 2절 | 나만의 살아갈 이유, 후회 없이 = 슈퍼스타 | K10, K11, K12, K13 |
| 8 | 2차 후렴 | 후렴 반복 | K13, K14, K15 |
| 9 | 브리지 | 힘들었던 일, 땀과 눈물을 한잔에 | K17, K18, K19 |
| 10 | 후렴 반복(클라이맥스) | 후렴 첫 줄 여러 번 반복 | K19, K20, K21 |
| 11 | 마지막 후렴 | 눈부신 미래 | K22, K23, K24 |
| 12 | 아웃트로 | "나나나" 떼창 | K24, K25 |
| 13 | 엔딩 | 너만의 인생의 슈퍼스타 | K25, K26 |

> 간주 큐(6)는 원곡에서 간주가 등장하는 실제 위치에 배치. 1차 후렴 뒤로 가정했으나 미확인.

---

## 4. Google Drive (키프레임 저장소)

### 4.1 폴더
- **폴더 URL**: https://drive.google.com/drive/folders/1m0X8V2-KvoG2e3FMrSeX7twTOoNpb2KH
- **폴더 ID**: `1m0X8V2-KvoG2e3FMrSeX7twTOoNpb2KH`
- 소유자: 사용자 본인 계정 (Google Drive 커넥터로 접근 가능)
- 이미지 생성 도구: Google Flow / Gemini(Nano Banana). 모든 이미지 우하단에 ✦ 워터마크 있음 → **제거하지 않기로 사용자 결정**(하단 20% 마스크 영역 안에 위치).
- 해상도: 확정본 전부 **2752×1536** (16:9).

### 4.2 확정 키프레임 28장 (파일명 → File ID)

| ID | 파일명 | Drive File ID | 내용 |
|---|---|---|---|
| K00 | `K00_plane_reference.jpg` | `1jGKUWfXtoRIfs42vslVS84hkbX0xJyyl` | 종이비행기 형태 레퍼런스(크림 배경) |
| K01 | `K01_attic_dawn.jpg` | `1ideMWjqoESD5mzUfvvmAc5OkTR205xgK` | 새벽 다락방, 닫힌 아치창, 창틀 위 비행기, 창밖 한옥+아파트 |
| K02 | `K02_window_open.jpg` | `1U6CSSeUVBmLY5bAIlUv4of3Tp1-sPu91` | 같은 다락방, 창 열림, 비행기가 오른쪽 위로 이륙 + 금빛 궤적 |
| K03 | `K03_skyscrapers.jpg` | `1Svzt6fuK3FX12JoFQgCmstzxAJgDPv6O` | 로우앵글 유리 빌딩 숲 사이 비행기 |
| K04 | `K04_stadium_aerial.jpg` | `1fd56bOwbKNIPYtWqmul0i1vFxWzvgqwT` | 서울 동네 속 경기장 항공뷰, 북한산, 비행기(방향 왼쪽 아래 — 허용) |
| K05 | `K05_start_line.jpg` | `1tN6Qk9UJLws7jizgO1oVbdQ4i0anrYWk` | 트랙 출발선, 그을린 선수 다리(뒤), 운동화 옆 비행기 |
| K06 | `K06_sweat_sparkles.jpg` | `1aFMqXJ6Oxr2AnxzNG6J2rBuHXUx7Y4Vo` | 역광 땀방울 → 금빛 입자, 흐린 경기장 조명 |
| K07 | `K07_hanriver_balloons.jpg` | `1sPHu99F0b-lwOPKWhLcf1Cr4lPL8ne1c` | 한강·다리·무지개, 열기구 5개 상승, 하단 풀숲 |
| K08 | `K08_balloon_sky.jpg` | `145VmAyzMN8Xpgyr-YgMlGXHU1lxUbezF` | **화풍 기준.** 열기구 가득한 하늘 + 비행기, 아래 서울·한강 |
| K09 | `K09_between_balloons.jpg` | `1oJubUb7ok3kBUwgi1zcIGbgzePp5Rhz5` | K08과 같은 하늘, 큰 열기구 2개 사이로 접근 |
| K10 | `K10_bokeh.jpg` | `1zeoBTj9Zy35WHKtViRyJFlUEvj-_wl3V` | 파스텔 보케(만능/비상용 루프) |
| K11 | `K11_dancing_window.jpg` | `1FoeD8R2CAER6GR-4Ptv7tLxN9lf6_lZ5` | 노을 빌라 정면, 창 속 춤추는 아이 실루엣 |
| K12 | `K12_dream_windows.jpg` | `1xLt154nrr07LPAWGdY-K6PaOMF0KC6w1` | 골목 빌라 창마다 꿈 실루엣(축구·그림·요리·바이올린·독서) |
| K13 | `K13_first_star.jpg` | `1y8tsvXwwsOvJERZE-HOTQhzjo2rfUzKR` | 해질녘 지붕, 첫 별, 비행기 오른쪽 위로, 남산타워 |
| K14 | `K14_milky_way.jpg` | `1kcJCVCCYSydKCJO-_aw6H_lopN8nN84v` | 보랏빛 은하수, 언덕, 도시 불빛 |
| K15 | `K15_star_constellation.jpg` | `1-a73aAYM9rb8L2UNzCRjzvZivt8M6Kno` | K14와 같은 구도 + 윤곽선 별자리(교차선 없음) |
| K16 | `K16_cloud_train_left.jpg` | `1DV7L6tbObuaGQkzmQIfar4OdMj2TMXtd` | 구름 기차(토끼·곰·코끼리 악단) 화면 왼쪽, 오른쪽을 향함 |
| K16b | `K16b_cloud_train_right.jpg` | `1bkaiQA5fik3Wb9dgBi3L1C_RGv0Tkqks` | 같은 기차 화면 오른쪽 |
| K17 | `K17_rainy_window.jpg` | `1Yd361mi9unhrjpuEc9Q6n3LkzTzbkZNd` | 비 오는 밤 창문, 서울 아파트·남산타워 보케 |
| K18 | `K18_rain_to_bubbles.jpg` | `1nrzhs1gtnjWywt6MLixc241r_ePsR_aK` | 빗방울(왼쪽 파랑) → 금빛 탄산 거품(오른쪽) |
| K19 | `K19_lemonade_toast.jpg` | `1f42eW6lBMac9wIO_rc5f1ofI5DADNYkQ` | 어른 손 + 아이 손 레모네이드 건배, 스플래시 |
| K20 | `K20_hanriver_fireworks.jpg` | `1CVJ96eFN3PG6CgamGmbZ7vBdNA2lOZnW` | 한강 불꽃놀이 + 빛나는 열기구 |
| K21 | `K21_city_light_trails.jpg` | `1hskY77HVQm7TgMwoWlmk7DIx3P3TLcEH` | 서울 야경 하이앵글, 하늘로 휘감기는 빛줄기 |
| K22 | `K22_space_pre_sunrise.jpg` | `1GsVj_eqlBJ1gyIxvJSZmn29-1LErUKH4` | 우주에서 본 지구 지평선, 해가 막 고개, 한반도 야경 |
| K23 | `K23_space_sunrise_rays.jpg` | `1HeUaz0IrgznbSQxGSTg8v9j74psRVgMX` | 같은 구도, 해가 떠오르며 금빛 광선이 하늘 전체로 |
| K24 | `K24_gold_confetti.jpg` | `14BC49ImaPhj_pMx9Y2sId5YJUJBh-gDP` | 파스텔 구름 하늘에 금빛 컨페티 |
| K25 | `K25_star_dust.jpg` | `1ipY4tj5KZWH4CZTyeKsAdjll5R6k5nvI` | 같은 하늘, 컨페티 걷히고 별가루 소용돌이 |
| K26 | `K26_golden_star_crown.jpg` | `1uBGO1fEQUcJUhyonsVj3NR_qAqurGftW` | 같은 하늘, 별가루가 왕관 얹은 황금별로 응집 |

### 4.3 보관용 파일 (사용하지 않음, `zz_` 접두사)

| 파일명 | File ID | 사유 |
|---|---|---|
| `zz_alt_K06.jpg` | `1mZ0wwqngTGrDJaf1X1y4PSHGYtRbP4by` | K06 예비(하단이 밝아 탈락) |
| `zz_alt_K16b.jpg` | `1W_aS3FhS791KMtedTYkg_bbF2THt02T8` | K16b 예비(별똥별 궤적 추가 버전) |
| `zz_lowres_K08.jpg` | `1ggziSiUxhEslR1snzpeM-CRz-HOfnl8n` | 1376px 저해상도 |
| `zz_lowres_K18.jpg` | `1N-COmx8qLSXaUH13lBlg50boWKCOWesc` | 1376px 저해상도 |
| `zz_old_K02.jpg` | `1temL6vJ8jMv2GNdZxquel3OUYd9jYWgK` | 비행기가 왼쪽을 향함(방향 규칙 위반) |
| `zz_old_K15.jpg` | `1y_Q5rlvbBhRDROrSsv6OHWe1HMcqGRiY` | 교차선 펜타그램 + K14와 구도 불일치 |
| `zz_old_K16.jpg` | `1NKpmugwGOgpZ0SxHbflZWVFvhaSBLB8U` | 기차가 왼쪽으로 달림 |
| `zz_duplicate_K25.jpg` | `1eta0MUxzCCxVgYpkAYDCdktEzu1i1Bx2` | K25와 동일 파일 중복 |

### 4.4 Drive 접근 방법 (Google Drive MCP)
- 목록: `search_files` with `query: "parentId = '1m0X8V2-KvoG2e3FMrSeX7twTOoNpb2KH'"`, `excludeContentSnippets: true` (페이지 토큰으로 반복).
- 다운로드: `download_file_content(fileId)` → 이미지가 커서 결과가 **JSON 파일로 저장됨**(`{content: base64, id, mimeType, title}`). 아래처럼 디코드:
  ```bash
  python3 -I -c "import json,base64,sys; d=json.load(open(sys.argv[1])); open(sys.argv[2],'wb').write(base64.b64decode(d['content']))" <saved_json_path> K01.jpg
  ```
- 이름 변경: `update_file(fileId, title=...)`.
- 영상 결과물은 같은 폴더 아래 **`clips/` 하위 폴더**를 만들어 올리는 것을 권장(사용자 미확정 — 업로드 전에 확인).

---

## 5. 영상 제작 사양 (Seedance / Dreamina)

### 5.1 공통 설정
- 비율 16:9, 해상도 1080p(가능하면), **길이 8초**(8초 옵션이 없으면 가장 가까운 더 긴 길이로 생성 후 8초로 트림).
- 모델: Seedance 2.x (Dreamina 기본 2.5 가능). 생성 방식: **첫·끝 프레임(First/Last frame)** 또는 **첫 프레임만(I2V)**.
- 모든 비행기 등장 클립에 K00을 참조로 넣을 수 있으면 넣는다(모양 일관성).

### 5.2 클립 유형
| 유형 | 기호 | 방법 |
|---|---|---|
| 연결(첫·끝 프레임) | FL | 같은 장소/연속 동작. A→B |
| 연결(첫 프레임만) | FO | 장소·카메라 높이가 크게 바뀌어 FL 시 모핑 위험이 큰 경우. 생성 후 다음 클립과 **1초 디졸브** |
| 루프 | L | A→A. 프롬프트에 *"subtle ambient motion, static or near-static camera, the final frame returns exactly to the opening composition"*. 경계에 0.5초 크로스페이드 안전장치 |
| 왕복 루프 | LP | A→B + B→A 두 클립(16초 루프). 카메라 전후 이동만 있고 피사체가 거꾸로 가는 일이 없을 때만 사용 |

### 5.3 프롬프트 공통 꼬리말 (모든 영상 프롬프트 끝에 붙임)
```
Smooth slow cinematic camera, gentle motion, keep the soft dreamy pastel painterly style of the input images, keep the bottom fifth of the frame dark and calm, the paper plane always travels from left to right, no text, no new characters, no faces, no flicker, no sudden cuts.
```

### 5.4 체이닝 규칙
- 같은 섹션 안에서는 **생성된 영상의 실제 마지막 프레임**을 추출해 다음 클립의 첫 프레임으로 사용 → 이음매가 튀지 않음:
  ```bash
  ffmpeg -sseof -0.1 -i C01.mp4 -frames:v 1 -q:v 2 C01_last.png
  ```
- 체이닝을 계속하면 화질·색이 누적 열화되므로 **섹션이 바뀔 때는 원본 키프레임에서 다시 시작**.
- 루프 클립의 끝 프레임은 반드시 원본 키프레임(동일 이미지)을 사용.

---

## 6. 클립 리스트 (총 32개 × 8초) — 영상 프롬프트 초안

> 초기 기획은 31개였으나, 아웃트로에서 K24→K25 전환 클립(C21)을 추가해 32개. C02~C04는 장소 변화가 커서 FO로 변경(이전 대화 결정 반영). 간주는 왕복 루프 대신 "진입 클립 + 제자리 루프"로 변경(기차가 뒤로 달리는 문제 방지).

| 큐 | 클립 | 유형 | 첫 → 끝 | 영상 프롬프트(영문, §5.3 꼬리말 추가) |
|---|---|---|---|---|
| 1 | **L01** | L | K01→K01 | Quiet dawn attic. Golden dust particles drift slowly through the beam of light, string lights twinkle softly, the paper plane rests still on the windowsill, faint clouds drift outside the window. Camera static. |
| 1 | **C01** | FL | K01→K02 | 0–3s: dawn light brightens, a breeze stirs. 3–5s: both window panes swing open outward, warm sunrise light floods in. 5–8s: the paper plane lifts off the sill and glides out to the upper right, leaving a swirling golden sparkle trail. Very slow push-in toward the window. |
| 2 | **C02** | FO | K02→(자유) | The paper plane flies out over Seoul's hanok roofs toward the distant apartment towers, rising and dipping slightly as if curious, golden trail following. Camera glides forward through the open window following the plane. → 끝에서 K03과 1초 디졸브 |
| 3 | **C03** | FO | K03→(자유) | Low-angle view between glass skyscrapers. The paper plane wobbles curiously, then steadies and climbs to the upper right between the towers, sunlight flaring off the glass, birds crossing. Slow upward tilt. → K04와 디졸브 |
| 3 | **C04** | FO | K04→(자유) | High aerial view. The paper plane glides down in a gentle curve toward the stadium, morning shadows long, trees sway softly. Slow drone descent toward the red track. → K05와 디졸브 |
| 3 | **C05** | FL | K05→K06 | 0–3s: the athlete's legs tense at the start line, chalk dust lifts. 3–5s: the athlete pushes off in slow motion out of frame to the right. 5–8s: sweat droplets hang in the backlight and turn into golden sparkles; camera pushes into the droplets. |
| 4 | **C06** | FL | K06→K07 | Golden sparkles drift upward and the focus slowly pulls from the sparkles to reveal the sunny Han River, the bridge and a rainbow; the first hot air balloons begin to rise. |
| 4 | **C07** | FL | K07→K08 | Crane shot rising from the riverbank up into the sky as dozens of hot air balloons rise around the camera; the paper plane joins them flying to the right; the city and river fall away below. |
| 4 | **L02a** | LP | K08→K09 | Slow forward drift between the floating balloons toward the sun, the paper plane gliding ahead, sparkles and birds drifting. |
| 4 | **L02b** | LP | K09→K08 | Slow backward drift away from the two large balloons back to the wide balloon-filled sky, everything else continues floating gently. |
| 5 | **C08** | FL | K08→K10 | The sun flare grows and the whole sky softly melts out of focus into warm pastel bokeh. |
| 5 | **L03** | L | K10→K10 | Pastel bokeh circles float, breathe and slowly cross each other; tiny golden sparkles twinkle. (만능·비상용) |
| 6 | **C09** | FL | K16→K16b | The fluffy cloud train glides from the left side of the sunset sky to the right side; the rabbit, bear and elephant play their guitar, drum and trumpet with happy bouncing; golden musical-note sparkles trail behind. |
| 6 | **L04** | L | K16b→K16b | The cloud train stays in place while its wheels puff and the musicians bounce to the music; note sparkles stream out behind; background clouds drift slowly. |
| 7 | **C10** | FL | K10→K11 | The bokeh lights slowly resolve into the warm glowing windows of a golden-hour villa building; a child silhouette dances in one window. |
| 7 | **C11** | FL | K11→K12 | Slow lateral truck to the right along the alley, passing glowing windows where silhouettes pursue their dreams: soccer juggling, painting, cooking, violin, reading. |
| 7 | **C12** | FL | K12→K13 | Camera tilts up from the windows to the dusk sky above the rooftops; the first bright star appears and the paper plane glides up toward it from the left. |
| 8 | **C13** | FL | K13→K14 | Dusk deepens into night as the camera tilts further up; the Milky Way slowly appears across the sky, stars blooming one by one. |
| 8 | **C14** | FL | K14→K15 | Bright stars light up one after another and thin golden lines draw between them, tracing the outline of one big five-pointed star. |
| 8 | **L05** | L | K15→K15 | The star constellation glows and gently pulses, stars twinkle, an occasional slow shooting star. Camera static. |
| 9 | **C15** | FL | K17→K18 | Raindrops slide down the night window; camera slowly pushes into the glass as the drops on the right turn warm and gold and start fizzing like soda bubbles. |
| 9 | **C16** | FL | K18→K19 | Golden bubbles rise and the scene resolves into two lemonade glasses, an adult hand and a child's hand, clinking in slow motion with a glowing splash. |
| 10 | **C17** | FL | K19→K20 | The glowing splash droplets fly upward and burst into fireworks over the Han River at night; glowing balloons float among them. |
| 10 | **L06** | L | K20→K20 | Fireworks keep blooming and fading in a gentle rhythm, reflections shimmer on the river, balloons sway. Camera static. |
| 10 | **C18** | FL | K20→K21 | Camera rises high above the city; firework trails stream down and turn into ribbons of colorful light flowing along the roads and bridges. |
| 10 | **L07** | L | K21→K21 | Light ribbons continuously flow along the streets and curl up into the sky, sparkles rising. Camera static. |
| 11 | **C19** | FL | K22→K23 | From space, the sun rises over Earth's horizon and enormous golden god rays sweep across the whole sky, darkness turning to gold. Very slow push-in. |
| 11 | **C20** | FL | K23→K24 | The golden light gently shatters into falling gold confetti and crystal sparkles against a soft pastel sky. |
| 12 | **L08** | L | K24→K24 | Gold and pastel confetti fall softly and continuously, sparkles shimmer, clouds drift. Camera static. |
| 12 | **C21** | FL | K24→K25 | The confetti gradually clears and the remaining sparkles gather into a slow swirl of golden star dust in the upper center. |
| 12 | **L09** | L | K25→K25 | Golden star dust slowly swirls and shimmers in place. Camera static. |
| 13 | **C22** | FL | K25→K26 | The star dust spirals inward and forms one radiant golden star with a small crown; at the very end it flashes with a bright starburst flare. (재생 후 편집에서 블랙 페이드) |

**검증 규칙**: 한 섹션의 C 클립 총 길이는 그 섹션 길이보다 최소 4초 짧아야 함(루프로 넘어갈 여유). 섹션 타임코드 확보 후 클립 수 조정.

**예상 생성량**: 32클립 × (1 + 재생성 약 0.3~0.8) ≈ **40~60회**.

---

## 7. 하단 마스크 PNG (아직 미제작)

재생 툴 최상단에 고정. 하단 20% 완전 검정, 실루엣 윗선은 아래에서 20~30% 높이, 위는 투명, 경계 2~3px 페더. 해상도는 LED 해상도에 맞춤(미확인 시 1920×1080).

| 파일 | 형태 | 사용 큐 |
|---|---|---|
| M1_grass.png | 부드러운 잔디 능선 + 둥근 나무 몇 그루 | 1~6 (낮) |
| M2_roofline.png | 서울 지붕선 + 언덕 위 타워 | 7~10 (노을·밤) |
| M3_family.png | 지붕선 위 손잡고 환호하는 가족(아빠·엄마·아이 둘) | 11~13 |

생성 프롬프트(흰 배경 검은 실루엣 → 흰색을 투명 처리):
```
M1: Flat solid black silhouette of gentle rolling grassy hills with a few small rounded trees along the bottom of the frame, silhouette top edge between 20% and 26% of the image height, pure white empty background above, clean vector style, no texture, 16:9
M2: Flat solid black silhouette of a Seoul city roofline with low-rise houses, apartment blocks and a tall tower on a hill, along the bottom of the frame, silhouette top edge between 20% and 28% of the image height, pure white empty background above, clean vector style, no texture, 16:9
M3: Flat solid black silhouette of a city roofline with a family standing on top holding hands and raising arms in celebration, a father, a mother and two small children, along the bottom of the frame, silhouette top edge between 20% and 30% of the image height, pure white empty background above, clean vector style, no texture, 16:9
```

---

## 8. 실행 절차 (다음 에이전트 작업 순서)

### 8.1 환경 전제 (중요)
- 이전 세션은 **클라우드 컨테이너**였고, 네트워크 정책상 `dreamina.capcut.com`, `www.youtube.com` 접근이 **차단**됨. Google Drive MCP는 정상 동작.
- Dreamina CLI는 **사용자 PC에 설치·로그인 완료** 상태(사용자 진술). 따라서 영상 생성은 **사용자 PC에서 실행**해야 함:
  - 방법 1: 사용자가 Claude 데스크톱 앱 → Settings → Claude Code → **Remote Control**에 작업 폴더 추가, 또는 해당 폴더에서 `claude remote-control` 실행 → 클라우드 세션에서 그 폴더를 연결 요청.
  - 방법 2: 사용자 PC의 Claude Code에서 이 문서를 열고 직접 진행.
- 이전 세션 종료 시점에 연결된 PC 폴더는 **없었음**.

### 8.2 사용자 사전 작업 (요청 완료, 수행 여부 미확인)
1. PC에 작업 폴더(예: `superstar_video/`) 생성, Drive의 `K00~K26`을 `keyframes/`로 다운로드(`zz_` 제외).
2. **Dreamina 웹에서 Seedance 영상 1개를 먼저 생성하고 승인 확인 수락** — 공식 안내상 이 절차 전에는 CLI로 영상 생성 불가(이미지는 무관).

### 8.3 에이전트 작업
1. `dreamina --help`(실행 파일명은 설치 메시지로 확인)로 하위 명령·옵션 확인. 공식 페이지 예시상 영상 옵션은 `--prompt --duration --ratio --video_resolution --poll` 형태였으나 **실제 문법은 반드시 help로 검증**. 첫/끝 프레임 이미지 입력 옵션명도 확인.
2. 로그인 상태 확인. Claude Code 안에서 로그인이 막히는 사례가 보고됨 → 웹 로그인 세션 재사용 안내.
3. **시험 클립 C01(K01→K02) 1개 생성** → 결과 프레임 3장(0s/4s/8s) 추출해 사용자에게 보여주고 피드백.
4. 프롬프트/설정 확정 후 **사용자에게 크레딧 사용 승인 받기**(예상 40~60회).
5. 큐 순서대로 생성. 파일명 `C01.mp4`, `L01.mp4`, `L02a.mp4` …, 재생성은 `C05_v2.mp4`.
6. 섹션 내부는 §5.4 체이닝 적용.
7. QA(§9) 통과분만 확정. 확정본을 Drive `clips/`에 업로드(업로드 전 사용자 확인).

### 8.4 산출물 폴더 구조(권장)
```
superstar_video/
  keyframes/      K00~K26 (Drive에서 다운로드)
  masks/          M1~M3 PNG
  clips/          C01.mp4 … C22.mp4, L01.mp4 … L09.mp4
  frames/         체이닝용 마지막 프레임, QA 썸네일
  cue_sheet.md    큐/파일/전환 방식 표
```

---

## 9. QA 체크리스트 (클립별)
- [ ] 첫/끝 프레임이 지정 키프레임과 일치(FL·L). 루프는 0s 프레임과 8s 프레임 차이가 육안상 없음.
- [ ] 비행기 모양이 K00과 동일, 진행 방향 왼→오.
- [ ] 하단 20%에 움직이는 주요 요소 없음, 어둡게 유지.
- [ ] 얼굴·글자 생성 없음, 손가락 기형 없음(K19).
- [ ] 화풍이 K08 기준에서 벗어나지 않음(갑자기 실사화 금지).
- [ ] 깜빡임(flicker), 모핑 붕괴, 급격한 카메라 이동 없음.
- [ ] 밝기: K23~K26 계열은 LED에서 눈부심 → 재생 시 마스터 70~80% 권장.

---

## 10. 미결 사항 (사용자에게 확인 필요)
1. **원곡 길이, BPM, 섹션별 시작 시각(mm:ss)** — 큐별 클립 수 검증에 필요. (이전 세션은 유튜브 접근 불가로 미확인.)
2. **LED 해상도·비율** — 마스크 PNG 및 최종 렌더 해상도.
3. **간주의 실제 위치**.
4. 영상 결과물 Drive 업로드 위치(`clips/` 하위 폴더 생성 여부).
5. 재생 소프트웨어(Resolume / QLab / 기타)와 오퍼레이터 유무.

---

## 11. 의사결정 로그 (왜 이렇게 됐는지)
| 결정 | 이유 |
|---|---|
| 스토리 없는 "빛의 흐름 + 하루의 시간대" 구조 | 사용자 요청(스토리 불필요) + 곡 정서(새 출발 → 희망) |
| 제미나이 초안 그대로 사용 안 함 | 초안이 인용한 가사 대부분이 실제 가사와 불일치(환각). 동물 악단 박자 싱크·다중 별자리·사계절 전환 등 AI 영상으로 구현 곤란 요소 다수. 단, 가족 관객·3D/동화 화풍·하단 실루엣·낮/밤 후렴 대비·황금별 엔딩은 채택 |
| 종이비행기 주인공 | 인물보다 AI 일관성 유지가 쉽고 "계획 없이 서울에 온 너"를 은유 |
| 섹션별 큐 + 루프 | 라이브 템포·떼창 반복 변동 대응 |
| 하단 마스크를 AI가 아닌 PNG 오버레이로 | 클립마다 실루엣이 달라지는 흔들림 방지 |
| 화풍 기준 K08로 통일 | 초안에서 반실사/실사/2D 애니가 혼재 → 다수결 + 가족 공연 적합성 |
| 레모네이드 건배 | 가족 관객 |
| 윤곽선 별(교차선 금지) | 교차선 오각성이 오컬트 상징처럼 보일 우려 |
| 워터마크 유지 | 사용자 결정(하단 마스크 영역 내 위치) |
| `google-flow-browser-mcp`(TMSSS05) 사용 안 함 | Google 자동화 탐지 우회 설계(계정 정지 위험), Chrome 프로필 쿠키 /tmp 복사, 참조 이미지 미구현(인자명 불일치), 영상은 Generate 미클릭, 프랑스어 UI 셀렉터 → 한국어 UI 비호환 |
| 영상 도구 Dreamina(Seedance) | 사용자 선택(A안). 공식 CLI, 첫/끝 프레임 지원 |

---

## 12. 참고 링크
- Drive 키프레임 폴더: https://drive.google.com/drive/folders/1m0X8V2-KvoG2e3FMrSeX7twTOoNpb2KH
- 곡(사용자 제공): https://www.youtube.com/watch?v=URRimPZBHf8
- Dreamina CLI 안내(공식, 다국어): https://dreamina.capcut.com/ja-jp/tools/dreamina-cli
- Dreamina CLI 설치: macOS/Linux `curl -fsSL https://dreamina.capcut.com/canvas-cli/install.sh | bash` · Windows PowerShell `irm https://dreamina.capcut.com/canvas-cli/install.ps1 | iex`
- 클라우드 환경 네트워크 설정: https://code.claude.com/docs/en/cloud-environments#network-access
