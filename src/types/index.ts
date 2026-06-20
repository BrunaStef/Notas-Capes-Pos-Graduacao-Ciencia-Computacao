export interface Metadata {
  total_registros_computacao: number;
  anos_analisados: number[];
  anos_disponiveis_esperados: number[];
  conceitos: number[];
  escopo: {
    areas: string[];
    conceitos_filtro: number[];
    periodo: [number, number];
  };
}

export interface LiderancaBolsasPq {
  CD_CONCEITO_PROGRAMA: number;
  TEM_BOLSA_PQ: "SIM" | "NÃO";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

export interface InternacionalizacaoTitulacaoExterior {
  CD_CONCEITO_PROGRAMA: number;
  TITULADO_NO_EXTERIOR: "SIM" | "NÃO";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

export interface InternacionalizacaoNacionalidade {
  CD_CONCEITO_PROGRAMA: number;
  DOCENTE_ESTRANGEIRO: "BRASILEIRO" | "ESTRANGEIRO";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

export interface EndogamiaAcademica {
  CD_CONCEITO_PROGRAMA: number;
  ENDOGAMIA: "SIM" | "NÃO";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

export interface MaturidadeTempoDoutorado {
  CD_CONCEITO_PROGRAMA: number;
  MEDIA_ANOS_DOUTORADO: number;
}

export interface TamanhoMedioPrograma {
  CD_CONCEITO_PROGRAMA: number;
  MEDIA_DOCENTES_PERMANENTES_POR_PROGRAMA: number;
}

export interface CategoriaDocente {
  CD_CONCEITO_PROGRAMA: number;
  DS_CATEGORIA_DOCENTE: "COLABORADOR" | "PERMANENTE" | "VISITANTE";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

export interface RegimeTrabalho {
  CD_CONCEITO_PROGRAMA: number;
  DS_REGIME_TRABALHO: "DEDICAÇÃO EXCLUSIVA" | "INTEGRAL" | "PARCIAL";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

export interface DesigualdadeRegional {
  CD_CONCEITO_PROGRAMA: number;
  NM_REGIAO: "NORTE" | "NORDESTE" | "CENTRO-OESTE" | "SUDESTE" | "SUL";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

export interface NaturezaInstituicao {
  CD_CONCEITO_PROGRAMA: number;
  DS_DEPENDENCIA_ADMINISTRATIVA: "PÚBLICA" | "PRIVADA";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

export interface Top20Instituicao {
  SG_ENTIDADE_ENSINO: string;
  NM_ENTIDADE_ENSINO: string;
  TOTAL_DOCENTES: number;
}

export interface IndicadoresBase {
  lideranca_bolsas_pq: LiderancaBolsasPq[];
  internacionalizacao_titulacao_exterior: InternacionalizacaoTitulacaoExterior[];
  internacionalizacao_nacionalidade: InternacionalizacaoNacionalidade[];
  endogamia_academica: EndogamiaAcademica[];
  maturidade_tempo_doutorado: MaturidadeTempoDoutorado[];
  tamanho_medio_programa: TamanhoMedioPrograma[];
  categoria_docente: CategoriaDocente[];
  regime_trabalho: RegimeTrabalho[];
  desigualdade_regional: DesigualdadeRegional[];
  natureza_instituicao: NaturezaInstituicao[];
  top_20_instituicoes: Top20Instituicao[];
}

export interface IndicadoresPorAno {
  "2017": IndicadoresBase;
  "2018": IndicadoresBase;
  "2019": IndicadoresBase;
  "2020": IndicadoresBase;
  "2021": IndicadoresBase;
  "2022": IndicadoresBase;
  "2023": IndicadoresBase;
  "2024": IndicadoresBase;
}

export interface IndicadoresComputacaoDocentes {
  metadata: Metadata;
  geral: IndicadoresBase;
  por_ano: IndicadoresPorAno;
}
