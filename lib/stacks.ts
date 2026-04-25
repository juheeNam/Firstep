// 스택 온보딩에서 사용하는 카테고리·기술 목록 및 상태 순환 정의

import type { CategoryMeta, StackCategory, StackSelectionState, StackStatus } from '@/lib/types/stacks';

export const CATEGORY_META: CategoryMeta[] = [
  { id: 'frontend', label: '프론트엔드' },
  { id: 'backend',  label: '백엔드'    },
  { id: 'db',       label: 'DB'        },
  { id: 'infra',    label: '인프라'    },
  { id: 'security', label: '보안/네트워크' },
];

export const STACKS: Record<StackCategory, string[]> = {
  frontend: [
    'React', 'Next.js', 'Vue', 'Nuxt', 'Svelte/SvelteKit',
    'Angular', 'Solid', 'Astro', 'Remix', 'React Native',
  ],
  backend: [
    'Node.js(Express)', 'NestJS', 'Next.js Route Handler',
    'Django', 'FastAPI', 'Spring Boot', 'Rails', 'Go(Gin/Echo)', 'Laravel', 'Hono',
  ],
  db: [
    'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis',
    'Supabase', 'Firebase', 'PlanetScale', 'Turso', 'Neon',
  ],
  infra: [
    'Vercel', 'Netlify', 'AWS', 'GCP', 'Cloudflare Pages/Workers',
    'Railway', 'Fly.io', 'Render', 'Heroku', 'Docker',
  ],
  security: [
    'Supabase Auth', 'Auth.js(NextAuth)', 'Clerk', 'Firebase Auth', 'OAuth 2.0/OIDC',
    'JWT', 'Cloudflare(CDN/WAF)', 'Nginx', "Let's Encrypt", 'Linux',
  ],
};

// 클릭 시 순환 순서: 미선택 → 써봤어요 → 써보고싶어요 → 관심없어요 → 미선택
export const STATUS_CYCLE: StackSelectionState[] = [
  null,
  'used',
  'want',
  'not_interested',
];

export const STATUS_LABEL: Record<StackStatus, string> = {
  used:           '써봤어요',
  want:           '써보고싶어요',
  not_interested: '관심없어요',
};
