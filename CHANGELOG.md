# Changelog

프로젝트 수정 이력을 누적 기록하는 문서입니다.
앞으로는 최신 항목을 상단에 추가합니다.

기록 규칙
- 날짜는 `YYYY-MM-DD` 형식으로 기록합니다.
- 변경은 `개선`, `버그 수정`, `리팩터링`, `밸런스`, `문서`처럼 성격별로 구분합니다.
- 가능하면 관련 파일 경로와 검증 결과를 함께 남깁니다.
- 사용자가 체감하는 영향이 큰 변경을 먼저 적습니다.

---

## 2026-04-08

### UI/UX
- 전체 플레이 화면을 전술 지휘실(HUD) 느낌으로 재설계했습니다.
  - 상단 타임라인을 캠페인 진행 바 + 위기 경보 형태로 개편
  - 중앙 플로우를 `탐색 → 가격 설정 → 선택 행동 → 장기 지시 → 월간 실행` 구조가 더 또렷하게 보이도록 재배치
  - 월간 실행 버튼을 준비 상태와 체크리스트가 보이는 실행 패널로 변경
  - 좌측 HQ 패널을 재무 요약 카드 중심으로 정리
  - 우측 패널을 시장 인텔 브리핑 형태로 재구성
  - 하단에 활성 효과와 이벤트 로그를 함께 노출해 피드백 가시성 강화
  - `src/components/TimelineBar.jsx`
  - `src/components/LeftPanel.jsx`
  - `src/components/CenterPanel.jsx`
  - `src/components/RightPanel.jsx`
  - `src/components/DashGrid.jsx`
  - `src/components/StatusBoard.jsx`
  - `src/styles/main.css`
- 난이도 선택 화면도 같은 비주얼 방향에 맞춰 보다 게임적인 오프닝 화면으로 조정했습니다.
  - `src/components/DifficultyScreen.jsx`
  - `src/styles/main.css`
- 도매업체 카드와 가격 설정 블록을 카드형 전술 UI로 개편해 정보 우선순위를 더 직관적으로 보이게 했습니다.
  - `src/components/VendorSearch.jsx`
  - `src/components/PriceBlock.jsx`
  - `src/styles/main.css`

### 개선
- 주요 UI 컴포넌트의 Zustand 구독을 `useShallow` 기반으로 정리해 불필요한 리렌더를 줄였습니다.
  - `src/components/PriceBlock.jsx`
  - `src/components/VendorSearch.jsx`
  - `src/components/EcoBanner.jsx`
  - `src/components/FactoryBlock.jsx`
  - `src/components/ActionButtons.jsx`
  - `src/components/RightPanel.jsx`
  - `src/components/ActionGuide.jsx`

### 버그 수정
- 새 아이템 검색이 성공했을 때 이전 도매 계약과 판매가가 남아 잘못된 상태로 다음 턴을 진행할 수 있던 문제를 수정했습니다.
  - `src/store/useGameStore.js`
- 공장 건설 중에도 업그레이드와 품목 변경이 가능하던 흐름을 차단했습니다.
  - `src/store/useGameStore.js`
  - `src/components/FactoryBlock.jsx`
- 턴 종료 후 신용등급과 실효금리가 한 턴 늦게 반영되던 문제를 수정했습니다.
  - `src/store/useGameStore.js`
- 담합 과징금과 산재 페널티가 월간 손익 및 자본에 일관되게 반영되도록 정산식을 정리했습니다.
  - `src/store/useGameStore.js`
- 블랙스완 모달이 실제 이벤트 데이터 필드와 맞지 않아 제목/설명이 비정상 표시되던 문제를 수정했습니다.
  - `src/components/modals/BlackSwanModal.jsx`

### 규칙 정합화
- 블랙스완별 실제 효과를 데이터 중심으로 분리해 설명과 구현이 일치하도록 맞췄습니다.
  - 덤핑 공세: 시장 수요 `-30%`
  - 적대적 인수: 수요/금리 직접 충격 없음
  - 퍼펙트 스톰: 금리 `+30%p`, 시장 수요 `-40%`, 불황 고정
  - `src/constants.js`
  - `src/store/useGameStore.js`
- 블랙스완 종료 후 회복 로직을 현재 충격량 기준으로 점진 복원되도록 조정했습니다.
  - `src/store/useGameStore.js`

### 안정성
- 외부/API 응답을 정규화해 잘못된 업체 데이터가 그대로 게임 상태로 들어오는 문제를 줄였습니다.
  - 카테고리 검증
  - 업체 필드 보정
  - 중복 업체 제거
  - `src/apiService.js`
- 손익분기점(BEP) 계산이 실효금리를 반영하도록 보정했습니다.
  - `src/calculations.js`
  - `src/components/PriceBlock.jsx`
  - `src/components/AdvisorBar.jsx`

### 검증
- `npm run build` 통과
