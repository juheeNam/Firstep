-- AI 토큰 사용 내역 테이블
CREATE TABLE IF NOT EXISTS ai_usage (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id  uuid        REFERENCES projects(id) ON DELETE SET NULL,
  action      text        NOT NULL
              CHECK (action IN (
                'roadmap_generate',
                'block_regenerate',
                'chat',
                'refund_cancel',
                'refund_error'
              )),
  tokens_delta integer    NOT NULL, -- 양수=차감, 음수=환불
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_user_created
  ON ai_usage (user_id, created_at DESC);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 토큰 사용 내역만 접근"
  ON ai_usage FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
