"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import ValidatorType = powerbi.visuals.ValidatorType;

const FONTE_PADRAO = "Segoe UI, sans-serif";

const TIPOS_LINHA: powerbi.IEnumMember[] = [
    { value: "solid", displayName: "Solida" },
    { value: "dash", displayName: "Tracejada" },
    { value: "dot", displayName: "Pontilhada" },
    { value: "dashdot", displayName: "Traco-Ponto" }
];

const TIPOS_LINHA_GRID: powerbi.IEnumMember[] = [
    { value: "solid", displayName: "Solida" },
    { value: "dash", displayName: "Tracejada" },
    { value: "dot", displayName: "Pontilhada" }
];

const TIPOS_CURVA: powerbi.IEnumMember[] = [
    { value: "linear", displayName: "Linear" },
    { value: "monotone", displayName: "Suave (monotone)" },
    { value: "step", displayName: "Escada" }
];

const FORMATOS_DATA: powerbi.IEnumMember[] = [
    { value: "auto", displayName: "Auto (texto)" },
    { value: "mmm/yy", displayName: "mai/26" },
    { value: "mmm/yyyy", displayName: "mai/2026" },
    { value: "MMM/yy", displayName: "Mai/26" },
    { value: "MMM/yyyy", displayName: "Mai/2026" },
    { value: "MMMM/yyyy", displayName: "maio/2026" },
    { value: "dd/MM/yyyy", displayName: "26/05/2026" },
    { value: "dd/MM/yy", displayName: "26/05/26" },
    { value: "yyyy-MM-dd", displayName: "2026-05-26" },
    { value: "MM/yyyy", displayName: "05/2026" },
    { value: "yyyy", displayName: "2026" }
];

const TIPOS_FORMATO: powerbi.IEnumMember[] = [
    { value: "auto", displayName: "Automatico" },
    { value: "decimal", displayName: "Decimal" },
    { value: "inteiro", displayName: "Inteiro" },
    { value: "percentualFracao", displayName: "Percentual (fracao 0-1)" },
    { value: "percentual", displayName: "Percentual (ja em %)" },
    { value: "moedaBRL", displayName: "Moeda (R$)" },
    { value: "moedaUSD", displayName: "Moeda (US$)" },
    { value: "moedaEUR", displayName: "Moeda (EUR)" }
];

const FORMAS_MARCADOR: powerbi.IEnumMember[] = [
    { value: "circle", displayName: "Circulo" },
    { value: "square", displayName: "Quadrado" },
    { value: "diamond", displayName: "Losango" },
    { value: "triangle", displayName: "Triangulo" }
];

const POSICOES_ROTULO_META: powerbi.IEnumMember[] = [
    { value: "esquerda", displayName: "Esquerda" },
    { value: "direita", displayName: "Direita" },
    { value: "acima", displayName: "Acima" }
];

function numero(name: string, displayName: string, valor: number, min: number, max: number): formattingSettings.NumUpDown {
    return new formattingSettings.NumUpDown({
        name,
        displayName,
        value: valor,
        options: {
            minValue: { type: ValidatorType.Min, value: min },
            maxValue: { type: ValidatorType.Max, value: max }
        }
    });
}

function cor(name: string, displayName: string, hex: string): formattingSettings.ColorPicker {
    return new formattingSettings.ColorPicker({
        name,
        displayName,
        value: { value: hex }
    });
}

function toggle(name: string, displayName: string, valor: boolean): formattingSettings.ToggleSwitch {
    return new formattingSettings.ToggleSwitch({ name, displayName, value: valor });
}

function texto(name: string, displayName: string, valor: string, placeholder?: string): formattingSettings.TextInput {
    return new formattingSettings.TextInput({
        name,
        displayName,
        value: valor,
        placeholder: placeholder || ""
    });
}

function dropdown(name: string, displayName: string, items: powerbi.IEnumMember[], indexPadrao: number): formattingSettings.ItemDropdown {
    return new formattingSettings.ItemDropdown({
        name,
        displayName,
        items,
        value: items[indexPadrao]
    });
}

/* =========================== Layout (margens) =========================== */
class LayoutCard extends Card {
    margemTopo = numero("margemTopo", "Margem topo", 24, 0, 200);
    margemBase = numero("margemBase", "Margem base", 40, 0, 200);
    margemEsquerda = numero("margemEsquerda", "Margem esquerda", 60, 0, 300);
    margemDireita = numero("margemDireita", "Margem direita", 30, 0, 300);
    name = "layout";
    displayName = "Layout (margens)";
    slices = [this.margemTopo, this.margemBase, this.margemEsquerda, this.margemDireita];
}

