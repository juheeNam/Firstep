// 스택 온보딩에서 사용하는 타입 정의

// DB category 컬럼과 1:1 대응
export type StackCategory = 'frontend' | 'backend' | 'db' | 'infra' | 'security';

// DB status 컬럼과 1:1 대응
export type StackStatus = 'used' | 'want' | 'not_interested';

// UI 4-상태 (null = 미선택, DB에 행 없음)
export type StackSelectionState = StackStatus | null;

export type CategoryMeta = {
  id: StackCategory;
  label: string;
};

// 선택 상태를 키로 관리하는 Map. key = `${category}:${techName}`
export type SelectionMap = Map<string, StackStatus>;

// Server Action 및 초기값 전달에 사용하는 직렬화 가능한 형태
export type StackEntry = {
  category: StackCategory;
  techName: string;
  status: StackStatus;
};
