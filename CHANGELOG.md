# Changelog

## 1.0.0 — 2026-05-26

Primeira versao do visual **Grafico Linha com Projecao**.

### Recursos
- Suporte a ate 5 series de medidas simultaneas no mesmo eixo
- Linha de **projecao automatica** apos o ultimo ponto valido da Serie 1
  - Vinculacao automatica ao ultimo ponto da serie principal
  - Rotulo dinamico (medida DAX, campo de texto ou rotulo padrao no painel)
- **Linha de meta** horizontal com rotulo personalizavel (texto + valor formatado)
- **Eixos X e Y** totalmente personalizaveis (fonte, cor, linha, formato de data e numero)
- **Gridlines** independentes para X e Y, com tipos de linha (solida, tracejada, pontilhada)
- **5 series** com configuracao independente: cor, espessura, tipo de linha, curva (linear, suave, escada)
- **Tipos de linha** independentes por elemento (serie, projecao, meta, grid)
- **Cores** com suporte a `fx` (cores dinamicas via DAX) em todos os ColorPickers
- **Marcadores** opcionais com 4 formas (circulo, quadrado, losango, triangulo) e modo preenchido/contorno
- **Rotulos de valor** sobre os pontos, com modo "apenas no ultimo" e formatacao numerica completa
- **Formatos numericos** (inteiro, decimal, percentual em fracao 0-1 e ja em %, moedas BRL/USD/EUR, abreviacoes mil/mi/bi, prefixos e sufixos)
- **Tooltips** nativos do Power BI com campo `Dicas de ferramenta`
- **Aparencia neutra** por padrao (sem identidade visual fixa) — todas as cores editaveis pelo usuario
