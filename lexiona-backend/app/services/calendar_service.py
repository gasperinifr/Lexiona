from datetime import date, timedelta
from typing import List, Optional


def gerar_datas_aula(
    periodo_inicio: date,
    periodo_fim: date,
    dias_semana: List[int],
    feriados: List[str],
) -> List[date]:
    """
    Gera lista de datas de aula entre inicio e fim,
    respeitando os dias da semana definidos e excluindo feriados.
    dias_semana: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
    """
    if not periodo_inicio or not periodo_fim or not dias_semana:
        return []

    feriados_set = set(feriados)
    datas = []

    atual = periodo_inicio
    while atual <= periodo_fim:
        # weekday(): 0=Seg...6=Dom | nosso padrão: 0=Dom...6=Sab
        dia_semana_nosso = (atual.weekday() + 1) % 7

        if dia_semana_nosso in dias_semana and str(atual) not in feriados_set:
            datas.append(atual)

        atual += timedelta(days=1)

    return datas


def deve_gerar_datas(modo_planejamento: str) -> bool:
    """
    Retorna True se datas de aula devem ser geradas automaticamente.
    No modo 'irregular', aulas são adicionadas manualmente.
    """
    return modo_planejamento == "periodico"
