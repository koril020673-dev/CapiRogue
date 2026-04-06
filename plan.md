# CapiRogue 개선 계획 (plan.md)

## 📋 개선 우선순위

### 🔴 **P0: 긴급 버그/안정성 (즉시 처리)**

1. **gameState 초기화 예외 처리**
   - `document.getElementById()` 실패 시 null체크 부족
   - 난이도 선택 전 게임 실행 시도 방지
   - 파일: `script.js` Line ~250 (updateUI)
   - 해결: try-catch 래핑 또는 early return 추가

2. **API 키 노출 문제**
   - Gemini API 키가 프론트엔드에 하드코딩됨 (Line 1540)
   - 보안 위험: 누구나 이 키로 API 호출 가능
   - 해결방법:
     - 백엔드 프록시 서버 구축 (권장)
     - 또는 환경변수 + 빌드 시점에 주입
     - 또는 키 로테이션/제한설정 필수

3. **메모리 누수 가능성**
   - toast/이벤트리스너 정리 미흡
   - 모달 닫을 때 이벤트리스너 제거 필요
   - 파일: `script.js` Line ~450 (closeModal)
   - 해결: removeEventListener 명시적 호출

4. **localStorage 의존성**
   - Meta 데이터 try-catch 있지만 용량 초과 상황 미처리
   - 파일: `script.js` Line ~2150 (loadMeta, saveMeta)
   - 해결: 용량 체크 및 사용자 안내 추가

---

### 🟠 **P1: 코드 품질 (1주일 내)**

1. **함수 분리 & 모듈화**
   - `updateUI()`: 500+ 줄 → 너무 큼
   - `runTurn()`: 200+ 줄 → 단일 책임 위반
   - 해결:
     ```javascript
     // updateUI 분해
     updateUIFinance()
     updateUIBrand()
     updateUIMarket()
     updateUIFactory()
     updateUIHR()
     
     // runTurn 분해
     processGamePhase()
     calculateMarket()
     calculateProfit()
     checkEndConditions()
     ```

2. **상수 정의 분산**
   - HR_TRAIN_COST, BASE_DEMAND 등이 코드 곳곳에
   - 파일: `script.js` Line ~250, 1750, 2150
   - 해결: 파일 상단 CONSTANTS 객체로 통일

3. **조건문 복잡도 감소**
   - 다중 중첩 if-else (특히 `rollMonthlyEvent()`)
   - 파일: `script.js` Line ~3500+
   - 해결: Early return 패턴 또는 상태 머신 도입

4. **매직 넘버 제거**
   - 0.05, 0.15, 50_000_000 등이 여러 곳에
   - 파일: 다수
   - 해결: 이름있는 상수로 치환

---

### 🟡 **P2: 성능 최적화 (2주일 내)**

1. **DOM 쿼리 캐싱**
   - `document.getElementById()` 매번 호출
   - 파일: `script.js` updateUI, renderUI 등
   - 해결:
     ```javascript
     // 캐시 객체 생성
     const DOM = {
       capital: document.getElementById('lp-capital'),
       debt: document.getElementById('lp-debt'),
       // ... 모든 자주 쓰는 요소
     };
     DOM.capital.textContent = fmtW(gameState.capital);
     ```

2. **이벤트 위임 (Event Delegation)**
   - `.vendor-tab` 각각에 addEventListener
   - 파일: `script.js` Line ~1050
   - 해결: 부모 요소 1개에 위임
     ```javascript
     document.querySelector('.vendor-tabs').addEventListener('click', e => {
       if(e.target.classList.contains('vendor-tab')) {
         gameState.currentVendorTab = e.target.dataset.type;
       }
     });
     ```

3. **renderProfitChart() 최적화**
   - 매 턴마다 전체 막대 재생성
   - 파일: `script.js` Line ~820
   - 해결: 최근 12개만 유지, 증분 업데이트

4. **API 호출 Debounce**
   - 검색 입력 시마다 즉시 API 호출 가능
   - 파일: `script.js` Line ~1700
   - 해결: 300ms debounce 적용

5. **requestAnimationFrame 활용**
   - `animateNum()` setTimeout 사용
   - 파일: `script.js` Line ~3100
   - 현재: requestAnimationFrame 사용 ✅ (이미 좋음)

---

### 🟢 **P3: 기능 추가 (3주일 이후)**

1. **게임 저장/로드 기능**
   - 현재: 메타 진행도만 저장
   - 필요: 현재 게임 스냅샷 저장 가능하게
   - 방법: localStorage 또는 IndexedDB 활용

2. **언어 지원 (다국어화)**
   - 현재: 한국어만
   - 방법: i18n 라이브러리 또는 간단한 객체 기반 번역

3. **통계 및 리플레이 시스템**
   - 게임 진행 기록 (턴별 의사결정)
   - 리플레이 영상 생성 가능하게

4. **튜토리얼 & 온보딩**
   - 첫 게임 시 가이드 표시
   - 각 기능별 Tooltip

