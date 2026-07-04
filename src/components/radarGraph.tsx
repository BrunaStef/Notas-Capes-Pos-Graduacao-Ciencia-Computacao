import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export interface RadarRecord {
  CD_CONCEITO_PROGRAMA: number;
  [metric: string]: number;
}

export interface CapesRadarData {
  radar_normalizado?: RadarRecord[];
  radar_valores_reais?: RadarRecord[];
  concept_year_raw?: any[];
}

export interface CapesRadarChartProps {
  data: CapesRadarData;
  programRadar?: Record<string, number>;
  programName?: string;
  width?: number;
  height?: number;
}

const COLOR = {
  bg: "#080E1A",
  text: "#F8FAFC",
  textDark: "#080E1A",
  border: "rgba(255,255,255,0.08)",
  grid: "rgba(255,255,255,0.15)",
};

const CONCEPT_COLORS: Record<string, string> = {
  3: "#FF4A60",
  4: "#FFB000",
  5: "#00E0A6",
  6: "#0088FF",
  7: "#B042FF",
  PROGRAMA: "#FFFFFF",
};

const METRIC_LABELS: Record<string, string> = {
  total_docentes_permanentes: "Docentes permanentes",
  docentes_permanentes_por_programa: "Docentes perm. / programa",
  pct_docentes_permanentes: "% Docentes permanentes",
  pct_pq: "% Docentes PQ",
  pct_titulado_no_exterior: "% Titulados no exterior",
  pct_docente_estrangeiro: "% Docentes estrangeiros",
  pct_endogamia: "% Endogamia",
  pct_dedicacao_exclusiva: "% Dedicação exclusiva",
  pct_instituicao_publica: "% Instituição pública",
  media_anos_doutorado: "Média anos doutorado",
  discentes_por_programa: "Discentes / programa",
  pct_mestrado: "% Mestrado",
  pct_doutorado: "% Doutorado",
  pct_titulado: "% Titulados",
  taxa_evasao: "Taxa evasão",
  pct_estrangeiro_discente: "% Discentes estrangeiros",
  media_meses_titulacao_mestrado: "Meses (Mestrado)",
  media_meses_titulacao_doutorado: "Meses (Doutorado)",
};

function humanizeMetric(metricId: string): string {
  return METRIC_LABELS[metricId] ?? metricId.replaceAll("_", " ");
}

function formatValue(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "0,00";
  return value.toFixed(2).replace(".", ",");
}

function createTooltip(): HTMLElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "9999",
    background: "rgba(8,14,26,0.96)",
    color: COLOR.text,
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    lineHeight: "1.45",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    opacity: "0",
    transition: "opacity 0.12s ease",
    minWidth: "150px",
    border: `1px solid ${COLOR.border}`,
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  return el;
}

function showTooltip(el: HTMLElement, html: string, event: MouseEvent) {
  el.innerHTML = html;
  el.style.opacity = "1";
  el.style.left = `${event.clientX + 14}px`;
  el.style.top = `${event.clientY + 14}px`;
}

function hideTooltip(el: HTMLElement) {
  el.style.opacity = "0";
}

