# Firstep

AI 기반 사이드프로젝트 런치패드 웹앱. 사이드프로젝트를 처음 시작하는 1인 개발자가 아이디어를 실제 서비스로 완성할 수 있도록 돕는다.

## 핵심 플로우

구글 로그인 → 스택 온보딩(선택) → 아이디어 구체화(AI 대화) → 로드맵 생성 → 투두 관리 → 완료

## 기술 스택

- 프론트엔드: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4
- 백엔드: Next.js Route Handlers (풀스택)
- DB: Supabase (PostgreSQL + Auth + Row Level Security)
- AI: Claude API (Streaming)
- 배포: Vercel
- 이메일: Resend
- 분석: PostHog

## 프로젝트 구조

```
/app             → 페이지 (React Server Components, App Router)
/app/api         → Route Handlers (백엔드 API)
/components      → 재사용 UI 컴포넌트
/lib             → 유틸리티 및 헬퍼 (Supabase 클라이언트, Claude 래퍼 등)
/docs            → 기획서 및 설계 문서
/.claude/skills  → Claude Code 스킬
/scripts         → 운영/마이그레이션 스크립트
```

## 개발 컨텍스트

- 1인 개발 (바이브코딩)
- 개발 경험: JS/Java 4년, React/Next.js 입문
- Claude Code Routines로 개발 진행
- MVP 목표: AI 로드맵 생성 + 투두 관리 + 대시보드

## 코드 컨벤션

- 한국어 주석, 영어 코드
- TypeScript strict 모드 필수, `any` 타입 금지 — `unknown` 사용
- default export 대신 named export 사용
- 컴포넌트는 함수형 + hooks
- API 응답은 항상 타입 정의
- CSS: Tailwind 유틸리티 클래스 사용, 커스텀 CSS 파일 금지
- 컴포넌트: PascalCase (예: RoadmapView.tsx)
- 유틸/훅: camelCase (예: useAuth.ts)
- API 라우트: kebab-case (예: /api/generate-roadmap)
- 커밋 메시지: 한국어, 접두사 사용 (feat:, fix:, docs:, refactor:, chore:)

## ⛔ 절대 하지 말아야 할 것들

다음 규칙은 **절대적**입니다:

### 민감 데이터 배포 금지
- 절대로 비밀번호, API 키, 토큰을 git/npm/docker에 배포하지 마세요
- 모든 커밋 전: 비밀 정보가 포함되지 않았는지 확인

### .env 파일 커밋 금지
- 절대로 `.env`를 git에 커밋하지 마세요
- 항상 `.env`가 `.gitignore`에 있는지 확인

### 위험한 명령어 금지
- `rm -rf /` 또는 시스템 디렉토리 삭제 금지
- `sudo` 없이 시스템 파일 수정 금지
- 프로덕션 데이터베이스 직접 조작 금지

---

## Git 운영 규칙

### 브랜치 전략

- **모든 작업은 새 브랜치에서 시작한다**: `git checkout -b feature/작업명`
- 브랜치 명명규칙: `feature/`, `fix/`, `docs/`, `chore/` 접두사를 사용한다
- `main` 및 `master` 브랜치로의 직접 push는 어떤 상황에서도 금지

### PR 필수 절차

- 작업 완료 후 반드시 PR을 생성한다
- **PR 생성 전 반드시 `qa-tester` 서브에이전트로 QA 리뷰를 먼저 수행한다** — Task tool에서 `subagent_type="qa-tester"`로 호출. 리뷰 리포트의 🔴 치명 이슈는 해결 후 PR 생성. 이 절차는 `.claude/hooks/pre-create-pr.sh`에서 하드 차단된다.
- PR 설명에는 변경 이유, 변경 내용, 테스트 방법을 포함한다
- 승인 없이 merge 하지 않는다

### 긴급상황

- 핫픽스가 필요한 경우에도 `hotfix/설명` 브랜치를 생성 후 PR을 통해 처리한다

---

## 테스트 워크플로우

### "테스트 진행해" 명령어

유저가 **"테스트 진행해"** (또는 유사 표현)를 말하면 아래 체인을 **끊김 없이 한 번에** 실행한다:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. (변경된 라우트/플로우가 있으면) dev 서버 스모크 테스트
5. **`qa-tester` 서브에이전트 리뷰** — Task tool `subagent_type="qa-tester"` 호출

**진행 규칙**
- 각 단계 사이에 유저 확인을 요청하지 않는다
- 🔴 치명 이슈나 실패가 발생한 경우에만 보고한다
- 모두 통과하면 결과 요약 + **merge 필요 시점에만** 유저에게 알린다
- qa-tester 리포트의 치명 이슈는 자동으로 수정 시도 후 재검증

---

## 📁 새 프로젝트 생성 시

새 프로젝트 생성 시 다음을 항상 포함:

### 필수 파일
- `.env` — 환경 변수 (절대 커밋 금지)
- `.env.example` — 플레이스홀더가 있는 템플릿
- `.gitignore` — 포함 필수: `.env`, `node_modules/`, `.next/`
- `CLAUDE.md` — 프로젝트 개요

### Node.js 프로젝트 필수 사항
진입점에 다음 추가:
```javascript
process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 Rejection:', reason);
  process.exit(1);
});
```

## 자주 사용하는 명령어

```bash
npm run dev          # 개발 서버
npm run test         # 테스트 실행
npm run lint         # ESLint
```
