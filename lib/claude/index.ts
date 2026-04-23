// Anthropic Claude API 래퍼

import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

// 기본 모델: Sonnet 4.6 (로드맵 생성·대화 균형)
// 경량 작업용: Haiku 4.5 (요약·분류 등 빠른 호출)
export const MODELS = {
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
} as const;

export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: env.anthropicApiKey() });
}
