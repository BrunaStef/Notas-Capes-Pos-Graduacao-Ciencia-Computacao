import pandas as pd
import os
import json
import glob
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

caminho_indicadores = os.path.join(BASE_DIR, "indicadores", "programas")
os.makedirs(caminho_indicadores, exist_ok=True)

areas_validas = ["CIÊNCIA DA COMPUTAÇÃO", "COMPUTAÇÃO", "ENGENHARIA DA COMPUTAÇÃO"]

print("[1/6] Iniciando carregamento de Discentes...")
arquivos_discentes = glob.glob(os.path.join(BASE_DIR, "br-capes-colsucup-discentes-*.xlsx")) + glob.glob(os.path.join(BASE_DIR, "br-capes-colsucup-discentes-*.csv"))
print(f"      Encontrados {len(arquivos_discentes)} arquivos de discentes.")

dfs_discentes = []
for arq in arquivos_discentes:
    try:
        print(f"      Lendo: {os.path.basename(arq)}...")
        df_ano = pd.read_excel(arq) if arq.endswith(".xlsx") else pd.read_csv(arq, sep=";", encoding="latin1", low_memory=False)
        dfs_discentes.append(df_ano)
    except Exception as e:
        print(f"      Erro ao ler {os.path.basename(arq)}: {e}")

print("      Concatenando dados de discentes...")
df_discentes_raw = pd.concat(dfs_discentes, ignore_index=True)

print("      Filtrando e limpando dados de discentes...")
df_discentes = df_discentes_raw[df_discentes_raw["NM_AREA_AVALIACAO"].astype(str).str.strip().str.upper().isin(areas_validas)].copy()
df_discentes["AN_BASE"] = pd.to_numeric(df_discentes["AN_BASE"], errors="coerce").dropna().astype(int)
df_discentes["CD_PROGRAMA_IES"] = df_discentes["CD_PROGRAMA_IES"].astype(str).str.strip()

print("[2/6] Iniciando carregamento de Docentes...")
arquivos_docentes = glob.glob(os.path.join(BASE_DIR, "br-capes-colsucup-docente-*.xlsx")) + glob.glob(os.path.join(BASE_DIR, "br-capes-colsucup-docente-*.csv"))
print(f"      Encontrados {len(arquivos_docentes)} arquivos de docentes.")

dfs_docentes = []
for arq in arquivos_docentes:
    try:
        print(f"      Lendo: {os.path.basename(arq)}...")
        df_ano = pd.read_excel(arq) if arq.endswith(".xlsx") else pd.read_csv(arq, sep=";", encoding="latin1", low_memory=False)
        dfs_docentes.append(df_ano)
    except Exception as e:
        print(f"      Erro ao ler {os.path.basename(arq)}: {e}")

print("      Concatenando dados de docentes...")
df_docentes_raw = pd.concat(dfs_docentes, ignore_index=True)

print("      Filtrando e limpando dados de docentes...")
df_docentes = df_docentes_raw[df_docentes_raw["NM_AREA_AVALIACAO"].astype(str).str.strip().str.upper().isin(areas_validas)].copy()
df_docentes["AN_BASE"] = pd.to_numeric(df_docentes["AN_BASE"], errors="coerce").dropna().astype(int)
df_docentes["CD_PROGRAMA_IES"] = df_docentes["CD_PROGRAMA_IES"].astype(str).str.strip()

print("[3/6] Gerando mapeamento de menus para o Front-end...")
menu_opcoes = {}
mapeamento_programas = df_discentes.dropna(subset=["SG_ENTIDADE_ENSINO", "NM_PROGRAMA_IES"]).groupby(
    ["SG_ENTIDADE_ENSINO", "CD_PROGRAMA_IES", "NM_PROGRAMA_IES"]
).size().reset_index()

for _, row in mapeamento_programas.iterrows():
    ies = str(row["SG_ENTIDADE_ENSINO"]).strip().upper()
    cd_prog = str(row["CD_PROGRAMA_IES"]).strip()
    nm_prog = str(row["NM_PROGRAMA_IES"]).strip().upper()
    
    if ies not in menu_opcoes:
        menu_opcoes[ies] = []
        
    if not any(p["cd_programa"] == cd_prog for p in menu_opcoes[ies]):
        menu_opcoes[ies].append({
            "cd_programa": cd_prog,
            "nm_programa": nm_prog
        })

caminho_menu = os.path.join(BASE_DIR, "indicadores", "menu_opcoes.json")
with open(caminho_menu, "w", encoding="utf-8") as f:
    json.dump(menu_opcoes, f, ensure_ascii=False, indent=2)
