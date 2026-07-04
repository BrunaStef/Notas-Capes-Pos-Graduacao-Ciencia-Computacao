import os
import json
import glob
from pathlib import Path

import pandas as pd

# =====================================
# 0. CONFIGURAÇÃO DE CAMINHOS
# =====================================

# Pasta onde está este script
BASE_DIR = Path(__file__).resolve().parent

# Arquivos Excel ficam na mesma pasta do script
PADRAO_ARQUIVOS = str(BASE_DIR / "br-capes-colsucup-discentes-*.xlsx")

# Pasta de saída também fica dentro da pasta do script
SAIDA_DIR = BASE_DIR / "indicadores"
SAIDA_DIR.mkdir(parents=True, exist_ok=True)

# =====================================
# 1. CARREGAMENTO ROBUSTO DOS ARQUIVOS
# =====================================

arquivos = glob.glob(PADRAO_ARQUIVOS)

if not arquivos:
    raise RuntimeError(
        f"Nenhum arquivo encontrado para o padrão:\n{PADRAO_ARQUIVOS}"
    )

print(f"Arquivos encontrados: {len(arquivos)}")

dfs = []

colunas_uso = [
    "AN_BASE",
    "NM_AREA_AVALIACAO",
    "CD_CONCEITO_PROGRAMA",
    "CD_PROGRAMA_IES",
    "DS_GRAU_ACADEMICO_DISCENTE",
    "NM_SITUACAO_DISCENTE",
    "DS_TIPO_NACIONALIDADE_DISCENTE",
    "QT_MES_TITULACAO",
    "DS_FAIXA_ETARIA",
]

for arquivo in arquivos:
    nome_arquivo = os.path.basename(arquivo)
    print(f"Lendo {nome_arquivo}...")
    try:
        df_ano = pd.read_excel(arquivo, usecols=lambda c: c in colunas_uso)
        dfs.append(df_ano)
    except Exception as e:
        print(f"Falha ao ler {nome_arquivo}: {e}")

if not dfs:
    raise RuntimeError("Nenhum arquivo válido pôde ser carregado.")

df = pd.concat(dfs, ignore_index=True)

# =====================================
# 2. FILTRO COMPUTAÇÃO E LIMPEZA
# =====================================

areas_validas = [
    "CIÊNCIA DA COMPUTAÇÃO",
    "COMPUTAÇÃO",
    "ENGENHARIA DA COMPUTAÇÃO",
]

df["NM_AREA_AVALIACAO"] = df["NM_AREA_AVALIACAO"].astype(str).str.strip().str.upper()

computacao = df[df["NM_AREA_AVALIACAO"].isin(areas_validas)].copy()

# Tratamento do Conceito
computacao["CD_CONCEITO_PROGRAMA"] = pd.to_numeric(
    computacao["CD_CONCEITO_PROGRAMA"], errors="coerce"
)
computacao = computacao[computacao["CD_CONCEITO_PROGRAMA"].isin([3, 4, 5, 6, 7])].copy()
computacao["CD_CONCEITO_PROGRAMA"] = computacao["CD_CONCEITO_PROGRAMA"].astype(int)

# Tratamento do Ano Base
computacao["AN_BASE"] = pd.to_numeric(computacao["AN_BASE"], errors="coerce")
computacao = computacao.dropna(subset=["AN_BASE"]).copy()
computacao["AN_BASE"] = computacao["AN_BASE"].astype(int)

print(f"\nRegistros válidos de Computação (Discentes - Notas 3 a 7): {len(computacao):,}")

# =====================================
# 3. FUNÇÕES AUXILIARES E INDICADORES
# =====================================

def calcular_proporcao(df_dados, coluna_analise):
    df_aux = df_dados.dropna(subset=["CD_CONCEITO_PROGRAMA", coluna_analise]).copy()

    if df_aux[coluna_analise].dtype == "object":
        df_aux[coluna_analise] = df_aux[coluna_analise].astype(str).str.strip().str.upper()

    agrupado = (
        df_aux.groupby(["CD_CONCEITO_PROGRAMA", coluna_analise])
        .size()
        .reset_index(name="TOTAL_DISCENTES")
    )

    total_por_conceito = (
        agrupado.groupby("CD_CONCEITO_PROGRAMA")["TOTAL_DISCENTES"].transform("sum")
    )
    agrupado["PERCENTUAL"] = ((agrupado["TOTAL_DISCENTES"] / total_por_conceito) * 100).round(2)

    return agrupado

