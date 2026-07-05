import pandas as pd
import os
import json
import glob
import numpy as np
from datetime import datetime
import unicodedata
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
BASE_DIR = CURRENT_DIR / "data"

SAIDA_DIR = BASE_DIR / "radar-data"
CAMINHO_PROGRAMAS = SAIDA_DIR / "programas-atualizados"

SAIDA_DIR.mkdir(parents=True, exist_ok=True)
CAMINHO_PROGRAMAS.mkdir(parents=True, exist_ok=True)

PADRAO_DOCENTES = str(BASE_DIR / "br-capes-colsucup-docente-*.xlsx") + ";" + str(BASE_DIR / "br-capes-colsucup-docente-*.csv")
PADRAO_DISCENTES = str(BASE_DIR / "br-capes-colsucup-discentes-*.xlsx") + ";" + str(BASE_DIR / "br-capes-colsucup-discentes-*.csv")
PADRAO_PRODUCAO = str(BASE_DIR / "computacao_bibliografica_periodicos_*.csv") + ";" + str(BASE_DIR / "br-capes-colsucup-producao-*.xlsx") + ";" + str(BASE_DIR / "br-capes-colsucup-producao-*.csv")

ANOS_DESEJADOS = list(range(2017, 2025))
CONCEITOS_DESEJADOS = [3, 4, 5, 6, 7]

AREAS_VALIDAS = {"CIENCIA DA COMPUTACAO", "COMPUTACAO", "ENGENHARIA DA COMPUTACAO"}

ARQUIVO_SAIDA_JSON = SAIDA_DIR / "capes_radar_chart_docentes_discentes.json"
ARQUIVO_SAIDA_CSV = SAIDA_DIR / "base_consolidada_conceito_ano.csv"

def log(msg):
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{agora}] {msg}")