print(f"      Menu salvo em: {caminho_menu}")

print("[4/6] Definindo funções de cálculo...")

def calcular_proporcao_programa(df_dados, coluna_analise):
    df_aux = df_dados.dropna(subset=[coluna_analise]).copy()
    if df_aux[coluna_analise].dtype == "object":
        df_aux[coluna_analise] = df_aux[coluna_analise].astype(str).str.strip().str.upper()
    if len(df_aux) == 0: return []
    
    agrupado = df_aux.groupby(coluna_analise).size().reset_index(name="TOTAL")
    total = agrupado["TOTAL"].sum()
    agrupado["PERCENTUAL"] = ((agrupado["TOTAL"] / total) * 100).round(2)
    return agrupado.to_dict("records")

def gerar_metricas_discentes_programa(df_base):
    if len(df_base) == 0: return {}
    
    titulados = df_base[df_base["NM_SITUACAO_DISCENTE"].astype(str).str.strip().str.upper() == "TITULADO"].copy()
    titulados["QT_MES_TITULACAO"] = pd.to_numeric(titulados["QT_MES_TITULACAO"], errors="coerce")
    titulados = titulados[titulados["QT_MES_TITULACAO"] > 0]
    
    tempo_titulacao = titulados.dropna(subset=["QT_MES_TITULACAO", "DS_GRAU_ACADEMICO_DISCENTE"]).groupby(
        "DS_GRAU_ACADEMICO_DISCENTE"
    )["QT_MES_TITULACAO"].mean().round(1).reset_index(name="MEDIA_MESES_TITULACAO")

    tamanho_medio = df_base.groupby("AN_BASE").size().mean().round(1)

    return {
        "distribuicao_grau_academico": calcular_proporcao_programa(df_base, "DS_GRAU_ACADEMICO_DISCENTE"),
        "situacao_academica": calcular_proporcao_programa(df_base, "NM_SITUACAO_DISCENTE"),
        "internacionalizacao_nacionalidade": calcular_proporcao_programa(df_base, "DS_TIPO_NACIONALIDADE_DISCENTE"),
        "tempo_medio_titulacao": tempo_titulacao.to_dict("records"),
        "tamanho_total_alunos_periodo": int(len(df_base)),
        "media_alunos_por_ano": float(tamanho_medio),
        "faixa_etaria": calcular_proporcao_programa(df_base, "DS_FAIXA_ETARIA")
    }

def gerar_metricas_docentes_programa(df_base):
    docentes_permanentes = df_base[df_base["DS_CATEGORIA_DOCENTE"].astype(str).str.strip().str.upper() == "PERMANENTE"].copy()
    if len(df_base) == 0: return {}
    
    if len(docentes_permanentes) > 0:
        docentes_permanentes["TEM_BOLSA_PQ"] = docentes_permanentes["CD_CAT_BOLSA_PRODUTIVIDADE"].apply(
            lambda x: "NÃO" if pd.isna(x) or str(x).strip().upper() in ["NA", "NÃO", "NÃO INFORMADO", "NAN", "NONE"] else "SIM"
        )
        docentes_permanentes["TITULADO_NO_EXTERIOR"] = docentes_permanentes["NM_PAIS_IES_TITULACAO"].apply(
            lambda x: "NÃO" if pd.isna(x) or str(x).strip().upper() == "BRASIL" else "SIM"
        )
        docentes_permanentes["DOCENTE_ESTRANGEIRO"] = docentes_permanentes["DS_TIPO_NACIONALIDADE_DOCENTE"].apply(
            lambda x: "BRASILEIRO" if str(x).strip().upper() == "BRASILEIRO" else "ESTRANGEIRO"
        )
        docentes_permanentes["ENDOGAMIA"] = np.where(
            docentes_permanentes["SG_ENTIDADE_ENSINO"].astype(str).str.strip().str.upper() == docentes_permanentes["SG_IES_TITULACAO"].astype(str).str.strip().str.upper(), 
            "SIM", "NÃO"
        )
        docentes_permanentes["AN_TITULACAO"] = pd.to_numeric(docentes_permanentes["AN_TITULACAO"], errors="coerce")
        docentes_permanentes["TEMPO_DOUTORADO"] = docentes_permanentes["AN_BASE"] - docentes_permanentes["AN_TITULACAO"]
        
        maturidade = docentes_permanentes["TEMPO_DOUTORADO"].dropna().mean()
        maturidade = round(maturidade, 1) if not pd.isna(maturidade) else 0
        
        bolsas_pq = calcular_proporcao_programa(docentes_permanentes, "TEM_BOLSA_PQ")
        titulacao_exterior = calcular_proporcao_programa(docentes_permanentes, "TITULADO_NO_EXTERIOR")
        nacionalidade = calcular_proporcao_programa(docentes_permanentes, "DOCENTE_ESTRANGEIRO")
        endogamia = calcular_proporcao_programa(docentes_permanentes, "ENDOGAMIA")
        regime_trabalho = calcular_proporcao_programa(docentes_permanentes, "DS_REGIME_TRABALHO")
    else:
        bolsas_pq, titulacao_exterior, nacionalidade, endogamia, regime_trabalho, maturidade = [], [], [], [], [], 0

    return {
        "lideranca_bolsas_pq": bolsas_pq,
        "internacionalizacao_titulacao_exterior": titulacao_exterior,
        "internacionalizacao_nacionalidade": nacionalidade,
        "endogamia_academica": endogamia,
        "maturidade_media_anos_doutorado": float(maturidade),
        "categoria_docente": calcular_proporcao_programa(df_base, "DS_CATEGORIA_DOCENTE"),
        "regime_trabalho": regime_trabalho
    }

