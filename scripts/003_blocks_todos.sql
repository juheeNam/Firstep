-- blocks 테이블: 로드맵 단위 (프로젝트당 N개)
CREATE TABLE IF NOT EXISTS blocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  seq         integer     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 동시 로드맵 생성 요청 시 중복 blocks 방지 (이슈 1: unique violation = 23505 → 두 번째 요청 차단)
CREATE UNIQUE INDEX IF NOT EXISTS blocks_project_seq_unique
  ON blocks (project_id, seq);

-- 002에서 정의한 set_updated_at() 함수 재사용
CREATE OR REPLACE TRIGGER blocks_set_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- todos 테이블: 블록 안의 개별 작업 (블록당 N개)
CREATE TABLE IF NOT EXISTS todos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id     uuid        NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  content      text        NOT NULL,
  is_done      boolean     NOT NULL DEFAULT false,
  seq          integer     NOT NULL,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 블록 내 seq ASC 정렬용 인덱스
CREATE INDEX IF NOT EXISTS todos_block_seq
  ON todos (block_id, seq);

CREATE OR REPLACE TRIGGER todos_set_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- RLS: blocks/todos는 조인된 project의 user_id 기준 간접 격리
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 프로젝트의 블록만 접근"
  ON blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = blocks.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = blocks.project_id
        AND projects.user_id = auth.uid()
    )
  );


ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 프로젝트의 투두만 접근"
  ON todos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN projects ON projects.id = blocks.project_id
      WHERE blocks.id = todos.block_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN projects ON projects.id = blocks.project_id
      WHERE blocks.id = todos.block_id
        AND projects.user_id = auth.uid()
    )
  );
