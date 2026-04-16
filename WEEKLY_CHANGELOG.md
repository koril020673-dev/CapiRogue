# Weekly Changelog

프로젝트의 주간 수정사항을 기록하는 문서입니다.

기록 규칙
- 주 단위로 섹션을 추가합니다.
- 핵심 변경은 기능/문서/UI/밸런스/버그수정으로 분류합니다.
- 가능하면 변경 파일 경로를 함께 남깁니다.

---

## 2026-W16 (2026-04-14 ~ 2026-04-20)

### UI/UX 변경
- 진행 흐름 재정리
  - Phase 01/02를 접고 펼칠 수 있도록 구성하고, 완료 시 요약 문구가 보이도록 개선
  - 현재 해야 할 판단을 바로 읽을 수 있도록 상황 요약 스트립과 실행 전 체크 칩 추가
  - 실행 영역 카피를 다듬고 버튼 상태가 더 직관적으로 보이도록 정리
- 가격/티어/품질 조작부 가독성 개선
  - 티어 카드, 품질 모드, 발주/가격 프리셋을 더 작은 카드형 그리드로 압축
  - 클릭 가능한 요소와 비활성 요소의 hover 차이를 강화해 누를 수 있는지 즉시 구분되도록 개선
  - 티어/품질/발주/가격 프리셋 hover 카드에 개념 설명, 장단점, 예시 3종씩 추가
- 결재/브리핑 영역 정돈
  - Phase 05 브리핑 카드가 실행 박스에 눌려 보이던 레이아웃을 완화
  - 결재 서류 브리핑과 승인 모달을 모두 1장 기준으로 단순화
  - 우측 끝에서 잘리던 T2 해금/실행 버튼 툴팁을 우측 정렬로 보정
- 첫 플레이 온보딩 추가
  - 첫 게임 진입 시 핵심 UI 영역을 순서대로 안내하는 튜토리얼 오버레이 추가
  - 설정 모달에서 튜토리얼을 다시 열 수 있도록 재실행 버튼 추가
  - `localStorage["firstPlay"]` 플래그로 첫 방문 여부를 관리
- 작은 정보 카드 compact화
  - 상황 스트립, 가격 요약 카드, 대시보드, 장기 의사결정 버튼이 폭을 과하게 먹지 않도록 compact grid로 조정

### 기능 변경
- 공장 진행 규칙 정리
  - 품질 모드는 공장 완공 후에만 해금되도록 조정
  - 공장 가동 후에는 아이템 탐색/계약을 잠그고, 공장 업그레이드 시 다시 라인 재선정이 가능하도록 변경
- 난이도 설정 화면 개선
  - 세부 조정 구간을 스크롤 가능한 화면 흐름으로 정리
  - 시작 전/게임 중 UI 비율 조정 경험을 정돈하고 설정 접근성을 개선
- 발주 기준 보정
  - 예상 수요 대비 발주 프리셋을 보수 `85%`, 기준 `100%`, 공세 `115%`로 조정
- 결재 흐름 단순화
  - 브리핑 미리보기와 실제 실행 시점 모두 단일 결재안 1장만 생성하도록 조정

### 버그 수정
- 프리미엄 품질 모드에서 개당 마진이 잘못 보이던 계산/표시 문제 수정
- 잠금 상태 티어 hover 설명이 잘못 판정되던 로직 수정
- Phase 05가 실행 박스에 가려 보이던 시각적 충돌 완화

### 문서 변경
- 주간 변경 기록 갱신
  - W16 UI/진행 흐름 개선, 결재 단일화, 첫 플레이 튜토리얼 반영
- `README.md` 최신화
  - 현재 플레이 루프, UX 개선점, 저장/설정/튜토리얼 흐름을 코드 기준으로 재정리
- `plan.md` 동기화
  - 예전 스텁 중심 계획을 제거하고 현재 제품 단계 기준 우선순위로 재작성

### 검증
- `npm run build` 통과

