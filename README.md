# Grafico Linha com Projecao

Visual personalizado para Power BI — grafico de linha altamente customizavel com recurso especial de **projecao automatica** apos o ultimo ponto da serie principal.

## Recursos principais

- Ate **5 series simultaneas** plotadas no mesmo eixo
- **Projecao/Extensao automatica** apos o ultimo ponto valido da Serie 1
  - Linha continua do ultimo ponto historico ate um valor futuro/meta
  - Rotulo dinamico (aceita texto fixo ou medida DAX)
- **Linha de Meta** horizontal de referencia, com rotulo opcional + valor
- **Cores** totalmente editaveis (suporte a `fx` para cores dinamicas via DAX)
- **Tipos de linha** independentes para cada elemento: solida, tracejada, pontilhada, traco-ponto
- **Curvas**: linear, suave (monotone), escada
- **Eixos X e Y** com formatacao completa (fontes, cores, espessura, grade, gridlines)
- **Formatacao numerica** rica: inteiro, decimal, percentual, monetario (R$/US$/EUR), abreviacoes (mil/mi/bi), prefixos e sufixos personalizados
- **Marcadores** opcionais nos pontos (circulo, quadrado, losango, triangulo)
- **Rotulos de valor** opcionais (todos os pontos ou apenas o ultimo)
- **Tooltips** customizaveis via campo `Dicas de ferramenta`

## Campos (data roles)

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `Eixo X (Periodo)` | Texto/Data/Medida | Sim | Categorias do eixo X (datas ou textos) |
| `Serie 1` | Medida | Sim (>=1) | Valor da serie principal (recebe a projecao) |
| `Serie 2..5` | Medida | Nao | Series adicionais |
| `Projecao - Valor` | Medida | Nao | Valor do ponto de projecao (apos a ultima Serie 1) |
| `Projecao - Rotulo` | Texto/Medida | Nao | Rotulo do ponto de projecao no eixo X |
| `Meta (linha de referencia)` | Medida | Nao | Valor horizontal de meta |
| `Dicas de ferramenta` | Medida | Nao | Itens adicionais no tooltip |

## Como funciona a projecao

1. O visual lê todos os pontos do `Eixo X` e plota a `Serie 1`.
2. Identifica o **ultimo ponto valido** da `Serie 1` (ultima linha onde Serie 1 nao e nula).
3. Se `Projecao - Valor` estiver preenchido, traca uma **linha tracejada** (padrao) ligando esse ultimo ponto ao novo valor da projecao.
4. O **rotulo da projecao** aparece como um novo item no eixo X. Vem de `Projecao - Rotulo` (medida ou texto) ou do `Rotulo padrao` configurado no painel.

## Personalizacao

Todos os elementos podem ser configurados via painel de Formatacao do Power BI:

- **Cartao** (fundo, margens, arredondamento)
- **Eixo X / Eixo Y** (fonte, cor, linha, grade, formato de data, formato numerico)
- **Grid** (gridlines X e Y, cor, tipo)
- **Serie 1..5** (cor, espessura, tipo de linha, curva)
- **Projecao** (cor, espessura, tipo de linha, marcador final, rotulo padrao)
- **Meta** (cor, espessura, tipo, posicao do rotulo)
- **Marcadores** (forma, tamanho, preenchimento)
- **Rotulos de valor** (todos os pontos ou apenas o ultimo, formato, deslocamento)

## Build

```bash
npm install
npx pbiviz package
```

O arquivo `.pbiviz` e gerado em `dist/`.

## Autor

Rodrigo de Souza Barbosa
