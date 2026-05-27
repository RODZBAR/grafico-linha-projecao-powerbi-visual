"use strict";

const MESES_CURTOS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS_PT = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function pad2(n: number): string {
    return n < 10 ? "0" + n : String(n);
}

export function ehData(v: any): v is Date {
    return v instanceof Date && !isNaN(v.getTime());
}

export function tentarParsearData(v: any): Date | null {
    if (ehData(v)) return v;
    if (typeof v === "number") {
        const d = new Date(v);
        return ehData(d) ? d : null;
    }
    if (typeof v === "string" && v.length > 0) {
        const d = new Date(v);
        if (ehData(d)) return d;
        const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (m) {
            const dia = parseInt(m[1], 10);
            const mes = parseInt(m[2], 10) - 1;
            let ano = parseInt(m[3], 10);
            if (ano < 100) ano += 2000;
            const d2 = new Date(ano, mes, dia);
            return ehData(d2) ? d2 : null;
        }
    }
    return null;
}

function capitalizar(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatarPeriodo(valor: any, formato: string): string {
    if (valor === null || valor === undefined || valor === "") {
        return "";
    }
    if (formato === "auto") {
        return String(valor);
    }
    const d = tentarParsearData(valor);
    if (!d) {
        return String(valor);
    }
    const dia = d.getDate();
    const mesIdx = d.getMonth();
    const ano = d.getFullYear();
    const mesCurto = MESES_CURTOS_PT[mesIdx];
    const mesLongo = MESES_LONGOS_PT[mesIdx];
    const anoCurto = pad2(ano % 100);

    switch (formato) {
        case "mmm/yy": return mesCurto + "/" + anoCurto;
        case "mmm/yyyy": return mesCurto + "/" + ano;
        case "MMM/yy": return capitalizar(mesCurto) + "/" + anoCurto;
        case "MMM/yyyy": return capitalizar(mesCurto) + "/" + ano;
        case "MMMM/yyyy": return capitalizar(mesLongo) + "/" + ano;
        case "dd/MM/yyyy": return pad2(dia) + "/" + pad2(mesIdx + 1) + "/" + ano;
        case "dd/MM/yy": return pad2(dia) + "/" + pad2(mesIdx + 1) + "/" + anoCurto;
        case "yyyy-MM-dd": return ano + "-" + pad2(mesIdx + 1) + "-" + pad2(dia);
        case "MM/yyyy": return pad2(mesIdx + 1) + "/" + ano;
        case "yyyy": return String(ano);
        default: return String(valor);
    }
}
