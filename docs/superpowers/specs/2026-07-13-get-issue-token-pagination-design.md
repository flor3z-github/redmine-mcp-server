# get_issue 토큰 절감 · 코멘트 페이지네이션 설계

- **날짜:** 2026-07-13
- **대상:** `redmine_get_issue` MCP 도구
- **브랜치:** `develop` (릴리즈 시 `main`으로 머지)
- **범위:** 팀 내부 전용 fork — 파괴적 변경 허용

## 1. 배경 / 문제

`redmine_get_issue`가 이슈 하나당 과도한 토큰을 소비한다. 실측:

- 회의록형 이슈(#34861) 1회 조회 = 약 6,600자 → **~5,000 토큰**
- `list_issues` 5건(~900 토큰)의 5배 이상

원인 (코드 확인):

1. **코멘트 강제 포함.** `src/tools/issues.ts`의 `getIssue` 핸들러가 `journals`를 include에 강제 주입한다. 호출자가 원치 않아도 코멘트 전량이 반환된다.
   ```ts
   // 현재 코드
   if (!include) include = ['journals'];
   else if (!include.includes('journals')) include = [...include, 'journals'];
   ```
2. **truncate 부재.** `formatIssue`가 description 전체 + 모든 journal note를 상한 없이 렌더링한다.
3. **입력 검증 부재.** `getIssue`는 zod 검증 없이 raw cast만 한다.

이 팀은 회의록·장애분석을 코멘트에 통째로 붙이는 사용 패턴이 있어, 코멘트 하나가 수천 자에 이르는 경우가 잦다.

### 왜 도구 레이어에서 해결하는가

토큰 비용은 도구가 결과를 **반환하는 순간** 컨텍스트에 적재되며 발생한다. 스킬은 모델 추론 내에서 "어떤 도구를 무슨 인자로 부를지"를 결정할 뿐, 이미 반환된 페이로드를 사후 축소하지 못한다. 게다가 현재 구조는 journals를 강제하므로 스킬 단독으로는 코멘트 반환을 막을 수 없다. 따라서 페이로드 제어는 도구/서버 레이어에 있어야 한다. (스킬은 파라미터가 열린 뒤 그 위에 얹는 "호출 규율" 레이어로서 보완적이다 — 본 설계 범위 밖.)

Redmine 코어 API는 issue 내 journals를 페이지네이션하지 않는다. `GET /issues/:id.json?include=journals`는 전체 journal을 한 번에 반환한다. 따라서 "끊어 읽기"는 서버가 전체를 fetch한 뒤 **모델에 넘길 때 슬라이스**하는 방식으로 구현한다. 서버↔Redmine 네트워크는 전량 그대로지만(내부망이라 무시 가능), 절감 대상인 **모델 컨텍스트 토큰**은 제어된다.

## 2. 목표 / 비목표

**목표:**
- get_issue 기본 호출을 경량화(코멘트 기본 미포함)
- 코멘트를 offset/limit으로 끊어 읽기(페이지네이션)
- 본문·개별 코멘트 길이 상한(옵션)
- 필요 시 전문 회수 가능한 탈출구 제공
- 입력 검증 추가

**비목표:**
- 하위호환 유지 (팀 내부 전용, 파괴적 변경 허용)
- 별도 스킬 작성 (후속 과제)
- 다른 도구(`list_issues` 등) 변경
- Redmine 서버측 페이지네이션 (코어 API 미지원)

## 2.5 기대 이득 (ROI)

절감폭은 호출 패턴에 따라 다르다. 이슈는 대략 2종류다.

**본문형** (#34861: 본문 큼, 코멘트 적음) — 현재 ~5,000 토큰:

| 새 호출 | 토큰 | 절감 |
|---|---|---|
| 기본(본문 전체 + 코멘트 OFF) | ~4,000 | 20% |
| 스캔(`description_max_chars=500` + 코멘트 OFF) | ~400 | 92% |

→ 본문형은 코멘트 OFF만으로는 이득이 작다(범인이 본문). 트리아지 시 `description_max_chars`를 써야 크게 남는다.

**토론형** (본문 작음, 코멘트 30개) — 현재 ~9,700 토큰:

| 새 호출 | 토큰 | 절감 |
|---|---|---|
| 기본(코멘트 OFF) | ~750 | 92% |
| 본문 + 최신 10개(cap 500) | ~3,500 | 64% |
| 전체 드릴다운 | ~9,700 | 0% (명시적 선택) |

→ 토론형은 기본값만으로 ~90% 절감.

**세션 단위** (디버깅 중 이슈 10개 탐색):

- 현재: 10 × 평균 ~4,000 = **~40,000 토큰**
- 신설계: 트리아지 스캔 10개(×~400) + 정독 1~2개 ≈ **~12,000 토큰**
- **탐색 비용 ~70% 절감**

**핵심 가치:** 최악의 경우가 "무한 → 상한"으로 바뀐다. 코멘트 30개 이슈가 조용히 1만 토큰을 먹는 사고 원천을 차단한다.

**한계 (정직한 명시):**
1. `get_issue`만 개선 — `list`/`search`는 이미 truncate되어 무관.
2. 고정비 소폭 증가(파라미터 2→7개, 스키마 수백 토큰). `defer_loading` 환경에선 무시 가능하며 응답 절감이 압도.
3. 본문형은 자동 절감 안 됨 — 호출자(모델/스킬)가 `description_max_chars`를 실제로 써야 큰 이득.

## 3. API 설계

### 시그니처

```
redmine_get_issue(
  id: number,                               // 필수
  include_journals?: boolean = false,       // 코멘트 반환 여부 (기존 강제ON → 기본OFF)
  journals_limit?: number = 10,             // 코멘트 페이지 크기 (1~100)
  journals_offset?: number = 0,             // 코멘트 시작점 (≥0, 끊어 읽기)
  journals_order?: 'asc' | 'desc' = 'desc', // 정렬 (desc=최신부터, offset=0이 최신)
  description_max_chars?: number,           // 본문 상한. 미지정/0 = 무제한
  journal_notes_max_chars?: number = 500,   // 각 코멘트 note 상한. 0 = 무제한(탈출구)
  include?: string[]                        // journals 외 부가데이터
)                                           // watchers/relations/children/attachments/changesets
```

### 동작

- 서버는 Redmine에 **항상 journals 포함**(+요청된 다른 include)으로 fetch → 코멘트 총개수 확보.
- **본문:** `description_max_chars` 지정 시 truncate, 아니면 전체.
- **코멘트:**
  - `include_journals=false`(기본): 코멘트 본문 미포함. 메타만 표시.
    - 예: `Comments: 47 total (not shown — pass include_journals=true)`
  - `include_journals=true`: note 있는 항목만 필터 → `journals_order` 정렬 → `[offset, offset+limit)` 슬라이스 → 각 note를 `journal_notes_max_chars`로 컷.
    - 메타: `Comments: 47 total (showing 0–9, newest first)`
    - 컷 마커: `…(+4200 chars 잘림, journals_offset=3 journals_limit=1 journal_notes_max_chars=0 로 전문)`

### `include` 처리 (브릿지 방식)

`include` 배열은 journals 외 부가데이터(watchers 등)용. journals는 전용 파라미터가 관장하되, 하위 호출 놀람 방지를 위해 브릿지:

- 우선순위: **명시적 `include_journals` > `include` 배열의 `'journals'` 추론 > 기본 `false`**
- 즉 `include=['journals']`만 넘기면 `include_journals=true`로 해석. 단 `include_journals=false`를 명시하면 그것이 우선(코멘트 미표시).
- Redmine 요청용 include에는 journals를 항상 강제 주입하고 사용자 배열의 중복 journals는 제거(dedup).

### 동작 예시

| 호출 | 결과 |
|---|---|
| `get_issue(34861)` | 본문 전체 + `Comments: 1 total (not shown…)`. 코멘트 ~0토큰 |
| `get_issue(34861, include_journals=true)` | 본문 + 최신 10개(각 500자 컷) |
| `get_issue(34861, include_journals=true, journals_offset=10)` | 본문 + 11~20번째 |
| `get_issue(34861, description_max_chars=500, include_journals=true, journals_limit=3)` | 본문 500자 + 최신 3개. 초경량 |
| `get_issue(34861, include_journals=true, journals_offset=3, journals_limit=1, journal_notes_max_chars=0)` | 3번 코멘트 전문(드릴다운) |
| `get_issue(34861, include=['journals'])` | 브릿지 → 최신 10개 |

## 4. 데이터 흐름

```
MCP 호출
  ▼
[1] 검증  validateInput(getIssueSchema, input)   ← 신규(현재 무검증)
  │   범위: limit 1~100, offset ≥0, *_max_chars ≥0, order enum
  ▼
[2] include 조립  buildInclude(userInclude)
  │   Redmine엔 ['journals', ...나머지], 사용자 journals 중복 제거
  │   include 배열의 journals 존재 → includeJournals 추론(브릿지)
  ▼
[3] client.getIssue(id, include)  ──HTTP──▶ Redmine ◀── journals 전량
  ▼
[4] formatIssue(issue, opts)
  │   본문: descriptionMaxChars 컷
  │   formatJournals(journals, opts):
  │     a. note 있는 항목만 필터
  │     b. total = 필터된 개수  ← "코멘트 N개"의 N
  │     c. order=desc → 복사 후 역순
  │     d. includeJournals=false → 본문 생략, 메타만
  │        =true → [offset, offset+limit) 슬라이스, note컷+마커
  ▼
[5] text 반환
```

**서브결정:**
1. `total`은 **note 달린 코멘트만** 카운트(상태변경-only 항목 제외) — 사용자 멘탈모델과 일치.
2. 슬라이싱은 `formatIssue`/`formatJournals`가 opts 받아 처리 — 이미 journal 렌더링 담당.

## 5. 구현 분해

### `src/utils/validators.ts` — 신규 스키마

```ts
export const getIssueSchema = z.object({
  id: positiveIntegerSchema,
  include_journals: z.boolean().optional().default(false),
  journals_limit: z.number().int().min(1).max(100).optional().default(10),
  journals_offset: z.number().int().min(0).optional().default(0),
  journals_order: z.enum(['asc', 'desc']).optional().default('desc'),
  description_max_chars: z.number().int().min(0).optional(),
  journal_notes_max_chars: z.number().int().min(0).optional().default(500),
  include: z.array(z.string()).optional(),
});
```

### `src/utils/formatters.ts` — `formatIssue` 확장 + `formatJournals` 신규(export)

```ts
export interface FormatIssueOptions {
  descriptionMaxChars?: number;    // 미지정/0 = 무제한
  includeJournals?: boolean;       // 기본 true (기존 호출부 안전)
  journalsLimit?: number;
  journalsOffset?: number;
  journalsOrder?: 'asc' | 'desc';
  journalNotesMaxChars?: number;   // 미지정/0 = 무제한
}

export function formatIssue(issue: RedmineIssue, opts?: FormatIssueOptions): string;
export function formatJournals(journals: Journal[] | undefined, opts?: FormatIssueOptions): string;
```

- 기본 `opts = {}` → `includeJournals` 기본 true, 상한 없음 → **기존 4개 호출부(list/get/create/update) 무변경**. (list/create/update가 넘기는 issue엔 journals가 없어 무해.)
- `formatJournals`는 순수함수 → 단위테스트 용이.
- 마커·메타 문자열 생성은 `formatJournals` 내부.

### `src/tools/issues.ts` — 도구 스키마 + 핸들러 + 헬퍼

```ts
// getIssueTool.inputSchema (JSON, MCP용): 파라미터 7개 + description 문서화
//   (기존 관례: 손으로 쓴 JSON inputSchema와 zod 스키마 이중 유지)

function buildInclude(userInclude?: string[]): { include: string[]; journalsRequested: boolean }
// journals 강제 주입 + dedup, 사용자 배열의 journals 존재 여부 반환(브릿지용)

export async function getIssue(input: unknown) {
  const p = validateInput(getIssueSchema, input);
  const { include, journalsRequested } = buildInclude(p.include);
  // 브릿지 우선순위: 입력에 include_journals 명시 → 그 값 / 아니면 journalsRequested / 아니면 false
  const includeJournals = /* 명시 여부 판별 */;
  const res = await redmineClient.getIssue(p.id, include);
  const text = formatIssue(res.issue, {
    descriptionMaxChars: p.description_max_chars,
    includeJournals,
    journalsLimit: p.journals_limit,
    journalsOffset: p.journals_offset,
    journalsOrder: p.journals_order,
    journalNotesMaxChars: p.journal_notes_max_chars,
  });
  return { content: [{ type: 'text', text }] };
}
```

**브릿지 구현 주의:** zod의 `.default(false)`가 걸리면 "명시 안 함"과 "false 명시"를 구별 못 한다. 원본 input에서 `include_journals` 키 존재 여부를 검증 전에 확인하거나, 스키마에서 default를 빼고 핸들러에서 3단 우선순위를 계산한다. (구현 계획에서 확정.)

### 변경 없음

- `src/client/index.ts` — `getIssue(id, include[])` 그대로.
- `src/client/types.ts` — `Journal`(notes/user/created_on) 기존 타입 사용.

## 6. 엣지케이스

| 상황 | 동작 |
|---|---|
| `*_max_chars = 0` / 미지정 | 무제한(전체) |
| `journals_offset ≥ total` | 코멘트 0개 + `Comments: 47 total (offset 50 exceeds range)` |
| journals 없음 | `Comments: none` |
| note 없는 항목(상태변경-only) | count·표시 제외 |
| `include_journals=false` + limit/offset 지정 | 무시(코멘트 미표시) |
| `order=desc` | 배열 복사 후 역순(원본 불변) |
| note 컷 경계 | 한글 BMP → `substring` 안전, 기존 `truncateText` 재사용 |

**Redmine 에러(404/403 등):** client throw → 기존 retry/`formatErrorResponse` 경로. 변경 없음.

## 7. 테스트 계획

- `test/unit/tools.test.ts` (get_issue):
  - 기본 호출 → 코멘트 본문 미포함, 총개수 메타 존재
  - `include_journals=true` → limit 개수만 반환
  - `journals_offset` → 올바른 구간 반환
  - `journals_order=asc/desc` → 정렬 방향 확인
  - `description_max_chars` → 본문 컷 확인
  - `journal_notes_max_chars` → note 컷 + 마커
  - `include=['journals']` 브릿지 → 코멘트 반환
  - `include_journals=false` 명시 + `include=['journals']` → 코멘트 미반환(우선순위)
  - 검증 실패(limit 범위 초과 등) → 에러 응답
- `test/unit/formatters.test.ts`(신규 또는 기존): `formatJournals` 순수함수 단위테스트
  - note-only 필터, count, order, slice, note컷, offset 초과, journals 없음
- 커버리지 80% 임계 유지.

## 8. 마이그레이션 / 롤아웃

- `develop`에서 작업 → 검증 → PR로 `main` 머지(릴리즈).
- 파괴적 변경(코멘트 기본 OFF, `include` 배열 journals 의미 변경) → CHANGELOG/README에 명시.
- 버전: minor bump (기능 추가 + 동작 변경). 예 `1.x.0`.
