# PromptBridge 구현 플랜

## Context
A1111 프롬프트 텍스트와 ComfyUI 워크플로우 JSON을 상호 변환하는 Next.js 웹 서비스. 모든 변환은 클라이언트 사이드에서 수행 (API 불필요). 빈 프로젝트에서 시작.

## 핵심 결정사항
- **ComfyUI JSON 포맷**: UI 포맷 (pos, size, links 포함) 생성 + 파싱
- **FLUX 감지**: 모델명 `flux` 포함(case-insensitive) OR FLUX 전용 파라미터 존재 (Schedule type: Beta, Distilled CFG Scale)
- **FLUX 워크플로우**: 기본 파이프라인(CheckpointLoaderSimple + KSampler) 사용, 비호환 샘플러만 경고/대체
- **서버 로직 없음**: 전부 클라이언트 사이드 변환

---

## 파일 구조

```
src/
├── app/
│   ├── layout.tsx          # Geist 폰트, dark mode only
│   ├── page.tsx            # Hero + Converter 조합
│   └── globals.css         # Tailwind + shadcn CSS variables
│
├── components/
│   ├── ui/                 # shadcn/ui (button, card, textarea, badge, alert 등)
│   ├── layout/
│   │   ├── navbar.tsx
│   │   └── footer.tsx
│   ├── converter/
│   │   ├── converter-panel.tsx     # 메인 2패널 컨테이너
│   │   ├── input-panel.tsx         # 입력 패널
│   │   ├── output-panel.tsx        # 출력 패널
│   │   ├── direction-toggle.tsx    # 변환 방향 토글
│   │   ├── parameter-preview.tsx   # 파싱된 파라미터 카드
│   │   └── action-buttons.tsx      # 복사/다운로드/클리어
│   └── hero/
│       └── hero-section.tsx
│
├── lib/
│   ├── utils.ts                    # cn() 유틸리티
│   ├── types/
│   │   ├── a1111.ts                # A1111Params 인터페이스
│   │   ├── comfyui.ts              # ComfyUIWorkflow, ComfyUINode 등
│   │   └── converter.ts            # ConversionDirection, ConversionResult
│   ├── mappings/
│   │   ├── sampler-map.ts          # 양방향 샘플러 매핑
│   │   └── scheduler-map.ts        # 양방향 스케줄러 매핑
│   ├── parsers/
│   │   ├── a1111-parser.ts         # A1111 텍스트 파싱
│   │   └── comfyui-parser.ts       # ComfyUI JSON 파싱
│   ├── generators/
│   │   ├── comfyui-generator.ts    # A1111Params → ComfyUI JSON 생성
│   │   └── a1111-generator.ts      # A1111Params → A1111 텍스트 생성
│   ├── converters/
│   │   ├── a1111-to-comfyui.ts     # parser + validator + generator 조합
│   │   └── comfyui-to-a1111.ts
│   └── validators/
│       └── flux-validator.ts       # FLUX 감지 + 샘플러 호환성 체크
│
└── hooks/
    ├── use-converter.ts            # 변환 상태 관리 훅
    └── use-clipboard.ts            # 클립보드 복사 훅
```

---

## 구현 순서

### Phase 1: 프로젝트 초기화
- `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir`
- `npm install geist`
- `npx shadcn@latest init` (zinc 테마, dark mode)
- shadcn 컴포넌트 추가: button, card, textarea, badge, toggle-group, separator, alert
- `globals.css` 다크모드 전용 CSS 변수 설정
- `layout.tsx` Geist 폰트 + `<html className="dark">` 설정

### Phase 2: 타입 정의
- `src/lib/types/a1111.ts` — A1111Params (positivePrompt, negativePrompt, steps, cfgScale, sampler, seed, width, height, model, scheduleType, distilledCfgScale, betaScheduleAlpha/Beta, extra)
- `src/lib/types/comfyui.ts` — ComfyUIWorkflow, ComfyUINode, ComfyUILink
- `src/lib/types/converter.ts` — ConversionDirection, ConversionResult

### Phase 3: 매핑 테이블
- `sampler-map.ts` — A1111↔ComfyUI 샘플러 매핑 (Euler→euler, DPM++ 2M Karras→dpmpp_2m+karras 등)
- `scheduler-map.ts` — Normal→normal, Karras→karras, Beta→beta, Simple→simple