/* =========================== Eixo X =========================== */
class EixoXCard extends Card {
    exibir = toggle("exibir", "Exibir rotulos", true);
    exibirLinha = toggle("exibirLinha", "Exibir linha do eixo", true);
    corLinha = cor("corLinha", "Cor da linha", "#6B7280");
    espessuraLinha = numero("espessuraLinha", "Espessura da linha", 1, 0, 10);
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", value: FONTE_PADRAO });
    fontSize = numero("fontSize", "Tamanho", 11, 6, 60);
    fontBold = toggle("fontBold", "Negrito", false);
    fontItalic = toggle("fontItalic", "Italico", false);
    fontUnderline = toggle("fontUnderline", "Sublinhado", false);
    corRotulo = cor("corRotulo", "Cor do rotulo", "#374151");
    formatoData = dropdown("formatoData", "Formato data", FORMATOS_DATA, 0);
    rotacao = numero("rotacao", "Rotacao (graus)", 0, -90, 90);
    name = "eixoX";
    displayName = "Eixo X";
    slices = [
        this.exibir, this.exibirLinha, this.corLinha, this.espessuraLinha,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline,
        this.corRotulo, this.formatoData, this.rotacao
    ];
}

/* =========================== Eixo Y =========================== */
class EixoYCard extends Card {
    exibir = toggle("exibir", "Exibir rotulos", true);
    exibirLinha = toggle("exibirLinha", "Exibir linha do eixo", true);
    corLinha = cor("corLinha", "Cor da linha", "#6B7280");
    espessuraLinha = numero("espessuraLinha", "Espessura da linha", 1, 0, 10);
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", value: FONTE_PADRAO });
    fontSize = numero("fontSize", "Tamanho", 11, 6, 60);
    fontBold = toggle("fontBold", "Negrito", false);
    fontItalic = toggle("fontItalic", "Italico", false);
    fontUnderline = toggle("fontUnderline", "Sublinhado", false);
    corRotulo = cor("corRotulo", "Cor do rotulo", "#374151");
    minimoAuto = toggle("minimoAuto", "Minimo automatico", true);
    minimo = numero("minimo", "Minimo", 0, -1e12, 1e12);
    maximoAuto = toggle("maximoAuto", "Maximo automatico", true);
    maximo = numero("maximo", "Maximo", 100, -1e12, 1e12);
    passo = numero("passo", "Passo (0 = automatico)", 0, 0, 1e9);
    tipoFormato = dropdown("tipoFormato", "Tipo de formato", TIPOS_FORMATO, 0);
    casasDecimais = numero("casasDecimais", "Casas decimais", 0, 0, 6);
    abreviar = toggle("abreviar", "Abreviar (mil/mi/bi)", false);
    prefixo = texto("prefixo", "Prefixo", "", "ex.: R$ ");
    sufixo = texto("sufixo", "Sufixo", "", "ex.: %");
    name = "eixoY";
    displayName = "Eixo Y";
    slices = [
        this.exibir, this.exibirLinha, this.corLinha, this.espessuraLinha,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline,
        this.corRotulo,
        this.minimoAuto, this.minimo, this.maximoAuto, this.maximo, this.passo,
        this.tipoFormato, this.casasDecimais, this.abreviar, this.prefixo, this.sufixo
    ];
}

/* =========================== Grid =========================== */
class GridCard extends Card {
    exibirX = toggle("exibirX", "Gridlines verticais (X)", false);
    exibirY = toggle("exibirY", "Gridlines horizontais (Y)", true);
    corGrid = cor("corGrid", "Cor do grid", "#E5E7EB");
    espessuraGrid = numero("espessuraGrid", "Espessura", 1, 0, 5);
    tipoLinhaGrid = dropdown("tipoLinhaGrid", "Tipo de linha", TIPOS_LINHA_GRID, 0);
    name = "grid";
    displayName = "Grid (linhas de fundo)";
    slices = [this.exibirX, this.exibirY, this.corGrid, this.espessuraGrid, this.tipoLinhaGrid];
}

/* =========================== Resultado (serie principal) =========================== */
class ResultadoCard extends Card {
    cor = cor("cor", "Cor da linha", "#3B82F6");
    espessura = numero("espessura", "Espessura", 3, 0.5, 20);
    tipoLinha = dropdown("tipoLinha", "Tipo de linha", TIPOS_LINHA, 0);
    curva = dropdown("curva", "Curva", TIPOS_CURVA, 0);
    name = "resultado";
    displayName = "Linha do Resultado";
    slices = [this.cor, this.espessura, this.tipoLinha, this.curva];
}

/* =========================== Projecao =========================== */
class ProjecaoCard extends Card {
    exibir = toggle("exibir", "Exibir projecao", true);
    cor = cor("cor", "Cor da linha", "#3B82F6");
    espessura = numero("espessura", "Espessura", 3, 0.5, 20);
    tipoLinha = dropdown("tipoLinha", "Tipo de linha", TIPOS_LINHA, 1);
    exibirMarcador = toggle("exibirMarcador", "Exibir marcador no ponto final", true);
    tamanhoMarcador = numero("tamanhoMarcador", "Tamanho do marcador", 6, 1, 40);
    rotuloPadrao = texto("rotuloPadrao", "Rotulo padrao (se nao houver campo)", "Projecao", "ex.: Meta, Projecao");
    name = "projecao";
    displayName = "Projecao (continuacao da linha do Resultado)";
    slices = [this.exibir, this.cor, this.espessura, this.tipoLinha, this.exibirMarcador, this.tamanhoMarcador, this.rotuloPadrao];
}

