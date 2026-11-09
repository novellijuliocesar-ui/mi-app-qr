// Utilidades compartidas de interfaz, texto, canvas y compartir.

export const $ = sel => document.querySelector(sel);

/** Pasa a minúsculas, quita acentos y deja solo letras, números y espacios. */
export function normalizar(texto) {
    return String(texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/** Evita que el texto del Excel se interprete como HTML. */
export function escapeHtml(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

export function debounce(fn, ms) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

export function nombreArchivo(texto) {
    return String(texto).replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 60);
}

// ---------- Aviso flotante (uno solo a la vez) ----------
let toastTimer;
export function toast(texto, tipo = 'info', ms = 2500) {
    const el = document.getElementById('toast');
    el.textContent = texto;
    el.className = `toast ${tipo}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

// ---------- Botón «atrás» del móvil ----------
// Las vistas que se abren encima (tarjeta QR, modo selección) se registran aquí para que
// el botón o gesto «atrás» del móvil las cierre en lugar de salir de la app.
const capas = [];
window.addEventListener('popstate', () => capas.pop()?.());

/** Registra una vista abierta; `cerrar` se ejecutará al pulsar «atrás». */
export function abrirCapa(cerrar) {
    history.pushState({ capa: capas.length + 1 }, '');
    capas.push(cerrar);
}

/** Cierra la vista abierta más reciente (igual que pulsar «atrás»). */
export function cerrarCapa() {
    if (capas.length) history.back();
}

// ---------- Compartir / descargar ----------
export function canvasABlob(canvas) {
    return new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo crear la imagen'))), 'image/png'));
}

export function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Comparte un archivo con el menú nativo; si no se puede, lo descarga. */
export async function compartirArchivo(blob, nombre, texto) {
    const file = new File([blob], nombre, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], text: texto });
        } catch (e) {
            if (e.name !== 'AbortError') throw e;
        }
        return;
    }
    descargar(blob, nombre);
    toast('Este dispositivo no permite compartir: se ha descargado', 'info');
}

/** Comparte texto; si no se puede, lo copia al portapapeles. */
export async function compartirTexto(texto) {
    if (navigator.share) {
        try {
            await navigator.share({ text: texto });
            return;
        } catch (e) {
            if (e.name === 'AbortError') return;
        }
    }
    await navigator.clipboard.writeText(texto);
    toast('Texto copiado al portapapeles', 'success');
}

// ---------- Ayudas de canvas ----------
export function rectRedondeado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

/** Parte un texto en líneas por palabras; corta palabras que no caben solas. */
export function partirTexto(ctx, texto, anchoMax) {
    const lineas = [];
    let actual = '';
    for (const palabra of String(texto).split(/\s+/).filter(Boolean)) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (ctx.measureText(prueba).width <= anchoMax) {
            actual = prueba;
            continue;
        }
        if (actual) lineas.push(actual);
        actual = palabra;
        while (ctx.measureText(actual).width > anchoMax && actual.length > 1) {
            let i = actual.length - 1;
            while (i > 1 && ctx.measureText(actual.slice(0, i)).width > anchoMax) i--;
            lineas.push(actual.slice(0, i));
            actual = actual.slice(i);
        }
    }
    if (actual) lineas.push(actual);
    return lineas;
}

export function recortar(ctx, texto, anchoMax) {
    texto = String(texto);
    if (ctx.measureText(texto).width <= anchoMax) return texto;
    while (texto.length > 1 && ctx.measureText(texto + '…').width > anchoMax) texto = texto.slice(0, -1);
    return texto + '…';
}

/** Muestra resultados por bloques para no pintar miles de filas de golpe. */
export class ListaPaginada {
    constructor(listEl, moreBtn, renderItem, tamPagina = 50) {
        this.listEl = listEl;
        this.moreBtn = moreBtn;
        this.renderItem = renderItem;
        this.tamPagina = tamPagina;
        this.items = [];
        this.mostrados = 0;
        moreBtn.addEventListener('click', () => this._pintarMas());
        // Carga el siguiente bloque sola al acercarse al final de la lista.
        new IntersectionObserver(entradas => {
            if (entradas[0].isIntersecting && !moreBtn.hidden) this._pintarMas();
        }, { rootMargin: '400px' }).observe(moreBtn);
    }

    mostrar(items) {
        this.items = items;
        this.mostrados = 0;
        this.listEl.innerHTML = '';
        this._pintarMas();
    }

    refrescar() {
        const n = this.mostrados;
        this.listEl.innerHTML = '';
        this.mostrados = 0;
        this._pintarMas(n);
    }

    _pintarMas(cuantos = this.tamPagina) {
        const siguiente = this.items.slice(this.mostrados, this.mostrados + cuantos);
        this.listEl.insertAdjacentHTML('beforeend',
            siguiente.map((it, i) => this.renderItem(it, this.mostrados + i)).join(''));
        this.mostrados += siguiente.length;
        const quedan = this.items.length - this.mostrados;
        this.moreBtn.hidden = quedan <= 0;
        this.moreBtn.textContent = `Mostrar ${Math.min(quedan, this.tamPagina)} más (quedan ${quedan})`;
    }
}