### Phase 4: 파서
**`a1111-parser.ts`** 핵심 로직:
1. `\nNegative prompt:` 로 positive/negative 분리 (없으면 negative 비워둠)
2. `Steps:` 패턴으로 메타데이터 라인 분리
3. 알려진 키 목록(Steps, CFG scale, Sampler, Seed, Size, Model, Schedule type, Distilled CFG Scale 등)으로 순차 파싱
4. `Size: WxH` → width/height 분리, 숫자 필드 변환

**`comfyui-parser.ts`** 핵심 로직:
1. JSON.parse + nodes/links 배열 검증
2. KSampler 노드 찾기 → `widgets_values[seed, control, steps, cfg, sampler, scheduler, denoise]`
3. links 배열로 KSampler inputs 추적: slot 0→model(CheckpointLoaderSimple), slot 1→positive(CLIPTextEncode), slot 2→negative(CLIPTextEncode), slot 3→latent(EmptyLatentImage)
4. 각 노드의 widgets_values에서 값 추출

### Phase 5: FLUX 검증기
- `isFluxModel()`: 모델명 /flux/i 매치 OR distilledCfgScale 존재 OR scheduleType === "Beta"
- `validateFluxSampler()`: 비호환 샘플러(ddim, uni_pc, lms, dpmpp_2s_ancestral) 감지 → 경고 + euler 자동 대체

### Phase 6: 제너레이터
**`comfyui-generator.ts`**: A1111Params → ComfyUI UI포맷 JSON
- 고정 노드 ID/위치로 7개 노드 파이프라인 생성
- 9개 링크로 연결
- KSampler widgets_values: `[seed, "randomize", steps, cfg, sampler_name, scheduler, denoise]`

**`a1111-generator.ts`**: A1111Params → A1111 텍스트
- `{positive}\nNegative prompt: {negative}\nSteps: {steps}, CFG scale: {cfg}, ...` 형식

### Phase 7: 변환기 조합
- `a1111-to-comfyui.ts`: parseA1111 → validateFlux → generateComfyUI → ConversionResult
- `comfyui-to-a1111.ts`: parseComfyUI → generateA1111 → ConversionResult

### Phase 8: UI 레이아웃
- `navbar.tsx`: 로고 좌측, 심플한 링크 (GitHub 등)
- `footer.tsx`: 미니멀 푸터
- `hero-section.tsx`: 큰 타이틀 + 서브텍스트 + CTA (스크롤 다운)

### Phase 9: UI 컨버터 컴포넌트
- `use-converter.ts` 훅: direction, input, result 상태 관리 + convert() 함수
- `direction-toggle.tsx`: A1111→ComfyUI / ComfyUI→A1111 토글
- `input-panel.tsx`: textarea (A1111 모드) 또는 textarea+파일업로드 (ComfyUI 모드)
- `output-panel.tsx`: 결과 textarea (read-only) + 문법 하이라이팅
- `parameter-preview.tsx`: 파싱된 파라미터 그리드 카드 + FLUX 경고 배지
- `action-buttons.tsx`: 복사 / 다운로드 / 클리어
- `converter-panel.tsx`: 전체 조합 (데스크탑: 좌우, 모바일: 상하)

### Phase 10: 페이지 조합
- `page.tsx`: Hero + ConverterPanel 조합

---

## 샘플러 매핑 테이블

| A1111 | ComfyUI sampler_name | scheduler |
|-------|---------------------|-----------|
| Euler | euler | normal |
| Euler a | euler_ancestral | normal |
| DPM++ 2M | dpmpp_2m | normal |
| DPM++ 2M Karras | dpmpp_2m | karras |
| DPM++ SDE | dpmpp_sde | normal |
| DPM++ 2M SDE | dpmpp_2m_sde | normal |
| DPM++ 2S a | dpmpp_2s_ancestral | normal |
| DDIM | ddim | normal |
| UniPC | uni_pc | normal |
| Heun | heun | normal |
| LMS | lms | normal |

## 스케줄러 매핑

| A1111 Schedule type | ComfyUI scheduler |
|--------------------|-------------------|
| (없음/Normal) | normal |
| Karras | karras |
| Beta | beta |
| Simple | simple |

---

## 검증 방법
1. `npm run dev`로 로컬 실행
2. A1111 샘플 텍스트 입력 → ComfyUI JSON 출력 확인
3. ComfyUI JSON 샘플 입력 → A1111 텍스트 출력 확인
4. 라운드트립 테스트: A1111→ComfyUI→A1111 핵심 파라미터 보존 확인
5. FLUX 모델명 입력 시 경고 표시 + 비호환 샘플러 자동 대체 확인
6. 모바일 뷰포트에서 레이아웃 확인
7. 복사/다운로드 버튼 동작 확인
