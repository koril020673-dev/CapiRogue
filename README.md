# CapiRogue

경제 시뮬레이션 x 전략 x 로그라이크를 결합한 기업 경영 게임입니다.

## 프로젝트 개요
CapiRogue는 플레이어가 제한된 자본과 변동하는 거시경제 환경 속에서 가격, 투자, 인력, 금융 의사결정을 반복하며 생존/성장을 목표로 하는 턴 기반 경영 시뮬레이터입니다.

최근 버전은 경제 교과 성취기준 연계를 강화하여 아래 개념을 실제 게임 규칙으로 구현했습니다.
- 희소성과 합리적 선택: OEM 선택, R&D vs 마케팅 기회비용
- 수요/공급 가격결정: 가격-수요 함수, 라이벌 점유율 경쟁, 재고 리스크
- 거시경제 변동: 경기 국면 순환, 블랙스완, 뉴스 이벤트
- 정부 개입/금융: 누진세, 신용등급 기반 금리, 정책 이벤트

## 핵심 게임 시스템
- 수요 함수: 선형 가격 탄력 모델 + 난이도별 탄력성 계수
- 라이벌 기업: 저가/프리미엄/혁신/효율 4유형 고정 아키타입
- 재고 시스템: 보관비, 악성 재고(3턴), 강제 폐기(5턴)
- 거시경제: 확률형 경기 사이클(최소 2턴 유지)
- 블랙스완: 80턴 이후 누적 확률 발동, 10턴 위기 + 3턴 점진 회복
- 금융 시스템: 신용등급(A~D) 가산금리, 연속 적자 금리 패널티
- 조세/정책: 누진세, 규제/보조금 이벤트 풀, 순자산 15% 캡
- UI/리포트: 정책 이력 필터, 타임라인 뉴스 마커, 월간 보고서 상세 정산

## 기술 스택 (최신)
### Frontend
- React 18
- React DOM 18
- Zustand (전역 게임 상태 관리)
- JSX 기반 컴포넌트 아키텍처

### Build / Dev Server
- Vite 6
- @vitejs/plugin-react
- ES Modules (package.json: type=module)

### 스타일링
- 순수 CSS (src/styles/main.css)
- 반응형 레이아웃 + 게임 전용 커스텀 UI 컴포넌트

### 데이터/상태
- Zustand store 단일 소스 오브 트루스
- localStorage 메타 진행도 저장 (업적/보너스)

### API / AI 연동
- 클라이언트 API 레이어: src/apiService.js
- 서버 API Route: api/deepseek.js
- DeepSeek Chat Completions 연동
- 서버 응답 캐시(TTL) + 타임아웃 + 오프라인 폴백 데이터

### 런타임/배포 호환
- 브라우저 Fetch API
- Vercel API Route 구조와 호환 가능한 서버 핸들러
- Windows 개발 보조 스크립트(start.bat / stop.bat)

## 환경 변수
.env.example 기준:
- DEEPSEEK_API_KEY: 서버용 DeepSeek API 키 (권장)
- VITE_DEEPSEEK_API_KEY: 호환 fallback 키

설정 방법:
1. .env.example을 복사해 .env 생성
2. 키 값 입력
3. 개발 서버 재시작

## 실행 방법
### 1) 의존성 설치
```bash
npm install
```

### 2) 개발 서버 실행
```bash
npm run dev
```

### 3) 프로덕션 빌드
```bash
npm run build
```

### 4) 빌드 결과 미리보기
```bash
npm run preview
```

### Windows 빠른 실행(선택)
- start.bat: 백그라운드 dev 서버 실행
- stop.bat: PID 파일 기반 dev 서버 종료

## npm 스크립트
- dev: vite
- build: vite build
- preview: vite preview

## 현재 프로젝트 구조
```text
CapiRogue/
  api/
    deepseek.js
  src/
    components/
      modals/
    store/
      useGameStore.js
    styles/
      main.css
    apiService.js
    calculations.js
    constants.js
    utils.js
    App.jsx
    main.jsx
  .env.example
  index.html
  package.json
  vite.config.js
  plan.md
  UI_SPEC.md
  start.bat
  stop.bat
```

## 문서
- 계획/진행 현황: plan.md
- UI 요구사항: UI_SPEC.md

## 라이선스
개인 프로젝트
