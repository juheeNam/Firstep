-- projects 테이블: 유저 프로젝트 메타데이터
CREATE TABLE IF NOT EXISTS projects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text        NOT NULL DEFAULT '',
  idea_summary text,
  entry_level smallint    CHECK (entry_level IN (1, 2, 3)),
  intent_data jsonb,
  size_option text        CHECK (size_option IN ('auto', 'basic', 'detailed')),
  status      text        NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'completed', 'locked')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- 대시보드 기본 정렬(updated_at DESC) 쿼리용 인덱스
CREATE INDEX IF NOT EXISTS projects_user_updated
  ON projects (user_id, updated_at DESC);

-- 범용 updated_at 자동 갱신 트리거 함수 (blocks·todos 등에서도 재사용)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 프로젝트만 접근"
  ON projects FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
