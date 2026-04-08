# Weekly Changelog

프로젝트의 주간 수정사항을 기록하는 문서입니다.

기록 규칙
- 주 단위로 섹션을 추가합니다.
- 핵심 변경은 기능/문서/UI/밸런스/버그수정으로 분류합니다.
- 가능하면 변경 파일 경로를 함께 남깁니다.

---

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
