"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel } from "./settings";
import { formatarValor, ehNumeroValido, OpcoesFormato, TipoFormato } from "./numberFormatter";
import { formatarPeriodo } from "./dateFormatter";

const VERSAO_VISUAL = "v1.0.4";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;

interface PontoSerie {
    indice: number;
    rotuloEixoX: string;
    valor: number | null;
    metaValor: number | null;
}

interface ProjecaoInfo {
    valorNumerico: number;
    rotulo: string;
    indiceUltimoValido: number;
    valorUltimoValido: number;
}

function numOuNull(v: any): number | null {
    if (!ehNumeroValido(v)) return null;
    return Number(v);
}

function dashArray(tipo: string, espessura: number): string {
    const e = Math.max(0.5, espessura);
    switch (tipo) {
        case "dash": return `${e * 3} ${e * 2}`;
        case "dot": return `${e} ${e * 2}`;
        case "dashdot": return `${e * 3} ${e * 1.5} ${e * 0.6} ${e * 1.5}`;
        default: return "";
    }
}

function curvaD3(tipo: string): d3.CurveFactory {
    switch (tipo) {
        case "monotone": return d3.curveMonotoneX;
        case "step": return d3.curveStepAfter;
        default: return d3.curveLinear;
    }
}

function lerCor(picker: any, fallback: string): string {
    if (!picker) return fallback;
    let v: any = picker.value;
    while (v && typeof v === "object" && "value" in v) v = v.value;
    if (typeof v === "string" && v.length > 0) return v;
    return fallback;
}

function lerEnum(picker: any, fallback: string): string {
    if (!picker || !picker.value) return fallback;
    const v: any = picker.value;
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && typeof v.value === "string") return v.value;
    return fallback;
}

function lerNumero(picker: any, fallback: number): number {
    if (!picker) return fallback;
    const n = Number(picker.value);
    return isFinite(n) ? n : fallback;
}

function lerBool(picker: any, fallback: boolean): boolean {
    if (!picker || picker.value === undefined || picker.value === null) return fallback;
    return !!picker.value;
}

function lerTexto(picker: any, fallback: string): string {
    if (!picker || picker.value === undefined || picker.value === null) return fallback;
    return String(picker.value);
}

function lerFonte(picker: any, fallback: string): string {
    if (!picker) return fallback;
    if (typeof picker.value === "string") return picker.value || fallback;
    return fallback;
}

function opcoesFormatoDeCard(card: any): OpcoesFormato {
    return {
        tipo: lerEnum(card.tipoFormato, "auto") as TipoFormato,
        casasDecimais: lerNumero(card.casasDecimais, 0),
        abreviar: lerBool(card.abreviar, false),
        limiarAbreviar: card.limiarAbreviar ? lerNumero(card.limiarAbreviar, 1000) : 1000,
        prefixo: card.prefixo ? lerTexto(card.prefixo, "") : "",
        sufixo: card.sufixo ? lerTexto(card.sufixo, "") : ""
    };
}

/* ============= Leitura de cores conditional formatting ============= */

function extrairCor(o: any): string | null {
    if (o === null || o === undefined) return null;
    if (typeof o === "string" && o.length > 0) return o;
    if (typeof o === "object") {
        if (o.solid && typeof o.solid.color === "string") return o.solid.color;
        if (typeof o.color === "string") return o.color;
        if (typeof o.value === "string") return o.value;
    }
    return null;
}

// Cor global (medida que retorna 1 cor, regra simples)
function lerCorGlobalDV(dv: DataView, objectName: string, propertyName: string): string | null {
    const objs: any = dv && dv.metadata && (dv.metadata as any).objects;
    return extrairCor(objs && objs[objectName] && objs[objectName][propertyName]);
}

// Cor por categoria (gradient, regra por valor da categoria)
// Em categorical mapping, fica em categories[0].objects[idx][objectName][propertyName]
function lerCorPorCategoria(categoria: DataViewCategoryColumn | null, idx: number, objectName: string, propertyName: string): string | null {
    if (!categoria || !categoria.objects) return null;
    const o = categoria.objects[idx];
    if (!o) return null;
    return extrairCor((o as any)[objectName] && (o as any)[objectName][propertyName]);
}