def gerar_indicadores_discentes(df_base):
    if df_base.empty:
        return {
            "distribuicao_grau_academico": [],
            "situacao_academica": [],
            "internacionalizacao_nacionalidade": [],
            "tempo_medio_titulacao": [],
            "tamanho_medio_programa": [],
            "faixa_etaria": [],
        }

    # 1. Distribuição de Grau (Mestrado vs Doutorado)
    grau = calcular_proporcao(df_base, "DS_GRAU_ACADEMICO_DISCENTE")

    # 2. Situação Acadêmica
    situacao = calcular_proporcao(df_base, "NM_SITUACAO_DISCENTE")

    # 3. Internacionalização
    nacionalidade = calcular_proporcao(df_base, "DS_TIPO_NACIONALIDADE_DISCENTE")

    # 4. Tempo Médio de Titulação (Apenas Titulados)
    titulados = df_base[
        df_base["NM_SITUACAO_DISCENTE"].astype(str).str.strip().str.upper() == "TITULADO"
    ].copy()

    titulados["QT_MES_TITULACAO"] = pd.to_numeric(titulados["QT_MES_TITULACAO"], errors="coerce")
    titulados = titulados[titulados["QT_MES_TITULACAO"] > 0]

    tempo_titulacao = (
        titulados.dropna(subset=["QT_MES_TITULACAO", "DS_GRAU_ACADEMICO_DISCENTE"])
        .groupby(["CD_CONCEITO_PROGRAMA", "DS_GRAU_ACADEMICO_DISCENTE"])["QT_MES_TITULACAO"]
        .mean()
        .round(1)
        .reset_index(name="MEDIA_MESES_TITULACAO")
    )

    # 5. Tamanho Médio do Programa
    tamanho_programa = (
        df_base.groupby(["AN_BASE", "CD_PROGRAMA_IES", "CD_CONCEITO_PROGRAMA"])
        .size()
        .reset_index(name="QTD_DISCENTES")
    )

    tamanho_medio = (
        tamanho_programa.groupby("CD_CONCEITO_PROGRAMA")["QTD_DISCENTES"]
        .mean()
        .round(1)
        .reset_index(name="MEDIA_DISCENTES_POR_PROGRAMA")
    )

    # 6. Faixa Etária
    faixa_etaria = calcular_proporcao(df_base, "DS_FAIXA_ETARIA")

    return {
        "distribuicao_grau_academico": grau.to_dict("records"),
        "situacao_academica": situacao.to_dict("records"),
        "internacionalizacao_nacionalidade": nacionalidade.to_dict("records"),
        "tempo_medio_titulacao": tempo_titulacao.to_dict("records"),
        "tamanho_medio_programa": tamanho_medio.to_dict("records"),
        "faixa_etaria": faixa_etaria.to_dict("records"),
    }

# =====================================
# 4. PREPARAÇÃO PARA ANÁLISE POR ANO E EXPORTAÇÃO
# =====================================

anos_desejados = list(range(2017, 2025))
anos_presentes = sorted(computacao["AN_BASE"].dropna().unique().astype(int).tolist())

csv_saida = SAIDA_DIR / "computacao_discentes_2017_2024.csv"
computacao.to_csv(csv_saida, index=False, encoding="utf-8-sig")

# =====================================
# 5. CONSTRUÇÃO DO JSON E SALVAMENTO
# =====================================

indicadores_discentes = {
    "metadata": {
        "total_registros_computacao": int(len(computacao)),
        "anos_analisados": anos_presentes,
        "anos_disponiveis_esperados": anos_desejados,
        "conceitos": sorted(computacao["CD_CONCEITO_PROGRAMA"].unique().tolist()),
        "escopo": {
            "areas": areas_validas,
            "conceitos_filtro": [3, 4, 5, 6, 7],
            "periodo": [2017, 2024],
        },
    },
    "geral": gerar_indicadores_discentes(computacao),
    "por_ano": {}
}

for ano in anos_desejados:
    df_ano = computacao[computacao["AN_BASE"] == ano].copy()
    indicadores_discentes["por_ano"][str(ano)] = gerar_indicadores_discentes(df_ano)

json_saida = SAIDA_DIR / "indicadores_computacao_discentes_final.json"
with open(json_saida, "w", encoding="utf-8") as arquivo_json:
    json.dump(indicadores_discentes, arquivo_json, ensure_ascii=False, indent=2)

print("\nProcessamento concluído.")
print(f"CSV gerado em: {csv_saida}")
print(f"JSON gerado em: {json_saida}")