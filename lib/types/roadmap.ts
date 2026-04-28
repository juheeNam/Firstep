// blocks · todos 테이블과 1:1 대응하는 타입 정의

export type Block = {
  id: string;
  project_id: string;
  name: string;
  seq: number;
  created_at: string;
  updated_at: string;
};

export type Todo = {
  id: string;
  block_id: string;
  content: string;
  is_done: boolean;
  seq: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

// 로드맵 뷰에서 사용하는 조인 타입 (blocks.select('*, todos(*)'))
export type BlockWithTodos = Block & {
  todos: Todo[];
};

// AI 스트리밍 결과 (Zod 검증 후, DB 저장 직전)
export type RoadmapDraft = {
  blocks: Array<{
    name: string;
    todos: Array<{ content: string }>;
  }>;
};
