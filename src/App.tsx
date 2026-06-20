import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Divider,
  Button,
  alpha,
} from "@mui/material";
import {
  InsightsRounded,
  GroupsRounded,
  SchoolRounded,
  PublicRounded,
  WorkspacePremiumRounded,
  ApartmentRounded,
  DataObjectRounded,
  HubRounded,
  QueryStatsRounded,
  MapRounded,
  BadgeRounded,
  AccessTimeFilledRounded,
  AccountBalanceRounded,
} from "@mui/icons-material";

import rawJsonData from "./database/indicadores_computacao_docentes.json";

const PALETTE = [
  "#42001A",
  "#760031",
  "#D51C39",
  "#FF6060",
  "#FF9D00",
  "#8A5A00",
] as const;

type AnoKey = "GERAL" | string;

interface Metadata {
  total_registros_computacao: number;
  anos_analisados: number[];
  anos_disponiveis_esperados?: number[];
  conceitos: number[];
  escopo?: {
    areas: string[];
    conceitos_filtro: number[];
    periodo: [number, number];
  };
}

interface LiderancaBolsasPq {
  CD_CONCEITO_PROGRAMA: number;
  TEM_BOLSA_PQ: "SIM" | "NÃO";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

interface InternacionalizacaoTitulacaoExterior {
  CD_CONCEITO_PROGRAMA: number;
  TITULADO_NO_EXTERIOR: "SIM" | "NÃO";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

interface InternacionalizacaoNacionalidade {
  CD_CONCEITO_PROGRAMA: number;
  DOCENTE_ESTRANGEIRO: "BRASILEIRO" | "ESTRANGEIRO";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

interface EndogamiaAcademica {
  CD_CONCEITO_PROGRAMA: number;
  ENDOGAMIA: "SIM" | "NÃO";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

interface MaturidadeTempoDoutorado {
  CD_CONCEITO_PROGRAMA: number;
  MEDIA_ANOS_DOUTORADO: number;
}

interface TamanhoMedioPrograma {
  CD_CONCEITO_PROGRAMA: number;
  MEDIA_DOCENTES_PERMANENTES_POR_PROGRAMA: number;
}

interface CategoriaDocente {
  CD_CONCEITO_PROGRAMA: number;
  DS_CATEGORIA_DOCENTE: "COLABORADOR" | "PERMANENTE" | "VISITANTE";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

interface RegimeTrabalho {
  CD_CONCEITO_PROGRAMA: number;
  DS_REGIME_TRABALHO: "DEDICAÇÃO EXCLUSIVA" | "INTEGRAL" | "PARCIAL";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

interface DesigualdadeRegional {
  CD_CONCEITO_PROGRAMA: number;
  NM_REGIAO: "NORTE" | "NORDESTE" | "CENTRO-OESTE" | "SUDESTE" | "SUL";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

interface NaturezaInstituicao {
  CD_CONCEITO_PROGRAMA: number;
  DS_DEPENDENCIA_ADMINISTRATIVA: "PÚBLICA" | "PRIVADA";
  TOTAL_DOCENTES: number;
  PERCENTUAL: number;
}

interface Top20Instituicao {
  SG_ENTIDADE_ENSINO: string;
  NM_ENTIDADE_ENSINO: string;
  TOTAL_DOCENTES: number;
}

interface IndicadoresBase {
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

interface IndicadoresComputacaoDocentes {
  metadata: Metadata;
  geral: IndicadoresBase;
  por_ano: Record<string, IndicadoresBase>;
}

const jsonData = rawJsonData as unknown as IndicadoresComputacaoDocentes;

type Row = Record<string, any>;

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: PALETTE[4] },
    secondary: { main: PALETTE[5] },
    success: { main: PALETTE[2] },
    warning: { main: PALETTE[3] },
    error: { main: PALETTE[1] },
    background: {
      default: "#080E1A",
      paper: "#0F1928",
    },
    text: {
      primary: "#F1F5F9",
      secondary: "#94A3B8",
    },
    divider: "rgba(148, 163, 184, 0.10)",
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.04em" },
    h2: { fontWeight: 700, letterSpacing: "-0.03em" },
    h3: { fontWeight: 700, letterSpacing: "-0.03em" },
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 650, letterSpacing: "-0.01em" },
    body1: { lineHeight: 1.7, fontSize: "1.05rem" },
    body2: { lineHeight: 1.65, fontSize: "0.98rem" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: "smooth" },
        body: { background: "#080E1A" },
        "*::-webkit-scrollbar": { width: "8px", height: "8px" },
        "*::-webkit-scrollbar-thumb": {
          borderRadius: "999px",
          backgroundColor: "rgba(148, 163, 184, 0.20)",
        },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: "1px solid rgba(148, 163, 184, 0.08)",
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 0 },
      },
    },
  },
});

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.getBoundingClientRect().width);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function formatNumber(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

function sortConcepts(values: Array<string | number>) {
  return [
    ...new Set(values.filter((v) => v !== null && v !== undefined).map(String)),
  ].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b, "pt-BR", { numeric: true });
  });
}

function getConceptValue(rows: Row[], concept: string, valueKey: string) {
  const values = rows
    .filter((d) => String(d.CD_CONCEITO_PROGRAMA) === concept)
    .map((d) => toNumber(d[valueKey]))
    .filter((v): v is number => typeof v === "number");
  if (!values.length) return 0;
  return d3.sum(values);
}