5. **모바일 반응형 개선**
   - 현재 CSS 반응형 있지만 터치 최적화 미흡
   - 파일: `style.css` Line ~1800+ (@media)
   - 해결: 터치 친화적 버튼 크기, 모바일 우선 설계

---

### 💜 **P4: UX/UI 개선**

1. **어두운 테마만 있음 (옅은 테마 추가)**
   - CSS 변수 활용해서 쉽게 토글 가능
   - 파일: `style.css` Line ~1-50 (CSS variables)

2. **키보드 네비게이션**
   - Tab 키 순서 정의 필요
   - Enter 키로 버튼 활성화
   - 파일: `index.html` 모든 interactive 요소

3. **로딩 상태 표시**
   - AI 호출 중 다른 버튼 비활성화
   - 파일: `script.js` Line ~1600 (showAILoading)
   - 해결: 이미 있음 ✅ (개선 필요한 정도)

4. **에러 메시지 개선**
   - 현재: toast로만 표시
   - 개선: 상황별 명확한 에러 메시지
   - 예: "현금 부족 (1억 2천만 부족)" → "현금 부족: 추가 1억 2천만 필요"

5. **애니메이션 미세조정**
   - 숫자 롤링 속도 조정 가능하게
   - 전체 애니메이션 끄기 옵션 추가 (접근성)

---

### 🔵 **P5: 테스트 & 문서**

1. **단위 테스트 작성**
   - calcAttraction(), calcMarketShares() 등 순수 함수
   - 사용 라이브러리: Jest 또는 Vitest
   - 목표: 80%+ 커버리지

2. **통합 테스트**
   - 한 턴 진행 로직 검증
   - 블랙스완, 이벤트 트리거 검증

3. **코드 주석 추가**
   - 복잡한 알고리즘 설명 필요
   - 파일: `script.js` Line ~1750+ (시장 계산)

4. **README 보완**
   - 게임 규칙 상세 설명
   - 게임 밸런싱 파라미터 문서화
   - API 명세(formatNumber, toast 등)

5. **변경 이력 (CHANGELOG.md)**
   - v1.0 → v1.1 → ... 추적

---

## 🛠️ 구현 순서 (제안)

### **Week 1 (긴급)**
- [ ] P0-1: API 키 보안 처리
- [ ] P0-2: gameState 초기화 try-catch
- [ ] P0-4: localStorage 용량 체크

### **Week 2 (코드 정리)**
- [ ] P1-1: 함수 분리 (updateUI, runTurn)
- [ ] P1-2: 상수 통일
- [ ] P2-1: DOM 캐싱

### **Week 3 (성능)**
- [ ] P2-2: 이벤트 위임
- [ ] P2-4: Debounce 추가
- [ ] P1-3: 조건문 단순화

### **Week 4+ (기능 & 테스트)**
- [ ] P3-1: 게임 저장 기능
- [ ] P5-1: 단위 테스트
- [ ] P4-2: 키보드 네비게이션

---

## 📊 영향도 vs 난이도

| 항목 | 영향도 | 난이도 | 추천 |
|------|--------|--------|------|
| API 키 보안 | 🔴 높음 | 🟢 낮음 | **지금 해야됨** |
| 함수 분리 | 🟠 중간 | 🟡 중간 | 다음 주 |
| DOM 캐싱 | 🟡 중간 | 🟢 낮음 | 다음 주 |
| 테스트 작성 | 🟢 낮음 | 🟡 중간 | 나중에 |
| 다국어화 | 🟡 중간 | 🟠 높음 | 나중에 |

---

## 🎯 추천 즉시 Action Items

1. **API 키 이동** → .env 파일 또는 백엔드 프록시
2. **Plan.md 생성** ← 현재 완료 ✅
3. **함수 분리 시작** → updateUI() 분해
4. **DOM 캐싱** → 성능 개선 빠른 이득

---

## 📝 파일별 개선 체크리스트

### `index.html` (~900줄)
- [ ] 각 input/button에 aria-label 추가 (접근성)
- [ ] form 유효성 검사 (HTML5)
- [ ] lang="ko" 속성 확인

### `style.css` (~2,100줄)
- [ ] 다크/라이트 테마 토글
- [ ] 모바일 터치 최적화 (tap-highlight 제거)
- [ ] 애니메이션 성능 최적화 (will-change)

### `script.js` (~4,200줄)
- [ ] 함수 단위 분리
- [ ] 에러 핸들링 강화
- [ ] JSDoc 주석 추가
- [ ] 전역 변수 최소화 (_bsActive 등)

---

## 👥 참고: 코드 복잡도 분석

| 함수 | 줄수 | 복잡도 | 상태 |
|------|------|--------|------|
| updateUI | 500+ | 🔴 높음 | 분리 필요 |
| runTurn | 200+ | 🟠 중간 | 약간 분리 |
| calculateMarketShare | 100 | 🟡 중간 | OK |
| generateSecretaryReport | 150 | 🟡 중간 | OK ish |
| rollMonthlyEvent | 80 | 🟠 중간 | 단순화 가능 |

---

**생성일**: 2026-04-06  
**버전**: v1.0 (분석 기준)  
**상태**: 검토 대기중
