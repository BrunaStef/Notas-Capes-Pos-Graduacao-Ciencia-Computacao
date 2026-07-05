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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  InsightsRounded,
  GroupsRounded,
  SchoolRounded,
  PublicRounded,
  WorkspacePremiumRounded,
  ApartmentRounded,
  QueryStatsRounded,
  MapRounded,
  BadgeRounded,
  AccessTimeFilledRounded,
  AccountBalanceRounded,
  ShareRounded,
} from "@mui/icons-material";

import rawJsonTeachersData from "./database/indicadores_computacao_docentes.json";
import rawJsonStudentsData from "./database/indicadores_computacao_discentes.json";
import rawJsonPeriodicosData from "./database/indicadores_computacao_bibliografica_periodicos.json";
import rawRadarData from "./database/capes_radar_chart_docentes_discentes.json";
import { CapesRadarChart, type CapesRadarData } from "./components/radarGraph";
import type { IndicadoresBase, Metadata } from "./types";

const PALETTE = [
  "#42001A",
  "#760031",
  "#D51C39",
  "#FF6060",
  "#FF9D00",
  "#8A5A00",
] as const;

type AnoKey = "GERAL" | string;

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
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
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
    MuiSelect: {
      styleOverrides: {
        select: {
          paddingTop: "10px",
          paddingBottom: "10px",
        },
      },
    },
  },
});

interface IndicadoresComputacaoDocentes {
  metadata: Metadata;
  geral: IndicadoresBase;
  por_ano: Record<string, IndicadoresBase>;
}

export interface IndicadoresBaseDiscentes {
  distribuicao_grau_academico: any[];
  situacao_academica: any[];
  internacionalizacao_nacionalidade: any[];
  tempo_medio_titulacao: any[];
  tamanho_medio_programa: any[];
  faixa_etaria: any[];
}

interface IndicadoresComputacaoDiscentes {
  metadata: Metadata;
  geral: IndicadoresBaseDiscentes;
  por_ano: Record<string, IndicadoresBaseDiscentes>;
}

export interface IndicadoresBasePeriodicos {
  total_publicacoes_por_conceito: any[];
  evolucao_anual_por_conceito: any[];
  media_publicacoes_por_programa: any[];
  programas_por_conceito: any[];
  tipo_producao: any[];
  subtipo_producao: any[];
  formulario: any[];
  producao_com_vinculo_tcc: any[];
  glosa: any[];
  veiculos_mais_frequentes: any[];
  producoes_mais_frequentes: any[];
  areas_concentracao_mais_frequentes: any[];
  linhas_pesquisa_mais_frequentes: any[];
  projetos_mais_frequentes: any[];
  instituicoes_mais_frequentes: any[];
  presenca_identificador_veiculo: any[];
}

interface IndicadoresComputacaoPeriodicos {
  metadata: Metadata;
  geral: IndicadoresBasePeriodicos;
  por_ano: Record<string, IndicadoresBasePeriodicos>;
}

const jsonTeachersData =
  rawJsonTeachersData as unknown as IndicadoresComputacaoDocentes;
const jsonStudentsData =
  rawJsonStudentsData as unknown as IndicadoresComputacaoDiscentes;
const jsonPeriodicosData =
  rawJsonPeriodicosData as unknown as IndicadoresComputacaoPeriodicos;
const jsonRadarData = rawRadarData as any;

type Row = Record<string, any>;

const EMPTY_PERIODICOS_DATA: IndicadoresBasePeriodicos = {
  total_publicacoes_por_conceito: [],
  evolucao_anual_por_conceito: [],
  media_publicacoes_por_programa: [],
  programas_por_conceito: [],
  tipo_producao: [],
  subtipo_producao: [],
  formulario: [],
  producao_com_vinculo_tcc: [],
  glosa: [],
  veiculos_mais_frequentes: [],
  producoes_mais_frequentes: [],
  areas_concentracao_mais_frequentes: [],
  linhas_pesquisa_mais_frequentes: [],
  projetos_mais_frequentes: [],
  instituicoes_mais_frequentes: [],
  presenca_identificador_veiculo: [],
};

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
      position: fixed; pointer-events: none; background: #0F1928;
      border: 1px solid rgba(148,163,184,0.20); color: #F1F5F9;
      font-size: 13px; padding: 8px 12px; border-radius: 4px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7); z-index: 9999;
      opacity: 0; transition: opacity 120ms ease; white-space: nowrap;
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
          spacing={1.5}
          sx={{
            marginBottom: 1.25,
            display: "flex",
            direction: "row",
            alignItems: "flex-start",
          }}
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
    if (!rows.length) return;

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
        (d) => String(d[categoryKey]).toUpperCase(),
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
              `<strong>${row.concept.length > 2 ? row.concept : "Conceito " + row.concept}</strong><br/>${seg.category}: <strong>${seg.value.toFixed(1)}%</strong>`,
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
            .text(`${seg.value.toFixed(1)}%`);
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

