"use strict";

export type TipoFormato =
    | "auto"
    | "decimal"
    | "inteiro"
    | "percentualFracao"
    | "percentual"
    | "moedaBRL"
    | "moedaUSD"
    | "moedaEUR";

export interface OpcoesFormato {
    tipo: TipoFormato;
    casasDecimais: number;
    abreviar: boolean;
    limiarAbreviar: number;
    prefixo: string;
    sufixo: string;
}

const ABRV: { limite: number; sufixo: string; divisor: number }[] = [
    { limite: 1_000_000_000, sufixo: " bi", divisor: 1_000_000_000 },
    { limite: 1_000_000, sufixo: " mi", divisor: 1_000_000 },
    { limite: 1_000, sufixo: " mil", divisor: 1_000 }
];

const SIMBOLO_MOEDA: { [k: string]: string } = {
    moedaBRL: "R$ ",
    moedaUSD: "US$ ",
    moedaEUR: "EUR "
};

export function ehNumeroValido(v: any): boolean {
    return v !== null && v !== undefined && v !== "" && !isNaN(Number(v)) && isFinite(Number(v));
}

function formatarPtBR(n: number, casas: number): string {
    return n.toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
        useGrouping: true
    });
}

function tipoEhPercentual(t: TipoFormato): boolean {
    return t === "percentual" || t === "percentualFracao";
}

function tipoEhMoeda(t: TipoFormato): boolean {
    return t === "moedaBRL" || t === "moedaUSD" || t === "moedaEUR";
}

function inferirTipoAuto(v: number, formatoColuna: string | undefined): TipoFormato {
    if (formatoColuna) {
        const f = formatoColuna.toLowerCase();
        if (f.indexOf("%") >= 0) return "percentualFracao";
        if (f.indexOf("r$") >= 0 || f.indexOf("brl") >= 0) return "moedaBRL";
        if (f.indexOf("$") >= 0 || f.indexOf("usd") >= 0) return "moedaUSD";
        if (f.indexOf("eur") >= 0 || f.indexOf("€") >= 0) return "moedaEUR";
    }
    if (Math.abs(v) > 0 && Math.abs(v) <= 1 && Number.isFinite(v) && !Number.isInteger(v)) {
        return "percentualFracao";
    }
    return Number.isInteger(v) ? "inteiro" : "decimal";
}

export function formatarValor(valor: any, opts: OpcoesFormato, formatoColuna?: string): string {
    if (!ehNumeroValido(valor)) {
        return "";
    }
    let n = Number(valor);
    const tipo: TipoFormato = opts.tipo === "auto" ? inferirTipoAuto(n, formatoColuna) : opts.tipo;
    let prefixoFinal = opts.prefixo || "";
    let sufixoFinal = opts.sufixo || "";

    if (tipo === "percentualFracao") {
        n = n * 100;
        if (sufixoFinal.indexOf("%") < 0) sufixoFinal = sufixoFinal + "%";
    } else if (tipo === "percentual") {
        if (sufixoFinal.indexOf("%") < 0) sufixoFinal = sufixoFinal + "%";
    } else if (tipoEhMoeda(tipo)) {
        const simbolo = SIMBOLO_MOEDA[tipo] || "";
        if (prefixoFinal.indexOf("R$") < 0 && prefixoFinal.indexOf("$") < 0 && prefixoFinal.indexOf("EUR") < 0) {
            prefixoFinal = simbolo + prefixoFinal;
        }
    }

    const casas = tipo === "inteiro" ? 0 : Math.max(0, opts.casasDecimais | 0);

    let corpo: string;
    if (opts.abreviar && !tipoEhPercentual(tipo)) {
        const abs = Math.abs(n);
        if (abs >= Math.max(1000, opts.limiarAbreviar)) {
            const sinal = n < 0 ? "-" : "";
            for (const a of ABRV) {
                if (abs >= a.limite) {
                    const v = Math.abs(n) / a.divisor;
                    corpo = sinal + formatarPtBR(v, casas) + a.sufixo;
                    return prefixoFinal + corpo + sufixoFinal;
                }
            }
        }
    }
    corpo = formatarPtBR(n, casas);
    return prefixoFinal + corpo + sufixoFinal;
}

let canvasMedida: HTMLCanvasElement | null = null;
export function larguraTextoEstimada(texto: string, fontFamily: string, fontSize: number, bold: boolean): number {
    if (!texto) return 0;
    if (!canvasMedida) {
        canvasMedida = document.createElement("canvas");
    }
    const ctx = canvasMedida.getContext("2d");
    if (!ctx) return texto.length * fontSize * 0.55;
    ctx.font = (bold ? "700 " : "400 ") + fontSize + "px " + fontFamily;
    return ctx.measureText(texto).width;
}
