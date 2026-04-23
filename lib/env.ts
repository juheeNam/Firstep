// 환경 변수 접근을 한 곳에서 관리 (타입 안정성 + 누락 감지)

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경 변수 ${name} 가 설정되지 않았습니다.`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name];
}

export const env = {
  // Supabase
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),

  // Anthropic
  anthropicApiKey: () => required('ANTHROPIC_API_KEY'),

  // Resend (이메일 넛지, MVP 제외 — 슬롯만 유지)
  resendApiKey: () => optional('RESEND_API_KEY'),
};
