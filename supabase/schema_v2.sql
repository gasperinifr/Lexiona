-- ============================================================
-- LEXIONA — Schema v2 (Migração incremental — não apaga dados)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- DISCIPLINAS — novas colunas
-- ============================================================

ALTER TABLE disciplinas
  ADD COLUMN IF NOT EXISTS turno TEXT,                           -- matutino | vespertino | noturno | integral | particular
  ADD COLUMN IF NOT EXISTS modo_planejamento TEXT DEFAULT 'periodico',  -- periodico | irregular
  ADD COLUMN IF NOT EXISTS bncc_componente TEXT;                 -- ex: "Matemática", "Língua Portuguesa"

-- Tornar periodo_inicio e periodo_fim opcionais (modo irregular não precisa)
ALTER TABLE disciplinas
  ALTER COLUMN periodo_inicio DROP NOT NULL,
  ALTER COLUMN periodo_fim DROP NOT NULL;

-- Tornar dias_semana opcional
ALTER TABLE disciplinas
  ALTER COLUMN dias_semana SET DEFAULT '{}';

-- ============================================================
-- GOOGLE CALENDAR TOKENS — nova tabela
-- ============================================================

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMPTZ,
    calendar_id TEXT DEFAULT 'primary',
    sincronizacao_ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor acessa seus tokens Google"
    ON google_calendar_tokens FOR ALL
    USING (professor_id = auth.uid());

CREATE TRIGGER trigger_google_tokens_updated_at
    BEFORE UPDATE ON google_calendar_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AULAS — coluna google_event_id para evitar duplicatas no sync
-- ============================================================

ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS turno TEXT;  -- herdado da disciplina, mas pode ser override

-- ============================================================
-- ÍNDICES ADICIONAIS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_disciplinas_professor_modo
    ON disciplinas(professor_id, modo_planejamento);

CREATE INDEX IF NOT EXISTS idx_aulas_google_event
    ON aulas(google_event_id) WHERE google_event_id IS NOT NULL;

-- ============================================================
-- FIM DA MIGRAÇÃO v2
-- ============================================================