def json_default(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return None if np.isnan(obj) else float(obj)
    if isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    if isinstance(obj, (pd.Timestamp,)):
        return obj.isoformat()
    if pd.isna(obj):
        return None
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

def norm_text(value):
    if pd.isna(value):
        return ""
    txt = str(value).strip().upper()
    txt = unicodedata.normalize("NFKD", txt).encode("ASCII", "ignore").decode("ASCII")
    return " ".join(txt.split())

def safe_pct(series_bool, total):
    if total is None or total == 0 or len(series_bool) == 0:
        return 0.0
    return round(pd.Series(series_bool).fillna(False).astype(bool).mean() * 100, 2)

def safe_mean(series):
    s = pd.to_numeric(series, errors="coerce").dropna()
    return np.nan if s.empty else round(float(s.mean()), 2)

def read_any_file(path):
    try:
        if path.endswith(".xlsx"):
            return pd.read_excel(path)
        return pd.read_csv(path, sep=",", encoding="utf-8", low_memory=False)
    except Exception:
        try:
            return pd.read_csv(path, sep=";", encoding="latin1", low_memory=False)
        except Exception as ex:
            log(f"Falha ao ler {os.path.basename(path)}: {ex}")
            return None

def carregar_base(pattern_string, nome_base):
    patterns = pattern_string.split(";")
    arquivos = []
    for p in patterns:
        arquivos.extend(glob.glob(p))
    arquivos = sorted(list(set(arquivos)))
    if not arquivos:
        log(f"Nenhum arquivo encontrado para {nome_base}. Inicializando DataFrame vazio.")
        return pd.DataFrame()
    
    log(f"{nome_base}: {len(arquivos)} arquivo(s) encontrados")
    dfs = []
    for i, arquivo in enumerate(arquivos, start=1):
        nome = os.path.basename(arquivo)
        log(f"{nome_base}: lendo {i}/{len(arquivos)} -> {nome}")
        df = read_any_file(arquivo)
        if df is not None and not df.empty:
            dfs.append(df)
    
    if not dfs:
        return pd.DataFrame()
    df_final = pd.concat(dfs, ignore_index=True)
    log(f"{nome_base}: consolidação concluída ({len(df_final):,} linhas)")
    return df_final

def filtrar_area(df, coluna_area="NM_AREA_AVALIACAO"):
    if df.empty:
        return df
    out = df.copy()
    if coluna_area in out.columns:
        area_norm = out[coluna_area].apply(norm_text)
        out = out[area_norm.isin(AREAS_VALIDAS)].copy()
    if "AN_BASE" in out.columns:
        out["AN_BASE"] = pd.to_numeric(out["AN_BASE"], errors="coerce")
        out = out.dropna(subset=["AN_BASE"]).copy()
        out["AN_BASE"] = out["AN_BASE"].astype(int)
    if "CD_PROGRAMA_IES" in out.columns:
        out["CD_PROGRAMA_IES"] = out["CD_PROGRAMA_IES"].astype(str).str.strip()
    return out

def filtrar_radar(df):
    if df.empty:
        return df
    out = df.copy()
    out["CD_CONCEITO_PROGRAMA"] = pd.to_numeric(out.get("CD_CONCEITO_PROGRAMA", np.nan), errors="coerce")
    out = out.dropna(subset=["CD_CONCEITO_PROGRAMA"]).copy()
    out = out[out["CD_CONCEITO_PROGRAMA"].isin(CONCEITOS_DESEJADOS)].copy()
    out["CD_CONCEITO_PROGRAMA"] = out["CD_CONCEITO_PROGRAMA"].astype(int)
    return out

def build_teacher_concept_year(df):
    if df.empty:
        return pd.DataFrame()
    df = df.copy()
    for col in ["DS_CATEGORIA_DOCENTE", "DS_REGIME_TRABALHO", "DS_DEPENDENCIA_ADMINISTRATIVA", "SG_ENTIDADE_ENSINO", "SG_IES_TITULACAO", "DS_TIPO_NACIONALIDADE_DOCENTE", "NM_PAIS_IES_TITULACAO", "CD_CAT_BOLSA_PRODUTIVIDADE"]:
        if col in df.columns:
            df[col] = df[col].map(norm_text)
    
    df["AN_TITULACAO_NUM"] = pd.to_numeric(df.get("AN_TITULACAO", np.nan), errors="coerce")
    df["EH_PERMANENTE"] = df.get("DS_CATEGORIA_DOCENTE", "").eq("PERMANENTE")
    df["TEM_BOLSA_PQ"] = ~df.get("CD_CAT_BOLSA_PRODUTIVIDADE", "").isin(["", "NA", "N/A", "0"])
    df["TITULADO_NO_EXTERIOR"] = ~df.get("NM_PAIS_IES_TITULACAO", "").eq("BRASIL")
    df["DOCENTE_ESTRANGEIRO"] = ~df.get("DS_TIPO_NACIONALIDADE_DOCENTE", "").eq("BRASILEIRO")
    df["ENDOGAMIA"] = df.get("SG_ENTIDADE_ENSINO", "") == df.get("SG_IES_TITULACAO", "")
    df["DEDICACAO_EXCLUSIVA"] = df.get("DS_REGIME_TRABALHO", "").eq("DEDICACAO EXCLUSIVA")
    df["INSTITUICAO_PUBLICA"] = df.get("DS_DEPENDENCIA_ADMINISTRATIVA", "").eq("PUBLICA")
    
    rows = []
    for (ano, conceito), g in df.groupby(["AN_BASE", "CD_CONCEITO_PROGRAMA"]):
        total = len(g)
        gp = g[g["EH_PERMANENTE"]]
        total_perm = len(gp)
        programas = g["CD_PROGRAMA_IES"].nunique() if "CD_PROGRAMA_IES" in g.columns else np.nan
        media_dout = np.nan
        if total_perm > 0:
            tempo = pd.to_numeric(gp["AN_BASE"], errors="coerce") - pd.to_numeric(gp["AN_TITULACAO_NUM"], errors="coerce")
            tempo = tempo.dropna()
            if not tempo.empty:
                media_dout = round(float(tempo.mean()), 2)
        rows.append({
            "AN_BASE": int(ano),
            "CD_CONCEITO_PROGRAMA": int(conceito),
            "total_docentes": total,
            "total_docentes_permanentes": total_perm,
            "docentes_permanentes_por_programa": round(total_perm / programas, 2) if programas else np.nan,
            "pct_docentes_permanentes": round(total_perm / total * 100, 2) if total else 0.0,
            "pct_pq": safe_pct(gp["TEM_BOLSA_PQ"], total_perm),
            "pct_titulado_no_exterior": safe_pct(gp["TITULADO_NO_EXTERIOR"], total_perm),
            "pct_docente_estrangeiro": safe_pct(gp["DOCENTE_ESTRANGEIRO"], total_perm),
            "pct_endogamia": safe_pct(gp["ENDOGAMIA"], total_perm),
            "pct_dedicacao_exclusiva": safe_pct(gp["DEDICACAO_EXCLUSIVA"], total_perm),
            "pct_instituicao_publica": safe_pct(g["INSTITUICAO_PUBLICA"], total),
            "media_anos_doutorado": media_dout,
        })
    return pd.DataFrame(rows)

def build_student_concept_year(df):
    if df.empty:
        return pd.DataFrame()
    df = df.copy()
    for col in ["DS_GRAU_ACADEMICO_DISCENTE", "NM_SITUACAO_DISCENTE", "DS_TIPO_NACIONALIDADE_DISCENTE"]:
        if col in df.columns:
            df[col] = df[col].map(norm_text)
            
    df["QT_MES_TITULACAO_NUM"] = pd.to_numeric(df.get("QT_MES_TITULACAO", np.nan), errors="coerce")
    df["EH_MESTRADO"] = df.get("DS_GRAU_ACADEMICO_DISCENTE", "").str.contains("MESTRADO", na=False)
    df["EH_DOUTORADO"] = df.get("DS_GRAU_ACADEMICO_DISCENTE", "").str.contains("DOUTORADO", na=False)
    df["EH_TITULADO"] = df.get("NM_SITUACAO_DISCENTE", "") == "TITULADO"
    df["EH_EVASAO"] = df.get("NM_SITUACAO_DISCENTE", "").isin(["ABANDONOU", "DESLIGADO"])
    df["EH_ESTRANGEIRO"] = ~df.get("DS_TIPO_NACIONALIDADE_DISCENTE", "").eq("BRASILEIRO")

    rows = []
    for (ano, conceito), g in df.groupby(["AN_BASE", "CD_CONCEITO_PROGRAMA"]):
        total = len(g)
        programas = g["CD_PROGRAMA_IES"].nunique() if "CD_PROGRAMA_IES" in g.columns else np.nan
        tit = g[g["EH_TITULADO"]]
        media_m = safe_mean(tit[tit["EH_MESTRADO"]]["QT_MES_TITULACAO_NUM"])
        media_d = safe_mean(tit[tit["EH_DOUTORADO"]]["QT_MES_TITULACAO_NUM"])
        rows.append({
            "AN_BASE": int(ano),
            "CD_CONCEITO_PROGRAMA": int(conceito),
            "total_discentes": total,
            "discentes_por_programa": round(total / programas, 2) if programas else np.nan,
            "pct_mestrado": safe_pct(g["EH_MESTRADO"], total),
            "pct_doutorado": safe_pct(g["EH_DOUTORADO"], total),
            "pct_titulado": safe_pct(g["EH_TITULADO"], total),
            "taxa_evasao": safe_pct(g["EH_EVASAO"], total),
            "pct_estrangeiro_discente": safe_pct(g["EH_ESTRANGEIRO"], total),
            "media_meses_titulacao_mestrado": media_m,
            "media_meses_titulacao_doutorado": media_d,
        })
    return pd.DataFrame(rows)

def build_producao_concept_year(df):
    if df.empty:
        return pd.DataFrame()
    df = df.copy()
    rows = []
    for (ano, conceito), g in df.groupby(["AN_BASE", "CD_CONCEITO_PROGRAMA"]):
        total = len(g)
        programas = g["CD_PROGRAMA_IES"].nunique() if "CD_PROGRAMA_IES" in g.columns else np.nan
        rows.append({
            "AN_BASE": int(ano),
            "CD_CONCEITO_PROGRAMA": int(conceito),
            "total_publicacoes": total,
            "publicacoes_por_programa": round(total / programas, 2) if programas else np.nan
        })
    return pd.DataFrame(rows)

def get_global_bounds(df, metric_cols):
    bounds = {}
    for col in metric_cols:
        col_data = df[col].dropna()
        bounds[col] = {
            "min": float(col_data.min()) if not col_data.empty else 0.0,
            "max": float(col_data.max()) if not col_data.empty else 1.0,
        }
    return bounds

def normalizar_metrica(valor, bounds):
    c_min = bounds.get("min", 0.0)
    c_max = bounds.get("max", 1.0)
    if pd.isna(valor):
        return 0.0
    if c_max > c_min:
        return float(np.clip((valor - c_min) / (c_max - c_min), 0.0, 1.0))
    return 0.0 if c_max == 0 else 1.0

def build_radar_data(df, metric_cols, global_bounds):
    if df.empty or not metric_cols:
        return [], []
    mean_by_concept = df.groupby("CD_CONCEITO_PROGRAMA")[metric_cols].mean(numeric_only=True).reset_index()
    radar_series_norm = []
    radar_series_raw = []
    for _, row in mean_by_concept.iterrows():
        conceito = int(row["CD_CONCEITO_PROGRAMA"])
        norm_record = {"CD_CONCEITO_PROGRAMA": conceito}
        raw_record = {"CD_CONCEITO_PROGRAMA": conceito}
        for col in metric_cols:
            val = row[col]
            raw_record[col] = val
            norm_record[col] = normalizar_metrica(val, global_bounds.get(col, {"min": 0, "max": 1}))
        radar_series_norm.append(norm_record)
        radar_series_raw.append(raw_record)
    return radar_series_norm, radar_series_raw

def calcular_metricas_radar_programa(df_doc_prog, df_disc_prog, df_prod_prog):
    permanentes = df_doc_prog[df_doc_prog["DS_CATEGORIA_DOCENTE"].astype(str).str.strip().str.upper() == "PERMANENTE"] if not df_doc_prog.empty else pd.DataFrame()
    total_doc = len(permanentes)
    
    pct_pq = (len(permanentes[permanentes["CD_CAT_BOLSA_PRODUTIVIDADE"].notna() & ~permanentes["CD_CAT_BOLSA_PRODUTIVIDADE"].astype(str).str.upper().isin(["NA", "NÃO", "NÃO INFORMADO", "NAN", "NONE", "0"])]) / total_doc * 100) if total_doc > 0 else 0
    pct_ext = (len(permanentes[permanentes["NM_PAIS_IES_TITULACAO"].astype(str).str.strip().str.upper() != "BRASIL"]) / total_doc * 100) if total_doc > 0 else 0
    pct_doc_est = (len(permanentes[permanentes["DS_TIPO_NACIONALIDADE_DOCENTE"].astype(str).str.strip().str.upper() != "BRASILEIRO"]) / total_doc * 100) if total_doc > 0 else 0
    pct_endo = (len(permanentes[permanentes["SG_ENTIDADE_ENSINO"].astype(str).str.strip().str.upper() == permanentes["SG_IES_TITULACAO"].astype(str).str.strip().str.upper()]) / total_doc * 100) if total_doc > 0 else 0
    pct_ded = (len(permanentes[permanentes["DS_REGIME_TRABALHO"].astype(str).str.strip().str.upper() == "DEDICAÇÃO EXCLUSIVA"]) / total_doc * 100) if total_doc > 0 else 0
    
    pct_pub = 0
    if not permanentes.empty and "DS_DEPENDENCIA_ADMINISTRATIVA" in permanentes.columns:
        pct_pub = (len(permanentes[permanentes["DS_DEPENDENCIA_ADMINISTRATIVA"].astype(str).str.strip().str.upper() == "PÚBLICA"]) / total_doc * 100) if total_doc > 0 else 0
    
    perm_copy = permanentes.copy()
    if not perm_copy.empty:
        perm_copy["AN_TITULACAO"] = pd.to_numeric(perm_copy["AN_TITULACAO"], errors="coerce")
        maturidade = (perm_copy["AN_BASE"] - perm_copy["AN_TITULACAO"]).mean()
    else:
        maturidade = 0

    total_disc = len(df_disc_prog)
    pct_mest = (len(df_disc_prog[df_disc_prog["DS_GRAU_ACADEMICO_DISCENTE"].astype(str).str.upper() == "MESTRADO"]) / total_disc * 100) if total_disc > 0 else 0
    pct_dout = (len(df_disc_prog[df_disc_prog["DS_GRAU_ACADEMICO_DISCENTE"].astype(str).str.upper() == "DOUTORADO"]) / total_disc * 100) if total_disc > 0 else 0
    pct_tit = (len(df_disc_prog[df_disc_prog["NM_SITUACAO_DISCENTE"].astype(str).str.upper() == "TITULADO"]) / total_disc * 100) if total_disc > 0 else 0
    taxa_evas = (len(df_disc_prog[df_disc_prog["NM_SITUACAO_DISCENTE"].astype(str).str.upper().isin(["ABANDONOU", "DESLIGADO"])]) / total_disc * 100) if total_disc > 0 else 0
    pct_disc_est = (len(df_disc_prog[df_disc_prog["DS_TIPO_NACIONALIDADE_DISCENTE"].astype(str).str.upper() != "BRASILEIRA"]) / total_disc * 100) if total_disc > 0 else 0
    
    if not df_disc_prog.empty:
        titulados = df_disc_prog[df_disc_prog["NM_SITUACAO_DISCENTE"].astype(str).str.upper() == "TITULADO"].copy()
        titulados["QT_MES_TITULACAO"] = pd.to_numeric(titulados.get("QT_MES_TITULACAO", np.nan), errors="coerce")
        media_m = titulados[titulados["DS_GRAU_ACADEMICO_DISCENTE"].astype(str).str.upper() == "MESTRADO"]["QT_MES_TITULACAO"].mean()
        media_d = titulados[titulados["DS_GRAU_ACADEMICO_DISCENTE"].astype(str).str.upper() == "DOUTORADO"]["QT_MES_TITULACAO"].mean()
    else:
        media_m = 0
        media_d = 0

    total_producao = len(df_prod_prog)

    return {
        "total_docentes_permanentes": float(total_doc),
        "docentes_permanentes_por_programa": float(total_doc),
        "pct_docentes_permanentes": float(pct_pq * 0 + 100),
        "pct_pq": float(pct_pq),
        "pct_titulado_no_exterior": float(pct_ext),
        "pct_docente_estrangeiro": float(pct_doc_est),
        "pct_endogamia": float(pct_endo),
        "pct_dedicacao_exclusiva": float(pct_ded),
        "pct_instituicao_publica": float(pct_pub),
        "media_anos_doutorado": float(maturidade if pd.notna(maturidade) else 0),
        "discentes_por_programa": float(total_disc),
        "pct_mestrado": float(pct_mest),
        "pct_doutorado": float(pct_dout),
        "pct_titulado": float(pct_tit),
        "taxa_evasao": float(taxa_evas),
        "pct_estrangeiro_discente": float(pct_disc_est),
        "media_meses_titulacao_mestrado": float(media_m if pd.notna(media_m) else 0),
        "media_meses_titulacao_doutorado": float(media_d if pd.notna(media_d) else 0),
        "publicacoes_por_programa": float(total_producao)
    }

def normalizar_metricas_programa(valores, global_bounds):
    return {k: normalizar_metrica(v, global_bounds.get(k, {"min": 0, "max": 1})) for k, v in valores.items()}

def gerar_radar_programa(df_doc, df_disc, df_prod, global_bounds):
    reais = calcular_metricas_radar_programa(df_doc, df_disc, df_prod)
    return {"valores_reais": reais, "normalizado": normalizar_metricas_programa(reais, global_bounds)}

def calcular_proporcao_programa(df_dados, col):
    df_aux = df_dados.dropna(subset=[col]).copy()
    if df_aux.empty: return []
    if df_aux[col].dtype == "object": df_aux[col] = df_aux[col].astype(str).str.strip().str.upper()
    agrupado = df_aux.groupby(col).size().reset_index(name="TOTAL")
    agrupado["PERCENTUAL"] = ((agrupado["TOTAL"] / agrupado["TOTAL"].sum()) * 100).round(2)
    return agrupado.to_dict("records")

def gerar_metricas_discentes_programa(df):
    if len(df) == 0: return {}
    titulados = df[df["NM_SITUACAO_DISCENTE"].astype(str).str.strip().str.upper() == "TITULADO"].copy()
    titulados["QT_MES_TITULACAO"] = pd.to_numeric(titulados.get("QT_MES_TITULACAO", np.nan), errors="coerce")
    tempo = titulados.dropna(subset=["QT_MES_TITULACAO", "DS_GRAU_ACADEMICO_DISCENTE"]).groupby("DS_GRAU_ACADEMICO_DISCENTE")["QT_MES_TITULACAO"].mean().round(1).reset_index(name="MEDIA_MESES_TITULACAO")
    return {
        "distribuicao_grau_academico": calcular_proporcao_programa(df, "DS_GRAU_ACADEMICO_DISCENTE"),
        "situacao_academica": calcular_proporcao_programa(df, "NM_SITUACAO_DISCENTE"),
        "internacionalizacao_nacionalidade": calcular_proporcao_programa(df, "DS_TIPO_NACIONALIDADE_DISCENTE"),
        "tempo_medio_titulacao": tempo.to_dict("records"),
        "tamanho_total_alunos_periodo": int(len(df)),
        "media_alunos_por_ano": float(df.groupby("AN_BASE").size().mean().round(1)) if not df.empty else 0.0,
        "faixa_etaria": calcular_proporcao_programa(df, "DS_FAIXA_ETARIA") if "DS_FAIXA_ETARIA" in df.columns else []
    }

def gerar_metricas_docentes_programa(df):
    permanentes = df[df["DS_CATEGORIA_DOCENTE"].astype(str).str.strip().str.upper() == "PERMANENTE"].copy() if not df.empty else pd.DataFrame()
    if len(df) == 0: return {}
    mat = 0.0
    if len(permanentes) > 0:
        permanentes["TEM_BOLSA_PQ"] = permanentes["CD_CAT_BOLSA_PRODUTIVIDADE"].apply(lambda x: "NÃO" if pd.isna(x) or str(x).strip().upper() in ["NA", "NÃO", "NÃO INFORMADO", "NAN", "NONE", "0"] else "SIM")
        permanentes["TITULADO_NO_EXTERIOR"] = permanentes["NM_PAIS_IES_TITULACAO"].apply(lambda x: "NÃO" if pd.isna(x) or str(x).strip().upper() == "BRASIL" else "SIM")
        permanentes["DOCENTE_ESTRANGEIRO"] = permanentes["DS_TIPO_NACIONALIDADE_DOCENTE"].apply(lambda x: "BRASILEIRO" if str(x).strip().upper() == "BRASILEIRO" else "ESTRANGEIRO")
        permanentes["ENDOGAMIA"] = np.where(permanentes["SG_ENTIDADE_ENSINO"].astype(str).str.strip().str.upper() == permanentes["SG_IES_TITULACAO"].astype(str).str.strip().str.upper(), "SIM", "NÃO")
        mat = round((permanentes["AN_BASE"] - pd.to_numeric(permanentes["AN_TITULACAO"], errors="coerce")).mean(), 1)
    return {
        "lideranca_bolsas_pq": calcular_proporcao_programa(permanentes, "TEM_BOLSA_PQ") if len(permanentes) > 0 else [],
        "internacionalizacao_titulacao_exterior": calcular_proporcao_programa(permanentes, "TITULADO_NO_EXTERIOR") if len(permanentes) > 0 else [],
        "internacionalizacao_nacionalidade": calcular_proporcao_programa(permanentes, "DOCENTE_ESTRANGEIRO") if len(permanentes) > 0 else [],
        "endogamia_academica": calcular_proporcao_programa(permanentes, "ENDOGAMIA") if len(permanentes) > 0 else [],
        "maturidade_media_anos_doutorado": float(mat) if not pd.isna(mat) else 0.0,
        "categoria_docente": calcular_proporcao_programa(df, "DS_CATEGORIA_DOCENTE"),
        "regime_trabalho": calcular_proporcao_programa(permanentes, "DS_REGIME_TRABALHO") if len(permanentes) > 0 else []
    }

def gerar_metricas_producao_programa(df):
    if len(df) == 0: return {}
    total = len(df)
    subtipos = calcular_proporcao_programa(df, "NM_SUBTIPO_PRODUCAO")
    veiculos = []
    if "DS_TITULO_PADRONIZADO" in df.columns:
        top_veic = df["DS_TITULO_PADRONIZADO"].value_counts().head(10).reset_index()
        top_veic.columns = ["DS_TITULO_PADRONIZADO", "TOTAL"]
        veiculos = top_veic.to_dict("records")
    return {
        "total_publicacoes": int(total),
        "media_publicacoes_por_ano": float(df.groupby("AN_BASE").size().mean().round(1)) if not df.empty else 0.0,
        "distribuicao_subtipo": subtipos,
        "top_veiculos": veiculos
    }

def main():
    log("Iniciando processamento integrado")
    
    log("Carregando bases brutas")
    docentes_raw = carregar_base(PADRAO_DOCENTES, "DOCENTES")
    discentes_raw = carregar_base(PADRAO_DISCENTES, "DISCENTES")
    producao_raw = carregar_base(PADRAO_PRODUCAO, "PRODUÇÃO")

    log("Aplicando filtros globais (Area)")
    df_doc_all = filtrar_area(docentes_raw)
    df_disc_all = filtrar_area(discentes_raw)
    df_prod_all = filtrar_area(producao_raw)
    
    log("Preparando dados para Radar Geral e Cálculo de Limites Globais")
    df_doc_radar = filtrar_radar(df_doc_all)
    df_disc_radar = filtrar_radar(df_disc_all)
    df_prod_radar = filtrar_radar(df_prod_all)

    teacher_agg = build_teacher_concept_year(df_doc_radar)
    student_agg = build_student_concept_year(df_disc_radar)
    prod_agg = build_producao_concept_year(df_prod_radar)

    concept_year = teacher_agg
    if not student_agg.empty:
        concept_year = pd.merge(concept_year, student_agg, on=["AN_BASE", "CD_CONCEITO_PROGRAMA"], how="outer")
    if not prod_agg.empty:
        concept_year = pd.merge(concept_year, prod_agg, on=["AN_BASE", "CD_CONCEITO_PROGRAMA"], how="outer")
        
    if not concept_year.empty:
        concept_year = concept_year.sort_values(["AN_BASE", "CD_CONCEITO_PROGRAMA"]).reset_index(drop=True)
        concept_year.to_csv(ARQUIVO_SAIDA_CSV, index=False, encoding="utf-8-sig")

    metricas_radar = [c for c in concept_year.columns if c not in ["AN_BASE", "CD_CONCEITO_PROGRAMA", "total_docentes", "total_discentes", "total_publicacoes"]]
    
    log("Calculando Limites Globais (Global Bounds)")
    global_bounds = get_global_bounds(concept_year, metricas_radar)
    
    radar_geral_norm, radar_geral_raw = build_radar_data(concept_year, metricas_radar, global_bounds)

    anos_validos = []
    conceitos_validos = []
    if not concept_year.empty:
        anos_validos = sorted(concept_year["AN_BASE"].dropna().unique().astype(int).tolist())
        conceitos_validos = sorted(concept_year["CD_CONCEITO_PROGRAMA"].dropna().unique().astype(int).tolist())

    output_geral = {
        "metadata": {
            "total_docentes": int(len(df_doc_radar)),
            "total_discentes": int(len(df_disc_radar)),
            "total_producao": int(len(df_prod_radar)),
            "anos": anos_validos,
            "conceitos": conceitos_validos,
            "eixos_radar": metricas_radar,
            "limites_escala_global": global_bounds,
            "escopo": {
                "areas": list(AREAS_VALIDAS),
                "conceitos_filtro": CONCEITOS_DESEJADOS,
                "periodo": [2017, 2024],
            }
        },
        "geral": {
            "radar_normalizado": radar_geral_norm,
            "radar_valores_reais": radar_geral_raw,
            "concept_year_raw": concept_year.to_dict(orient="records") if not concept_year.empty else [],
        },
        "por_ano": {}
    }

    for ano in ANOS_DESEJADOS:
        if concept_year.empty:
            df_ano = pd.DataFrame()
        else:
            df_ano = concept_year[concept_year["AN_BASE"] == ano].copy()
            
        if df_ano.empty:
            output_geral["por_ano"][str(ano)] = {"radar_normalizado": [], "radar_valores_reais": []}
            continue
            
        radar_ano_norm, radar_ano_raw = build_radar_data(df_ano, metricas_radar, global_bounds)
        output_geral["por_ano"][str(ano)] = {
            "radar_normalizado": radar_ano_norm,
            "radar_valores_reais": radar_ano_raw,
        }

    with open(ARQUIVO_SAIDA_JSON, "w", encoding="utf-8") as f:
        json.dump(output_geral, f, ensure_ascii=False, indent=2, default=json_default)
    
    log("Gerando mapeamento de menus")
    menu_opcoes = {}
    
    df_for_mapping = pd.concat([df_disc_all, df_doc_all, df_prod_all], ignore_index=True)
    if not df_for_mapping.empty and "SG_ENTIDADE_ENSINO" in df_for_mapping.columns and "CD_PROGRAMA_IES" in df_for_mapping.columns:
        mapeamento = df_for_mapping.groupby(["SG_ENTIDADE_ENSINO", "CD_PROGRAMA_IES", "NM_PROGRAMA_IES"]).size().reset_index()
        for _, row in mapeamento.iterrows():
            ies = str(row["SG_ENTIDADE_ENSINO"]).strip().upper()
            cd = str(row["CD_PROGRAMA_IES"]).strip()
            nm_prog = str(row["NM_PROGRAMA_IES"]).strip().upper()
            if ies not in menu_opcoes: 
                menu_opcoes[ies] = []
            if not any(item['cd_programa'] == cd for item in menu_opcoes[ies]):
                menu_opcoes[ies].append({"cd_programa": cd, "nm_programa": nm_prog})
    
    with open(SAIDA_DIR / "menu_opcoes.json", "w", encoding="utf-8") as f:
        json.dump(menu_opcoes, f, ensure_ascii=False, indent=2)

    log("Processando paineis individuais dos programas utilizando os Global Bounds")
    todos_progs = set()
    if not df_disc_all.empty: todos_progs.update(df_disc_all["CD_PROGRAMA_IES"].unique())
    if not df_doc_all.empty: todos_progs.update(df_doc_all["CD_PROGRAMA_IES"].unique())
    if not df_prod_all.empty: todos_progs.update(df_prod_all["CD_PROGRAMA_IES"].unique())
    
    for cd in todos_progs:
        if pd.isna(cd) or cd == "nan": continue
        
        df_d = df_disc_all[df_disc_all["CD_PROGRAMA_IES"] == cd] if not df_disc_all.empty else pd.DataFrame()
        df_dc = df_doc_all[df_doc_all["CD_PROGRAMA_IES"] == cd] if not df_doc_all.empty else pd.DataFrame()
        df_p = df_prod_all[df_prod_all["CD_PROGRAMA_IES"] == cd] if not df_prod_all.empty else pd.DataFrame()
        
        nm = ""
        sg = ""
        ano_m = 0
        conc = "NÃO INFORMADO"
        
        for df_temp in [df_d, df_dc, df_p]:
            if not df_temp.empty:
                if not nm and "NM_PROGRAMA_IES" in df_temp.columns: nm = str(df_temp["NM_PROGRAMA_IES"].iloc[0]).strip().upper()
                if not sg and "SG_ENTIDADE_ENSINO" in df_temp.columns: sg = str(df_temp["SG_ENTIDADE_ENSINO"].iloc[0]).strip().upper()
                if "AN_BASE" in df_temp.columns:
                    max_ano = df_temp["AN_BASE"].max()
                    if max_ano > ano_m: ano_m = max_ano
                    
        for df_temp in [df_d, df_dc, df_p]:
            if not df_temp.empty and "CD_CONCEITO_PROGRAMA" in df_temp.columns and "AN_BASE" in df_temp.columns:
                filtro_ano = df_temp[df_temp["AN_BASE"] == ano_m]
                if not filtro_ano.empty:
                    conc = filtro_ano["CD_CONCEITO_PROGRAMA"].iloc[0]
                    break
        
        json_p = {
            "metadata": {"cd_programa": cd, "nm_programa": nm, "sg_ies": sg, "conceito_recente": int(conc) if str(conc).replace('.','',1).isdigit() else conc},
            "radar": {
                "geral": gerar_radar_programa(df_dc, df_d, df_p, global_bounds),
                "por_ano": {}
            },
            "discentes": {"geral": gerar_metricas_discentes_programa(df_d), "por_ano": {}},
            "docentes": {"geral": gerar_metricas_docentes_programa(df_dc), "por_ano": {}},
            "producao": {"geral": gerar_metricas_producao_programa(df_p), "por_ano": {}}
        }
        
        for a in ANOS_DESEJADOS:
            df_d_ano = df_d[df_d["AN_BASE"] == a] if not df_d.empty else pd.DataFrame()
            df_dc_ano = df_dc[df_dc["AN_BASE"] == a] if not df_dc.empty else pd.DataFrame()
            df_p_ano = df_p[df_p["AN_BASE"] == a] if not df_p.empty else pd.DataFrame()

            if not df_d_ano.empty: 
                json_p["discentes"]["por_ano"][str(a)] = gerar_metricas_discentes_programa(df_d_ano)
            if not df_dc_ano.empty: 
                json_p["docentes"]["por_ano"][str(a)] = gerar_metricas_docentes_programa(df_dc_ano)
            if not df_p_ano.empty:
                json_p["producao"]["por_ano"][str(a)] = gerar_metricas_producao_programa(df_p_ano)
                
            if not df_d_ano.empty or not df_dc_ano.empty or not df_p_ano.empty:
                json_p["radar"]["por_ano"][str(a)] = gerar_radar_programa(df_dc_ano, df_d_ano, df_p_ano, global_bounds)
                
        with open(CAMINHO_PROGRAMAS / f"{cd}.json", "w", encoding="utf-8") as f:
            json.dump(json_p, f, ensure_ascii=False, default=json_default)

    log("[SUCESSO] Processamento concluído!")

if __name__ == "__main__":
    main()