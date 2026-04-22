# Firstep

AI 기반 사이드프로젝트 런치패드 웹앱. 사이드프로젝트를 처음 시작하는 1인 개발자가 아이디어를 실제 서비스로 완성할 수 있도록 돕는다.

## 핵심 플로우

구글 로그인 → 스택 온보딩(선택) → 아이디어 구체화(AI 대화) → 로드맵 생성 → 투두 관리 → 완료

## 기술 스택

- 프론트엔드: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- 백엔드: Next.js Route Handlers (풀스택)
- DB: Supabase (PostgreSQL + Auth + Row Level Security)
- AI: Claude API (Streaming)
- 배포: Vercel
- 이메일: Resend
- 분석: PostHog

## 프로젝트 구조

```
/app           → 페이지 (React Server Components)
/app/api       → Route Handlers (백엔드 API)
/components    → UI 컴포넌트
/docs          → 기획서 및 설계 문서
```

## 개발 컨텍스트

- 1인 개발 (바이브코딩)
- 개발 경험: JS/Java 4년, React/Next.js 입문
- Claude Code Routines로 개발 진행
- MVP 목표: AI 로드맵 생성 + 투두 관리 + 대시보드

## 코드 컨벤션

- 한국어 주석, 영어 코드
- 컴포넌트: PascalCase (예: RoadmapView.tsx)
- 유틸/훅: camelCase (예: useAuth.ts)
- API 라우트: kebab-case (예: /api/generate-roadmap)
- 커밋 메시지: 한국어, 접두사 사용 (feat:, fix:, docs:, refactor:, chore:)
