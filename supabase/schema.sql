-- ============================================================
-- LEXIONA — Schema do Banco de Dados
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: professores
-- ============================================================
CREATE TABLE IF NOT EXISTS professores (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    instituicao TEXT,
    modalidades TEXT[] DEFAULT '{}',
    onboarding_concluido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE professores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor acessa apenas seus dados"
    ON professores FOR ALL
    USING (auth.uid() = id);

-- ============================================================
-- TABELA: disciplinas
-- ============================================================
CREATE TYPE nivel_enum AS ENUM ('fundamental', 'medio', 'superior', 'livre', 'tecnico');

CREATE TABLE IF NOT EXISTS disciplinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    turma TEXT,
    nivel nivel_enum NOT NULL DEFAULT 'medio',
    carga_horaria_total INTEGER NOT NULL DEFAULT 0, -- em minutos
    metodologia TEXT DEFAULT 'Tradicional',
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    dias_semana INTEGER[] NOT NULL DEFAULT '{}', -- 0=Dom ... 6=Sab
    horario_inicio TIME,
    horario_fim TIME,
    ementa_texto TEXT,
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE disciplinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor acessa suas disciplinas"
    ON disciplinas FOR ALL
    USING (professor_id = auth.uid());

-- ============================================================
-- TABELA: feriados
-- ============================================================
CREATE TYPE tipo_feriado_enum AS ENUM ('nacional', 'estadual', 'municipal', 'recesso');

CREATE TABLE IF NOT EXISTS feriados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    tipo tipo_feriado_enum DEFAULT 'nacional',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor acessa seus feriados"
    ON feriados FOR ALL
    USING (professor_id = auth.uid());

-- Feriados nacionais do Brasil 2026 (base para todos os professores)
-- Serão inseridos dinamicamente pelo backend ao criar conta

-- ============================================================
-- TABELA: aulas
-- ============================================================
CREATE TYPE status_aula_enum AS ENUM ('planejada', 'pendente', 'cancelada', 'realizada');

CREATE TABLE IF NOT EXISTS aulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    status status_aula_enum DEFAULT 'pendente',
    tema TEXT,
    objetivos TEXT,
    conteudos TEXT,
    recursos TEXT,
    metodologia_aula TEXT,
    gerado_por_ia BOOLEAN DEFAULT FALSE,
    numero_aula INTEGER, -- sequência dentro da disciplina
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(disciplina_id, data)
);

ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor acessa aulas de suas disciplinas"
    ON aulas FOR ALL
    USING (
        disciplina_id IN (
            SELECT id FROM disciplinas WHERE professor_id = auth.uid()
        )
    );

CREATE INDEX idx_aulas_disciplina_data ON aulas(disciplina_id, data);
CREATE INDEX idx_aulas_data ON aulas(data);

-- ============================================================
-- TABELA: insumos_ia
-- ============================================================
CREATE TYPE tipo_insumo_enum AS ENUM ('texto', 'pdf', 'audio', 'docx');
CREATE TYPE status_insumo_enum AS ENUM ('processando', 'concluido', 'erro');

CREATE TABLE IF NOT EXISTS insumos_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    tipo tipo_insumo_enum NOT NULL,
    conteudo_bruto TEXT,
    conteudo_estruturado JSONB,
    status status_insumo_enum DEFAULT 'processando',
    erro_mensagem TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE insumos_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor acessa insumos de suas disciplinas"
    ON insumos_ia FOR ALL
    USING (
        disciplina_id IN (
            SELECT id FROM disciplinas WHERE professor_id = auth.uid()
        )
    );

-- ============================================================
-- TABELA: jobs_geracao (rastrear geração assíncrona de planos)
-- ============================================================
CREATE TYPE status_job_enum AS ENUM ('aguardando', 'processando', 'concluido', 'erro');

CREATE TABLE IF NOT EXISTS jobs_geracao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    status status_job_enum DEFAULT 'aguardando',
    progresso INTEGER DEFAULT 0, -- 0 a 100
    total_aulas INTEGER DEFAULT 0,
    aulas_geradas INTEGER DEFAULT 0,
    erro_mensagem TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jobs_geracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor acessa jobs de suas disciplinas"
    ON jobs_geracao FOR ALL
    USING (
        disciplina_id IN (
            SELECT id FROM disciplinas WHERE professor_id = auth.uid()
        )
    );

-- ============================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_professores_updated_at
    BEFORE UPDATE ON professores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_disciplinas_updated_at
    BEFORE UPDATE ON disciplinas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_aulas_updated_at
    BEFORE UPDATE ON aulas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_insumos_updated_at
    BEFORE UPDATE ON insumos_ia
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_jobs_updated_at
    BEFORE UPDATE ON jobs_geracao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();