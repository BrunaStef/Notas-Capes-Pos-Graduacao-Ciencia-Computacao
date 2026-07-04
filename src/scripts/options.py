import pandas as pd
import os
import json
import glob
import numpy as np

DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(DIR, "data")

caminho_indicadores = os.path.join(BASE_DIR, "indicadores", "programas-atualizados")
os.makedirs(caminho_indicadores, exist_ok=True)

# Limites globais para normalização (baseados no script principal de consolidação)
GLOBAL_BOUNDS = {
    "total_docentes_permanentes": {"min": 0, "max": 150},
    "docentes_permanentes_por_programa": {"min": 0, "max": 150},
    "pct_docentes_permanentes": {"min": 0, "max": 100},
    "pct_pq": {"min": 0, "max": 100},
    "pct_titulado_no_exterior": {"min": 0, "max": 100},
    "pct_docente_estrangeiro": {"min": 0, "max": 100},
    "pct_endogamia": {"min": 0, "max": 100},
    "pct_dedicacao_exclusiva": {"min": 0, "max": 100},
    "pct_instituicao_publica": {"min": 0, "max": 100},
    "media_anos_doutorado": {"min": 0, "max": 40},
    "discentes_por_programa": {"min": 0, "max": 1000},
    "pct_mestrado": {"min": 0, "max": 100},
    "pct_doutorado": {"min": 0, "max": 100},
    "pct_titulado": {"min": 0, "max": 100},
    "taxa_evasao": {"min": 0, "max": 100},
    "pct_estrangeiro_discente": {"min": 0, "max": 100},
    "media_meses_titulacao_mestrado": {"min": 0, "max": 60},
    "media_meses_titulacao_doutorado": {"min": 0, "max": 72}
}

areas_validas = ["CIÊNCIA DA COMPUTAÇÃO", "COMPUTAÇÃO", "ENGENHARIA DA COMPUTAÇÃO"]

print("[1/6] Iniciando carregamento de Discentes...")
arquivos_discentes = glob.glob(os.path.join(BASE_DIR, "br-capes-colsucup-discentes-*.xlsx")) + glob.glob(os.path.join(BASE_DIR, "br-capes-colsucup-discentes-*.csv"))
dfs_discentes = []
for arq in arquivos_discentes:
    try:
        print(f"lendo {os.path.basename(arq)}...")

        df_ano = pd.read_excel(arq) if arq.endswith(".xlsx") else pd.read_csv(arq, sep=";", encoding="latin1", low_memory=False)
        dfs_discentes.append(df_ano)
    except Exception as e:
        print(f"      Erro ao ler {os.path.basename(arq)}: {e}")

df_discentes = pd.concat(dfs_discentes, ignore_index=True)
df_discentes = df_discentes[df_discentes["NM_AREA_AVALIACAO"].astype(str).str.strip().str.upper().isin(areas_validas)].copy()
df_discentes["AN_BASE"] = pd.to_numeric(df_discentes["AN_BASE"], errors="coerce").astype(int)
df_discentes["CD_PROGRAMA_IES"] = df_discentes["CD_PROGRAMA_IES"].astype(str).str.strip()

print("[2/6] Iniciando carregamento de Docentes...")
arquivos_docentes = glob.glob(os.path.join(BASE_DIR, "br-capes-colsucup-docente-*.xlsx")) + glob.glob(os.path.join(BASE_DIR, "br-capes-colsucup-docente-*.csv"))
dfs_docentes = []
for arq in arquivos_docentes:
    try:
        print(f"lendo {os.path.basename(arq)}...")
        df_ano = pd.read_excel(arq) if arq.endswith(".xlsx") else pd.read_csv(arq, sep=";", encoding="latin1", low_memory=False)
        dfs_docentes.append(df_ano)
    except Exception as e:
        print(f"      Erro ao ler {os.path.basename(arq)}: {e}")

df_docentes = pd.concat(dfs_docentes, ignore_index=True)
df_docentes = df_docentes[df_docentes["NM_AREA_AVALIACAO"].astype(str).str.strip().str.upper().isin(areas_validas)].copy()
df_docentes["AN_BASE"] = pd.to_numeric(df_docentes["AN_BASE"], errors="coerce").astype(int)
df_docentes["CD_PROGRAMA_IES"] = df_docentes["CD_PROGRAMA_IES"].astype(str).str.strip()