### 주요 변경 파일
- src/components/ActionGuide.jsx
- src/components/CenterPanel.jsx
- src/components/DifficultyScreen.jsx
- src/components/FactoryBlock.jsx
- src/components/GameLayout.jsx
- src/components/GameplayTutorial.jsx
- src/components/HoverHint.jsx
- src/components/LeftPanel.jsx
- src/components/PriceBlock.jsx
- src/components/RightPanel.jsx
- src/components/TimelineBar.jsx
- src/components/VendorSearch.jsx
- src/components/modals/ApprovalModal.jsx
- src/components/modals/SettingsModal.jsx
- src/constants.js
- src/designData.js
- src/store/useGameStore.js
- src/styles/main.css
- README.md
- plan.md
- WEEKLY_CHANGELOG.md

## 2026-W15 (2026-04-07 ~ 2026-04-13)

### 기능 변경
- 경제 교과 연계 시스템을 실제 게임 로직에 반영
  - 수요 함수 선형 모델 + 난이도별 탄력성 계수 적용
  - 4유형 라이벌(저가/프리미엄/혁신/효율) 아키타입 도입
  - 재고 연령 시스템 추가(악성 재고 3턴, 강제 폐기 5턴)
  - 경기 사이클 확률형 전환 + 최소 유지 턴 적용
  - 블랙스완 80턴 이후 누적 확률 발동, 10턴 위기 + 3턴 회복
  - 누진세 및 신용등급 기반 실효금리 계산 적용
  - 연속 적자 금리 가산 패널티(최대 +4%p) 적용
  - 정책 이벤트 풀(규제/보조금) 및 순자산 15% 영향 캡 적용
- 자동 의사결정 비교 로그 추가
  - OEM/마케팅/R&D 비교 문장 로그 자동 생성

### UI/UX 변경
- 우측 패널
  - 라이벌 유형 배지 추가
  - 정책 이력 필터(전체/규제/보조금) 추가
- 상단 타임라인
  - 거시/정책 뉴스 마커 추가
- 월간 보고서
  - 세금, 재고 보관비/폐기비, 정책 영향, 실효금리, 연속 적자 패널티 표시 강화
- 가격 블록
  - R&D vs 마케팅 기회비용 비교 패널 추가
- 공급업체 카드
  - OEM 지표(예상 불량률/납기 안정성/편익-비용 점수) 표시 추가

### 구현 알고리즘 상세
- 수요 계산 알고리즘
  - 기준식: `Demand = BASE_DEMAND * 경기배율 * 블랙스완배율 * 가격배율 * 이벤트배율 * 문서배율 * 난수배율`
  - 가격배율: 기준가격 대비 선형 탄력 (`DEMAND_REF_PRICE_MUL`, `DEMAND_ELASTICITY`) 적용
  - 난이도 탄력성: Easy/Normal/Hard/Insane 계수(`DIFF_DEMAND_ELASTICITY`)로 가격 민감도 차등
  - 배율 하한/상한: `DEMAND_MIN_MUL ~ DEMAND_MAX_MUL` 클램프

- 매력도/점유율 분배 알고리즘
  - 매력도: `(품질 + 브랜드) * 경기/인지도 보정 / (판매가 * (1-가격저항))`
  - 플레이어/라이벌 매력도 계산 후 제곱 정규화(`attraction^2`)로 시장점유율 분배
  - 라이벌 아키타입별 가격/품질 갱신 규칙 반영

- 라이벌 아키타입 행동 알고리즘
  - 저가형: 공격적 저가 정책 + 품질 상한
  - 프리미엄형: 고가 유지, 불황 시 매력도 보정
  - 혁신형: 확률적 품질 상승 + 위기 취약 리스크
  - 효율형: 중립 운영 패턴
  - 파산 라이벌은 일정 턴 후 무작위 아키타입으로 재진입

- 경기 사이클 전이 알고리즘
  - 상태: `boom/stable/recession`
  - 각 상태는 최소 유지 턴(`ECO_PHASE_DURATION.min`) 보장
  - 유지 턴 종료 시 전이 확률(`ECO_TRANSITIONS`) 기반 난수 선택
  - 메타 보너스(`_boomBonus`)로 boom 전이 가중

- 블랙스완 알고리즘
  - 80턴 이후 발동 후보 활성화
  - 매턴 누적 확률(`_bsTriggerChance`) 증가 방식으로 트리거
  - 발동 시 10턴 위기(`BLACK_SWAN_TURNS`): 수요 감소(`_bsDemandMul`), 금리 쇼크(`_bsRateShock`) 적용
  - 종료 후 3턴(`BLACK_SWAN_RECOVERY_TURNS`) 점진 회복: 수요/금리 단계적 정상화