/* =========================== Meta =========================== */
class MetaCard extends Card {
    exibir = toggle("exibir", "Exibir linha de meta", true);
    cor = cor("cor", "Cor da linha", "#9CA3AF");
    espessura = numero("espessura", "Espessura", 2, 0.5, 10);
    tipoLinha = dropdown("tipoLinha", "Tipo de linha", TIPOS_LINHA, 1);
    exibirRotulo = toggle("exibirRotulo", "Exibir rotulo da meta", true);
    rotuloTexto = texto("rotuloTexto", "Texto do rotulo", "Meta", "ex.: Meta, Objetivo");
    exibirValor = toggle("exibirValor", "Incluir valor no rotulo", true);
    posicaoRotulo = dropdown("posicaoRotulo", "Posicao do rotulo", POSICOES_ROTULO_META, 1);
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", value: FONTE_PADRAO });
    fontSize = numero("fontSize", "Tamanho", 11, 6, 60);
    fontBold = toggle("fontBold", "Negrito", false);
    fontItalic = toggle("fontItalic", "Italico", false);
    fontUnderline = toggle("fontUnderline", "Sublinhado", false);
    corRotulo = cor("corRotulo", "Cor do rotulo", "#6B7280");
    name = "meta";
    displayName = "Meta (linha de referencia)";
    slices = [
        this.exibir, this.cor, this.espessura, this.tipoLinha,
        this.exibirRotulo, this.rotuloTexto, this.exibirValor, this.posicaoRotulo,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline, this.corRotulo
    ];
}

/* =========================== Marcadores =========================== */
class MarcadoresCard extends Card {
    exibir = toggle("exibir", "Exibir marcadores nos pontos", false);
    tamanho = numero("tamanho", "Tamanho", 5, 1, 40);
    forma = dropdown("forma", "Forma", FORMAS_MARCADOR, 0);
    preencher = toggle("preencher", "Preenchidos", true);
    espessuraBorda = numero("espessuraBorda", "Espessura da borda", 1.5, 0, 10);
    name = "marcadores";
    displayName = "Marcadores (pontos)";
    slices = [this.exibir, this.tamanho, this.forma, this.preencher, this.espessuraBorda];
}

/* =========================== Rotulos de Valor =========================== */
class RotulosValorCard extends Card {
    exibir = toggle("exibir", "Exibir rotulos de valor", false);
    exibirApenasUltimo = toggle("exibirApenasUltimo", "Apenas no ultimo ponto", false);
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", value: FONTE_PADRAO });
    fontSize = numero("fontSize", "Tamanho", 11, 6, 60);
    fontBold = toggle("fontBold", "Negrito", true);
    fontItalic = toggle("fontItalic", "Italico", false);
    fontUnderline = toggle("fontUnderline", "Sublinhado", false);
    cor = cor("cor", "Cor", "#111827");
    deslocamentoY = numero("deslocamentoY", "Deslocamento vertical", -10, -80, 80);
    tipoFormato = dropdown("tipoFormato", "Tipo de formato", TIPOS_FORMATO, 0);
    casasDecimais = numero("casasDecimais", "Casas decimais", 1, 0, 6);
    abreviar = toggle("abreviar", "Abreviar (mil/mi/bi)", false);
    limiarAbreviar = numero("limiarAbreviar", "Limiar para abreviar", 1000, 100, 1_000_000);
    prefixo = texto("prefixo", "Prefixo", "", "ex.: R$ ");
    sufixo = texto("sufixo", "Sufixo", "", "ex.: %");
    name = "rotulosValor";
    displayName = "Rotulos de valor";
    slices = [
        this.exibir, this.exibirApenasUltimo,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline, this.cor, this.deslocamentoY,
        this.tipoFormato, this.casasDecimais, this.abreviar, this.limiarAbreviar, this.prefixo, this.sufixo
    ];
}

/* =========================== Modelo =========================== */
export class VisualFormattingSettingsModel extends Model {
    layout = new LayoutCard();
    eixoX = new EixoXCard();
    eixoY = new EixoYCard();
    grid = new GridCard();
    resultado = new ResultadoCard();
    projecao = new ProjecaoCard();
    meta = new MetaCard();
    marcadores = new MarcadoresCard();
    rotulosValor = new RotulosValorCard();
    cards = [
        this.layout,
        this.eixoX, this.eixoY, this.grid,
        this.resultado, this.projecao, this.meta,
        this.marcadores, this.rotulosValor
    ];
}