def calcular_metricas_radar_programa(df_doc_prog, df_disc_prog):
    permanentes = df_doc_prog[df_doc_prog["DS_CATEGORIA_DOCENTE"].astype(str).str.strip().str.upper() == "PERMANENTE"]
    total_doc = len(permanentes)
    
    pct_pq = (len(permanentes[permanentes["CD_CAT_BOLSA_PRODUTIVIDADE"].notna()]) / total_doc * 100) if total_doc > 0 else 0
    pct_ext = (len(permanentes[permanentes["NM_PAIS_IES_TITULACAO"].astype(str).str.strip().str.upper() != "BRASIL"]) / total_doc * 100) if total_doc > 0 else 0
    pct_doc_est = (len(permanentes[permanentes["DS_TIPO_NACIONALIDADE_DOCENTE"].astype(str).str.strip().str.upper() != "BRASILEIRO"]) / total_doc * 100) if total_doc > 0 else 0
    pct_endo = (len(permanentes[permanentes["SG_ENTIDADE_ENSINO"].astype(str).str.strip().str.upper() == permanentes["SG_IES_TITULACAO"].astype(str).str.strip().str.upper()]) / total_doc * 100) if total_doc > 0 else 0
    pct_ded = (len(permanentes[permanentes["DS_REGIME_TRABALHO"].astype(str).str.strip().str.upper() == "DEDICAÇÃO EXCLUSIVA"]) / total_doc * 100) if total_doc > 0 else 0
    
    pct_pub = 0
    if "DS_DEPENDENCIA_ADMINISTRATIVA" in permanentes.columns:
        pct_pub = (len(permanentes[permanentes["DS_DEPENDENCIA_ADMINISTRATIVA"].astype(str).str.strip().str.upper() == "PÚBLICA"]) / total_doc * 100) if total_doc > 0 else 0
    
    perm_copy = permanentes.copy()
    perm_copy["AN_TITULACAO"] = pd.to_numeric(perm_copy["AN_TITULACAO"], errors="coerce")
    maturidade = (perm_copy["AN_BASE"] - perm_copy["AN_TITULACAO"]).mean() if not perm_copy.empty else 0

    total_disc = len(df_disc_prog)
    pct_mest = (len(df_disc_prog[df_disc_prog["DS_GRAU_ACADEMICO_DISCENTE"].astype(str).str.upper() == "MESTRADO"]) / total_disc * 100) if total_disc > 0 else 0
    pct_dout = (len(df_disc_prog[df_disc_prog["DS_GRAU_ACADEMICO_DISCENTE"].astype(str).str.upper() == "DOUTORADO"]) / total_disc * 100) if total_disc > 0 else 0
    pct_tit = (len(df_disc_prog[df_disc_prog["NM_SITUACAO_DISCENTE"].astype(str).str.upper() == "TITULADO"]) / total_disc * 100) if total_disc > 0 else 0
    taxa_evas = (len(df_disc_prog[df_disc_prog["NM_SITUACAO_DISCENTE"].astype(str).str.upper() == "DESLIGADO"]) / total_disc * 100) if total_disc > 0 else 0
    pct_disc_est = (len(df_disc_prog[df_disc_prog["DS_TIPO_NACIONALIDADE_DISCENTE"].astype(str).str.upper() != "BRASILEIRA"]) / total_disc * 100) if total_disc > 0 else 0
    
    titulados = df_disc_prog[df_disc_prog["NM_SITUACAO_DISCENTE"].astype(str).str.upper() == "TITULADO"]
    media_m = titulados[titulados["DS_GRAU_ACADEMICO_DISCENTE"].astype(str).str.upper() == "MESTRADO"]["QT_MES_TITULACAO"].mean()
    media_d = titulados[titulados["DS_GRAU_ACADEMICO_DISCENTE"].astype(str).str.upper() == "DOUTORADO"]["QT_MES_TITULACAO"].mean()

    return {
        "total_docentes_permanentes": float(total_doc),
        "docentes_permanentes_por_programa": float(total_doc),
        "pct_docentes_permanentes": float(100),
        "pct_pq": float(pct_pq),
        "pct_titulado_no_exterior": float(pct_ext),
        "pct_docente_estrangeiro": float(pct_doc_est),
        "pct_endogamia": float(pct_endo),
        "pct_dedicacao_exclusiva": float(pct_ded),
        "pct_instituicao_publica": float(pct_pub),
        "media_anos_doutorado": float(maturidade),
        "discentes_por_programa": float(total_disc),
        "pct_mestrado": float(pct_mest),
        "pct_doutorado": float(pct_dout),
        "pct_titulado": float(pct_tit),
        "taxa_evasao": float(taxa_evas),
        "pct_estrangeiro_discente": float(pct_disc_est),
        "media_meses_titulacao_mestrado": float(media_m if pd.notna(media_m) else 0),
        "media_meses_titulacao_doutorado": float(media_d if pd.notna(media_d) else 0)
    }

