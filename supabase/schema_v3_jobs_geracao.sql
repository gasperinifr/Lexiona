-- ============================================================
-- LEXIONA - Schema v3 incremental
-- Jobs persistidos para geracao de planos por IA
-- Execute no SQL Editor do Supabase em bases que ja usaram schema_v2.sql
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_job_enum') THEN
        CREATE TYPE status_job_enum AS ENUM ('aguardando', 'processando', 'concluido', 'erro');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS jobs_geracao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    status status_job_enum DEFAULT 'aguardando',
    progresso INTEGER DEFAULT 0,
    total_aulas INTEGER DEFAULT 0,
    aulas_geradas INTEGER DEFAULT 0,
    erro_mensagem TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jobs_geracao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professor acessa jobs de suas disciplinas" ON jobs_geracao;
CREATE POLICY "Professor acessa jobs de suas disciplinas"
    ON jobs_geracao FOR ALL
    USING (
        disciplina_id IN (
            SELECT id FROM disciplinas WHERE professor_id = auth.uid()
        )
    );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_jobs_updated_at'
    ) THEN
        CREATE TRIGGER trigger_jobs_updated_at
            BEFORE UPDATE ON jobs_geracao
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END$$;
