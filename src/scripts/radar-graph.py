import os
import json
import glob
import zipfile
import unicodedata
from datetime import datetime
from pathlib import Path
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
SAIDA_DIR = BASE_DIR / "indicadores"
SAIDA_DIR.mkdir(parents=True, exist_ok=True)

PADRAO_DOCENTES = str(BASE_DIR / "br-capes-colsucup-docente-*.xlsx")
PADRAO_DISCENTES = str(BASE_DIR / "br-capes-colsucup-discentes-*.xlsx")
ANOS_DESEJADOS = list(range(2017, 2025))
CONCEITOS_DESEJADOS = [3, 4, 5, 6, 7]

AREAS_VALIDAS = {
    "CIENCIA DA COMPUTACAO",
    "COMPUTACAO",
    "ENGENHARIA DA COMPUTACAO",
}

ARQUIVO_SAIDA_JSON = SAIDA_DIR / "capes_radar_chart_docentes_discentes.json"
ARQUIVO_SAIDA_CSV = SAIDA_DIR / "base_consolidada_conceito_ano.csv"

def log(msg):
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{agora}] {msg}")

def json_default(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        if np.isnan(obj):
            return None
        return float(obj)
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
    if total is None or total == 0:
        return 0.0
    if len(series_bool) == 0:
        return 0.0
    return round(pd.Series(series_bool).fillna(False).astype(bool).mean() * 100, 2)

def safe_mean(series):
    s = pd.to_numeric(series, errors="coerce").dropna()
    if s.empty:
        return np.nan
    return round(float(s.mean()), 2)

def read_any_file(path):
    try:
        return pd.read_excel(path)
    except zipfile.BadZipFile:
        try:
            return pd.read_csv(path, sep=";", encoding="latin1", low_memory=False)
        except Exception as e:
            log(f"Falha ao ler CSV {os.path.basename(path)}: {e}")
            return None
    except Exception:
        try:
            return pd.read_csv(path, sep=";", encoding="latin1", low_memory=False)
        except Exception as e:
            log(f"Falha ao ler {os.path.basename(path)}: {e}")
            return None

def carregar_base(pattern, nome_base):
    arquivos = sorted(glob.glob(pattern))
    if not arquivos:
        raise RuntimeError(f"Nenhum arquivo encontrado: {pattern}")
    log(f"{nome_base}: {len(arquivos)} arquivo(s) encontrados")

    dfs = []
    for i, arquivo in enumerate(arquivos, start=1):
        nome = os.path.basename(arquivo)
        log(f"{nome_base}: lendo {i}/{len(arquivos)} -> {nome}")
        df = read_any_file(arquivo)
        if df is not None and not df.empty:
            dfs.append(df)
            log(f"{nome_base}: OK -> {nome} ({len(df):,} linhas)")
        else:
            log(f"{nome_base}: ignorado -> {nome}")

    if not dfs:
        raise RuntimeError(f"Nenhum arquivo válido pôde ser carregado para {nome_base}")

    df_final = pd.concat(dfs, ignore_index=True)
    log(f"{nome_base}: consolidação concluída ({len(df_final):,} linhas)")
    return df_final

def filtrar_computacao(df, coluna_area="NM_AREA_AVALIACAO"):
    out = df.copy()
    log("Filtrando área de avaliação")
    out[coluna_area] = out[coluna_area].map(norm_text)
    out = out[out[coluna_area].isin(AREAS_VALIDAS)].copy()
    log(f"Após filtro de área: {len(out):,} registros")

    log("Tratando conceito do programa")
    out["CD_CONCEITO_PROGRAMA"] = pd.to_numeric(out["CD_CONCEITO_PROGRAMA"], errors="coerce")
    out = out[out["CD_CONCEITO_PROGRAMA"].isin(CONCEITOS_DESEJADOS)].copy()
    out["CD_CONCEITO_PROGRAMA"] = out["CD_CONCEITO_PROGRAMA"].astype(int)
    log(f"Após filtro de conceito: {len(out):,} registros")

    log("Tratando ano base")
    out["AN_BASE"] = pd.to_numeric(out["AN_BASE"], errors="coerce")
    out = out.dropna(subset=["AN_BASE"]).copy()
    out["AN_BASE"] = out["AN_BASE"].astype(int)
    log(f"Após tratamento do ano: {len(out):,} registros")

    return out

def build_teacher_concept_year(df):
    log("Construindo indicadores docentes por ano e conceito")
    df = df.copy()
    for col in [
        "DS_CATEGORIA_DOCENTE",
        "DS_REGIME_TRABALHO",
        "DS_DEPENDENCIA_ADMINISTRATIVA",
        "SG_ENTIDADE_ENSINO",
        "SG_IES_TITULACAO",
        "DS_TIPO_NACIONALIDADE_DOCENTE",
        "NM_PAIS_IES_TITULACAO",
        "CD_CAT_BOLSA_PRODUTIVIDADE",
    ]:
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

    grupos = list(df.groupby(["AN_BASE", "CD_CONCEITO_PROGRAMA"]))
    log(f"Docentes: {len(grupos)} grupo(s) ano/conceito identificados")

    for idx, ((ano, conceito), g) in enumerate(grupos, start=1):
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

    resultado = pd.DataFrame(rows)
    log(f"Docentes: indicadores gerados ({len(resultado):,} linhas)")
    return resultado

def build_student_concept_year(df):
    log("Construindo indicadores discentes por ano e conceito")
    df = df.copy()
    for col in [
        "DS_GRAU_ACADEMICO_DISCENTE",
        "NM_SITUACAO_DISCENTE",
        "DS_TIPO_NACIONALIDADE_DISCENTE",
        "DS_FAIXA_ETARIA",
    ]:
        if col in df.columns:
            df[col] = df[col].map(norm_text)

    df["QT_MES_TITULACAO_NUM"] = pd.to_numeric(df.get("QT_MES_TITULACAO", np.nan), errors="coerce")

    df["EH_MESTRADO"] = df.get("DS_GRAU_ACADEMICO_DISCENTE", "").str.contains("MESTRADO", na=False)
    df["EH_DOUTORADO"] = df.get("DS_GRAU_ACADEMICO_DISCENTE", "").str.contains("DOUTORADO", na=False)
    df["EH_TITULADO"] = df.get("NM_SITUACAO_DISCENTE", "") == "TITULADO"
    df["EH_EVASAO"] = df.get("NM_SITUACAO_DISCENTE", "").isin(["ABANDONOU", "DESLIGADO"])
    df["EH_ESTRANGEIRO"] = ~df.get("DS_TIPO_NACIONALIDADE_DISCENTE", "").eq("BRASILEIRO")

    rows = []

    grupos = list(df.groupby(["AN_BASE", "CD_CONCEITO_PROGRAMA"]))
    log(f"Discentes: {len(grupos)} grupo(s) ano/conceito identificados")

    for idx, ((ano, conceito), g) in enumerate(grupos, start=1):
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

    resultado = pd.DataFrame(rows)
    log(f"Discentes: indicadores gerados ({len(resultado):,} linhas)")
    return resultado

def get_global_bounds(df, metric_cols):
    """Calcula min e max globais de todo o dataset (2017-2024) para normalização consistente"""
    bounds = {}
    for col in metric_cols:
        bounds[col] = {
            "min": float(df[col].min(skipna=True)) if not df[col].dropna().empty else 0.0,
            "max": float(df[col].max(skipna=True)) if not df[col].dropna().empty else 1.0,
        }
    return bounds

def build_radar_data(df, metric_cols, global_bounds):
    """Gera dados normalizados (0-1) agrupados por conceito para alimentar um gráfico de radar"""
    if df.empty or not metric_cols:
        return [], []

    # Agrupa por conceito tirando a média das métricas
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

            c_min = global_bounds[col]["min"]
            c_max = global_bounds[col]["max"]

            # Normalização Min-Max para escalar tudo entre 0 e 1 no radar
            if pd.isna(val):
                norm_record[col] = 0.0
            elif c_max > c_min:
                norm_record[col] = round((val - c_min) / (c_max - c_min), 4)
            else:
                norm_record[col] = 0.0 if c_max == 0 else 1.0
        
        radar_series_norm.append(norm_record)
        radar_series_raw.append(raw_record)

    return radar_series_norm, radar_series_raw

def main():
    log("Iniciando processamento")
    log("Carregando docentes")
    docentes_raw = carregar_base(PADRAO_DOCENTES, "DOCENTES")

    log("Carregando discentes")
    discentes_raw = carregar_base(PADRAO_DISCENTES, "DISCENTES")

    docentes = filtrar_computacao(docentes_raw)
    discentes = filtrar_computacao(discentes_raw)

    log(f"Docentes válidos após filtro: {len(docentes):,}")
    log(f"Discentes válidos após filtro: {len(discentes):,}")

    log("Exportando bases filtradas para auditoria")
    docentes.to_csv(SAIDA_DIR / "computacao_docentes_2017_2024.csv", index=False, encoding="utf-8-sig")
    discentes.to_csv(SAIDA_DIR / "computacao_discentes_2017_2024.csv", index=False, encoding="utf-8-sig")

    teacher = build_teacher_concept_year(docentes)
    student = build_student_concept_year(discentes)

    log("Unindo bases agregadas por ano/conceito")
    concept_year = pd.merge(
        teacher,
        student,
        on=["AN_BASE", "CD_CONCEITO_PROGRAMA"],
        how="outer"
    ).sort_values(["AN_BASE", "CD_CONCEITO_PROGRAMA"]).reset_index(drop=True)

    log(f"Base consolidada final: {len(concept_year):,} linhas")
    concept_year.to_csv(ARQUIVO_SAIDA_CSV, index=False, encoding="utf-8-sig")
    log(f"CSV consolidado salvo em: {ARQUIVO_SAIDA_CSV}")

    # Definir colunas que farão parte dos eixos do radar
    metricas_radar = [c for c in concept_year.columns if c not in ["AN_BASE", "CD_CONCEITO_PROGRAMA", "total_docentes", "total_discentes"]]
    
    # Calcular min e max global para que o radar mantenha a escala em todos os anos (permite comparar 2017 com 2024 perfeitamente)
    global_bounds = get_global_bounds(concept_year, metricas_radar)
    
    # Dados da visão Geral (Todos os anos consolidados)
    radar_geral_norm, radar_geral_raw = build_radar_data(concept_year, metricas_radar, global_bounds)

    anos = sorted(concept_year["AN_BASE"].dropna().unique().astype(int).tolist())
    conceitos = sorted(concept_year["CD_CONCEITO_PROGRAMA"].dropna().unique().astype(int).tolist())

    log("Montando JSON final")
    output = {
        "metadata": {
            "total_docentes": int(len(docentes)),
            "total_discentes": int(len(discentes)),
            "anos": anos,
            "conceitos": conceitos,
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
            "concept_year_raw": concept_year.to_dict(orient="records"),
        },
        "por_ano": {}
    }

    # Dados separados ano a ano
    for ano in ANOS_DESEJADOS:
        df_ano = concept_year[concept_year["AN_BASE"] == ano].copy()
        log(f"Gerando bloco anual para radar: {ano} ({len(df_ano):,} linhas)")

        if df_ano.empty:
            output["por_ano"][str(ano)] = {
                "radar_normalizado": [],
                "radar_valores_reais": [],
            }
            continue

        radar_ano_norm, radar_ano_raw = build_radar_data(df_ano, metricas_radar, global_bounds)

        output["por_ano"][str(ano)] = {
            "radar_normalizado": radar_ano_norm,
            "radar_valores_reais": radar_ano_raw,
        }

    with open(ARQUIVO_SAIDA_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2, default=json_default)

    log("Processamento concluído")
    log(f"JSON gerado em: {ARQUIVO_SAIDA_JSON}")
    log(f"CSV gerado em: {ARQUIVO_SAIDA_CSV}")

if __name__ == "__main__":
    main()