# Dashboard CAPES para Pós-Graduação em Computação

Este repositório contém uma aplicação web interativa em React e TypeScript para visualizar, comparar e analisar indicadores de programas de pós-graduação em Computação com base nos dados CAPES. A interface permite explorar métricas de docentes, discentes, produção bibliográfica e desempenho geral de programas avaliados por conceito CAPES.

## Visão geral

O projeto foi desenvolvido para transformar dados tabulares e indicadores em uma experiência visual mais acessível para:

- comparar programas de pós-graduação por conceito CAPES;
- acompanhar tendências ao longo do tempo;
- analisar indicadores de qualidade acadêmica e estrutura institucional;
- visualizar métricas consolidadas e detalhadas em gráficos interativos.

A aplicação é voltada principalmente para análise institucional, acompanhamento de avaliações e apoio à tomada de decisão em contextos de pós-graduação.

## O que a aplicação faz

A interface oferece uma visão consolidada de indicadores organizados em quatro grandes blocos:

1. Indicadores de docentes
   - presença de bolsas PQ;
   - titulação no exterior;
   - nacionalidade dos docentes;
   - endogamia acadêmica;
   - maturidade acadêmica (tempo de doutoramento);
   - tamanho médio dos programas;
   - composição por categoria docente;
   - regime de trabalho;
   - desigualdade regional;
   - natureza das instituições;
   - ranking das instituições mais presentes.

2. Indicadores de discentes
   - distribuição por grau acadêmico;
   - situação acadêmica;
   - nacionalidade dos discentes;
   - tempo médio de titulação;
   - tamanho médio do corpo discente;
   - faixa etária.

3. Produção bibliográfica e periódicos
   - publicações por conceito;
   - evolução anual;
   - média de publicações por programa;
   - tipos e subtipos de produção;
   - veículos mais frequentes;
   - produções mais frequentes;
   - áreas e linhas de pesquisa;
   - projetos e instituições relacionados;
   - presença de identificador de veículo.

4. Visualização comparativa em radar
   - comparação de programas e conceitos em múltiplos eixos normalizados;
   - destaque de métricas-chave para avaliação do perfil do programa.

## Tecnologias utilizadas

- React 19
- TypeScript
- Vite
- Material UI (MUI)
- D3.js para visualizações customizadas
- Vega e Vega-Lite
- JSON como fonte principal de dados para a interface
- Python para processamento e geração de dados estruturados a partir de arquivos fontes

## Estrutura do projeto

```text
.
├── public/                         # Arquivos públicos estáticos
├── src/
│   ├── App.tsx                    # Componente principal da aplicação
│   ├── main.tsx                   # Ponto de entrada do React
│   ├── components/
│   │   └── radarGraph.tsx         # Componente do gráfico radar
│   ├── database/
│   │   ├── indicadores_computacao_docentes.json
│   │   ├── indicadores_computacao_discentes.json
│   │   ├── indicadores_computacao_bibliografica_periodicos.json
│   │   ├── capes_radar_chart_docentes_discentes.json
│   │   └── programas/             # Dados por programa selecionado
│   ├── scripts/
│   │   ├── docentes.py
│   │   ├── discentes.py
│   │   ├── bibliografica_periodicos.py
│   │   ├── programas_area_conceito.py
│   │   └── radar-graph.py
│   └── types/
│       └── index.ts
├── index.html
├── package.json
├── tsconfig*.json
├── vite.config.ts
└── README.md
```

## Pré-requisitos

Antes de executar o projeto, certifique-se de ter instalado:

- Node.js 20+ (recomendado)
- npm
- Python 3.x (opcional, apenas se você quiser regenerar os dados a partir dos arquivos-fonte)

## Instalação

Na raiz do projeto, execute:

```bash
npm install
```

## Executando localmente

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação ficará disponível normalmente em:

```text
http://localhost:5173
```

## Build para produção

Para gerar a versão otimizada para deploy:

```bash
npm run build
```

O resultado será gerado na pasta dist.

## Lint

Para validar o código com ESLint:

```bash
npm run lint
```

## Geração de dados

A pasta src/database já contém arquivos JSON prontos para a aplicação. Caso você queira gerar ou atualizar esses dados a partir de fontes originais, os scripts Python localizados em src/scripts podem ser usados.

### Dependências Python

Os scripts de processamento utilizam bibliotecas como pandas, numpy e openpyxl. Se necessário, instale-as com:

```bash
pip install pandas numpy openpyxl
```

### Fluxo típico de geração

- executar o script de docentes para gerar indicadores de corpo docente;
- executar o script de discentes para gerar indicadores de corpo discente;
- executar o script de produção bibliográfica para gerar métricas de periódicos e publicações;
- executar o script de programas_area_conceito.py, se for necessário consolidar informações por programa;
- executar o script de radar-graph.py para gerar os dados usados no gráfico radar.

> Observação: os scripts esperam arquivos de entrada no formato Excel ou CSV e podem precisar de ajustes de caminho conforme o ambiente local.

## Como usar a interface

Ao abrir a aplicação, você poderá:

- selecionar um período (geral ou ano específico);
- escolher uma IES;
- selecionar um programa específico para comparação;
- alternar entre visualização comparativa e foco no programa;
- explorar gráficos e rankings interativos com detalhes por conceito CAPES.

Essas interações ajudam a compreender não apenas o desempenho absoluto dos programas, mas também como eles se posicionam frente aos demais.

## Arquitetura da aplicação

A aplicação segue uma estrutura baseada em componentes e dados já preparados para visualização:

- App.tsx atua como orquestrador da interface;
- gráficos e componentes visuais são construídos com D3 e renderizados dentro de cartões temáticos;
- os dados são carregados de arquivos JSON estruturados, o que facilita a manutenção e a análise por parte de quem trabalha no projeto;
- o componente radarGraph.tsx encapsula a lógica de exibição do gráfico comparativo em múltiplos eixos.

## Observações importantes

- Os dados utilizados na aplicação são estáticos e já pré-processados, o que torna a execução rápida e previsível.
- O projeto tem foco em visualização e análise exploratória de indicadores de pós-graduação em Computação.
- A interface é pensada para ser utilizada tanto em ambiente local quanto em implantação web simples.

## Licença

Nenhuma licença foi declarada explicitamente no projeto até o momento.
