-- profiles 테이블: auth.users 의 공개 프로필 미러
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 신규 가입 시 profiles 행 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- user_stacks 테이블
CREATE TABLE IF NOT EXISTS user_stacks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category   text NOT NULL CHECK (category IN ('frontend','backend','db','infra','security')),
  tech_name  text NOT NULL,
  status     text NOT NULL CHECK (status IN ('used','want','not_interested')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, tech_name)
);

-- RLS 활성화
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 프로필만 접근"
  ON profiles FOR ALL
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "본인 스택만 접근"
  ON user_stacks FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
