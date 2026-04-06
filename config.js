// ════════════════════════════════════════════════════════
//  CapiRogue 환경 설정
//  ⚠️  이 파일은 .gitignore에 추가하거나 배포 시 서버사이드로 이동하세요.
//  ⚠️  API 키를 공개 저장소에 커밋하지 마세요.
// ════════════════════════════════════════════════════════

const GEMINI_CONFIG = {
  // Gemini API 키 — https://aistudio.google.com/app/apikey 에서 발급
  // 운영 환경에서는 백엔드 프록시를 통해 호출하는 것을 추천합니다.
  apiKey: 'AIzaSyDq7evD2CW0uLHymBZlqf9XcZdqJVq2wCI',
  model:  'gemini-2.5-flash',
  get url() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
  },
};