function getSpecificCategoryPercent(
  rows: Row[],
  concept: string,
  categoryKey: string,
  targetCategory: string,
  valueKey: string,
) {
  const conceptRows = rows.filter(
    (d) => String(d.CD_CONCEITO_PROGRAMA) === concept,
  );
  const targetRows = conceptRows.filter(
    (d) =>
      String(d[categoryKey]).toUpperCase() === targetCategory.toUpperCase(),
  );
  const values = targetRows
    .map((d) => toNumber(d[valueKey]))
    .filter((v): v is number => typeof v === "number");
  if (values.length) return d3.sum(values);
  return 0;
}

function createDarkTooltip() {
  let tooltipEl = document.getElementById("d3-dark-tooltip");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "d3-dark-tooltip";
    tooltipEl.style.cssText = `
      position: fixed;
      pointer-events: none;
      background: #0F1928;
      border: 1px solid rgba(148,163,184,0.20);
      color: #F1F5F9;
      font-size: 13px;
      font-family: Inter, system-ui, sans-serif;
      padding: 8px 12px;
      border-radius: 4px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7);
      z-index: 9999;
      opacity: 0;
      transition: opacity 120ms ease;
      white-space: nowrap;
      line-height: 1.5;
    `;
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function showTooltip(el: HTMLElement, html: string, event: MouseEvent) {
  el.innerHTML = html;
  el.style.opacity = "1";
  el.style.left = event.clientX + 14 + "px";
  el.style.top = event.clientY - 10 + "px";
}

function hideTooltip(el: HTMLElement) {
  el.style.opacity = "0";
}

function ChartShell({
  title,
  subtitle,
  description,
  icon: Icon,
  accent,
  children,
  fullWidth,
}: {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gridColumn: fullWidth ? { xs: "auto", xl: "1 / -1" } : undefined,
        background: "#0F1928",
        borderColor: "rgba(148, 163, 184, 0.08)",
        transition: "border-color 200ms ease",
        "&:hover": { borderColor: alpha(accent, 0.3) },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2.5, md: 3 },
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ mb: 1.25 }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              display: "grid",
              placeItems: "center",
              bgcolor: alpha(accent, 0.1),
              color: accent,
              flexShrink: 0,
              border: `1px solid ${alpha(accent, 0.18)}`,
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{ lineHeight: 1.2, mb: 0.3, fontSize: "1.05rem" }}
            >
              {title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.875rem" }}
            >
              {subtitle}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            mb: 2,
            p: "10px 14px",
            bgcolor: "rgba(148,163,184,0.04)",
            borderLeft: `2px solid ${alpha(accent, 0.5)}`,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: "0.85rem", lineHeight: 1.6 }}
          >
            {description}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2, borderColor: "rgba(148,163,184,0.08)" }} />
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

