import os
import json
import glob
from pathlib import Path

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent

SRC_DIR = BASE_DIR.parent

DATA_DIR = BASE_DIR / "data"

DADOS_PERIODICOS_DIR = (
    DATA_DIR
    / "dados-publicações"
    / "bibliográfica-periódicos"
)

ARQUIVO_PROGRAMAS = DATA_DIR / "programas_area_conceito.xlsx"

PADRAO_ARQUIVOS = str(DADOS_PERIODICOS_DIR / "*.xlsx")

SAIDA_DIR = SRC_DIR / "database"
SAIDA_DIR.mkdir(parents=True, exist_ok=True)

CSV_SAIDA = SAIDA_DIR / "computacao_bibliografica_periodicos_2017_2024.csv"
JSON_SAIDA = SAIDA_DIR / "indicadores_computacao_bibliografica_periodicos.json"


def tornar_json_seguro(obj):
    if isinstance(obj, dict):
        return {k: tornar_json_seguro(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [tornar_json_seguro(v) for v in obj]

    if isinstance(obj, np.integer):
        return int(obj)

    if isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)

    if isinstance(obj, np.bool_):
        return bool(obj)

    if pd.isna(obj):
        return None

    return obj


def dataframe_para_records(df_dados):
    return tornar_json_seguro(df_dados.to_dict("records"))


def normalizar_codigo_programa(serie):
    return (
        serie
        .astype(str)
        .str.strip()
        .str.replace(r"\.0$", "", regex=True)
    )


def normalizar_texto_coluna(df_dados, coluna):
    df_dados[coluna] = (
        df_dados[coluna]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    return df_dados


def campo_preenchido(valor):
    if pd.isna(valor):
        return False

    texto = str(valor).strip().upper()

    return texto not in ["", "NAN", "NONE", "NULL", "NA", "NÃO INFORMADO"]


def valor_mais_frequente(serie):
    serie = serie.dropna()

    if serie.empty:
        return None

    moda = serie.mode()

    if not moda.empty:
        return moda.iloc[0]

    return serie.iloc[0]

if not ARQUIVO_PROGRAMAS.exists():
    raise FileNotFoundError(
        f"Arquivo auxiliar não encontrado:\n{ARQUIVO_PROGRAMAS}\n\n"
        "Gere primeiro o arquivo programas_area_conceito.xlsx."
    )

print(f"Lendo arquivo auxiliar: {ARQUIVO_PROGRAMAS}")

colunas_programas = [
    "CD_PROGRAMA_IES",
    "NM_AREA_AVALIACAO",
    "AN_BASE",
    "CD_CONCEITO_PROGRAMA",
]

programas = pd.read_excel(
    ARQUIVO_PROGRAMAS,
    engine="openpyxl",
    usecols=lambda coluna: coluna in colunas_programas
)

programas.columns = programas.columns.astype(str).str.strip()

colunas_faltantes_programas = [
    coluna for coluna in colunas_programas if coluna not in programas.columns
]

if colunas_faltantes_programas:
    raise RuntimeError(
        "As seguintes colunas não foram encontradas no arquivo programas_area_conceito.xlsx:\n"
        f"{colunas_faltantes_programas}\n\n"
        "Colunas encontradas:\n"
        f"{list(programas.columns)}"
    )

programas["CD_PROGRAMA_IES"] = normalizar_codigo_programa(programas["CD_PROGRAMA_IES"])

programas["NM_AREA_AVALIACAO"] = (
    programas["NM_AREA_AVALIACAO"]
    .astype(str)
    .str.strip()
    .str.upper()
)

programas["AN_BASE"] = pd.to_numeric(
    programas["AN_BASE"],
    errors="coerce"
)

programas["CD_CONCEITO_PROGRAMA"] = pd.to_numeric(
    programas["CD_CONCEITO_PROGRAMA"],
    errors="coerce"
)

programas = programas.dropna(
    subset=[
        "CD_PROGRAMA_IES",
        "NM_AREA_AVALIACAO",
        "AN_BASE",
        "CD_CONCEITO_PROGRAMA",
    ]
).copy()

programas["AN_BASE"] = programas["AN_BASE"].astype(int)
programas["CD_CONCEITO_PROGRAMA"] = programas["CD_CONCEITO_PROGRAMA"].astype(int)

areas_validas = [
    "CIÊNCIA DA COMPUTAÇÃO",
    "COMPUTAÇÃO",
    "ENGENHARIA DA COMPUTAÇÃO",
]

programas_computacao = programas[
    programas["NM_AREA_AVALIACAO"].isin(areas_validas)
].copy()

programas_computacao = programas_computacao[
    programas_computacao["CD_CONCEITO_PROGRAMA"].isin([3, 4, 5, 6, 7])
].copy()

programas_computacao = programas_computacao[
    programas_computacao["AN_BASE"].between(2017, 2024)
].copy()

mapa_programas = (
    programas_computacao
    .groupby(["AN_BASE", "CD_PROGRAMA_IES"])
    .agg(
        NM_AREA_AVALIACAO=("NM_AREA_AVALIACAO", valor_mais_frequente),
        CD_CONCEITO_PROGRAMA=("CD_CONCEITO_PROGRAMA", valor_mais_frequente),
    )
    .reset_index()
)

print(f"Programas de Computação mapeados: {len(mapa_programas):,}")

if mapa_programas.empty:
    raise RuntimeError(
        "Nenhum programa de Computação foi encontrado no arquivo programas_area_conceito.xlsx."
    )

arquivos = sorted(
    arquivo for arquivo in glob.glob(PADRAO_ARQUIVOS)
    if not Path(arquivo).name.startswith("~$")
)

if not arquivos:
    raise RuntimeError(
        f"Nenhum arquivo encontrado para o padrão:\n{PADRAO_ARQUIVOS}"
    )

print(f"\nArquivos de periódicos encontrados: {len(arquivos)}")

dfs = []

colunas_publicacoes_uso = [
    "CD_PROGRAMA_IES",
    "NM_PROGRAMA_IES",
    "SG_ENTIDADE_ENSINO",
    "NM_ENTIDADE_ENSINO",
    "AN_BASE",
    "ID_ADD_PRODUCAO_INTELECTUAL",
    "ID_PRODUCAO_INTELECTUAL",
    "NM_PRODUCAO",
    "ID_TIPO_PRODUCAO",
    "NM_TIPO_PRODUCAO",
    "ID_SUBTIPO_PRODUCAO",
    "NM_SUBTIPO_PRODUCAO",
    "ID_FORMULARIO_PRODUCAO",
    "NM_FORMULARIO",
    "ID_AREA_CONCENTRACAO",
    "NM_AREA_CONCENTRACAO",
    "ID_LINHA_PESQUISA",
    "NM_LINHA_PESQUISA",
    "ID_PROJETO",
    "NM_PROJETO",
    "DH_INICIO_AREA_CONC",
    "DH_FIM_AREA_CONC",
    "DH_INICIO_LINHA",
    "DH_FIM_LINHA",
    "CD_IDENTIFICADOR_VEICULO",
    "DS_TITULO_PADRONIZADO",
    "IN_GLOSA",
    "IN_PRODUCAO_COM_VINCULO_TCC",
    "ID_ADD_TRABALHO_CONCLUSAO_CT",
    "ID_ADD_FOTO_PROGRAMA",
    "ID_ADD_FOTO_PROGRAMA_IES",
]

for arquivo in arquivos:
    caminho_arquivo = Path(arquivo)
    nome_arquivo = os.path.basename(arquivo)

    print(f"\nLendo {nome_arquivo}...")
    print(f"  Caminho: {caminho_arquivo}")
    print(f"  Existe? {caminho_arquivo.exists()}")

    try:
        df_arquivo = pd.read_excel(
            caminho_arquivo,
            engine="openpyxl",
            usecols=lambda coluna: coluna in colunas_publicacoes_uso
        )

        df_arquivo.columns = df_arquivo.columns.astype(str).str.strip()
        df_arquivo["ARQUIVO_ORIGEM"] = nome_arquivo

        print(f"  Arquivo lido com sucesso. Linhas: {len(df_arquivo):,}")

        dfs.append(df_arquivo)

    except Exception as e:
        print(f"Falha ao ler {nome_arquivo}: {type(e).__name__} - {e}")

if not dfs:
    raise RuntimeError("Nenhum arquivo válido pôde ser carregado.")

publicacoes = pd.concat(dfs, ignore_index=True)

print(f"\nTotal bruto de registros de periódicos: {len(publicacoes):,}")


colunas_obrigatorias_publicacoes = [
    "AN_BASE",
    "CD_PROGRAMA_IES",
]

colunas_faltantes_publicacoes = [
    coluna for coluna in colunas_obrigatorias_publicacoes
    if coluna not in publicacoes.columns
]

if colunas_faltantes_publicacoes:
    raise RuntimeError(
        "As seguintes colunas obrigatórias não foram encontradas nos arquivos de periódicos:\n"
        f"{colunas_faltantes_publicacoes}\n\n"
        "Colunas disponíveis:\n"
        f"{list(publicacoes.columns)}"
    )

publicacoes["AN_BASE"] = pd.to_numeric(
    publicacoes["AN_BASE"],
    errors="coerce"
)

publicacoes = publicacoes.dropna(
    subset=["AN_BASE", "CD_PROGRAMA_IES"]
).copy()

publicacoes["AN_BASE"] = publicacoes["AN_BASE"].astype(int)

publicacoes["CD_PROGRAMA_IES"] = normalizar_codigo_programa(
    publicacoes["CD_PROGRAMA_IES"]
)

publicacoes = publicacoes[
    publicacoes["AN_BASE"].between(2017, 2024)
].copy()

computacao = publicacoes.merge(
    mapa_programas,
    on=["AN_BASE", "CD_PROGRAMA_IES"],
    how="inner"
)

print(
    "\nRegistros válidos de Computação "
    f"(Bibliográfica - Periódicos - Notas 3 a 7): {len(computacao):,}"
)

if computacao.empty:
    raise RuntimeError(
        "Nenhuma publicação foi associada aos programas de Computação.\n\n"
        "Verifique se CD_PROGRAMA_IES e AN_BASE estão compatíveis entre:\n"
        "- programas_area_conceito.xlsx\n"
        "- arquivos de bibliográfica-periódicos"
    )

def calcular_total_por_conceito(df_dados):
    if df_dados.empty:
        return []

    agrupado = (
        df_dados
        .dropna(subset=["CD_CONCEITO_PROGRAMA"])
        .groupby("CD_CONCEITO_PROGRAMA")
        .size()
        .reset_index(name="TOTAL_PUBLICACOES")
    )

    total_geral = agrupado["TOTAL_PUBLICACOES"].sum()

    if total_geral > 0:
        agrupado["PERCENTUAL"] = (
            (agrupado["TOTAL_PUBLICACOES"] / total_geral) * 100
        ).round(2)
    else:
        agrupado["PERCENTUAL"] = 0

    return dataframe_para_records(agrupado)


def calcular_evolucao_anual_por_conceito(df_dados):
    if df_dados.empty:
        return []

    agrupado = (
        df_dados
        .dropna(subset=["AN_BASE", "CD_CONCEITO_PROGRAMA"])
        .groupby(["AN_BASE", "CD_CONCEITO_PROGRAMA"])
        .size()
        .reset_index(name="TOTAL_PUBLICACOES")
        .sort_values(["AN_BASE", "CD_CONCEITO_PROGRAMA"])
    )

    return dataframe_para_records(agrupado)


def calcular_media_publicacoes_por_programa(df_dados):
    if df_dados.empty:
        return []

    tamanho_programa = (
        df_dados
        .dropna(subset=["AN_BASE", "CD_PROGRAMA_IES", "CD_CONCEITO_PROGRAMA"])
        .groupby(["AN_BASE", "CD_PROGRAMA_IES", "CD_CONCEITO_PROGRAMA"])
        .size()
        .reset_index(name="QTD_PUBLICACOES")
    )

    if tamanho_programa.empty:
        return []

    media = (
        tamanho_programa
        .groupby("CD_CONCEITO_PROGRAMA")["QTD_PUBLICACOES"]
        .mean()
        .round(1)
        .reset_index(name="MEDIA_PUBLICACOES_POR_PROGRAMA")
    )

    return dataframe_para_records(media)


def calcular_programas_por_conceito(df_dados):
    if df_dados.empty:
        return []

    agrupado = (
        df_dados
        .dropna(subset=["CD_CONCEITO_PROGRAMA", "CD_PROGRAMA_IES"])
        .groupby("CD_CONCEITO_PROGRAMA")["CD_PROGRAMA_IES"]
        .nunique()
        .reset_index(name="TOTAL_PROGRAMAS")
    )

    return dataframe_para_records(agrupado)


def calcular_proporcao(df_dados, coluna_analise):
    if df_dados.empty:
        return []

    if coluna_analise not in df_dados.columns:
        return []

    df_aux = df_dados.dropna(
        subset=["CD_CONCEITO_PROGRAMA", coluna_analise]
    ).copy()

    if df_aux.empty:
        return []

    df_aux = normalizar_texto_coluna(df_aux, coluna_analise)

    agrupado = (
        df_aux
        .groupby(["CD_CONCEITO_PROGRAMA", coluna_analise])
        .size()
        .reset_index(name="TOTAL_PUBLICACOES")
    )

    total_por_conceito = (
        agrupado
        .groupby("CD_CONCEITO_PROGRAMA")["TOTAL_PUBLICACOES"]
        .transform("sum")
    )

    agrupado["PERCENTUAL"] = (
        (agrupado["TOTAL_PUBLICACOES"] / total_por_conceito) * 100
    ).round(2)

    return dataframe_para_records(agrupado)


def calcular_top_por_coluna(df_dados, coluna, top_n=15):
    if df_dados.empty:
        return []

    if coluna not in df_dados.columns:
        return []

    df_aux = df_dados.dropna(
        subset=["CD_CONCEITO_PROGRAMA", coluna]
    ).copy()

    if df_aux.empty:
        return []

    df_aux = normalizar_texto_coluna(df_aux, coluna)

    agrupado = (
        df_aux
        .groupby(["CD_CONCEITO_PROGRAMA", coluna])
        .size()
        .reset_index(name="TOTAL_PUBLICACOES")
        .sort_values(
            ["CD_CONCEITO_PROGRAMA", "TOTAL_PUBLICACOES"],
            ascending=[True, False]
        )
    )

    top = (
        agrupado
        .groupby("CD_CONCEITO_PROGRAMA")
        .head(top_n)
        .reset_index(drop=True)
    )

    return dataframe_para_records(top)


def calcular_presenca_campo(df_dados, coluna, nome_status):
    if df_dados.empty:
        return []

    if coluna not in df_dados.columns:
        return []

    df_aux = df_dados.dropna(
        subset=["CD_CONCEITO_PROGRAMA"]
    ).copy()

    if df_aux.empty:
        return []

    df_aux[nome_status] = df_aux[coluna].apply(
        lambda valor: (
            f"COM_{nome_status}"
            if campo_preenchido(valor)
            else f"SEM_{nome_status}"
        )
    )

    agrupado = (
        df_aux
        .groupby(["CD_CONCEITO_PROGRAMA", nome_status])
        .size()
        .reset_index(name="TOTAL_PUBLICACOES")
    )

    total_por_conceito = (
        agrupado
        .groupby("CD_CONCEITO_PROGRAMA")["TOTAL_PUBLICACOES"]
        .transform("sum")
    )

    agrupado["PERCENTUAL"] = (
        (agrupado["TOTAL_PUBLICACOES"] / total_por_conceito) * 100
    ).round(2)

    return dataframe_para_records(agrupado)


def gerar_indicadores_bibliografica_periodicos(df_base):
    if df_base.empty:
        return {
            "total_publicacoes_por_conceito": [],
            "evolucao_anual_por_conceito": [],
            "media_publicacoes_por_programa": [],
            "programas_por_conceito": [],
            "tipo_producao": [],
            "subtipo_producao": [],
            "formulario": [],
            "producao_com_vinculo_tcc": [],
            "glosa": [],
            "veiculos_mais_frequentes": [],
            "producoes_mais_frequentes": [],
            "areas_concentracao_mais_frequentes": [],
            "linhas_pesquisa_mais_frequentes": [],
            "projetos_mais_frequentes": [],
            "instituicoes_mais_frequentes": [],
            "presenca_identificador_veiculo": [],
        }

    return {
        "total_publicacoes_por_conceito": calcular_total_por_conceito(df_base),

        "evolucao_anual_por_conceito": calcular_evolucao_anual_por_conceito(df_base),

        "media_publicacoes_por_programa": calcular_media_publicacoes_por_programa(df_base),

        "programas_por_conceito": calcular_programas_por_conceito(df_base),

        "tipo_producao": calcular_proporcao(
            df_base,
            "NM_TIPO_PRODUCAO"
        ),

        "subtipo_producao": calcular_proporcao(
            df_base,
            "NM_SUBTIPO_PRODUCAO"
        ),

        "formulario": calcular_proporcao(
            df_base,
            "NM_FORMULARIO"
        ),

        "producao_com_vinculo_tcc": calcular_proporcao(
            df_base,
            "IN_PRODUCAO_COM_VINCULO_TCC"
        ),

        "glosa": calcular_proporcao(
            df_base,
            "IN_GLOSA"
        ),

        "veiculos_mais_frequentes": calcular_top_por_coluna(
            df_base,
            "DS_TITULO_PADRONIZADO",
            top_n=15
        ),

        "producoes_mais_frequentes": calcular_top_por_coluna(
            df_base,
            "NM_PRODUCAO",
            top_n=15
        ),

        "areas_concentracao_mais_frequentes": calcular_top_por_coluna(
            df_base,
            "NM_AREA_CONCENTRACAO",
            top_n=15
        ),

        "linhas_pesquisa_mais_frequentes": calcular_top_por_coluna(
            df_base,
            "NM_LINHA_PESQUISA",
            top_n=15
        ),

        "projetos_mais_frequentes": calcular_top_por_coluna(
            df_base,
            "NM_PROJETO",
            top_n=15
        ),

        "instituicoes_mais_frequentes": calcular_top_por_coluna(
            df_base,
            "NM_ENTIDADE_ENSINO",
            top_n=15
        ),

        "presenca_identificador_veiculo": calcular_presenca_campo(
            df_base,
            "CD_IDENTIFICADOR_VEICULO",
            "IDENTIFICADOR_VEICULO"
        ),
    }

anos_desejados = list(range(2017, 2025))

anos_presentes = sorted(
    computacao["AN_BASE"]
    .dropna()
    .unique()
    .astype(int)
    .tolist()
)

conceitos_presentes = sorted(
    computacao["CD_CONCEITO_PROGRAMA"]
    .dropna()
    .unique()
    .astype(int)
    .tolist()
)

programas_presentes = int(computacao["CD_PROGRAMA_IES"].nunique())

computacao.to_csv(CSV_SAIDA, index=False, encoding="utf-8-sig")

indicadores_bibliografica_periodicos = {
    "metadata": {
        "total_registros_periodicos_bruto": int(len(publicacoes)),
        "total_registros_computacao": int(len(computacao)),
        "total_programas_computacao": programas_presentes,
        "tipo_producao": "bibliografica_periodicos",
        "anos_analisados": anos_presentes,
        "anos_disponiveis_esperados": anos_desejados,
        "conceitos": conceitos_presentes,
        "arquivos_lidos": [os.path.basename(arquivo) for arquivo in arquivos],
        "arquivo_auxiliar": str(ARQUIVO_PROGRAMAS),
        "escopo": {
            "areas": areas_validas,
            "conceitos_filtro": [3, 4, 5, 6, 7],
            "periodo": [2017, 2024],
            "fonte_dados": "CAPES Sucupira - Produção Bibliográfica em Periódicos",
            "observacao": (
                "Os arquivos de produção bibliográfica não possuem diretamente "
                "NM_AREA_AVALIACAO e CD_CONCEITO_PROGRAMA. Essas informações foram "
                "obtidas pelo cruzamento com programas_area_conceito.xlsx usando "
                "AN_BASE e CD_PROGRAMA_IES."
            ),
        },
    },
    "geral": gerar_indicadores_bibliografica_periodicos(computacao),
    "por_ano": {}
}

for ano in anos_desejados:
    df_ano = computacao[computacao["AN_BASE"] == ano].copy()

    indicadores_bibliografica_periodicos["por_ano"][str(ano)] = (
        gerar_indicadores_bibliografica_periodicos(df_ano)
    )

with open(JSON_SAIDA, "w", encoding="utf-8") as arquivo_json:
    json.dump(
        tornar_json_seguro(indicadores_bibliografica_periodicos),
        arquivo_json,
        ensure_ascii=False,
        indent=2
    )

print("\nProcessamento concluído.")
print(f"CSV gerado em: {CSV_SAIDA}")
print(f"JSON gerado em: {JSON_SAIDA}")