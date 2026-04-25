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
