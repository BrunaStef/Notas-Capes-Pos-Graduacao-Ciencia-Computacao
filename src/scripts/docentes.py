import pandas as pd
import os
import json
import zipfile
import numpy as np

arquivos = [
    "br-capes-colsucup-docente-2017-2021-11-10.xlsx",
    "br-capes-colsucup-docente-2018-2021-11-10.xlsx",
    "br-capes-colsucup-docente-2019-2021-11-10.xlsx",
    "br-capes-colsucup-docente-2020-2021-11-10.xlsx",
    "br-capes-colsucup-docente-2021-2025-03-31.xlsx",
    "br-capes-colsucup-docente-2022-2025-03-31.xlsx",
    "br-capes-colsucup-docente-2023-2025-03-31.xlsx",
    "br-capes-colsucup-docente-2024-2025-12-01.xlsx",
]

dfs = []

for arquivo in arquivos:
    if os.path.exists(arquivo):
        print(f"Lendo {arquivo}...")
        try:
            df_ano = pd.read_excel(arquivo)
            dfs.append(df_ano)
        except zipfile.BadZipFile:
            try:
                df_ano = pd.read_csv(arquivo, sep=";", encoding="latin1", low_memory=False)
                dfs.append(df_ano)
            except Exception as e:
                print(f"Falha ao ler {arquivo}: {e}")
        except Exception as e:
            print(f"Falha ao ler {arquivo}: {e}")

if not dfs:
    raise RuntimeError("Nenhum arquivo válido foi carregado.")

df = pd.concat(dfs, ignore_index=True)


areas_validas = ["CIÊNCIA DA COMPUTAÇÃO", "COMPUTAÇÃO", "ENGENHARIA DA COMPUTAÇÃO"]

computacao = df[
    df["NM_AREA_AVALIACAO"].astype(str).str.strip().str.upper().isin(areas_validas)
].copy()

computacao["CD_CONCEITO_PROGRAMA"] = pd.to_numeric(computacao["CD_CONCEITO_PROGRAMA"], errors="coerce")
computacao = computacao[computacao["CD_CONCEITO_PROGRAMA"].isin([3, 4, 5, 6, 7])].copy()
computacao["CD_CONCEITO_PROGRAMA"] = computacao["CD_CONCEITO_PROGRAMA"].astype(int)

computacao["AN_BASE"] = pd.to_numeric(computacao["AN_BASE"], errors="coerce")
computacao = computacao.dropna(subset=["AN_BASE"]).copy()
computacao["AN_BASE"] = computacao["AN_BASE"].astype(int)

print(f"\nRegistros válidos de Computação (Notas 3 a 7): {len(computacao):,}")


def calcular_proporcao(df_dados, coluna_analise):
    df_aux = df_dados.dropna(subset=["CD_CONCEITO_PROGRAMA", coluna_analise]).copy()
    agrupado = (
        df_aux.groupby(["CD_CONCEITO_PROGRAMA", coluna_analise])
        .size()
        .reset_index(name="TOTAL_DOCENTES")
    )
    total_por_conceito = agrupado.groupby("CD_CONCEITO_PROGRAMA")["TOTAL_DOCENTES"].transform("sum")
    agrupado["PERCENTUAL"] = ((agrupado["TOTAL_DOCENTES"] / total_por_conceito) * 100).round(2)
    return agrupado

