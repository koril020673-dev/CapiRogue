# CapiRogue 개선 계획 (plan.md)

> **마지막 업데이트**: 2026-04-07  
> **현재 커밋**: `b7e51a8` → `koril020673-dev/CapiRogue.git`  
> **상태**: 스텁 함수 구현 진행 중

---

## ✅ 완료된 항목

- [x] HTML/CSS/JS 파일 분리 (`index.html`, `style.css`, `script.js`, `config.js`)
- [x] UI_SPEC.md 기준 HTML 전체 재구성 (클래스명·ID 전수 교정)
- [x] CSS 보완 (`.hidden`, `hqEvolve` 애니메이션, 파이차트 팔레트, profit-badge, swan-bg)
- [x] CONSTANTS 객체 통일 (매직 넘버 제거)
- [x] DOM 쿼리 캐싱 (`_dom()` 헬퍼)
- [x] 이벤트 위임 적용
- [x] API 호출 Debounce 적용
- [x] 스텁 구현: `updateHQVisual()`, `updateTimeline()`, `renderPieChart()`, `renderStatusBoard()`

---

## 🔴 P0: 게임 루프가 동작하려면 필수 (즉시 구현)

### 1. `rollMonthlyEvent(s)` — script.js line 1900
- 현재: `return null;` (빈 스텁)
- 역할: 매 턴 랜덤 이벤트 발생 (경기침체, 블랙스완, 호재 등)
- 구현 필요:
  - `gameState.difficulty`에 따른 이벤트 확률 조정
  - 반환값: `{ type, title, desc, effect }` 이벤트 객체 또는 `null`
  - 블랙스완 발생 시 `body.swan-bg-dump/fund/storm` 클래스 토글

### 2. `tickActiveEffects(s)` — script.js line 1901
- 현재: 빈 함수 `{}`
- 역할: 매 턴마다 `gameState.activeEffects` 배열의 `turns` 카운트다운
- 구현 필요:
  - 각 효과 `turns -= 1`, `turns <= 0`이면 배열에서 제거
  - 이후 `renderStatusBoard()` 호출

### 3. `getActiveEffectModifier(type)` — script.js line 1902
- 현재: `return 0;` (항상 0)
- 역할: 활성화된 효과 중 `type`에 해당하는 수치 합산 반환
- 구현 필요:
  ```javascript
  return gameState.activeEffects
    .filter(e => e.type === type)
    .reduce((sum, e) => sum + e.value, 0);
  ```

### 4. `step5PostUI()` — script.js line 1995
- 현재: 빈 함수 `{}`
- 역할: 다음 턴 버튼 활성화, 결재 버튼 상태 갱신 등 Step 5 UI 마무리
- 구현 필요:
  - `#next-btn` 활성화
  - 완료된 연구/결재 결과 알림 처리

---

## 🟠 P1: 결재(Doc) 시스템 구현

### 5. `generateDocCards()` — script.js line 1992
- 현재: 빈 함수 `{}`
- 역할: 이번 턴 처리 가능한 결재 카드 목록 생성
- 구현 필요:
  - `gameState.pendingDocs = [...]` 배열에 카드 저장
  - 각 카드: `{ id, title, cost, effect, type }` 형태
  - 조건 기반 카드 생성 (자금 부족 시 대출 카드, 인력 부족 시 채용 카드 등)

### 6. `renderDocCards(enabled=true)` — script.js line 1993
- 현재: 빈 함수 `{}`
- 역할: `pendingDocs` 배열을 `doc-section` DOM에 렌더링
- 구현 필요:
  - `#doc-list` 내부에 카드 HTML 생성
  - `enabled=false`일 때 모든 카드 비활성화
  - 카드 클릭 → 결재 처리 후 `gameState.approvedDocs`에 추가

### 7. `updateDocSection()` — script.js line 1994
- 현재: 빈 함수 `{}`
- 역할: `generateDocCards()` + `renderDocCards()` 합성 호출

---

## 🟡 P2: UX 연출

### 8. `showNewsBreaking(event)` — script.js line 1996
- 현재: 빈 함수 `{}`
- 역할: 블랙스완/주요 이벤트 발생 시 뉴스 속보 오버레이 연출
- 구현 필요:
  - 화면 중앙에 오버레이 표시 (`modal-overlay` + `modal-box` 재사용 가능)
  - `event.type`에 따라 `swan-bg-dump/fund/storm` 배경 적용
  - 2~3초 후 자동 닫힘 또는 클릭으로 닫기

---

## 🔵 P3: 보안 보완

### 9. API 키 노출 문제 (config.js)
- 현재: `config.js`에 분리되었지만 여전히 프론트엔드에 노출됨
- 위험: 소스에서 누구나 키 추출 가능
- 해결 옵션 (택 1):
  - **최소 조치**: Google Cloud Console에서 HTTP Referrer 제한 설정
  - **권장**: 간단한 백엔드 프록시 구축 (Node.js Express 5줄)
  - **배포용**: Cloudflare Worker 또는 Vercel Edge Function

---

## 🟢 P4: 추후 기능 추가

1. **게임 저장/로드 기능** — 현재 게임 스냅샷 `localStorage` 저장 + 이어하기 버튼
2. **튜토리얼 & 온보딩** — 첫 게임 시 각 UI 영역 툴팁, `localStorage`로 "첫 방문" 체크
3. **모바일 반응형** — 현재 640px 이상 대상, 태블릿 세로 모드 레이아웃 추가
4. **접근성 보완** — `aria-label`, `role` 누락 버튼 정비, Tab 네비게이션 순서

---

## 📊 현재 스텁 함수 구현 상태

| 함수 | 상태 | 우선순위 |
|------|------|----------|
| `rollMonthlyEvent(s)` | 🔴 스텁 (`return null`) | P0 |
| `tickActiveEffects(s)` | 🔴 스텁 (빈 함수) | P0 |
| `getActiveEffectModifier(type)` | 🔴 스텁 (`return 0`) | P0 |
| `step5PostUI()` | 🔴 스텁 (빈 함수) | P0 |
| `generateDocCards()` | 🟠 스텁 (빈 함수) | P1 |
| `renderDocCards(enabled)` | 🟠 스텁 (빈 함수) | P1 |
| `updateDocSection()` | 🟠 스텁 (빈 함수) | P1 |
| `showNewsBreaking(event)` | 🟡 스텁 (빈 함수) | P2 |
| `updateHQVisual()` | ✅ 구현 완료 | — |
| `updateTimeline()` | ✅ 구현 완료 | — |
| `renderPieChart()` | ✅ 구현 완료 | — |
| `renderStatusBoard()` | ✅ 구현 완료 | — |

---

## 🛠️ 다음 작업 순서 (권장)

1. `getActiveEffectModifier(type)` — 가장 단순, 한 줄
2. `tickActiveEffects(s)` — 배열 순회 로직
3. `rollMonthlyEvent(s)` — 이벤트 테이블 정의 필요 (config.js에 추가 권장)
4. `step5PostUI()` — 어떤 버튼을 어떤 조건에 활성화할지 확인 후 구현
5. `generateDocCards()` + `renderDocCards()` + `updateDocSection()` — 세트로 구현
6. `showNewsBreaking(event)` — 게임 연출 마무리

---

**Git push 방법 (origin이 다른 계정)**:
```bash
git push https://github.com/koril020673-dev/CapiRogue.git main
```