- 재고/판매/폐기 알고리즘
  - 생산계획: `plannedProduction = round(demand * INVENTORY_PLAN_RATIO)`
  - 가용재고: `openingInventory + plannedProduction`
  - 실판매량: `min(targetSold, availableUnits)`
  - 재고 lot 단위로 연령 증가, 고연령 lot 우선 소진
  - 악성 재고 기준: `INVENTORY_BAD_AGE(3턴)`
  - 강제 폐기 기준: `INVENTORY_DISPOSE_AGE(5턴)`
  - 보관비/폐기비: 원가 기반 비율(`HOLD_COST_RATE`, `DISPOSE_PENALTY_RATE`) 반영

- 금융/금리 알고리즘
  - 신용등급: 순자산 기반 A~D 산정
  - 실효금리: `기준금리 + 등급스프레드 + 블랙스완쇼크 + 연속적자가산`
  - 월이자: 실효금리 + 경기금리보정(`ECO_RATE_ADJ`) + 효과보정을 월 단위 환산

- 연속 적자 패널티 알고리즘
  - 연속 적자 2턴부터 가산금리 시작
  - 적자 지속 시 턴당 +1%p, 최대 +4%p
  - 흑자 전환 시 단계적 완화
  - 리포트에 `deficitStreak`, `deficitRatePenalty` 노출

- 세금 알고리즘(누진세)
  - 과세표준이 0 이하이면 세금 0
  - 구간별 누진 합산(`TAX_BRACKETS`)
    - 0~5천만: 10%
    - 5천만~2억: 20%
    - 2억 초과: 30%

- 정책 이벤트 알고리즘
  - 발생 확률: 매턴 `POLICY_EVENT_PROB(5%)`
  - 이벤트군: regulation/subsidy 풀에서 랜덤 선택
  - 충격치: 이벤트별 `shockMin~shockMax` 난수
  - 금액 반영: `순자산 * POLICY_NETWORTH_CAP_RATE(15%)` 이내 캡 적용
  - 부가효과: `activeEffects`에 turnsLeft 기반 버프/디버프 등록
  - 정책 뉴스 피드/모달/이력 필터와 연동

- 파산/종료 판정 알고리즘
  - 연속 적자 + 현금/부채 조건 충족 시 파산
  - 순자산 임계값(`BANKRUPTCY_INSOLVENCY_NW`) 하회 시 파산
  - 블랙스완 PE 조건(순자산 기준)에서 hostile 종료 가능
  - 최대 턴 도달 시 clear

- 메타 진행 알고리즘
  - 게임 종료 시 `plays`, `bankrupts`, `clears` 누적
  - 파산 누적 보너스: 초기 자본 가산(`capitalBonus`)
  - 클리어 누적 보너스: boom 전이 보정(`boomBonus`)

- OEM 의사결정 보조 지표 알고리즘(UI 계산)
  - 예상 불량률: 품질 점수 기반 역함수 형태 추정
  - 납기 안정성: 벤더 타입(고품질/변동/실속 등) 기반 점수 매핑
  - 편익-비용 점수: 품질/안정성 가중합 - 단가 패널티

### 문서 변경
- README 최신화
  - 현재 코드 기준 기술 스택/환경변수/실행 방법/구조 정리
  - 핵심 게임 시스템 상세 설명 및 비교표 추가
- plan 문서 동기화
  - 구현 상태(완료/부분완료) 갱신
  - 기술 스택 요약 섹션 추가

### 스타일/호환성
- CSS 호환성 개선
  - appearance 표준 속성 추가로 경고 정리

### 검증
- npm run build 통과

### 주요 변경 파일
- src/constants.js
- src/calculations.js
- src/store/useGameStore.js
- src/components/EcoBanner.jsx
- src/components/RightPanel.jsx
- src/components/TimelineBar.jsx
- src/components/VendorSearch.jsx
- src/components/PriceBlock.jsx
- src/components/modals/ReportModal.jsx
- src/components/modals/FinanceModal.jsx
- src/components/LeftPanel.jsx
- src/styles/main.css
- README.md
- plan.md