function BarChart({
  rows,
  width,
  height,
  color = PALETTE[2],
}: {
  rows: any[];
  width: number;
  height: number;
  color?: string;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || !width) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    if (!rows.length) return;

    const tooltip = createDarkTooltip();

    const margin = { top: 20, right: 20, bottom: 50, left: 60 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const concepts = sortConcepts(
      rows.map((d) => String(d.CD_CONCEITO_PROGRAMA)),
    );

    const x = d3
      .scaleBand<string>()
      .domain(concepts)
      .range([0, innerWidth])
      .padding(0.3);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(rows, (d) => d.PERCENTUAL) || 0])
      .nice()
      .range([innerHeight, 0]);

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    g.append("g").call(d3.axisLeft(y).tickFormat((d) => `${d}%`));

    g.selectAll(".bar")
      .data(rows)
      .enter()
      .append("rect")
      .attr("x", (d) => x(String(d.CD_CONCEITO_PROGRAMA))!)
      .attr("y", (d) => y(d.PERCENTUAL))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerHeight - y(d.PERCENTUAL))
      .attr("fill", color)
      .on("mousemove", (event, d) => {
        showTooltip(
          tooltip,
          `<strong>${String(d.CD_CONCEITO_PROGRAMA).length > 2 ? d.CD_CONCEITO_PROGRAMA : "Conceito " + d.CD_CONCEITO_PROGRAMA}</strong><br/>Evasão: <strong>${d.PERCENTUAL.toFixed(2)}%</strong>`,
          event,
        );
      })
      .on("mouseleave", () => hideTooltip(tooltip));

    g.selectAll(".label")
      .data(rows)
      .enter()
      .append("text")
      .attr("x", (d) => x(String(d.CD_CONCEITO_PROGRAMA))! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.PERCENTUAL) - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#CBD5E1")
      .text((d) => `${d.PERCENTUAL.toFixed(1)}%`);
  }, [rows, width, height, color]);

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
    if (!rows.length) return;

    const tooltip = createDarkTooltip();
    const margin = { top: 16, right: 56, bottom: 32, left: 56 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const data = [...rows]
      .map((d: any) => ({
        concept: String(d.CD_CONCEITO_PROGRAMA),
        value: toNumber(d[valueKey]) ?? 0,
      }))
      .sort((a, b) => {
        const na = Number(a.concept);
        const nb = Number(b.concept);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return a.concept.localeCompare(b.concept, "pt-BR", { numeric: true });
      });

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
            `<strong>${d.concept.length > 2 ? d.concept : "Conceito " + d.concept}</strong><br/>Valor: <strong>${d3.format(".1f")(d.value)}</strong>`,
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
    if (!rows.length) return;

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
      return values.map((d) => ({ ...d, normalized: scale(d.value) }));
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
            `<strong>${d.metric}</strong><br/>${d.concept.length > 2 ? d.concept : "Conceito " + d.concept}<br/>Valor Bruto: <strong>${d3.format(".1f")(d.value)}</strong><br/>Score: <strong>${d3.format(".0f")(d.normalized)}</strong>`,
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

export function StudentsPanel({
  activeData,
  progDiscentes,
  pLabel = "Programa",
  viewMode,
}: {
  activeData: IndicadoresBaseDiscentes;
  progDiscentes?: any;
  pLabel?: string;
  viewMode: "COMPARATIVE" | "PROGRAM_ONLY";
}) {
  const { ref: grauRef, width: grauWidth } = useWidth<HTMLDivElement>();
  const { ref: situacaoRef, width: situacaoWidth } = useWidth<HTMLDivElement>();
  const { ref: nacionalidadeRef, width: nacionalidadeWidth } =
    useWidth<HTMLDivElement>();
  const { ref: faixaRef, width: faixaWidth } = useWidth<HTMLDivElement>();
  const { ref: tamanhoRef, width: tamanhoWidth } = useWidth<HTMLDivElement>();
  const { ref: tempoMestradoRef, width: tempoMestradoWidth } =
    useWidth<HTMLDivElement>();
  const { ref: tempoDoutoradoRef, width: tempoDoutoradoWidth } =
    useWidth<HTMLDivElement>();

  const stackedHeight = 270;
  const lollipopHeight = 260;

  const inject = (base: any[], prog: any[] | undefined, label: string) => {
    const baseData = viewMode === "PROGRAM_ONLY" && prog ? [] : base;
    if (!prog) return [...baseData];
    return [
      ...baseData,
      ...prog.map((item) => ({ ...item, CD_CONCEITO_PROGRAMA: label })),
    ];
  };

  const gerarMapaDeCores = (
    rows: Record<string, any>[],
    chaveCategoria: string,
  ) => {
    const categoriasUnicas = [
      ...new Set(rows.map((r) => String(r[chaveCategoria]).toUpperCase())),
    ].sort();
    const mapa: Record<string, string> = {};
    categoriasUnicas.forEach((cat, index) => {
      mapa[cat] = PALETTE[index % PALETTE.length];
    });
    return mapa;
  };

  const evasaoData = useMemo(() => {
    const grouped = new Map<string | number, number>();

    const fullEvasao = inject(
      activeData.situacao_academica || [],
      progDiscentes?.situacao_academica,
      pLabel,
    );

    fullEvasao.forEach((item) => {
      if (
        item.NM_SITUACAO_DISCENTE === "ABANDONOU" ||
        item.NM_SITUACAO_DISCENTE === "DESLIGADO"
      ) {
        grouped.set(
          item.CD_CONCEITO_PROGRAMA,
          (grouped.get(item.CD_CONCEITO_PROGRAMA) || 0) + item.PERCENTUAL,
        );
      }
    });

    return Array.from(grouped.entries()).map(([conceito, percentual]) => ({
      CD_CONCEITO_PROGRAMA: conceito,
      NM_INDICADOR: "EVASÃO",
      PERCENTUAL: Number(percentual.toFixed(2)),
    }));
  }, [activeData.situacao_academica, progDiscentes, pLabel, viewMode]);

  const mapaFaixa = useMemo(
    () =>
      gerarMapaDeCores(
        inject(
          activeData.faixa_etaria || [],
          progDiscentes?.faixa_etaria,
          pLabel,
        ),
        "DS_FAIXA_ETARIA",
      ),
    [activeData.faixa_etaria, progDiscentes, pLabel, viewMode],
  );

  const tempoMestrado = useMemo(
    () =>
      inject(
        activeData.tempo_medio_titulacao || [],
        progDiscentes?.tempo_medio_titulacao,
        pLabel,
      ).filter((d: any) => d.DS_GRAU_ACADEMICO_DISCENTE === "MESTRADO"),
    [activeData.tempo_medio_titulacao, progDiscentes, pLabel, viewMode],
  );

  const tempoDoutorado = useMemo(
    () =>
      inject(
        activeData.tempo_medio_titulacao || [],
        progDiscentes?.tempo_medio_titulacao,
        pLabel,
      ).filter((d: any) => d.DS_GRAU_ACADEMICO_DISCENTE === "DOUTORADO"),
    [activeData.tempo_medio_titulacao, progDiscentes, pLabel, viewMode],
  );

  const tamanhoData = useMemo(() => {
    const base =
      viewMode === "PROGRAM_ONLY" && progDiscentes
        ? []
        : [...(activeData.tamanho_medio_programa || [])];
    if (progDiscentes?.tamanho_total_alunos_periodo !== undefined) {
      base.push({
        CD_CONCEITO_PROGRAMA: pLabel,
        MEDIA_DISCENTES_POR_PROGRAMA:
          progDiscentes.media_alunos_por_ano ||
          progDiscentes.tamanho_total_alunos_periodo,
      });
    }
    return base;
  }, [activeData.tamanho_medio_programa, progDiscentes, pLabel, viewMode]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
        gap: 2,
        mb: 5,
      }}
    >
      <Box ref={grauRef}>
        <ChartShell
          title="Distribuição de Grau Acadêmico"
          subtitle="Mestrado vs Doutorado"
          description="Proporção de discentes matriculados ou titulados por nível acadêmico dentro de cada conceito."
          icon={SchoolRounded}
          accent={PALETTE[4]}
        >
          {grauWidth > 0 && (
            <StackedBarChart
              rows={inject(
                activeData.distribuicao_grau_academico || [],
                progDiscentes?.distribuicao_grau_academico,
                pLabel,
              )}
              categoryKey="DS_GRAU_ACADEMICO_DISCENTE"
              valueKey="PERCENTUAL"
              width={grauWidth}
              height={stackedHeight}
              colorMap={{
                MESTRADO: PALETTE[5],
                "MESTRADO PROFISSIONAL": PALETTE[3],
                DOUTORADO: PALETTE[4],
                "DOUTORADO PROFISSIONAL": PALETTE[2],
              }}
            />
          )}
        </ChartShell>
      </Box>

      <Box ref={situacaoRef}>
        <ChartShell
          title="Taxa de Evasão Discente"
          subtitle="Abandono + desligamento"
          description="Percentual de discentes que abandonaram ou foram desligados dos programas entre 2017 e 2024. Valores menores indicam maior capacidade de retenção dos alunos."
          icon={GroupsRounded}
          accent={PALETTE[2]}
        >
          {situacaoWidth > 0 && (
            <BarChart
              rows={evasaoData}
              width={situacaoWidth}
              height={stackedHeight}
            />
          )}
        </ChartShell>
      </Box>

      <Box ref={tempoMestradoRef}>
        <ChartShell
          title="Tempo de Titulação (Mestrado)"
          subtitle="Média em meses"
          description="Velocidade média com que os alunos de mestrado concluem o curso, filtrado apenas por discentes já titulados."
          icon={AccessTimeFilledRounded}
          accent={PALETTE[5]}
        >
          {tempoMestradoWidth > 0 && (
            <LollipopChart
              rows={tempoMestrado}
              valueKey="MEDIA_MESES_TITULACAO"
              width={tempoMestradoWidth}
              height={lollipopHeight}
              accent={PALETTE[5]}
            />
          )}
        </ChartShell>
      </Box>

      <Box ref={tempoDoutoradoRef}>
        <ChartShell
          title="Tempo de Titulação (Doutorado)"
          subtitle="Média em meses"
          description="Média de meses necessários para a defesa e titulação no doutorado nos diferentes conceitos CAPES."
          icon={AccessTimeFilledRounded}
          accent={PALETTE[3]}
        >
          {tempoDoutoradoWidth > 0 && (
            <LollipopChart
              rows={tempoDoutorado}
              valueKey="MEDIA_MESES_TITULACAO"
              width={tempoDoutoradoWidth}
              height={lollipopHeight}
              accent={PALETTE[3]}
            />
          )}
        </ChartShell>
      </Box>

      <Box ref={nacionalidadeRef}>
        <ChartShell
          title="Nacionalidade Discente"
          subtitle="Atração de alunos internacionais"
          description="Proporção de discentes estrangeiros em relação aos brasileiros. Importante para observar o alcance internacional dos programas."
          icon={PublicRounded}
          accent={PALETTE[1]}
        >
          {nacionalidadeWidth > 0 && (
            <StackedBarChart
              rows={inject(
                activeData.internacionalizacao_nacionalidade || [],
                progDiscentes?.internacionalizacao_nacionalidade,
                pLabel,
              )}
              categoryKey="DS_TIPO_NACIONALIDADE_DISCENTE"
              valueKey="PERCENTUAL"
              width={nacionalidadeWidth}
              height={stackedHeight}
              colorMap={{ BRASILEIRO: PALETTE[0], ESTRANGEIRO: PALETTE[1] }}
            />
          )}
        </ChartShell>
      </Box>

      <Box ref={faixaRef}>
        <ChartShell
          title="Faixa Etária"
          subtitle="Perfil demográfico dos alunos"
          description="Distribuição etária do corpo discente, indicando a predominância de jovens recém-formados ou profissionais mais experientes."
          icon={BadgeRounded}
          accent={PALETTE[4]}
        >
          {faixaWidth > 0 && (
            <StackedBarChart
              rows={inject(
                activeData.faixa_etaria || [],
                progDiscentes?.faixa_etaria,
                pLabel,
              )}
              categoryKey="DS_FAIXA_ETARIA"
              valueKey="PERCENTUAL"
              width={faixaWidth}
              height={stackedHeight}
              colorMap={mapaFaixa}
            />
          )}
        </ChartShell>
      </Box>

      <Box ref={tamanhoRef} sx={{ gridColumn: { xs: "auto", xl: "1 / -1" } }}>
        <ChartShell
          title="Tamanho Médio do Corpo Discente"
          subtitle="Volume de alunos por programa"
          description="Média total de discentes vinculados por programa, evidenciando a capacidade de absorção e escala de orientação dos conceitos."
          icon={ApartmentRounded}
          accent={PALETTE[2]}
          fullWidth
        >
          {tamanhoWidth > 0 && (
            <LollipopChart
              rows={tamanhoData}
              valueKey="MEDIA_DISCENTES_POR_PROGRAMA"
              width={tamanhoWidth}
              height={lollipopHeight}
              accent={PALETTE[2]}
            />
          )}
        </ChartShell>
      </Box>
    </Box>
  );
}