export function CapesRadarChart({
  data,
  programRadar,
  programName = "PROGRAMA",
  width = 1000,
  height = 800,
}: CapesRadarChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeConcepts, setActiveConcepts] = useState<any[]>([
    3,
    4,
    5,
    6,
    7,
    "PROGRAMA",
  ]);

  const toggleConcept = (concept: any) => {
    setActiveConcepts((prev) =>
      prev.includes(concept)
        ? prev.filter((c) => c !== concept)
        : [...prev, concept],
    );
  };

  const { metrics, radarData } = useMemo(() => {
    if (!data?.radar_normalizado || data.radar_normalizado.length === 0) {
      return { metrics: [], radarData: [] };
    }

    const metricKeys = Object.keys(data.radar_normalizado[0]).filter(
      (key) => key !== "CD_CONCEITO_PROGRAMA",
    );

    const formattedData: any[] = [3, 4, 5, 6, 7].map((concept) => {
      const normRow = data.radar_normalizado!.find(
        (r) => r.CD_CONCEITO_PROGRAMA === concept,
      );
      const realRow = data.radar_valores_reais?.find(
        (r) => r.CD_CONCEITO_PROGRAMA === concept,
      );

      return {
        concept,
        isProgram: false,
        values: metricKeys.map((metric) => ({
          metric,
          norm: normRow ? normRow[metric] : 0,
          real: realRow ? realRow[metric] : 0,
        })),
      };
    });

    if (programRadar) {
      const maxVals: Record<string, number> = {};
      metricKeys.forEach((m) => {
        const maxReal = Math.max(
          ...(data.radar_valores_reais || []).map((r) => r[m] || 0),
        );
        maxVals[m] = maxReal > 0 ? maxReal : 1;
      });

      formattedData.push({
        concept: "PROGRAMA",
        isProgram: true,
        values: metricKeys.map((metric) => ({
          metric,
          norm: Math.min(1, (programRadar[metric] || 0) / maxVals[metric]),
          real: programRadar[metric] || 0,
        })),
      });
    }

    return { metrics: metricKeys, radarData: formattedData };
  }, [data, programRadar]);

  useEffect(() => {
    if (!svgRef.current || metrics.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = 120;
    const radius = Math.min(width, height) / 2 - margin;
    const angleSlice = (Math.PI * 2) / metrics.length;
    const cx = width / 2;
    const cy = height / 2;

    const tooltip = createTooltip();

    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 1]);

    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    const gridLevels = 5;
    const axisGrid = g.append("g").attr("class", "axisWrapper");

    axisGrid
      .selectAll(".levels")
      .data(d3.range(1, gridLevels + 1).reverse())
      .enter()
      .append("circle")
      .attr("class", "gridCircle")
      .attr("r", (d) => (radius / gridLevels) * d)
      .style("fill", "none")
      .style("stroke", COLOR.grid)
      .style("stroke-dasharray", "4,4");

    const axis = axisGrid
      .selectAll(".axis")
      .data(metrics)
      .enter()
      .append("g")
      .attr("class", "axis");

    axis
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr(
        "x2",
        (_, i) => rScale(1.05) * Math.cos(angleSlice * i - Math.PI / 2),
      )
      .attr(
        "y2",
        (_, i) => rScale(1.05) * Math.sin(angleSlice * i - Math.PI / 2),
      )
      .attr("class", "line")
      .style("stroke", COLOR.grid)
      .style("stroke-width", "1px");

    axis
      .append("text")
      .attr("class", "legend")
      .style("font-size", "11px")
      .style("fill", "rgba(248,250,252,0.65)")
      .style("font-weight", "500")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("x", (_, i) => rScale(1.2) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y", (_, i) => rScale(1.2) * Math.sin(angleSlice * i - Math.PI / 2))
      .text((d) => humanizeMetric(d))
      .call(wrapText, 80);

    const radarLine = d3
      .lineRadial<any>()
      .angle((_, i) => i * angleSlice)
      .radius((d) => rScale(d.norm))
      .curve(d3.curveLinearClosed);

    const blobWrapper = g
      .selectAll(".radarWrapper")
      .data(radarData.filter((d) => activeConcepts.includes(d.concept)))
      .enter()
      .append("g")
      .attr("class", "radarWrapper");

    const highlightConcept = (concept: any, parentNode: any) => {
      d3.select(parentNode).raise();

      d3.selectAll(".radarArea")
        .transition()
        .duration(200)
        .style("fill-opacity", (d: any) => {
          if (d.isProgram) return 0.2;
          return d.concept === concept ? 0.6 : 0.03;
        });

      d3.selectAll(".radarStroke")
        .transition()
        .duration(200)
        .style("stroke-opacity", (d: any) => (d.concept === concept ? 1 : 0.15))
        .style("stroke-width", (d: any) => {
          if (d.isProgram) return d.concept === concept ? 4 : 2;
          return d.concept === concept ? 3.5 : 2.5;
        });

      d3.selectAll(".radarCircle")
        .transition()
        .duration(200)
        .style("opacity", (d: any) => (d.concept === concept ? 1 : 0.1));
    };

    const unhighlightConcept = () => {
      d3.selectAll(".radarArea")
        .transition()
        .duration(200)
        .style("fill-opacity", (d: any) => (d.isProgram ? 0.2 : 0.15));
      d3.selectAll(".radarStroke")
        .transition()
        .duration(200)
        .style("stroke-opacity", 1)
        .style("stroke-width", (d: any) => (d.isProgram ? 3.5 : 2.5));
      d3.selectAll(".radarCircle")
        .transition()
        .duration(200)
        .style("opacity", 1);
    };

    blobWrapper
      .append("path")
      .attr("class", "radarArea")
      .attr("d", (d) => radarLine(d.values))
      .style("fill", (d) => CONCEPT_COLORS[d.concept])
      .style("fill-opacity", (d) => (d.isProgram ? 0.2 : 0.15))
      .on("mouseover", function (_, d) {
        highlightConcept(d.concept, this.parentNode);
      })
      .on("mousemove", function (event, d) {
        const title = d.isProgram ? programName : `Conceito ${d.concept}`;
        showTooltip(
          tooltip,
          `<div style="text-align: center; padding: 2px;">
             <strong style="font-size: 15px; color: ${CONCEPT_COLORS[d.concept]}">${title}</strong>
             <div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 4px;">Área do perfil geral</div>
           </div>`,
          event,
        );
      })
      .on("mouseout", function () {
        unhighlightConcept();
        hideTooltip(tooltip);
      });

    blobWrapper
      .append("path")
      .attr("class", "radarStroke")
      .attr("d", (d) => radarLine(d.values))
      .style("stroke-width", (d) => (d.isProgram ? 3.5 : 2.5))
      .style("stroke", (d) => CONCEPT_COLORS[d.concept])
      .style("stroke-dasharray", (d) => (d.isProgram ? "6,4" : "none"))
      .style("fill", "none")
      .style("pointer-events", "none");

    blobWrapper
      .selectAll(".radarCircle")
      .data((d) =>
        d.values.map((v: any) => ({
          ...v,
          concept: d.concept,
          isProgram: d.isProgram,
        })),
      )
      .enter()
      .append("circle")
      .attr("class", "radarCircle")
      .attr("r", (d) => (d.isProgram ? 5 : 4))
      .attr(
        "cx",
        (d, i) => rScale(d.norm) * Math.cos(angleSlice * i - Math.PI / 2),
      )
      .attr(
        "cy",
        (d, i) => rScale(d.norm) * Math.sin(angleSlice * i - Math.PI / 2),
      )
      .style("fill", (d) => CONCEPT_COLORS[d.concept])
      .style("fill-opacity", 0.8)
      .style("stroke", COLOR.bg)
      .style("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseover", function (_, d) {
        highlightConcept(d.concept, this.parentNode);
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", d.isProgram ? 8 : 7);
      })
      .on("mousemove", function (event: MouseEvent, d: any) {
        const title = d.isProgram ? programName : `Conceito ${d.concept}`;
        showTooltip(
          tooltip,
          `<div style="margin-bottom: 6px;"><strong style="font-size: 13px;">${humanizeMetric(d.metric)}</strong></div>
           <div style="display: flex; justify-content: space-between; gap: 20px; color: ${CONCEPT_COLORS[d.concept]}">
             <span>${title}:</span>
             <span style="font-weight: 700;">${formatValue(d.real)}</span>
           </div>`,
          event,
        );
      })
      .on("mouseleave", function (_, d: any) {
        unhighlightConcept();
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", d.isProgram ? 5 : 4);
        hideTooltip(tooltip);
      });

    return () => {
      tooltip.remove();
    };
  }, [radarData, metrics, activeConcepts, width, height, programName]);

  function wrapText(
    text: d3.Selection<SVGTextElement, string, SVGGElement, unknown>,
    width: number,
  ) {
    text.each(function () {
      const textNode = d3.select(this);
      const words = textNode.text().split(/\s+/).reverse();
      let word;
      let line: string[] = [];
      let lineNumber = 0;
      const lineHeight = 1.1;
      const y = textNode.attr("y");
      const x = textNode.attr("x");
      const dy = parseFloat(textNode.attr("dy"));
      let tspan = textNode
        .text(null)
        .append("tspan")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", dy + "em");

      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(" "));
        if ((tspan.node()?.getComputedTextLength() || 0) > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = textNode
            .append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + dy + "em")
            .text(word);
        }
      }
    });
  }

  if (!metrics.length) {
    return (
      <div
        style={{
          width: "100%",
          height: height || 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(248,250,252,0.5)",
        }}
      >
        Nenhum dado disponível para o período selecionado.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginBottom: "8px",
          flexWrap: "wrap",
          zIndex: 10,
        }}
      >
        {[3, 4, 5, 6, 7].map((c) => {
          const isActive = activeConcepts.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggleConcept(c)}
              style={{
                background: isActive
                  ? `${CONCEPT_COLORS[String(c)]}20`
                  : "transparent",
                border: `1.5px solid ${isActive ? CONCEPT_COLORS[String(c)] : COLOR.border}`,
                color: isActive
                  ? CONCEPT_COLORS[String(c)]
                  : "rgba(248,250,252,0.4)",
                padding: "6px 16px",
                borderRadius: "999px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: isActive ? 700 : 500,
                transition: "all 0.2s ease",
              }}
            >
              Conceito {c}
            </button>
          );
        })}
        {programRadar && (
          <button
            onClick={() => toggleConcept("PROGRAMA")}
            style={{
              background: activeConcepts.includes("PROGRAMA")
                ? `${CONCEPT_COLORS["PROGRAMA"]}20`
                : "transparent",
              border: `1.5px solid ${activeConcepts.includes("PROGRAMA") ? CONCEPT_COLORS["PROGRAMA"] : COLOR.border}`,
              color: activeConcepts.includes("PROGRAMA")
                ? CONCEPT_COLORS["PROGRAMA"]
                : "rgba(248,250,252,0.4)",
              padding: "6px 16px",
              borderRadius: "999px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: activeConcepts.includes("PROGRAMA") ? 700 : 500,
              transition: "all 0.2s ease",
            }}
          >
            {programName}
          </button>
        )}
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ overflow: "visible" }}
        />
      </div>
    </div>
  );
}
