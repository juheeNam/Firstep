// projects 테이블과 1:1 대응하는 타입 정의

export type ProjectStatus = 'active' | 'completed' | 'locked';
export type EntryLevel = 1 | 2 | 3;
export type SizeOption = 'auto' | 'basic' | 'detailed';

// DB projects 행 전체 타입
export type Project = {
  id: string;
  user_id: string;
  title: string;
  idea_summary: string | null;
  entry_level: EntryLevel | null;
  intent_data: unknown; // 다음 단계에서 레벨별 union 타입으로 좁힘
  size_option: SizeOption | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// 대시보드 카드 목록에서 사용하는 최소 타입
export type ProjectCard = Pick<
  Project,
  'id' | 'title' | 'status' | 'entry_level' | 'updated_at'
>;

// 레벨 선택 카드 UI 메타데이터
export type LevelMeta = {
  level: EntryLevel;
  emoji: string;
  title: string;
  description: string;
  href: string;
};

// 레벨 2 intent_data JSONB 구조 (5지선다 + 자유 텍스트)
export type IntentDataLevel2 = {
  q1Text: string;           // 서비스 한 줄 설명
  q2Form: string;           // 프로젝트 형태
  q3Auth: string;           // 인증/개인화 수준
  q4Integrations: string[]; // 외부 통합 (복수 선택)
  q5Audience: string;       // 공개 범위
};

// generateProjectSummary 반환 타입
export type ProjectSummaryResult =
  | { title: string; ideaSummary: string }
  | { error: string };

// 레벨 3 intent_data JSONB 구조 (자유 텍스트 + AI 후속 Q&A)
export type FollowUpQA = {
  question: string;
  answer: string;
};

export type IntentDataLevel3 = {
  ideaText: string;       // 상세 아이디어 자유 서술
  followUpQAs: FollowUpQA[];
};

// 레벨 1 intent_data JSONB 구조 (페인포인트 발굴 + AI 후속 Q&A)
export type IntentDataLevel1 = {
  q1: string;
  q2: string;
  q3: string;
  followUpQAs: FollowUpQA[];
};

// generateFollowUpQuestions 반환 타입
export type FollowUpQuestionsResult =
  | { questions: string[] }
  | { error: string };