function resolverCor(dv: DataView, categoria: DataViewCategoryColumn | null, objectName: string, propertyName: string, fallback: string): string {
    // Tenta global primeiro (cor unica)
    const global = lerCorGlobalDV(dv, objectName, propertyName);
    if (global) return global;
    // Tenta primeira cor por categoria (se houver, usa como representante)
    if (categoria && categoria.objects) {
        for (let i = 0; i < categoria.values.length; i++) {
            const c = lerCorPorCategoria(categoria, i, objectName, propertyName);
            if (c) return c;
        }
    }
    return fallback;
}

function coresPorCategoria(dv: DataView, categoria: DataViewCategoryColumn | null, objectName: string, propertyName: string, fallback: string): { cores: string[]; algumaPorLinha: boolean } {
    const n = categoria && categoria.values ? categoria.values.length : 0;
    const corGlobal = lerCorGlobalDV(dv, objectName, propertyName);
    let algumaPorLinha = false;
    const cores: string[] = [];
    for (let i = 0; i < n; i++) {
        const c = lerCorPorCategoria(categoria, i, objectName, propertyName);
        if (c) {
            algumaPorLinha = true;
            cores.push(c);
        } else {
            cores.push(corGlobal || fallback);
        }
    }
    return { cores, algumaPorLinha };
}

/* ============= Helpers para localizar values por role ============= */