def normalizar_metricas_programa(valores):
    normalizado = {}
    for key, val in valores.items():
        bounds = GLOBAL_BOUNDS.get(key, {"min": 0, "max": 1})
        norm = (val - bounds["min"]) / (bounds["max"] - bounds["min"]) if (bounds["max"] - bounds["min"]) != 0 else 0
        normalizado[key] = float(np.clip(norm, 0, 1))
    return normalizado

def gerar_radar_programa(df_doc, df_disc):
    reais = calcular_metricas_radar_programa(df_doc, df_disc)
    return {"valores_reais": reais, "normalizado": normalizar_metricas_programa(reais)}

print("[3/6] Gerando mapeamento de menus...")
menu_opcoes = {}
mapeamento = df_discentes.groupby(["SG_ENTIDADE_ENSINO", "CD_PROGRAMA_IES", "NM_PROGRAMA_IES"]).size().reset_index()
for _, row in mapeamento.iterrows():
    ies = str(row["SG_ENTIDADE_ENSINO"]).strip().upper()
    cd = str(row["CD_PROGRAMA_IES"]).strip()
    if ies not in menu_opcoes: menu_opcoes[ies] = []
    menu_opcoes[ies].append({"cd_programa": cd, "nm_programa": str(row["NM_PROGRAMA_IES"]).strip().upper()})
with open(os.path.join(BASE_DIR, "indicadores", "menu_opcoes.json"), "w", encoding="utf-8") as f:
    json.dump(menu_opcoes, f, ensure_ascii=False, indent=2)

def calcular_proporcao_programa(df_dados, col):
    df_aux = df_dados.dropna(subset=[col]).copy()
    if df_aux[col].dtype == "object": df_aux[col] = df_aux[col].astype(str).str.strip().str.upper()
    if len(df_aux) == 0: return []
    agrupado = df_aux.groupby(col).size().reset_index(name="TOTAL")
    agrupado["PERCENTUAL"] = ((agrupado["TOTAL"] / agrupado["TOTAL"].sum()) * 100).round(2)
    return agrupado.to_dict("records")

def gerar_metricas_discentes_programa(df):
    if len(df) == 0: return {}
    titulados = df[df["NM_SITUACAO_DISCENTE"].astype(str).str.strip().str.upper() == "TITULADO"].copy()
    titulados["QT_MES_TITULACAO"] = pd.to_numeric(titulados["QT_MES_TITULACAO"], errors="coerce")
    tempo = titulados.dropna(subset=["QT_MES_TITULACAO", "DS_GRAU_ACADEMICO_DISCENTE"]).groupby("DS_GRAU_ACADEMICO_DISCENTE")["QT_MES_TITULACAO"].mean().round(1).reset_index(name="MEDIA_MESES_TITULACAO")
    return {
        "distribuicao_grau_academico": calcular_proporcao_programa(df, "DS_GRAU_ACADEMICO_DISCENTE"),
        "situacao_academica": calcular_proporcao_programa(df, "NM_SITUACAO_DISCENTE"),
        "internacionalizacao_nacionalidade": calcular_proporcao_programa(df, "DS_TIPO_NACIONALIDADE_DISCENTE"),
        "tempo_medio_titulacao": tempo.to_dict("records"),
        "tamanho_total_alunos_periodo": int(len(df)),
        "media_alunos_por_ano": float(df.groupby("AN_BASE").size().mean().round(1)),
        "faixa_etaria": calcular_proporcao_programa(df, "DS_FAIXA_ETARIA")
    }