print("[5/6] Identificando programas únicos e preparando loop...")
todos_programas = set(df_discentes["CD_PROGRAMA_IES"].unique()).union(set(df_docentes["CD_PROGRAMA_IES"].unique()))
anos_desejados = list(range(2017, 2025))

total_programas = len(todos_programas)
print(f"      Total de {total_programas} programas para processar.")

print("[6/6] Processando JSONs individuais de cada programa...")
for index, cd_programa in enumerate(todos_programas, start=1):
    if pd.isna(cd_programa) or cd_programa == "nan": continue
    
    if index % 50 == 0 or index == 1 or index == total_programas:
        print(f"      Processando programa {index}/{total_programas}: {cd_programa}")
    
    df_disc_prog = df_discentes[df_discentes["CD_PROGRAMA_IES"] == cd_programa]
    df_doc_prog = df_docentes[df_docentes["CD_PROGRAMA_IES"] == cd_programa]
    
    nm_programa = "NÃO INFORMADO"
    sg_ies = "NÃO INFORMADO"
    conceito_recente = "NÃO INFORMADO"
    
    if not df_disc_prog.empty:
        nm_programa = str(df_disc_prog["NM_PROGRAMA_IES"].iloc[0]).strip().upper()
        sg_ies = str(df_disc_prog["SG_ENTIDADE_ENSINO"].iloc[0]).strip().upper()
        ano_max = df_disc_prog["AN_BASE"].max()
        conceito_recente = df_disc_prog[df_disc_prog["AN_BASE"] == ano_max]["CD_CONCEITO_PROGRAMA"].iloc[0]
    elif not df_doc_prog.empty:
        nm_programa = str(df_doc_prog["NM_PROGRAMA_IES"].iloc[0]).strip().upper()
        sg_ies = str(df_doc_prog["SG_ENTIDADE_ENSINO"].iloc[0]).strip().upper()
        ano_max = df_doc_prog["AN_BASE"].max()
        conceito_recente = df_doc_prog[df_doc_prog["AN_BASE"] == ano_max]["CD_CONCEITO_PROGRAMA"].iloc[0]

    json_programa = {
        "metadata": {
            "cd_programa": cd_programa,
            "nm_programa": nm_programa,
            "sg_ies": sg_ies,
            "conceito_recente": int(conceito_recente) if pd.notna(conceito_recente) and str(conceito_recente).isdigit() else conceito_recente
        },
        "discentes": {
            "geral": gerar_metricas_discentes_programa(df_disc_prog),
            "por_ano": {}
        },
        "docentes": {
            "geral": gerar_metricas_docentes_programa(df_doc_prog),
            "por_ano": {}
        }
    }
    
    for ano in anos_desejados:
        df_disc_ano = df_disc_prog[df_disc_prog["AN_BASE"] == ano]
        df_doc_ano = df_doc_prog[df_doc_prog["AN_BASE"] == ano]
        
        if not df_disc_ano.empty:
            json_programa["discentes"]["por_ano"][str(ano)] = gerar_metricas_discentes_programa(df_disc_ano)
        if not df_doc_ano.empty:
            json_programa["docentes"]["por_ano"][str(ano)] = gerar_metricas_docentes_programa(df_doc_ano)
            
    caminho_saida = os.path.join(caminho_indicadores, f"{cd_programa}.json")
    with open(caminho_saida, "w", encoding="utf-8") as f_out:
        json.dump(json_programa, f_out, ensure_ascii=False)

print("\n[SUCESSO] Processamento concluído!")