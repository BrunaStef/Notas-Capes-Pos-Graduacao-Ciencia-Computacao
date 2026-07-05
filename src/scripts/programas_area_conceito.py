import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

ARQUIVOS_ENTRADA = [
    DATA_DIR / "br-capes-colsucup-docente-2017-2021-11-10.xlsx",
    DATA_DIR / "br-capes-colsucup-docente-2018-2021-11-10.xlsx",
    DATA_DIR / "br-capes-colsucup-docente-2019-2021-11-10.xlsx",
    DATA_DIR / "br-capes-colsucup-docente-2020-2021-11-10.xlsx",
    DATA_DIR / "br-capes-colsucup-docente-2021-2025-03-31.xlsx",
    DATA_DIR / "br-capes-colsucup-docente-2022-2025-03-31.xlsx",
    DATA_DIR / "br-capes-colsucup-docente-2023-2025-03-31.xlsx",
    DATA_DIR / "br-capes-colsucup-docente-2024-2025-12-01.xlsx",
]

ARQUIVO_SAIDA = DATA_DIR / "programas_area_conceito.xlsx"

colunas_uso = [
    "CD_PROGRAMA_IES",
    "NM_AREA_AVALIACAO",
    "AN_BASE",
    "CD_CONCEITO_PROGRAMA",
]

# =====================================
# 2. FUNÇÕES AUXILIARES
# =====================================

def normalizar_codigo_programa(valor):
    if pd.isna(valor):
        return None

    texto = str(valor).strip()

    if texto.endswith(".0"):
        texto = texto[:-2]

    return texto


dfs = []

for arquivo in ARQUIVOS_ENTRADA:
    if not arquivo.exists():
        raise FileNotFoundError(f"Arquivo não encontrado:\n{arquivo}")

    print(f"Lendo arquivo: {arquivo.name}")

    df_arquivo = pd.read_excel(
        arquivo,
        engine="openpyxl",
        usecols=lambda coluna: coluna in colunas_uso
    )

    colunas_faltantes = [
        coluna for coluna in colunas_uso if coluna not in df_arquivo.columns
    ]

    if colunas_faltantes:
        raise RuntimeError(
            f"As seguintes colunas não foram encontradas em {arquivo.name}:\n"
            f"{colunas_faltantes}\n\n"
            "Colunas encontradas:\n"
            f"{list(df_arquivo.columns)}"
        )

    dfs.append(df_arquivo)

df = pd.concat(dfs, ignore_index=True)

print(f"\nTotal bruto de registros lidos: {len(df):,}")

df["CD_PROGRAMA_IES"] = df["CD_PROGRAMA_IES"].apply(normalizar_codigo_programa)

df["NM_AREA_AVALIACAO"] = (
    df["NM_AREA_AVALIACAO"]
    .astype(str)
    .str.strip()
    .str.upper()
)

df["AN_BASE"] = pd.to_numeric(
    df["AN_BASE"],
    errors="coerce"
)

df["CD_CONCEITO_PROGRAMA"] = pd.to_numeric(
    df["CD_CONCEITO_PROGRAMA"],
    errors="coerce"
)

df = df.dropna(
    subset=[
        "CD_PROGRAMA_IES",
        "NM_AREA_AVALIACAO",
        "AN_BASE",
        "CD_CONCEITO_PROGRAMA",
    ]
).copy()

df["AN_BASE"] = df["AN_BASE"].astype(int)
df["CD_CONCEITO_PROGRAMA"] = df["CD_CONCEITO_PROGRAMA"].astype(int)

df = df[df["AN_BASE"].between(2017, 2024)].copy()

df = df.drop_duplicates(
    subset=[
        "AN_BASE",
        "CD_PROGRAMA_IES",
        "NM_AREA_AVALIACAO",
        "CD_CONCEITO_PROGRAMA",
    ]
).copy()

df = df.sort_values(
    by=[
        "AN_BASE",
        "NM_AREA_AVALIACAO",
        "CD_PROGRAMA_IES",
    ]
)

print("\nRegistros por ano:")
print(
    df.groupby("AN_BASE")
    .size()
    .to_string()
)

print("\nProgramas únicos por ano:")
print(
    df.groupby("AN_BASE")["CD_PROGRAMA_IES"]
    .nunique()
    .to_string()
)

df.to_excel(
    ARQUIVO_SAIDA,
    index=False,
    engine="openpyxl"
)

print("\nArquivo gerado com sucesso.")
print(f"Total de registros finais: {len(df):,}")
print(f"Arquivo salvo em: {ARQUIVO_SAIDA}")