function StackedBarChart({
  rows,
  categoryKey,
  valueKey,
  width,
  height,
  colorMap,
}: {
  rows: Row[];
  categoryKey: string;
  valueKey: string;
  width: number;
  height: number;
  colorMap: Record<string, string>;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || !width) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const tooltip = createDarkTooltip();
    const margin = { top: 16, right: 28, bottom: 40, left: 56 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const concepts = sortConcepts(rows.map((d: any) => d.CD_CONCEITO_PROGRAMA));
    const categories = Object.keys(colorMap);

    const series = concepts.map((concept) => {
      const conceptRows = rows.filter(
        (d: any) => String(d.CD_CONCEITO_PROGRAMA) === concept,
      );
      const values = d3.rollups(
        conceptRows,
        (v) => d3.sum(v, (d) => toNumber(d[valueKey]) ?? 0),
        (d) => String(d[categoryKey]),
      );
      const total = d3.sum(values, (d) => d[1]) || 1;
      return {
        concept,
        segments: categories.map((cat) => ({
          category: cat,
          value: ((values.find((d) => d[0] === cat)?.[1] ?? 0) / total) * 100,
        })),
      };
    });

    const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    const y = d3
      .scaleBand<string>()
      .domain(concepts)
      .range([0, innerHeight])
      .padding(0.32);

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)
      .style("overflow", "visible");
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickSizeOuter(0)
          .tickFormat((d) => `${d}%`),
      )
      .call((s) =>
        s.selectAll("text").attr("fill", "#94A3B8").attr("font-size", 13),
      )
      .call((s) =>
        s.selectAll("path,line").attr("stroke", "rgba(255,255,255,0.08)"),
      );

    g.append("g")
      .call(d3.axisLeft(y).tickSizeOuter(0).tickSize(0))
      .call((s) =>
        s
          .selectAll("text")
          .attr("fill", "#CBD5E1")
          .attr("font-size", 14)
          .attr("font-weight", "600")
          .attr("dx", "-8"),
      )
      .call((s) =>
        s.selectAll("path").attr("stroke", "rgba(255,255,255,0.08)"),
      );

    series.forEach((row) => {
      const yPos = y(row.concept);
      if (yPos === undefined) return;
      const bandH = y.bandwidth();

      g.append("rect")
        .attr("x", 0)
        .attr("y", yPos)
        .attr("width", innerWidth)
        .attr("height", bandH)
        .attr("fill", "rgba(255,255,255,0.015)")
        .attr("stroke", "rgba(255,255,255,0.04)");

      let cursor = 0;
      row.segments.forEach((seg) => {
        const segW = x(seg.value);
        if (segW <= 0) return;

        const rect = g
          .append("rect")
          .attr("x", cursor)
          .attr("y", yPos + 1)
          .attr("width", segW)
          .attr("height", Math.max(0, bandH - 2))
          .attr("fill", colorMap[seg.category] || PALETTE[4])
          .attr("opacity", 0.9)
          .style("cursor", "default");

        rect
          .on("mousemove", (event: MouseEvent) => {
            showTooltip(
              tooltip,
              `<strong>Conceito ${row.concept}</strong><br/>${seg.category}: <strong>${seg.value.toFixed(1)}%</strong>`,
              event,
            );
          })
          .on("mouseleave", () => hideTooltip(tooltip));

        if (segW > 44) {
          g.append("text")
            .attr("x", cursor + segW / 2)
            .attr("y", yPos + bandH / 2 + 5)
            .attr("text-anchor", "middle")
            .attr("fill", "#F8FAFC")
            .attr("font-size", 12)
            .attr("font-weight", 700)
            .attr("pointer-events", "none")
            .text(`${seg.value.toFixed(0)}%`);
        }
        cursor += segW;
      });
    });

    const legend = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${height - 10})`);
    let legendCursor = 0;
    categories.forEach((cat) => {
      const legendGroup = legend
        .append("g")
        .attr("transform", `translate(${legendCursor}, 0)`);
      legendGroup
        .append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 2)
        .attr("fill", colorMap[cat] || PALETTE[4]);
      const text = legendGroup
        .append("text")
        .attr("x", 20)
        .attr("y", 10)
        .attr("fill", "#94A3B8")
        .attr("font-size", 12)
        .text(cat);
      legendCursor += (text.node()?.getComputedTextLength() || 50) + 36;
    });
  }, [rows, categoryKey, valueKey, width, height, colorMap]);

  return <svg ref={ref} />;
}

function LollipopChart({
  rows,
  valueKey,
  width,
  height,
  accent,
}: {
  rows: Row[];
  valueKey: string;
  width: number;
  height: number;
  accent: string;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || !width) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const tooltip = createDarkTooltip();
    const margin = { top: 16, right: 56, bottom: 32, left: 56 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const data = [...rows]
      .map((d: any) => ({
        concept: String(d.CD_CONCEITO_PROGRAMA),
        value: toNumber(d[valueKey]) ?? 0,
      }))
      .sort((a, b) => Number(a.concept) - Number(b.concept));

    const maxValue = d3.max(data, (d) => d.value) ?? 1;
    const x = d3
      .scaleLinear()
      .domain([0, maxValue * 1.15])
      .nice()
      .range([0, innerWidth]);
    const y = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.concept))
      .range([0, innerHeight])
      .padding(0.44);

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)
      .style("overflow", "visible");
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0))
      .call((s) =>
        s.selectAll("text").attr("fill", "#94A3B8").attr("font-size", 13),
      )
      .call((s) =>
        s.selectAll("path,line").attr("stroke", "rgba(255,255,255,0.08)"),
      );

    g.append("g")
      .call(d3.axisLeft(y).tickSizeOuter(0).tickSize(0))
      .call((s) =>
        s
          .selectAll("text")
          .attr("fill", "#CBD5E1")
          .attr("font-size", 14)
          .attr("font-weight", "600")
          .attr("dx", "-8"),
      )
      .call((s) =>
        s.selectAll("path").attr("stroke", "rgba(255,255,255,0.08)"),
      );

    data.forEach((d) => {
      const yPos = y(d.concept);
      if (yPos === undefined) return;
      const centerY = yPos + y.bandwidth() / 2;
      const xPos = x(d.value);

      g.append("line")
        .attr("x1", 0)
        .attr("x2", xPos)
        .attr("y1", centerY)
        .attr("y2", centerY)
        .attr("stroke", alpha(accent, 0.35))
        .attr("stroke-width", 2);

      const circle = g
        .append("circle")
        .attr("cx", xPos)
        .attr("cy", centerY)
        .attr("r", 6)
        .attr("fill", accent)
        .attr("stroke", "#080E1A")
        .attr("stroke-width", 2.5)
        .style("cursor", "default");

      circle
        .on("mousemove", (event: MouseEvent) => {
          showTooltip(
            tooltip,
            `<strong>Conceito ${d.concept}</strong><br/>Valor: <strong>${d3.format(".1f")(d.value)}</strong>`,
            event,
          );
        })
        .on("mouseleave", () => hideTooltip(tooltip));

      g.append("text")
        .attr("x", xPos + 12)
        .attr("y", centerY + 5)
        .attr("fill", "#E2E8F0")
        .attr("font-size", 13)
        .attr("font-weight", 700)
        .attr("pointer-events", "none")
        .text(d3.format(".1f")(d.value));
    });
  }, [rows, valueKey, width, height, accent]);

  return <svg ref={ref} />;
}

function HorizontalBarChart({
  data,
  width,
  height,
  accent,
}: {
  data: Top20Instituicao[];
  width: number;
  height: number;
  accent: string;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || !width) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const tooltip = createDarkTooltip();
    const margin = { top: 16, right: 60, bottom: 32, left: 80 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const sortedData = [...data]
      .sort((a, b) => b.TOTAL_DOCENTES - a.TOTAL_DOCENTES)
      .slice(0, 10);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(sortedData, (d) => d.TOTAL_DOCENTES) || 0])
      .nice()
      .range([0, innerWidth]);
    const y = d3
      .scaleBand<string>()
      .domain(sortedData.map((d) => d.SG_ENTIDADE_ENSINO))
      .range([0, innerHeight])
      .padding(0.2);

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)
      .style("overflow", "visible");
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0))
      .call((s) =>
        s.selectAll("text").attr("fill", "#94A3B8").attr("font-size", 12),
      )
      .call((s) =>
        s.selectAll("path,line").attr("stroke", "rgba(255,255,255,0.08)"),
      );

    g.append("g")
      .call(d3.axisLeft(y).tickSizeOuter(0).tickSize(0))
      .call((s) =>
        s
          .selectAll("text")
          .attr("fill", "#CBD5E1")
          .attr("font-size", 12)
          .attr("font-weight", "600"),
      )
      .call((s) =>
        s.selectAll("path").attr("stroke", "rgba(255,255,255,0.08)"),
      );

    sortedData.forEach((d, index) => {
      const yPos = y(d.SG_ENTIDADE_ENSINO);
      if (yPos === undefined) return;

      const rect = g
        .append("rect")
        .attr("x", 0)
        .attr("y", yPos)
        .attr("width", x(d.TOTAL_DOCENTES))
        .attr("height", y.bandwidth())
        .attr("fill", index % 2 === 0 ? accent : PALETTE[3])
        .attr("rx", 2)
        .attr("opacity", 0.9);

      rect
        .on("mousemove", (event: MouseEvent) => {
          showTooltip(
            tooltip,
            `<strong>${d.SG_ENTIDADE_ENSINO}</strong><br/>${d.NM_ENTIDADE_ENSINO}<br/>Total de Docentes: <strong>${d.TOTAL_DOCENTES}</strong>`,
            event,
          );
        })
        .on("mouseleave", () => hideTooltip(tooltip));

      g.append("text")
        .attr("x", x(d.TOTAL_DOCENTES) + 8)
        .attr("y", yPos + y.bandwidth() / 2 + 4)
        .attr("fill", "#F1F5F9")
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .text(d.TOTAL_DOCENTES);
    });
  }, [data, width, height, accent]);

  return <svg ref={ref} />;
}

function HeatmapChart({
  rows,
  width,
  height,
}: {
  rows: Array<{ concept: string; metric: string; value: number }>;
  width: number;
  height: number;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || !width) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const tooltip = createDarkTooltip();
    const margin = { top: 28, right: 24, bottom: 40, left: 180 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const concepts = sortConcepts(rows.map((d) => d.concept));
    const metrics = [...new Set(rows.map((d) => d.metric))] as string[];

    const normalizedByMetric = metrics.flatMap((metric) => {
      const values = rows.filter((d) => d.metric === metric);
      const min = d3.min(values, (d) => d.value) ?? 0;
      const max = d3.max(values, (d) => d.value) ?? 1;
      const scale =
        min === max
          ? (v: number) => (v === 0 ? 0 : 100)
          : d3.scaleLinear().domain([min, max]).range([0, 100]).clamp(true);
      return values.map((d) => ({
        ...d,
        normalized: scale(d.value),
      }));
    });

    const x = d3
      .scaleBand<string>()
      .domain(concepts)
      .range([0, innerWidth])
      .padding(0.1);
    const y = d3
      .scaleBand<string>()
      .domain(metrics)
      .range([0, innerHeight])
      .padding(0.1);

    const color = d3
      .scaleQuantize<string>()
      .domain([0, 100])
      .range([...PALETTE]);

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)
      .style("overflow", "visible");
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .call(d3.axisLeft(y).tickSizeOuter(0).tickSize(0))
      .call((s) =>
        s
          .selectAll("text")
          .attr("fill", "#CBD5E1")
          .attr("font-size", 13)
          .attr("font-weight", "500")
          .attr("dx", "-8"),
      )
      .call((s) =>
        s.selectAll("path").attr("stroke", "rgba(255,255,255,0.06)"),
      );

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0).tickSize(0))
      .call((s) =>
        s
          .selectAll("text")
          .attr("fill", "#94A3B8")
          .attr("font-size", 14)
          .attr("font-weight", "700")
          .attr("dy", "14"),
      )
      .call((s) =>
        s.selectAll("path").attr("stroke", "rgba(255,255,255,0.06)"),
      );

    normalizedByMetric.forEach((d) => {
      const xPos = x(d.concept);
      const yPos = y(d.metric);
      if (xPos === undefined || yPos === undefined) return;

      const rect = g
        .append("rect")
        .attr("x", xPos)
        .attr("y", yPos)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", color(d.normalized))
        .attr("rx", 2)
        .style("cursor", "default");

      rect
        .on("mousemove", (event: MouseEvent) => {
          showTooltip(
            tooltip,
            `<strong>${d.metric}</strong><br/>Conceito ${d.concept}<br/>Valor Bruto: <strong>${d3.format(".1f")(d.value)}</strong><br/>Score: <strong>${d3.format(".0f")(d.normalized)}</strong>`,
            event,
          );
        })
        .on("mouseleave", () => hideTooltip(tooltip));

      if (x.bandwidth() > 40 && y.bandwidth() > 24) {
        g.append("text")
          .attr("x", xPos + x.bandwidth() / 2)
          .attr("y", yPos + y.bandwidth() / 2 + 5)
          .attr("text-anchor", "middle")
          .attr("fill", d.normalized > 60 ? "#F8FAFC" : "#94A3B8")
          .attr("font-size", 12)
          .attr("font-weight", 700)
          .attr("pointer-events", "none")
          .text(d3.format(".0f")(d.normalized));
      }
    });
  }, [rows, width, height]);

  return <svg ref={ref} />;
}

export default function App() {
  const anos = useMemo(() => {
    const expected = jsonData.metadata?.anos_disponiveis_esperados ?? [];
    const available = jsonData.metadata?.anos_analisados ?? [];
    const base = expected.length ? expected : available;
    return [...new Set(base)].sort((a, b) => a - b);
  }, []);

  const [selectedPeriod, setSelectedPeriod] = useState<AnoKey>("GERAL");

  const activeData = useMemo<IndicadoresBase>(() => {
    if (selectedPeriod === "GERAL") return jsonData.geral;
    return jsonData.por_ano?.[selectedPeriod] ?? jsonData.geral;
  }, [selectedPeriod]);

  const { metrics, charts, selectedLabel } = useMemo(() => {
    const leadershipRows = activeData.lideranca_bolsas_pq || [];
    const sizeRows = activeData.tamanho_medio_programa || [];
    const maturityRows = activeData.maturidade_tempo_doutorado || [];
    const internationalRows =
      activeData.internacionalizacao_titulacao_exterior || [];
    const endogamyRows = activeData.endogamia_academica || [];
    const nationalityRows = activeData.internacionalizacao_nacionalidade || [];
    const categoryRows = activeData.categoria_docente || [];
    const regimeRows = activeData.regime_trabalho || [];
    const regionRows = activeData.desigualdade_regional || [];
    const institutionRows = activeData.natureza_instituicao || [];
    const top20Rows = activeData.top_20_instituicoes || [];

    const concepts = sortConcepts(
      leadershipRows.map((d) => d.CD_CONCEITO_PROGRAMA),
    );
    const totalRegistros = jsonData.metadata.total_registros_computacao || 0;
    const quantidadeProgramas = concepts.length;
    const maxConcept = concepts.length ? Math.max(...concepts.map(Number)) : 0;

    const heatRows = concepts.flatMap((concept) => [
      {
        metric: "Bolsas PQ (% Sim)",
        concept,
        value: getSpecificCategoryPercent(
          leadershipRows,
          concept,
          "TEM_BOLSA_PQ",
          "SIM",
          "PERCENTUAL",
        ),
      },
      {
        metric: "Titulação Ext. (% Sim)",
        concept,
        value: getSpecificCategoryPercent(
          internationalRows,
          concept,
          "TITULADO_NO_EXTERIOR",
          "SIM",
          "PERCENTUAL",
        ),
      },
      {
        metric: "Docentes Estrangeiros (%)",
        concept,
        value: getSpecificCategoryPercent(
          nationalityRows,
          concept,
          "DOCENTE_ESTRANGEIRO",
          "ESTRANGEIRO",
          "PERCENTUAL",
        ),
      },
      {
        metric: "Endogamia Acadêmica (%)",
        concept,
        value: getSpecificCategoryPercent(
          endogamyRows,
          concept,
          "ENDOGAMIA",
          "SIM",
          "PERCENTUAL",
        ),
      },
      {
        metric: "Dedicação Exclusiva (%)",
        concept,
        value: getSpecificCategoryPercent(
          regimeRows,
          concept,
          "DS_REGIME_TRABALHO",
          "DEDICAÇÃO EXCLUSIVA",
          "PERCENTUAL",
        ),
      },
      {
        metric: "Docentes Permanentes (%)",
        concept,
        value: getSpecificCategoryPercent(
          categoryRows,
          concept,
          "DS_CATEGORIA_DOCENTE",
          "PERMANENTE",
          "PERCENTUAL",
        ),
      },
      {
        metric: "Inst. Públicas (%)",
        concept,
        value: getSpecificCategoryPercent(
          institutionRows,
          concept,
          "DS_DEPENDENCIA_ADMINISTRATIVA",
          "PÚBLICA",
          "PERCENTUAL",
        ),
      },
      {
        metric: "Tamanho do Prog. (Média)",
        concept,
        value: getConceptValue(
          sizeRows,
          concept,
          "MEDIA_DOCENTES_PERMANENTES_POR_PROGRAMA",
        ),
      },
      {
        metric: "Tempo Doutorado (Anos)",
        concept,
        value: getConceptValue(maturityRows, concept, "MEDIA_ANOS_DOUTORADO"),
      },
    ]);

    return {
      metrics: {
        totalRegistros,
        quantidadeProgramas,
        maxConcept,
        recorte: selectedPeriod,
      },
      charts: {
        leadershipRows,
        sizeRows,
        maturityRows,
        internationalRows,
        endogamyRows,
        nationalityRows,
        categoryRows,
        regimeRows,
        regionRows,
        institutionRows,
        top20Rows,
        heatRows,
      },
      selectedLabel:
        selectedPeriod === "GERAL" ? "Geral (2017–2024)" : selectedPeriod,
    };
  }, [activeData, selectedPeriod]);

  const { ref: heatmapRef, width: heatmapWidth } = useWidth<HTMLDivElement>();
  const { ref: leadershipRef, width: leadershipWidth } =
    useWidth<HTMLDivElement>();
  const { ref: internationalRef, width: internationalWidth } =
    useWidth<HTMLDivElement>();
  const { ref: endogamyRef, width: endogamyWidth } = useWidth<HTMLDivElement>();
  const { ref: sizeRef, width: sizeWidth } = useWidth<HTMLDivElement>();
  const { ref: maturityRef, width: maturityWidth } = useWidth<HTMLDivElement>();
  const { ref: nationalityRef, width: nationalityWidth } =
    useWidth<HTMLDivElement>();
  const { ref: categoryRef, width: categoryWidth } = useWidth<HTMLDivElement>();
  const { ref: regimeRef, width: regimeWidth } = useWidth<HTMLDivElement>();
  const { ref: regionRef, width: regionWidth } = useWidth<HTMLDivElement>();
  const { ref: institutionRef, width: institutionWidth } =
    useWidth<HTMLDivElement>();
  const { ref: top20Ref, width: top20Width } = useWidth<HTMLDivElement>();

  const stackedHeight = 270;
  const lollipopHeight = 260;
  const heatmapHeight = 420;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "#080E1A" }}>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backdropFilter: "blur(16px)",
            background: "rgba(8, 14, 26, 0.85)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ minHeight: 60 }}>
              <Stack
                direction="row"
                spacing={1.2}
                alignItems="center"
                sx={{ flexGrow: 1 }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(PALETTE[4], 0.12),
                    color: PALETTE[5],
                    border: "1px solid rgba(255,157,0,0.16)",
                  }}
                >
                  <InsightsRounded fontSize="small" />
                </Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, fontSize: "0.95rem" }}
                >
                  CAPES Analytics
                </Typography>
              </Stack>
            </Toolbar>
          </Container>
        </AppBar>
        <Toolbar />

        <Container maxWidth="xl" sx={{ py: { xs: 3.5, md: 5 } }}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="overline"
              sx={{
                color: PALETTE[5],
                fontWeight: 800,
                letterSpacing: "0.12em",
              }}
            >
              CAPES · Computação
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "1.9rem", md: "2.4rem" },
                mt: 0.5,
                mb: 1.25,
              }}
            >
              Painel analítico
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 760 }}
            >
              Visão integrada do corpo docente dos programas de pós-graduação em
              Computação avaliados pela CAPES. O recorte atual é{" "}
              <Box component="span" sx={{ color: PALETTE[5], fontWeight: 700 }}>
                {selectedLabel}
              </Box>
              .
            </Typography>

            <Box
              sx={{
                mt: 3,
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                alignItems: "center",
              }}
            >
              <Button
                variant={selectedPeriod === "GERAL" ? "contained" : "outlined"}
                onClick={() => setSelectedPeriod("GERAL")}
                sx={{
                  borderColor: alpha(PALETTE[4], 0.5),
                  bgcolor:
                    selectedPeriod === "GERAL" ? PALETTE[4] : "transparent",
                  color: selectedPeriod === "GERAL" ? "#080E1A" : PALETTE[5],
                  "&:hover": {
                    bgcolor:
                      selectedPeriod === "GERAL"
                        ? PALETTE[5]
                        : alpha(PALETTE[4], 0.12),
                    borderColor: PALETTE[5],
                  },
                }}
              >
                Geral
              </Button>
              {anos.map((ano) => (
                <Button
                  key={ano}
                  variant={
                    selectedPeriod === String(ano) ? "contained" : "outlined"
                  }
                  onClick={() => setSelectedPeriod(String(ano))}
                  sx={{
                    borderColor: alpha(PALETTE[1], 0.5),
                    bgcolor:
                      selectedPeriod === String(ano)
                        ? PALETTE[1]
                        : "transparent",
                    color:
                      selectedPeriod === String(ano) ? "#F1F5F9" : PALETTE[5],
                    "&:hover": {
                      bgcolor:
                        selectedPeriod === String(ano)
                          ? PALETTE[2]
                          : alpha(PALETTE[1], 0.12),
                      borderColor: PALETTE[2],
                    },
                  }}
                >
                  {ano}
                </Button>
              ))}
            </Box>
          </Box>

          {/* <Box
            sx={{
              mb: 5,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                md: "repeat(4, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <Card
              sx={{
                background: "#0F1928",
                borderColor: "rgba(148,163,184,0.08)",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: alpha(PALETTE[4], 0.1),
                      color: PALETTE[4],
                      border: `1px solid ${alpha(PALETTE[4], 0.16)}`,
                    }}
                  >
                    <DataObjectRounded fontSize="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total de registros
                  </Typography>
                </Stack>
                <Typography
                  variant="h4"
                  sx={{ fontSize: { xs: "1.8rem", md: "2.1rem" } }}
                >
                  {formatNumber(metrics.totalRegistros)}
                </Typography>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: "#0F1928",
                borderColor: "rgba(148,163,184,0.08)",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: alpha(PALETTE[2], 0.1),
                      color: PALETTE[2],
                      border: `1px solid ${alpha(PALETTE[2], 0.16)}`,
                    }}
                  >
                    <HubRounded fontSize="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Programas avaliados
                  </Typography>
                </Stack>
                <Typography
                  variant="h4"
                  sx={{ fontSize: { xs: "1.8rem", md: "2.1rem" } }}
                >
                  {formatNumber(metrics.quantidadeProgramas)}
                </Typography>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: "#0F1928",
                borderColor: "rgba(148,163,184,0.08)",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: alpha(PALETTE[5], 0.1),
                      color: PALETTE[5],
                      border: `1px solid ${alpha(PALETTE[5], 0.16)}`,
                    }}
                  >
                    <QueryStatsRounded fontSize="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Maior conceito
                  </Typography>
                </Stack>
                <Typography
                  variant="h4"
                  sx={{ fontSize: { xs: "1.8rem", md: "2.1rem" } }}
                >
                  {formatNumber(metrics.maxConcept)}
                </Typography>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: "#0F1928",
                borderColor: "rgba(148,163,184,0.08)",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: alpha(PALETTE[3], 0.1),
                      color: PALETTE[3],
                      border: `1px solid ${alpha(PALETTE[3], 0.16)}`,
                    }}
                  >
                    <AccessTimeFilledRounded fontSize="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Recorte ativo
                  </Typography>
                </Stack>
                <Typography
                  variant="h4"
                  sx={{ fontSize: { xs: "1.55rem", md: "1.9rem" } }}
                >
                  {selectedLabel}
                </Typography>
              </CardContent>
            </Card>
          </Box> */}

          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Visão Geral Consolidada
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Todos os eixos da avaliação no recorte selecionado. Cores intensas
              indicam maior concentração relativa dentro de cada indicador.
            </Typography>
          </Box>

          <Box ref={heatmapRef} sx={{ mb: 5 }}>
            <ChartShell
              title="Matriz comparativa normalizada"
              subtitle="Indicadores em escala de 0 a 100 por linha"
              description="Explore rapidamente quais conceitos dominam quais características. Programas mais altos tendem a se concentrar nas faixas superiores da matriz."
              icon={QueryStatsRounded}
              accent={PALETTE[4]}
              fullWidth
            >
              {heatmapWidth > 0 && (
                <HeatmapChart
                  rows={charts.heatRows}
                  width={heatmapWidth}
                  height={heatmapHeight}
                />
              )}
            </ChartShell>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Detalhamento por Eixo Temático
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
              mb: 5,
            }}
          >
            <Box ref={leadershipRef}>
              <ChartShell
                title="Bolsas de Produtividade (PQ)"
                subtitle="Percentual por conceito"
                description="Proporção de docentes bolsistas CNPq. Evidencia o acúmulo de lideranças científicas em programas de excelência."
                icon={WorkspacePremiumRounded}
                accent={PALETTE[4]}
              >
                {leadershipWidth > 0 && (
                  <StackedBarChart
                    rows={charts.leadershipRows}
                    categoryKey="TEM_BOLSA_PQ"
                    valueKey="PERCENTUAL"
                    width={leadershipWidth}
                    height={stackedHeight}
                    colorMap={{ SIM: PALETTE[4], NÃO: PALETTE[0] }}
                  />
                )}
              </ChartShell>
            </Box>

            <Box ref={internationalRef}>
              <ChartShell
                title="Titulação no Exterior"
                subtitle="Métrica de internacionalização"
                description="Parcela com doutorado fora do Brasil. Crucial para inserção internacional."
                icon={PublicRounded}
                accent={PALETTE[5]}
              >
                {internationalWidth > 0 && (
                  <StackedBarChart
                    rows={charts.internationalRows}
                    categoryKey="TITULADO_NO_EXTERIOR"
                    valueKey="PERCENTUAL"
                    width={internationalWidth}
                    height={stackedHeight}
                    colorMap={{ SIM: PALETTE[5], NÃO: PALETTE[1] }}
                  />
                )}
              </ChartShell>
            </Box>

            <Box ref={nationalityRef}>
              <ChartShell
                title="Nacionalidade Docente"
                subtitle="Atração de talentos globais"
                description="Proporção de estrangeiros atuando nos programas. Notas mais altas tendem a atrair mais docentes internacionais."
                icon={BadgeRounded}
                accent={PALETTE[3]}
              >
                {nationalityWidth > 0 && (
                  <StackedBarChart
                    rows={charts.nationalityRows}
                    categoryKey="DOCENTE_ESTRANGEIRO"
                    valueKey="PERCENTUAL"
                    width={nationalityWidth}
                    height={stackedHeight}
                    colorMap={{
                      ESTRANGEIRO: PALETTE[3],
                      BRASILEIRO: PALETTE[0],
                    }}
                  />
                )}
              </ChartShell>
            </Box>

            <Box ref={endogamyRef}>
              <ChartShell
                title="Endogamia Acadêmica"
                subtitle="Formação na própria IES"
                description="Docentes formados na mesma instituição. Altas taxas podem representar isolamento intelectual."
                icon={GroupsRounded}
                accent={PALETTE[2]}
              >
                {endogamyWidth > 0 && (
                  <StackedBarChart
                    rows={charts.endogamyRows}
                    categoryKey="ENDOGAMIA"
                    valueKey="PERCENTUAL"
                    width={endogamyWidth}
                    height={stackedHeight}
                    colorMap={{ SIM: PALETTE[2], NÃO: PALETTE[0] }}
                  />
                )}
              </ChartShell>
            </Box>

            <Box ref={categoryRef}>
              <ChartShell
                title="Categoria Docente"
                subtitle="Composição do corpo docente"
                description="Vínculo dos professores com o programa. O núcleo permanente é o eixo sustentador das avaliações."
                icon={AccountBalanceRounded}
                accent={PALETTE[1]}
              >
                {categoryWidth > 0 && (
                  <StackedBarChart
                    rows={charts.categoryRows}
                    categoryKey="DS_CATEGORIA_DOCENTE"
                    valueKey="PERCENTUAL"
                    width={categoryWidth}
                    height={stackedHeight}
                    colorMap={{
                      PERMANENTE: PALETTE[1],
                      COLABORADOR: PALETTE[3],
                      VISITANTE: PALETTE[5],
                    }}
                  />
                )}
              </ChartShell>
            </Box>

            <Box ref={regimeRef}>
              <ChartShell
                title="Regime de Trabalho"
                subtitle="Dedicação ao programa"
                description="Tempo investido na instituição. A dedicação exclusiva se relaciona com a constância das entregas acadêmicas."
                icon={AccessTimeFilledRounded}
                accent={PALETTE[5]}
              >
                {regimeWidth > 0 && (
                  <StackedBarChart
                    rows={charts.regimeRows}
                    categoryKey="DS_REGIME_TRABALHO"
                    valueKey="PERCENTUAL"
                    width={regimeWidth}
                    height={stackedHeight}
                    colorMap={{
                      "DEDICAÇÃO EXCLUSIVA": PALETTE[5],
                      INTEGRAL: PALETTE[4],
                      PARCIAL: PALETTE[3],
                    }}
                  />
                )}
              </ChartShell>
            </Box>

            <Box ref={institutionRef}>
              <ChartShell
                title="Natureza Administrativa"
                subtitle="Pública vs Privada"
                description="Distribuição dos docentes com base no caráter mantenedor da instituição. Fator estrutural importante."
                icon={AccountBalanceRounded}
                accent={PALETTE[3]}
              >
                {institutionWidth > 0 && (
                  <StackedBarChart
                    rows={charts.institutionRows}
                    categoryKey="DS_DEPENDENCIA_ADMINISTRATIVA"
                    valueKey="PERCENTUAL"
                    width={institutionWidth}
                    height={stackedHeight}
                    colorMap={{ PÚBLICA: PALETTE[3], PRIVADA: PALETTE[0] }}
                  />
                )}
              </ChartShell>
            </Box>

            <Box ref={regionRef}>
              <ChartShell
                title="Distribuição Regional"
                subtitle="Cenário geográfico nacional"
                description="Assimetrias entre regiões do Brasil nos diferentes degraus de excelência da CAPES."
                icon={MapRounded}
                accent={PALETTE[4]}
              >
                {regionWidth > 0 && (
                  <StackedBarChart
                    rows={charts.regionRows}
                    categoryKey="NM_REGIAO"
                    valueKey="PERCENTUAL"
                    width={regionWidth}
                    height={stackedHeight}
                    colorMap={{
                      SUDESTE: PALETTE[4],
                      SUL: PALETTE[5],
                      NORDESTE: PALETTE[3],
                      "CENTRO-OESTE": PALETTE[2],
                      NORTE: PALETTE[1],
                    }}
                  />
                )}
              </ChartShell>
            </Box>

            <Box ref={sizeRef}>
              <ChartShell
                title="Tamanho Médio"
                subtitle="Docentes permanentes"
                description="Volume médio de professores formadores de base por programa de Computação."
                icon={ApartmentRounded}
                accent={PALETTE[1]}
              >
                {sizeWidth > 0 && (
                  <LollipopChart
                    rows={charts.sizeRows}
                    valueKey="MEDIA_DOCENTES_PERMANENTES_POR_PROGRAMA"
                    width={sizeWidth}
                    height={lollipopHeight}
                    accent={PALETTE[1]}
                  />
                )}
              </ChartShell>
            </Box>

            <Box ref={maturityRef}>
              <ChartShell
                title="Tempo de Doutorado"
                subtitle="Média de anos de titulação"
                description="Grupos mais maduros, com maior tempo de doutorado, costumam liderar os programas com nota máxima."
                icon={SchoolRounded}
                accent={PALETTE[2]}
              >
                {maturityWidth > 0 && (
                  <LollipopChart
                    rows={charts.maturityRows}
                    valueKey="MEDIA_ANOS_DOUTORADO"
                    width={maturityWidth}
                    height={lollipopHeight}
                    accent={PALETTE[2]}
                  />
                )}
              </ChartShell>
            </Box>

            {/* <Box
              ref={top20Ref}
              sx={{ gridColumn: { xs: "auto", xl: "1 / -1" } }}
            >
              <ChartShell
                title="Top 10 Instituições"
                subtitle="Volume total no recorte"
                description="Instituições com maior volume de docentes na amostra selecionada. Útil para localizar polos concentradores de produção acadêmica."
                icon={InsightsRounded}
                accent={PALETTE[5]}
                fullWidth
              >
                {top20Width > 0 && (
                  <HorizontalBarChart
                    data={charts.top20Rows}
                    width={top20Width}
                    height={320}
                    accent={PALETTE[5]}
                  />
                )}
              </ChartShell>
            </Box> */}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
