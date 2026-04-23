// Next.js 서버 초기화 훅 (Node.js 런타임에서만 실행)
// CLAUDE.md 규정: 진입점에 unhandledRejection 핸들러 등록

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('unhandledRejection', (reason) => {
      console.error('처리되지 않은 Rejection:', reason);
      process.exit(1);
    });
  }
}