function valuePorRole(values: powerbi.DataViewValueColumns | undefined, role: string): DataViewValueColumn | null {
    if (!values) return null;
    for (let i = 0; i < values.length; i++) {
        const v: any = values[i];
        if (v && v.source && v.source.roles && v.source.roles[role]) return v;
    }
    return null;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private target: HTMLElement;
    private svgRoot: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private gRoot: d3.Selection<SVGGElement, unknown, null, undefined>;
    private formattingSettingsService: FormattingSettingsService;
    private formattingSettings: VisualFormattingSettingsModel;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.classList.add("grafico-linha-projecao-host");

        this.svgRoot = d3.select(this.target).append("svg")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("preserveAspectRatio", "none");
        this.gRoot = this.svgRoot.append("g").attr("class", "raiz");
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public update(options: VisualUpdateOptions): void {
        const dv: DataView = options.dataViews && options.dataViews[0];
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            dv
        );

        const w = Math.max(120, options.viewport.width);
        const h = Math.max(80, options.viewport.height);

        this.svgRoot.attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);
        this.gRoot.selectAll("*").remove();

        const cfg = this.formattingSettings;

        if (!dv || !dv.categorical) {
            this.renderMensagem(w, h, "Arraste campos para Referencia e Eixo Y (Resultado).");
            return;
        }

        const cat = dv.categorical;
        const categoria: DataViewCategoryColumn | null = (cat.categories && cat.categories[0]) || null;

        if (!categoria) {
            this.renderMensagem(w, h, "Defina o campo Referencia (eixo X).");
            return;
        }

        const valResultado = valuePorRole(cat.values, "resultado");
        if (!valResultado) {
            this.renderMensagem(w, h, "Defina o campo Eixo Y (Resultado).");
            return;
        }

        const valProjecao = valuePorRole(cat.values, "projecaoValor");
        const valProjecaoRot = valuePorRole(cat.values, "projecaoRotulo");
        const valMeta = valuePorRole(cat.values, "meta");

        const formatoData = lerEnum(cfg.eixoX.formatoData, "auto");
        const formatoColRef = categoria.source ? categoria.source.format : undefined;
        const formatoColResultado = valResultado.source ? valResultado.source.format : undefined;

        const n = categoria.values.length;
        const pontos: PontoSerie[] = [];
        for (let i = 0; i < n; i++) {
            const ref = categoria.values[i];
            pontos.push({
                indice: i,
                rotuloEixoX: formatarPeriodo(ref, formatoData),
                valor: numOuNull(valResultado.values[i]),
                metaValor: valMeta ? numOuNull(valMeta.values[i]) : null
            });
        }

        // ===== Projecao =====
        let projecao: ProjecaoInfo | null = null;
        if (lerBool(cfg.projecao.exibir, true) && valProjecao) {
            // Pega primeiro valor nao nulo
            let valorProj: any = null;
            for (let i = 0; i < n; i++) {
                if (ehNumeroValido(valProjecao.values[i])) { valorProj = valProjecao.values[i]; break; }
            }
            const valorNum = numOuNull(valorProj);
            if (valorNum !== null) {
                let idxUltimo = -1;
                let valUltimo = 0;
                for (let i = pontos.length - 1; i >= 0; i--) {
                    if (pontos[i].valor !== null) { idxUltimo = i; valUltimo = pontos[i].valor!; break; }
                }
                if (idxUltimo >= 0) {
                    let rotulo = lerTexto(cfg.projecao.rotuloPadrao, "Projecao");
                    if (valProjecaoRot) {
                        for (let i = 0; i < n; i++) {
                            const v = valProjecaoRot.values[i];
                            if (v !== null && v !== undefined && String(v).length > 0) { rotulo = String(v); break; }
                        }
                    }
                    projecao = {
                        valorNumerico: valorNum,
                        rotulo,
                        indiceUltimoValido: idxUltimo,
                        valorUltimoValido: valUltimo
                    };
                }
            }
        }

        // ===== Layout =====
        const mTopo = Math.max(0, lerNumero(cfg.layout.margemTopo, 24));
        const mBase = Math.max(0, lerNumero(cfg.layout.margemBase, 40));
        const mEsq = Math.max(0, lerNumero(cfg.layout.margemEsquerda, 60));
        const mDir = Math.max(0, lerNumero(cfg.layout.margemDireita, 30));

        const plot = { x0: mEsq, x1: w - mDir, y0: mTopo, y1: h - mBase };
        if (plot.x1 <= plot.x0 + 10 || plot.y1 <= plot.y0 + 10) {
            this.renderMensagem(w, h, "Espaco insuficiente. Ajuste as margens.");
            return;
        }

        // ===== Escala X =====
        const dominioX: string[] = pontos.map(p => p.rotuloEixoX);
        if (projecao) {
            const baseRotulo = projecao.rotulo;
            let rot = baseRotulo;
            let suf = 1;
            while (dominioX.indexOf(rot) >= 0) { rot = baseRotulo + " " + suf; suf++; }
            projecao.rotulo = rot;
            dominioX.push(rot);
        }
        const escalaX = d3.scalePoint<string>().domain(dominioX).range([plot.x0, plot.x1]).padding(0.5);

        // ===== Escala Y =====
        const vals: number[] = [];
        for (const p of pontos) {
            if (p.valor !== null) vals.push(p.valor);
            if (p.metaValor !== null) vals.push(p.metaValor);
        }
        if (projecao) vals.push(projecao.valorNumerico);

        const minimoAuto = lerBool(cfg.eixoY.minimoAuto, true);
        const maximoAuto = lerBool(cfg.eixoY.maximoAuto, true);
        let yMin = vals.length > 0 ? Math.min(...vals) : 0;
        let yMax = vals.length > 0 ? Math.max(...vals) : 1;
        if (!minimoAuto) yMin = lerNumero(cfg.eixoY.minimo, yMin);
        if (!maximoAuto) yMax = lerNumero(cfg.eixoY.maximo, yMax);
        if (yMax === yMin) yMax = yMin + 1;
        const padding = (yMax - yMin) * 0.08;
        if (minimoAuto) yMin = yMin - padding;
        if (maximoAuto) yMax = yMax + padding;
        const escalaY = d3.scaleLinear().domain([yMin, yMax]).range([plot.y1, plot.y0]);

        // ===== Grid =====
        const exibirGridX = lerBool(cfg.grid.exibirX, false);
        const exibirGridY = lerBool(cfg.grid.exibirY, true);
        if (exibirGridX || exibirGridY) {
            const corGrid = lerCor(cfg.grid.corGrid, "#E5E7EB");
            const espGrid = Math.max(0.5, lerNumero(cfg.grid.espessuraGrid, 1));
            const tipoGrid = lerEnum(cfg.grid.tipoLinhaGrid, "solid");
            const dashGrid = dashArray(tipoGrid, espGrid);
            if (exibirGridY) {
                for (const t of escalaY.ticks(5)) {
                    const y = escalaY(t);
                    this.gRoot.append("line")
                        .attr("x1", plot.x0).attr("x2", plot.x1)
                        .attr("y1", y).attr("y2", y)
                        .attr("stroke", corGrid).attr("stroke-width", espGrid)
                        .attr("stroke-dasharray", dashGrid).attr("shape-rendering", "crispEdges");
                }
            }
            if (exibirGridX) {
                for (const rot of dominioX) {
                    const x = escalaX(rot);
                    if (x === undefined) continue;
                    this.gRoot.append("line")
                        .attr("x1", x).attr("x2", x).attr("y1", plot.y0).attr("y2", plot.y1)
                        .attr("stroke", corGrid).attr("stroke-width", espGrid)
                        .attr("stroke-dasharray", dashGrid).attr("shape-rendering", "crispEdges");
                }
            }
        }

        // ===== Linha da Meta =====
        if (lerBool(cfg.meta.exibir, true)) {
            const valoresMeta: number[] = pontos.map(p => p.metaValor).filter((v): v is number => v !== null);
            if (valoresMeta.length > 0) {
                const metaValor = valoresMeta[0];
                const yMeta = escalaY(metaValor);
                const corMeta = resolverCor(dv, categoria, "meta", "cor", lerCor(cfg.meta.cor, "#9CA3AF"));
                const espMeta = Math.max(0.5, lerNumero(cfg.meta.espessura, 2));
                const tipoMeta = lerEnum(cfg.meta.tipoLinha, "dash");
                this.gRoot.append("line")
                    .attr("x1", plot.x0).attr("x2", plot.x1)
                    .attr("y1", yMeta).attr("y2", yMeta)
                    .attr("stroke", corMeta).attr("stroke-width", espMeta)
                    .attr("stroke-dasharray", dashArray(tipoMeta, espMeta))
                    .attr("stroke-linecap", "round");

                if (lerBool(cfg.meta.exibirRotulo, true)) {
                    const rotuloBase = lerTexto(cfg.meta.rotuloTexto, "Meta");
                    const metaFormatoColuna = valMeta && valMeta.source ? valMeta.source.format : undefined;
                    const optsY = opcoesFormatoDeCard(cfg.eixoY);
                    const incluirValor = lerBool(cfg.meta.exibirValor, true);
                    const textoVal = incluirValor ? formatarValor(metaValor, optsY, metaFormatoColuna) : "";
                    const textoFinal = textoVal ? `${rotuloBase} ${textoVal}` : rotuloBase;
                    const posicao = lerEnum(cfg.meta.posicaoRotulo, "direita");
                    const corRot = lerCor(cfg.meta.corRotulo, "#6B7280");
                    const family = lerFonte(cfg.meta.fontFamily, "Segoe UI, sans-serif");
                    const size = lerNumero(cfg.meta.fontSize, 11);
                    const peso = lerBool(cfg.meta.fontBold, false) ? "700" : "400";
                    const italico = lerBool(cfg.meta.fontItalic, false) ? "italic" : "normal";
                    const sublin = lerBool(cfg.meta.fontUnderline, false) ? "underline" : "none";

                    let xR: number, anchor: string, yR: number;
                    if (posicao === "esquerda") { xR = plot.x0 + 4; anchor = "start"; yR = yMeta - 4; }
                    else if (posicao === "acima") { xR = (plot.x0 + plot.x1) / 2; anchor = "middle"; yR = yMeta - 4; }
                    else { xR = plot.x1 - 4; anchor = "end"; yR = yMeta - 4; }

                    this.gRoot.append("text")
                        .attr("x", xR).attr("y", yR).attr("text-anchor", anchor)
                        .attr("font-family", family).attr("font-size", size)
                        .attr("font-weight", peso).attr("font-style", italico)
                        .attr("text-decoration", sublin).attr("fill", corRot)
                        .text(textoFinal);
                }
            }
        }

        // ===== Linha do Resultado =====
        // Cores: 1) fx no painel via conditional formatting (categories.objects ou metadata.objects)
        //        2) cor fixa do painel (fallback)
        const corResultadoFallback = lerCor(cfg.resultado.cor, "#3B82F6");
        const { cores: coresPorIdx, algumaPorLinha } = coresPorCategoria(dv, categoria, "resultado", "cor", corResultadoFallback);
        const corResultado = coresPorIdx.length > 0 ? coresPorIdx[0] : corResultadoFallback;
        const espResultado = Math.max(0.5, lerNumero(cfg.resultado.espessura, 3));
        const tipoResultado = lerEnum(cfg.resultado.tipoLinha, "solid");
        const curvaResultado = lerEnum(cfg.resultado.curva, "linear");

        const lineGen = d3.line<{ x: number; y: number }>()
            .x(d => d.x).y(d => d.y).curve(curvaD3(curvaResultado));

        const ptsValidos = pontos
            .filter(p => p.valor !== null)
            .map(p => ({
                x: escalaX(p.rotuloEixoX) || 0,
                y: escalaY(p.valor!),
                v: p.valor!,
                rotulo: p.rotuloEixoX,
                idx: p.indice,
                cor: coresPorIdx[p.indice] || corResultadoFallback
            }));

        const coresDiferentes = algumaPorLinha && ptsValidos.length > 1 && ptsValidos.some(p => p.cor !== ptsValidos[0].cor);

        if (ptsValidos.length > 0) {
            if (coresDiferentes) {
                for (let i = 0; i < ptsValidos.length - 1; i++) {
                    const a = ptsValidos[i];
                    const b = ptsValidos[i + 1];
                    this.gRoot.append("line")
                        .attr("x1", a.x).attr("y1", a.y).attr("x2", b.x).attr("y2", b.y)
                        .attr("stroke", a.cor).attr("stroke-width", espResultado)
                        .attr("stroke-dasharray", dashArray(tipoResultado, espResultado))
                        .attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
                }
            } else {
                this.gRoot.append("path")
                    .datum(ptsValidos).attr("fill", "none")
                    .attr("stroke", corResultado).attr("stroke-width", espResultado)
                    .attr("stroke-dasharray", dashArray(tipoResultado, espResultado))
                    .attr("stroke-linecap", "round").attr("stroke-linejoin", "round")
                    .attr("d", lineGen(ptsValidos));
            }
        }

        // ===== Marcadores =====
        if (lerBool(cfg.marcadores.exibir, false)) {
            const tamMarc = Math.max(1, lerNumero(cfg.marcadores.tamanho, 5));
            const forma = lerEnum(cfg.marcadores.forma, "circle");
            const preencher = lerBool(cfg.marcadores.preencher, true);
            const espBorda = Math.max(0, lerNumero(cfg.marcadores.espessuraBorda, 1.5));
            for (const p of ptsValidos) {
                this.desenharMarcador(p.x, p.y, tamMarc, forma, p.cor, preencher, espBorda);
            }
        }

        // ===== Linha de Projecao =====
        if (projecao) {
            const xUlt = escalaX(pontos[projecao.indiceUltimoValido].rotuloEixoX) || 0;
            const yUlt = escalaY(projecao.valorUltimoValido);
            const xProj = escalaX(projecao.rotulo) || 0;
            const yProj = escalaY(projecao.valorNumerico);

            const corProj = resolverCor(dv, categoria, "projecao", "cor", lerCor(cfg.projecao.cor, corResultado));
            const espProj = Math.max(0.5, lerNumero(cfg.projecao.espessura, 3));
            const tipoProj = lerEnum(cfg.projecao.tipoLinha, "dash");

            this.gRoot.append("line")
                .attr("x1", xUlt).attr("x2", xProj).attr("y1", yUlt).attr("y2", yProj)
                .attr("stroke", corProj).attr("stroke-width", espProj)
                .attr("stroke-dasharray", dashArray(tipoProj, espProj))
                .attr("stroke-linecap", "round");

            if (lerBool(cfg.projecao.exibirMarcador, true)) {
                const tamProj = Math.max(1, lerNumero(cfg.projecao.tamanhoMarcador, 6));
                this.gRoot.append("circle")
                    .attr("cx", xProj).attr("cy", yProj).attr("r", tamProj)
                    .attr("fill", corProj).attr("stroke", corProj).attr("stroke-width", 1);
            }

            if (lerBool(cfg.marcadores.exibir, false)) {
                const tamMarc = Math.max(1, lerNumero(cfg.marcadores.tamanho, 5));
                const forma = lerEnum(cfg.marcadores.forma, "circle");
                const preencher = lerBool(cfg.marcadores.preencher, true);
                const espBorda = Math.max(0, lerNumero(cfg.marcadores.espessuraBorda, 1.5));
                const corUlt = coresPorIdx[projecao.indiceUltimoValido] || corResultadoFallback;
                this.desenharMarcador(xUlt, yUlt, tamMarc, forma, corUlt, preencher, espBorda);
            }
        }

        // ===== Rotulos de valor =====
        if (lerBool(cfg.rotulosValor.exibir, false)) {
            const optsRot = opcoesFormatoDeCard(cfg.rotulosValor);
            const apenasUlt = lerBool(cfg.rotulosValor.exibirApenasUltimo, false);
            const desY = lerNumero(cfg.rotulosValor.deslocamentoY, -10);
            const corRot = resolverCor(dv, categoria, "rotulosValor", "cor", lerCor(cfg.rotulosValor.cor, "#111827"));
            const family = lerFonte(cfg.rotulosValor.fontFamily, "Segoe UI, sans-serif");
            const size = lerNumero(cfg.rotulosValor.fontSize, 11);
            const peso = lerBool(cfg.rotulosValor.fontBold, true) ? "700" : "400";
            const italico = lerBool(cfg.rotulosValor.fontItalic, false) ? "italic" : "normal";
            const sublin = lerBool(cfg.rotulosValor.fontUnderline, false) ? "underline" : "none";

            const alvos = apenasUlt && ptsValidos.length > 0 ? [ptsValidos[ptsValidos.length - 1]] : ptsValidos;
            for (const p of alvos) {
                this.gRoot.append("text")
                    .attr("x", p.x).attr("y", p.y + desY).attr("text-anchor", "middle")
                    .attr("font-family", family).attr("font-size", size)
                    .attr("font-weight", peso).attr("font-style", italico)
                    .attr("text-decoration", sublin).attr("fill", corRot)
                    .text(formatarValor(p.v, optsRot, formatoColResultado));
            }

            if (projecao) {
                const xProj = escalaX(projecao.rotulo) || 0;
                const yProj = escalaY(projecao.valorNumerico) + desY;
                const fmtProj = valProjecao && valProjecao.source ? valProjecao.source.format : undefined;
                this.gRoot.append("text")
                    .attr("x", xProj).attr("y", yProj).attr("text-anchor", "middle")
                    .attr("font-family", family).attr("font-size", size)
                    .attr("font-weight", peso).attr("font-style", italico)
                    .attr("text-decoration", sublin).attr("fill", corRot)
                    .text(formatarValor(projecao.valorNumerico, optsRot, fmtProj));
            }
        }

        // ===== Eixo X =====
        if (lerBool(cfg.eixoX.exibirLinha, true)) {
            this.gRoot.append("line")
                .attr("x1", plot.x0).attr("x2", plot.x1).attr("y1", plot.y1).attr("y2", plot.y1)
                .attr("stroke", lerCor(cfg.eixoX.corLinha, "#6B7280"))
                .attr("stroke-width", Math.max(0.5, lerNumero(cfg.eixoX.espessuraLinha, 1)))
                .attr("shape-rendering", "crispEdges");
        }
        if (lerBool(cfg.eixoX.exibir, true)) {
            const familyX = lerFonte(cfg.eixoX.fontFamily, "Segoe UI, sans-serif");
            const sizeX = lerNumero(cfg.eixoX.fontSize, 11);
            const pesoX = lerBool(cfg.eixoX.fontBold, false) ? "700" : "400";
            const italicoX = lerBool(cfg.eixoX.fontItalic, false) ? "italic" : "normal";
            const sublinX = lerBool(cfg.eixoX.fontUnderline, false) ? "underline" : "none";
            const corX = lerCor(cfg.eixoX.corRotulo, "#374151");
            const rotacao = lerNumero(cfg.eixoX.rotacao, 0);

            for (const rot of dominioX) {
                const x = escalaX(rot);
                if (x === undefined) continue;
                const y = plot.y1 + sizeX + 4;
                const t = this.gRoot.append("text")
                    .attr("x", x).attr("y", y)
                    .attr("text-anchor", rotacao === 0 ? "middle" : "end")
                    .attr("font-family", familyX).attr("font-size", sizeX)
                    .attr("font-weight", pesoX).attr("font-style", italicoX)
                    .attr("text-decoration", sublinX).attr("fill", corX)
                    .text(rot);
                if (rotacao !== 0) t.attr("transform", `rotate(${rotacao}, ${x}, ${y})`);
            }
        }

        // ===== Eixo Y =====
        if (lerBool(cfg.eixoY.exibirLinha, true)) {
            this.gRoot.append("line")
                .attr("x1", plot.x0).attr("x2", plot.x0).attr("y1", plot.y0).attr("y2", plot.y1)
                .attr("stroke", lerCor(cfg.eixoY.corLinha, "#6B7280"))
                .attr("stroke-width", Math.max(0.5, lerNumero(cfg.eixoY.espessuraLinha, 1)))
                .attr("shape-rendering", "crispEdges");
        }
        if (lerBool(cfg.eixoY.exibir, true)) {
            const familyY = lerFonte(cfg.eixoY.fontFamily, "Segoe UI, sans-serif");
            const sizeY = lerNumero(cfg.eixoY.fontSize, 11);
            const pesoY = lerBool(cfg.eixoY.fontBold, false) ? "700" : "400";
            const italicoY = lerBool(cfg.eixoY.fontItalic, false) ? "italic" : "normal";
            const sublinY = lerBool(cfg.eixoY.fontUnderline, false) ? "underline" : "none";
            const corY = lerCor(cfg.eixoY.corRotulo, "#374151");
            const optsY = opcoesFormatoDeCard(cfg.eixoY);
            const passo = lerNumero(cfg.eixoY.passo, 0);
            let ticks: number[];
            if (passo > 0) {
                ticks = [];
                let v = Math.ceil(yMin / passo) * passo;
                while (v <= yMax) { ticks.push(v); v += passo; }
            } else {
                ticks = escalaY.ticks(5);
            }
            for (const t of ticks) {
                const y = escalaY(t);
                this.gRoot.append("text")
                    .attr("x", plot.x0 - 6).attr("y", y).attr("text-anchor", "end")
                    .attr("dominant-baseline", "central")
                    .attr("font-family", familyY).attr("font-size", sizeY)
                    .attr("font-weight", pesoY).attr("font-style", italicoY)
                    .attr("text-decoration", sublinY).attr("fill", corY)
                    .text(formatarValor(t, optsY, formatoColResultado));
            }
        }

        // ===== Diagnostico (debug fx) =====
        if (lerBool(cfg.diagnostico.exibir, false)) {
            this.renderDiagnostico(dv, categoria, coresPorIdx, algumaPorLinha, w);
        }

        // ===== Versao (sempre visivel no canto, discreta) =====
        this.gRoot.append("text")
            .attr("x", w - 4).attr("y", h - 2)
            .attr("text-anchor", "end")
            .attr("font-family", "Consolas, monospace").attr("font-size", 8)
            .attr("fill", "#9CA3AF").attr("opacity", 0.6)
            .text(VERSAO_VISUAL);
    }

    private renderDiagnostico(
        dv: DataView,
        categoria: DataViewCategoryColumn | null,
        coresPorIdx: string[],
        algumaPorLinha: boolean,
        w: number
    ): void {
        const corGlobal = lerCorGlobalDV(dv, "resultado", "cor");
        const objs: any = dv && dv.metadata && (dv.metadata as any).objects;
        const temObjsCategoria = !!(categoria && categoria.objects);
        const qtdComCor = categoria && categoria.objects ? categoria.objects.filter((o: any) => !!o).length : 0;

        const amostraCategoria: string[] = [];
        if (categoria && categoria.objects) {
            for (let i = 0; i < Math.min(3, categoria.objects.length); i++) {
                amostraCategoria.push(`cat.obj[${i}]=` + JSON.stringify(categoria.objects[i] || null).substring(0, 120));
            }
        }

        const linhas = [
            `[Diagnostico fx ${VERSAO_VISUAL}]`,
            `metadata.objects: ${objs ? JSON.stringify(objs).substring(0, 200) : "null"}`,
            `cor global metadata.objects.resultado.cor: ${corGlobal || "null"}`,
            `categoria.objects existe: ${temObjsCategoria} | itens com obj: ${qtdComCor}`,
            `algumaPorLinha: ${algumaPorLinha}`,
            `cores resultantes [0..4]: ${coresPorIdx.slice(0, 5).join(", ")}`,
            ...amostraCategoria
        ];
        let y = 12;
        const x = 6;
        this.gRoot.append("rect")
            .attr("x", x - 2).attr("y", 2)
            .attr("width", Math.max(280, w - 12)).attr("height", linhas.length * 12 + 4)
            .attr("fill", "rgba(255,255,200,0.95)")
            .attr("stroke", "#888").attr("stroke-width", 0.5);
        for (const ln of linhas) {
            this.gRoot.append("text")
                .attr("x", x).attr("y", y)
                .attr("font-family", "Consolas, monospace").attr("font-size", 9)
                .attr("fill", "#111").text(ln);
            y += 12;
        }
    }

    private desenharMarcador(x: number, y: number, tamanho: number, forma: string, cor: string, preencher: boolean, espBorda: number): void {
        const fill = preencher ? cor : "#FFFFFF";
        const stroke = cor;
        if (forma === "circle") {
            this.gRoot.append("circle").attr("cx", x).attr("cy", y).attr("r", tamanho)
                .attr("fill", fill).attr("stroke", stroke).attr("stroke-width", espBorda);
        } else if (forma === "square") {
            this.gRoot.append("rect").attr("x", x - tamanho).attr("y", y - tamanho)
                .attr("width", tamanho * 2).attr("height", tamanho * 2)
                .attr("fill", fill).attr("stroke", stroke).attr("stroke-width", espBorda);
        } else if (forma === "diamond") {
            const pts = `${x},${y - tamanho} ${x + tamanho},${y} ${x},${y + tamanho} ${x - tamanho},${y}`;
            this.gRoot.append("polygon").attr("points", pts)
                .attr("fill", fill).attr("stroke", stroke).attr("stroke-width", espBorda);
        } else if (forma === "triangle") {
            const pts = `${x},${y - tamanho} ${x + tamanho},${y + tamanho} ${x - tamanho},${y + tamanho}`;
            this.gRoot.append("polygon").attr("points", pts)
                .attr("fill", fill).attr("stroke", stroke).attr("stroke-width", espBorda);
        }
    }

    private renderMensagem(w: number, h: number, msg: string): void {
        this.gRoot.append("text")
            .attr("x", w / 2).attr("y", h / 2)
            .attr("text-anchor", "middle").attr("dominant-baseline", "central")
            .attr("font-family", "Segoe UI, sans-serif").attr("font-size", 13)
            .attr("fill", "#6B7280").text(msg);
    }
}