function RankingList({
  rows,
  labelKey,
  valueKey,
  topN = 10,
}: {
  rows: Row[];
  labelKey: string | string[];
  valueKey: string;
  topN?: number;
}) {
  const data = useMemo(() => {
    const labelKeys = Array.isArray(labelKey) ? labelKey : [labelKey];
    const fallbackLabelKeys = [
      ...labelKeys,
      "DS_TITULO_PADRONIZADO",
      "NM_REVISTA",
      "NM_PERIODICO",
      "NM_PERIÓDICO",
      "NM_VEICULO",
      "NM_TITULO_PERIODICO",
      "DS_NOME_PERIODICO",
      "NM_TITULO",
      "DS_TITULO_PERIODICO",
      "NM_AREA_CONCENTRACAO",
      "NM_PRODUCAO",
      "NM_LINHA_PESQUISA",
      "NM_PROJETO",
      "NM_ENTIDADE_ENSINO",
    ];

    const getLabel = (row: Row) => {
      for (const key of fallbackLabelKeys) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value).trim()) {
          return String(value).trim().toUpperCase();
        }
      }
      return "NÃO INFORMADO";
    };

    const grouped = d3.rollups(
      rows || [],
      (values) => d3.sum(values, (d) => toNumber(d[valueKey]) ?? 0),
      (d) => getLabel(d),
    );

    return grouped
      .map(([label, value]) => ({ label, value }))
      .filter(
        (item) =>
          item.label &&
          item.label !== "NAN" &&
          item.label !== "NÃO INFORMADO" &&
          item.value > 0,
      )
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
  }, [rows, labelKey, valueKey, topN]);

  const maxValue = d3.max(data, (d) => d.value) || 1;

  if (!data.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sem dados disponíveis para este recorte.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.4}>
      {data.map((item, index) => (
        <Box key={`${item.label}-${index}`}>
          <Stack
            spacing={2}
            sx={{
              marginBottom: 1.25,
              display: "flex",
              direction: "row",
              alignItems: "flex-start",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "#E2E8F0",
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={item.label}
            >
              {index + 1}. {item.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: PALETTE[5], fontWeight: 800, flexShrink: 0 }}
            >
              {d3.format(",")(item.value).replace(/,/g, ".")}
            </Typography>
          </Stack>

          <Box
            sx={{
              height: 7,
              bgcolor: "rgba(148,163,184,0.08)",
              border: "1px solid rgba(148,163,184,0.06)",
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: `${Math.max(4, (item.value / maxValue) * 100)}%`,
                bgcolor: PALETTE[index % PALETTE.length],
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

export function PeriodicosPanel({
  activeData,
  progPeriodicos,
  pLabel = "Programa",
  viewMode = "COMPARATIVE",
}: {
  activeData: IndicadoresBasePeriodicos;
  progPeriodicos?: any;
  pLabel?: string;
  viewMode?: "COMPARATIVE" | "PROGRAM_ONLY";
}) {
  const { ref: totalRef, width: totalWidth } = useWidth<HTMLDivElement>();
  const { ref: mediaRef, width: mediaWidth } = useWidth<HTMLDivElement>();
  const { ref: vinculoRef, width: vinculoWidth } = useWidth<HTMLDivElement>();

  const lollipopHeight = 260;
  const stackedHeight = 270;

  const inject = (base: any[], prog: any[] | undefined, label: string) => {
    const baseData = viewMode === "PROGRAM_ONLY" && prog ? [] : base;
    if (!prog) return [...baseData];
    return [
      ...baseData,
      ...prog.map((item) => ({ ...item, CD_CONCEITO_PROGRAMA: label })),
    ];
  };

  const gerarMapaDeCores = (
    rows: Record<string, any>[],
    chaveCategoria: string,
  ) => {
    const categoriasUnicas = [
      ...new Set(rows.map((r) => String(r[chaveCategoria]).toUpperCase())),
    ]
      .filter((cat) => cat && cat !== "NAN")
      .sort();

    const mapa: Record<string, string> = {};

    categoriasUnicas.forEach((cat, index) => {
      mapa[cat] = PALETTE[index % PALETTE.length];
    });

    return mapa;
  };

  const totalData = useMemo(() => {
    const base =
      viewMode === "PROGRAM_ONLY" && progPeriodicos
        ? []
        : [...(activeData.total_publicacoes_por_conceito || [])];
    if (progPeriodicos?.total_publicacoes !== undefined) {
      base.push({
        CD_CONCEITO_PROGRAMA: pLabel,
        TOTAL_PUBLICACOES: progPeriodicos.total_publicacoes,
      });
    }
    return base;
  }, [
    activeData.total_publicacoes_por_conceito,
    progPeriodicos,
    pLabel,
    viewMode,
  ]);

  const mediaData = useMemo(() => {
    const base =
      viewMode === "PROGRAM_ONLY" && progPeriodicos
        ? []
        : [...(activeData.media_publicacoes_por_programa || [])];

    return base;
  }, [
    activeData.media_publicacoes_por_programa,
    progPeriodicos,
    pLabel,
    viewMode,
  ]);

  const vinculoData = useMemo(() => {
    return inject(
      activeData.producao_com_vinculo_tcc || [],
      progPeriodicos?.producao_com_vinculo_tcc,
      pLabel,
    );
  }, [activeData.producao_com_vinculo_tcc, progPeriodicos, pLabel, viewMode]);

  const mapaVinculoTcc = useMemo(
    () => gerarMapaDeCores(vinculoData, "IN_PRODUCAO_COM_VINCULO_TCC"),
    [vinculoData],
  );

  const veiculosData = useMemo(() => {
    if (viewMode === "PROGRAM_ONLY" && progPeriodicos?.top_veiculos) {
      return progPeriodicos.top_veiculos;
    }
    return activeData.veiculos_mais_frequentes || [];
  }, [activeData.veiculos_mais_frequentes, progPeriodicos, viewMode]);

  const areasData = useMemo(() => {
    if (
      viewMode === "PROGRAM_ONLY" &&
      progPeriodicos?.areas_concentracao_mais_frequentes
    ) {
      return progPeriodicos.areas_concentracao_mais_frequentes;
    }
    return activeData.areas_concentracao_mais_frequentes || [];
  }, [activeData.areas_concentracao_mais_frequentes, progPeriodicos, viewMode]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
        gap: 2,
        mb: 5,
      }}
    >
      <Box ref={totalRef}>
        <ChartShell
          title="Total de Publicações"
          subtitle="Volume por conceito CAPES"
          description="Quantidade total de produções bibliográficas em periódicos associadas aos programas de Computação em cada conceito."
          icon={QueryStatsRounded}
          accent={PALETTE[4]}
        >
          {totalWidth > 0 && (
            <LollipopChart
              rows={totalData}
              valueKey="TOTAL_PUBLICACOES"
              width={totalWidth}
              height={lollipopHeight}
              accent={PALETTE[4]}
            />
          )}
        </ChartShell>
      </Box>

      <Box ref={mediaRef}>
        <ChartShell
          title="Média de Publicações por Programa"
          subtitle="Produtividade média"
          description="Média de publicações em periódicos por programa, permitindo comparar a intensidade de produção acadêmica entre os conceitos."
          icon={ApartmentRounded}
          accent={PALETTE[2]}
        >
          {mediaWidth > 0 && (
            <LollipopChart
              rows={mediaData}
              valueKey="MEDIA_PUBLICACOES_POR_PROGRAMA"
              width={mediaWidth}
              height={lollipopHeight}
              accent={PALETTE[2]}
            />
          )}
        </ChartShell>
      </Box>

      <Box ref={vinculoRef} sx={{ gridColumn: { xs: "auto", xl: "1 / -1" } }}>
        <ChartShell
          title="Produção com Vínculo a TCC"
          subtitle="Relação com trabalhos de conclusão"
          description="Proporção de publicações em periódicos que possuem vínculo registrado com trabalhos de conclusão."
          icon={GroupsRounded}
          accent={PALETTE[1]}
        >
          {vinculoWidth > 0 && (
            <StackedBarChart
              rows={vinculoData}
              categoryKey="IN_PRODUCAO_COM_VINCULO_TCC"
              valueKey="PERCENTUAL"
              width={vinculoWidth}
              height={stackedHeight}
              colorMap={mapaVinculoTcc}
            />
          )}
        </ChartShell>
      </Box>

      <Box sx={{ gridColumn: { xs: "auto", xl: "1 / -1" } }}>
        <ChartShell
          title="Periódicos mais Frequentes"
          subtitle="Veículos de publicação"
          description="Ranking dos periódicos que mais aparecem nos registros, somando as ocorrências dos conceitos CAPES no recorte selecionado."
          icon={PublicRounded}
          accent={PALETTE[4]}
          fullWidth
        >
          <RankingList
            rows={veiculosData}
            labelKey={[
              "DS_TITULO_PADRONIZADO",
              "NM_REVISTA",
              "NM_PERIODICO",
              "NM_PERIÓDICO",
              "NM_VEICULO",
              "NM_TITULO_PERIODICO",
              "DS_NOME_PERIODICO",
              "NM_TITULO",
              "DS_TITULO_PERIODICO",
            ]}
            valueKey="TOTAL_PUBLICACOES"
            topN={10}
          />
        </ChartShell>
      </Box>

      <Box sx={{ gridColumn: { xs: "auto", xl: "1 / -1" } }}>
        <ChartShell
          title="Áreas de Concentração mais Frequentes"
          subtitle="Temas associados às publicações"
          description="Áreas de concentração que mais aparecem associadas às produções em periódicos dos programas de Computação."
          icon={MapRounded}
          accent={PALETTE[2]}
          fullWidth
        >
          <RankingList
            rows={areasData}
            labelKey="NM_AREA_CONCENTRACAO"
            valueKey="TOTAL_PUBLICACOES"
            topN={10}
          />
        </ChartShell>
      </Box>
    </Box>
  );
}

export default function App() {
  const anos = useMemo(() => {
    const expected =
      jsonTeachersData.metadata?.anos_disponiveis_esperados ?? [];
    const available = jsonTeachersData.metadata?.anos_analisados ?? [];
    const base = expected.length ? expected : available;
    return [...new Set(base)].sort((a, b) => a - b);
  }, []);

  const [selectedPeriod, setSelectedPeriod] = useState<AnoKey>("GERAL");
  const [viewMode, setViewMode] = useState<"COMPARATIVE" | "PROGRAM_ONLY">(
    "COMPARATIVE",
  );
  const [menuOpcoes, setMenuOpcoes] = useState<
    Record<string, { cd_programa: string; nm_programa: string }[]>
  >({});
  const [selectedIES, setSelectedIES] = useState<string>("");
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [programData, setProgramData] = useState<any>(null);

  useEffect(() => {
    fetch("src/database/menu_opcoes.json")
      .then((res) => res.json())
      .then((data) => setMenuOpcoes(data))
      .catch(() => console.error("Menu de opções não encontrado"));
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      fetch(`src/database/programas/${selectedProgram}.json`)
        .then((res) => res.json())
        .then((data) => {
          setProgramData(data);
        })
        .catch(() => setProgramData(null));
    } else {
      setProgramData(null);
    }
  }, [selectedProgram]);

  const activeTeachersData = useMemo<IndicadoresBase>(() => {
    if (selectedPeriod === "GERAL") return jsonTeachersData.geral;
    return jsonTeachersData.por_ano?.[selectedPeriod] ?? jsonTeachersData.geral;
  }, [selectedPeriod]);

  const activeStudentsData = useMemo<IndicadoresBaseDiscentes>(() => {
    if (selectedPeriod === "GERAL") return jsonStudentsData.geral;
    return jsonStudentsData.por_ano?.[selectedPeriod] ?? jsonStudentsData.geral;
  }, [selectedPeriod]);

  const activePeriodicosData = useMemo<IndicadoresBasePeriodicos>(() => {
    if (selectedPeriod === "GERAL") {
      return jsonPeriodicosData.geral ?? EMPTY_PERIODICOS_DATA;
    }

    const porAno = jsonPeriodicosData.por_ano ?? {};
    const chaveAno = String(selectedPeriod);

    return (
      porAno[chaveAno] ??
      porAno[String(Number(chaveAno))] ??
      porAno[`${chaveAno}.0`] ??
      EMPTY_PERIODICOS_DATA
    );
  }, [selectedPeriod]);

  const radarData = useMemo<CapesRadarData>(() => {
    if (selectedPeriod === "GERAL") return jsonRadarData.geral;
    return jsonRadarData.por_ano?.[selectedPeriod] ?? jsonRadarData.geral;
  }, [selectedPeriod]);

  const progDocentes = useMemo(() => {
    if (!programData?.docentes) return undefined;
    if (selectedPeriod === "GERAL") return programData.docentes.geral;
    return (
      programData.docentes.por_ano?.[selectedPeriod] ||
      programData.docentes.geral
    );
  }, [programData, selectedPeriod]);

  const progDiscentes = useMemo(() => {
    if (!programData?.discentes) return undefined;
    if (selectedPeriod === "GERAL") return programData.discentes.geral;
    return (
      programData.discentes.por_ano?.[selectedPeriod] ||
      programData.discentes.geral
    );
  }, [programData, selectedPeriod]);

  const progPeriodicos = useMemo(() => {
    if (!programData?.producao) return undefined;
    if (selectedPeriod === "GERAL") return programData.producao.geral;
    return (
      programData.producao.por_ano?.[selectedPeriod] ||
      programData.producao.geral
    );
  }, [programData, selectedPeriod]);

  const programRadarMetrics = useMemo(() => {
    if (!programData?.radar) return undefined;

    if (selectedPeriod === "GERAL") {
      return programData.radar.geral;
    }

    return (
      programData.radar.por_ano?.[selectedPeriod] || programData.radar.geral
    );
  }, [programData, selectedPeriod]);

  const { charts, selectedLabel, programName } = useMemo(() => {
    const pLabel = programData?.metadata?.sg_ies || "Programa";

    const inject = (base: any[], prog: any[] | undefined) => {
      const baseData = viewMode === "PROGRAM_ONLY" && prog ? [] : base;
      if (!prog) return [...baseData];
      return [
        ...baseData,
        ...prog.map((item) => ({ ...item, CD_CONCEITO_PROGRAMA: pLabel })),
      ];
    };

    let leadershipRows = inject(
      activeTeachersData.lideranca_bolsas_pq || [],
      progDocentes?.lideranca_bolsas_pq,
    );
    let sizeRows =
      viewMode === "PROGRAM_ONLY" && progDocentes
        ? []
        : [...(activeTeachersData.tamanho_medio_programa || [])];
    let maturityRows =
      viewMode === "PROGRAM_ONLY" && progDocentes
        ? []
        : [...(activeTeachersData.maturidade_tempo_doutorado || [])];
    let internationalRows = inject(
      activeTeachersData.internacionalizacao_titulacao_exterior || [],
      progDocentes?.internacionalizacao_titulacao_exterior,
    );
    let endogamyRows = inject(
      activeTeachersData.endogamia_academica || [],
      progDocentes?.endogamia_academica,
    );
    let nationalityRows = inject(
      activeTeachersData.internacionalizacao_nacionalidade || [],
      progDocentes?.internacionalizacao_nacionalidade,
    );
    let categoryRows = inject(
      activeTeachersData.categoria_docente || [],
      progDocentes?.categoria_docente,
    );
    let regimeRows = inject(
      activeTeachersData.regime_trabalho || [],
      progDocentes?.regime_trabalho,
    );
    let regionRows =
      viewMode === "PROGRAM_ONLY" && progDocentes
        ? []
        : [...(activeTeachersData.desigualdade_regional || [])];
    let institutionRows =
      viewMode === "PROGRAM_ONLY" && progDocentes
        ? []
        : [...(activeTeachersData.natureza_instituicao || [])];
    let top20Rows =
      viewMode === "PROGRAM_ONLY" && progDocentes
        ? []
        : [...(activeTeachersData.top_20_instituicoes || [])];

    if (progDocentes) {
      if (progDocentes.maturidade_media_anos_doutorado !== undefined) {
        maturityRows.push({
          CD_CONCEITO_PROGRAMA: pLabel,
          MEDIA_ANOS_DOUTORADO: progDocentes.maturidade_media_anos_doutorado,
        });
      }
    }

    const concepts = sortConcepts(
      leadershipRows.map((d) => d.CD_CONCEITO_PROGRAMA),
    );

    const heatRows = concepts.flatMap((concept) => {
      const isProg = concept === pLabel;
      const progReal = programRadarMetrics?.valores_reais || {};

      return [
        {
          metric: "Bolsas PQ (% Sim)",
          concept,
          value:
            isProg && progReal.pct_pq !== undefined
              ? progReal.pct_pq
              : getSpecificCategoryPercent(
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
          value:
            isProg && progReal.pct_titulado_no_exterior !== undefined
              ? progReal.pct_titulado_no_exterior
              : getSpecificCategoryPercent(
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
          value:
            isProg && progReal.pct_docente_estrangeiro !== undefined
              ? progReal.pct_docente_estrangeiro
              : getSpecificCategoryPercent(
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
          value:
            isProg && progReal.pct_endogamia !== undefined
              ? progReal.pct_endogamia
              : getSpecificCategoryPercent(
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
          value:
            isProg && progReal.pct_dedicacao_exclusiva !== undefined
              ? progReal.pct_dedicacao_exclusiva
              : getSpecificCategoryPercent(
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
          value:
            isProg && progReal.pct_docentes_permanentes !== undefined
              ? progReal.pct_docentes_permanentes
              : getSpecificCategoryPercent(
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
          value:
            isProg && progReal.pct_instituicao_publica !== undefined
              ? progReal.pct_instituicao_publica
              : getSpecificCategoryPercent(
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
          value:
            isProg && progReal.docentes_permanentes_por_programa !== undefined
              ? progReal.docentes_permanentes_por_programa
              : getConceptValue(
                  sizeRows,
                  concept,
                  "MEDIA_DOCENTES_PERMANENTES_POR_PROGRAMA",
                ),
        },
        {
          metric: "Tempo Doutorado (Anos)",
          concept,
          value:
            isProg && progReal.media_anos_doutorado !== undefined
              ? progReal.media_anos_doutorado
              : getConceptValue(maturityRows, concept, "MEDIA_ANOS_DOUTORADO"),
        },
      ];
    });

    return {
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
      programName: pLabel,
    };
  }, [
    activeTeachersData,
    progDocentes,
    selectedPeriod,
    programData,
    viewMode,
    programRadarMetrics,
  ]);

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

  const stackedHeight = 270;
  const lollipopHeight = 260;
  const heatmapHeight = 420;

  const { ref: forceRef, width: forceWidth } = useWidth<HTMLDivElement>();
  const forceHeight = 600;

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
                spacing={1.2}
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "start",
                  gap: 2,
                  flexDirection: "row",
                }}
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
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    marginTop: "0px !important",
                  }}
                >
                  CAPES Analytics
                </Typography>
              </Stack>
            </Toolbar>
          </Container>
        </AppBar>
        <Toolbar />

        <Container maxWidth="xl" sx={{ py: { xs: 3.5, md: 5 } }}>
          <Box
            sx={{
              mb: 4,
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: 4,
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", lg: "flex-end" },
            }}
          >
            <Box>
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
                Visão integrada dos corpos docente e discente dos programas de
                pós-graduação em Computação avaliados pela CAPES. O recorte
                atual é{" "}
                <Box
                  component="span"
                  sx={{ color: PALETTE[5], fontWeight: 700 }}
                >
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
                  variant={
                    selectedPeriod === "GERAL" ? "contained" : "outlined"
                  }
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

            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel sx={{ color: "text.secondary" }}>
                  Instituição (IES)
                </InputLabel>
                <Select
                  value={selectedIES}
                  label="Instituição (IES)"
                  onChange={(e) => {
                    setSelectedIES(e.target.value);
                    setSelectedProgram("");
                  }}
                  sx={{
                    color: "text.primary",
                    ".MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.2)",
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Global (Nenhuma)</em>
                  </MenuItem>
                  {Object.keys(menuOpcoes)
                    .sort()
                    .map((ies) => (
                      <MenuItem key={ies} value={ies}>
                        {ies}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControl
                size="small"
                sx={{ minWidth: 280 }}
                disabled={!selectedIES}
              >
                <InputLabel sx={{ color: "text.secondary" }}>
                  Programa
                </InputLabel>
                <Select
                  value={selectedProgram}
                  label="Programa"
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  sx={{
                    color: "text.primary",
                    ".MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.2)",
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Selecione o programa</em>
                  </MenuItem>
                  {selectedIES &&
                    menuOpcoes[selectedIES]?.map((prog) => (
                      <MenuItem key={prog.cd_programa} value={prog.cd_programa}>
                        {prog.nm_programa}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Divider sx={{ mb: 4, borderColor: "rgba(148,163,184,0.15)" }} />
          <Box
            ref={forceRef}
            sx={{ mb: 5, gridColumn: { xs: "auto", xl: "1 / -1" } }}
          >
            <ChartShell
              title="Análise Multidimensional (Gráfico Radar)"
              subtitle="Comparativo de indicadores por conceito CAPES"
              description="Explore a área de cobertura de cada conceito nas diferentes métricas. Selecione um programa específico no menu acima para sobrepô-lo aos conceitos."
              icon={ShareRounded}
              accent={PALETTE[4]}
              fullWidth
            >
              {forceWidth > 0 && (
                <CapesRadarChart
                  data={radarData}
                  programRadar={programRadarMetrics}
                  programName={programName}
                  width={forceWidth}
                  height={forceHeight}
                />
              )}
            </ChartShell>
          </Box>

          <Box sx={{ mb: 8 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h3" sx={{ mb: 1, color: "#F8FAFC" }}>
                1. Visão do Corpo Docente
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Explore os indicadores focados nos professores formadores,
                atração de talentos e estrutura.
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
            </Box>
          </Box>

          <Divider sx={{ mb: 4, borderColor: "rgba(148,163,184,0.15)" }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h3" sx={{ mb: 1, color: "#F8FAFC" }}>
              2. Visão do Corpo Discente
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Métricas relativas aos alunos, acompanhando status acadêmico,
              demografia e tempo de titulação no período de{" "}
              <strong>{selectedLabel}</strong>.
            </Typography>

            <StudentsPanel
              activeData={activeStudentsData}
              progDiscentes={progDiscentes}
              pLabel={programName}
              viewMode={viewMode}
            />
          </Box>

          <Divider sx={{ mb: 4, borderColor: "rgba(148,163,184,0.15)" }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h3" sx={{ mb: 1, color: "#F8FAFC" }}>
              3. Produção Bibliográfica em Periódicos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Métricas relativas às produções acadêmicas publicadas em
              periódicos, acompanhando volume, distribuição e veículos de
              publicação no período de <strong>{selectedLabel}</strong>.
            </Typography>

            <PeriodicosPanel
              activeData={activePeriodicosData}
              progPeriodicos={progPeriodicos}
              pLabel={programName}
              viewMode={viewMode}
            />
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