def gerar_indicadores(df_base):
    df_base = df_base.copy()

    docentes_permanentes = df_base[
        df_base["DS_CATEGORIA_DOCENTE"].astype(str).str.strip().str.upper() == "PERMANENTE"
    ].copy()

    if len(docentes_permanentes) == 0:
        return {
            "lideranca_bolsas_pq": [],
            "internacionalizacao_titulacao_exterior": [],
            "internacionalizacao_nacionalidade": [],
            "endogamia_academica": [],
            "maturidade_tempo_doutorado": [],
            "tamanho_medio_programa": [],
            "categoria_docente": [],
            "regime_trabalho": [],
            "desigualdade_regional": [],
            "natureza_instituicao": [],
            "top_20_instituicoes": [],
        }

    docentes_permanentes["TEM_BOLSA_PQ"] = docentes_permanentes["CD_CAT_BOLSA_PRODUTIVIDADE"].apply(
        lambda x: "NÃO" if pd.isna(x) or str(x).strip().upper() in ["NA", "NÃO", "NÃO INFORMADO", "NAN", "NONE"] else "SIM"
    )
    bolsas_pq = calcular_proporcao(docentes_permanentes, "TEM_BOLSA_PQ")

    docentes_permanentes["TITULADO_NO_EXTERIOR"] = docentes_permanentes["NM_PAIS_IES_TITULACAO"].apply(
        lambda x: "NÃO" if pd.isna(x) or str(x).strip().upper() == "BRASIL" else "SIM"
    )
    titulacao_exterior = calcular_proporcao(docentes_permanentes, "TITULADO_NO_EXTERIOR")

    docentes_permanentes["DOCENTE_ESTRANGEIRO"] = docentes_permanentes["DS_TIPO_NACIONALIDADE_DOCENTE"].apply(
        lambda x: "BRASILEIRO" if str(x).strip().upper() == "BRASILEIRO" else "ESTRANGEIRO"
    )
    nacionalidade = calcular_proporcao(docentes_permanentes, "DOCENTE_ESTRANGEIRO")

    categoria_docente = calcular_proporcao(df_base, "DS_CATEGORIA_DOCENTE")

    regime_trabalho = calcular_proporcao(docentes_permanentes, "DS_REGIME_TRABALHO")

    regioes_conceito = calcular_proporcao(df_base, "NM_REGIAO")

    docentes_permanentes["SG_ENTIDADE_ENSINO"] = docentes_permanentes["SG_ENTIDADE_ENSINO"].astype(str).str.strip().str.upper()
    docentes_permanentes["SG_IES_TITULACAO"] = docentes_permanentes["SG_IES_TITULACAO"].astype(str).str.strip().str.upper()

    docentes_permanentes["ENDOGAMIA"] = np.where(
        docentes_permanentes["SG_ENTIDADE_ENSINO"] == docentes_permanentes["SG_IES_TITULACAO"],
        "SIM",
        "NÃO"
    )
    endogamia = calcular_proporcao(docentes_permanentes, "ENDOGAMIA")

    docentes_permanentes["AN_TITULACAO"] = pd.to_numeric(docentes_permanentes["AN_TITULACAO"], errors="coerce")
    docentes_permanentes["TEMPO_DOUTORADO"] = docentes_permanentes["AN_BASE"] - docentes_permanentes["AN_TITULACAO"]

    maturidade = (
        docentes_permanentes.dropna(subset=["TEMPO_DOUTORADO"])
        .groupby("CD_CONCEITO_PROGRAMA")["TEMPO_DOUTORADO"]
        .mean()
        .round(1)
        .reset_index(name="MEDIA_ANOS_DOUTORADO")
    )

    tamanho_programa = (
        docentes_permanentes.groupby(["AN_BASE", "CD_PROGRAMA_IES", "CD_CONCEITO_PROGRAMA"])
        .size()
        .reset_index(name="QTD_DOCENTES")
    )

    tamanho_medio = (
        tamanho_programa.groupby("CD_CONCEITO_PROGRAMA")["QTD_DOCENTES"]
        .mean()
        .round(1)
        .reset_index(name="MEDIA_DOCENTES_PERMANENTES_POR_PROGRAMA")
    )

    natureza_inst = calcular_proporcao(df_base, "DS_DEPENDENCIA_ADMINISTRATIVA")

    top_instituicoes = (
        df_base.groupby(["SG_ENTIDADE_ENSINO", "NM_ENTIDADE_ENSINO"])
        .size()
        .reset_index(name="TOTAL_DOCENTES")
        .sort_values("TOTAL_DOCENTES", ascending=False)
        .head(20)
    )

    return {
        "lideranca_bolsas_pq": bolsas_pq.to_dict("records"),
        "internacionalizacao_titulacao_exterior": titulacao_exterior.to_dict("records"),
        "internacionalizacao_nacionalidade": nacionalidade.to_dict("records"),
        "endogamia_academica": endogamia.to_dict("records"),
        "maturidade_tempo_doutorado": maturidade.to_dict("records"),
        "tamanho_medio_programa": tamanho_medio.to_dict("records"),
        "categoria_docente": categoria_docente.to_dict("records"),
        "regime_trabalho": regime_trabalho.to_dict("records"),
        "desigualdade_regional": regioes_conceito.to_dict("records"),
        "natureza_instituicao": natureza_inst.to_dict("records"),
        "top_20_instituicoes": top_instituicoes.to_dict("records"),
    }

anos_desejados = list(range(2017, 2025))
anos_presentes = sorted(computacao["AN_BASE"].dropna().unique().astype(int).tolist())

os.makedirs("indicadores", exist_ok=True)
computacao.to_csv("indicadores/computacao_docentes_2017_2024.csv", index=False, encoding="utf-8-sig")

indicadores = {
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
    "geral": gerar_indicadores(computacao),
    "por_ano": {}
}

for ano in anos_desejados:
    df_ano = computacao[computacao["AN_BASE"] == ano].copy()
    indicadores["por_ano"][str(ano)] = gerar_indicadores(df_ano)

saida_json = "indicadores/indicadores_computacao_docentes_final.json"
with open(saida_json, "w", encoding="utf-8") as arquivo_json:
    json.dump(indicadores, arquivo_json, ensure_ascii=False, indent=2)

print(f"\nProcessamento concluído.")
print(f"JSON gerado em: {saida_json}")
print("Estrutura criada com:")
print("- 'geral' para a análise agregada 2017–2024")
print("- 'por_ano' com chaves de '2017' até '2024'")