def gerar_metricas_docentes_programa(df):
    permanentes = df[df["DS_CATEGORIA_DOCENTE"].astype(str).str.strip().str.upper() == "PERMANENTE"].copy()
    if len(df) == 0: return {}
    mat = 0
    if len(permanentes) > 0:
        permanentes["TEM_BOLSA_PQ"] = permanentes["CD_CAT_BOLSA_PRODUTIVIDADE"].apply(lambda x: "NÃO" if pd.isna(x) or str(x).strip().upper() in ["NA", "NÃO", "NÃO INFORMADO", "NAN", "NONE"] else "SIM")
        permanentes["TITULADO_NO_EXTERIOR"] = permanentes["NM_PAIS_IES_TITULACAO"].apply(lambda x: "NÃO" if pd.isna(x) or str(x).strip().upper() == "BRASIL" else "SIM")
        permanentes["DOCENTE_ESTRANGEIRO"] = permanentes["DS_TIPO_NACIONALIDADE_DOCENTE"].apply(lambda x: "BRASILEIRO" if str(x).strip().upper() == "BRASILEIRO" else "ESTRANGEIRO")
        permanentes["ENDOGAMIA"] = np.where(permanentes["SG_ENTIDADE_ENSINO"].astype(str).str.strip().str.upper() == permanentes["SG_IES_TITULACAO"].astype(str).str.strip().str.upper(), "SIM", "NÃO")
        mat = round((permanentes["AN_BASE"] - pd.to_numeric(permanentes["AN_TITULACAO"], errors="coerce")).mean(), 1)
    return {
        "lideranca_bolsas_pq": calcular_proporcao_programa(permanentes, "TEM_BOLSA_PQ") if len(permanentes) > 0 else [],
        "internacionalizacao_titulacao_exterior": calcular_proporcao_programa(permanentes, "TITULADO_NO_EXTERIOR") if len(permanentes) > 0 else [],
        "internacionalizacao_nacionalidade": calcular_proporcao_programa(permanentes, "DOCENTE_ESTRANGEIRO") if len(permanentes) > 0 else [],
        "endogamia_academica": calcular_proporcao_programa(permanentes, "ENDOGAMIA") if len(permanentes) > 0 else [],
        "maturidade_media_anos_doutorado": float(mat) if not pd.isna(mat) else 0,
        "categoria_docente": calcular_proporcao_programa(df, "DS_CATEGORIA_DOCENTE"),
        "regime_trabalho": calcular_proporcao_programa(permanentes, "DS_REGIME_TRABALHO") if len(permanentes) > 0 else []
    }

print("[5/6] Processando programas...")
todos_progs = set(df_discentes["CD_PROGRAMA_IES"].unique()).union(set(df_docentes["CD_PROGRAMA_IES"].unique()))
anos = list(range(2017, 2025))

for cd in todos_progs:
    if pd.isna(cd) or cd == "nan": continue
    df_d = df_discentes[df_discentes["CD_PROGRAMA_IES"] == cd]
    df_dc = df_docentes[df_docentes["CD_PROGRAMA_IES"] == cd]
    
    nm = str(df_d["NM_PROGRAMA_IES"].iloc[0] if not df_d.empty else df_dc["NM_PROGRAMA_IES"].iloc[0]).strip().upper()
    sg = str(df_d["SG_ENTIDADE_ENSINO"].iloc[0] if not df_d.empty else df_dc["SG_ENTIDADE_ENSINO"].iloc[0]).strip().upper()
    ano_m = max(df_d["AN_BASE"].max() if not df_d.empty else 0, df_dc["AN_BASE"].max() if not df_dc.empty else 0)
    conc = df_d[df_d["AN_BASE"] == ano_m]["CD_CONCEITO_PROGRAMA"].iloc[0] if not df_d.empty and ano_m in df_d["AN_BASE"].values else "NÃO INFORMADO"
    
    json_p = {
        "metadata": {"cd_programa": cd, "nm_programa": nm, "sg_ies": sg, "conceito_recente": int(conc) if str(conc).isdigit() else conc},
        "radar": gerar_radar_programa(df_dc, df_d),
        "discentes": {"geral": gerar_metricas_discentes_programa(df_d), "por_ano": {}},
        "docentes": {"geral": gerar_metricas_docentes_programa(df_dc), "por_ano": {}}
    }
    
    for a in anos:
        if not df_d[df_d["AN_BASE"] == a].empty: json_p["discentes"]["por_ano"][str(a)] = gerar_metricas_discentes_programa(df_d[df_d["AN_BASE"] == a])
        if not df_dc[df_dc["AN_BASE"] == a].empty: json_p["docentes"]["por_ano"][str(a)] = gerar_metricas_docentes_programa(df_dc[df_dc["AN_BASE"] == a])
            
    with open(os.path.join(caminho_indicadores, f"{cd}.json"), "w", encoding="utf-8") as f:
        json.dump(json_p, f, ensure_ascii=False)

print("\n[SUCESSO] Processamento concluído!")