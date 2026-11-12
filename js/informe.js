// Informe de trabajo: se rellena desde la tarjeta de un activo y se envía por WhatsApp
// (o cualquier app del menú de compartir) como mensaje de texto con fotos.
// El borrador se guarda en el móvil mientras se escribe y se borra al enviarlo.
import { buscar } from './data.js';
import { $, toast, escapeHtml, debounce, abrirCapa, cerrarCapa } from './ui.js';

const TURNO_MS = 8 * 60 * 60 * 1000;   // el nombre del técnico se recuerda durante un turno
const MAX_LADO_FOTO = 1600;             // las fotos se reducen para que se envíen rápido

// ---------- Borradores (IndexedDB: guarda texto y fotos) ----------
const bd = new Promise((resolve, reject) => {
    const req = indexedDB.open('qr-stock', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('borradores');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

async function guardarBorrador(clave, datos) {
    const db = await bd;
    db.transaction('borradores', 'readwrite').objectStore('borradores').put(datos, clave);
}

async function leerBorrador(clave) {
    const db = await bd;
    return new Promise(resolve => {
        const req = db.transaction('borradores').objectStore('borradores').get(clave);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
}

async function borrarBorrador(clave) {
    const db = await bd;
    db.transaction('borradores', 'readwrite').objectStore('borradores').delete(clave);
}

// ---------- Nombre del técnico (se recuerda solo durante el turno) ----------
function nombreDelTurno() {
    try {
        const { nombre, hora } = JSON.parse(localStorage.getItem('tecnico') || '{}');
        return nombre && Date.now() - hora < TURNO_MS ? nombre : '';
    } catch { return ''; }
}

function recordarNombre(nombre) {
    try { localStorage.setItem('tecnico', JSON.stringify({ nombre, hora: Date.now() })); } catch { /* sin almacenamiento */ }
}

/** Reduce una foto a JPEG de tamaño razonable (respeta la orientación de la cámara). */
async function reducirFoto(archivo) {
    try {
        const img = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
        const escala = Math.min(1, MAX_LADO_FOTO / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        img.close();
        return await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8)) || archivo;
    } catch {
        return archivo;   // si no se puede procesar, se envía tal cual
    }
}

export class Informe {
    /** @param {{ stockItems: () => object[], alCerrar: () => void }} opciones */
    constructor({ stockItems, alCerrar }) {
        this.stockItems = stockItems;
        this.alCerrar = alCerrar;
        this.activo = null;
        this.estado = '';
        this.tipo = '';
        this.repuestos = [];   // { referencia, descripcion, ubicacion }
        this.fotos = [];       // Blobs JPEG
        this.urlsFotos = [];

        this.el = {
            vista: $('#reportView'),
            codigo: $('#repCodigo'),
            id: $('#repId'),
            desc: $('#repDesc'),
            estado: $('#repEstado'),
            tipo: $('#repTipo'),
            hecho: $('#repHecho'),
            pendBox: $('#repPendBox'),
            pend: $('#repPend'),
            chips: $('#repRepuestos'),
            buscarRep: $('#repBuscarRep'),
            listaRep: $('#repRepLista'),
            fotos: $('#repFotos'),
            fotoInput: $('#repFotoInput'),
            tecnico: $('#repTecnico'),
        };

        const guardar = debounce(() => this.guardar(), 400);
        this.el.estado.addEventListener('click', e => {
            const b = e.target.closest('[data-v]');
            if (!b) return;
            this.estado = b.dataset.v;
            this.pintarBotones();
            guardar();
        });
        this.el.tipo.addEventListener('click', e => {
            const b = e.target.closest('[data-v]');
            if (!b) return;
            this.tipo = this.tipo === b.dataset.v ? '' : b.dataset.v;   // tocar de nuevo lo quita
            this.pintarBotones();
            guardar();
        });
        for (const campo of [this.el.hecho, this.el.pend, this.el.tecnico]) {
            campo.addEventListener('input', guardar);
        }

        // Repuestos: buscador en línea con los 6 mejores resultados del stock.
        this.el.buscarRep.addEventListener('input', debounce(() => this.buscarRepuesto(), 200));
        this.el.listaRep.addEventListener('click', e => {
            const b = e.target.closest('[data-i]');
            if (!b) return;
            const it = this.sugerencias[+b.dataset.i];
            if (!this.repuestos.some(r => r.referencia === it.referencia && r.ubicacion === it.ubicacion)) {
                this.repuestos.push({ referencia: it.referencia, descripcion: it.descripcion, ubicacion: it.ubicacion });
            }
            this.el.buscarRep.value = '';
            this.el.listaRep.innerHTML = '';
            this.pintarRepuestos();
            guardar();
        });
        this.el.chips.addEventListener('click', e => {
            const b = e.target.closest('[data-quitar]');
            if (!b) return;
            this.repuestos.splice(+b.dataset.quitar, 1);
            this.pintarRepuestos();
            guardar();
        });

        // Fotos
        this.el.fotoInput.addEventListener('change', async () => {
            const archivos = [...this.el.fotoInput.files];
            this.el.fotoInput.value = '';
            if (!archivos.length) return;
            toast(`Preparando ${archivos.length} foto${archivos.length === 1 ? '' : 's'}…`, 'info', 1500);
            for (const a of archivos) this.fotos.push(await reducirFoto(a));
            this.pintarFotos();
            this.guardar();
        });
        this.el.fotos.addEventListener('click', e => {
            const b = e.target.closest('[data-quitar]');
            if (!b) return;
            this.fotos.splice(+b.dataset.quitar, 1);
            this.pintarFotos();
            this.guardar();
        });

        $('#repEnviar').addEventListener('click', () => this.enviar());
        $('#repDescartar').addEventListener('click', () => this.descartar());
    }

    get clave() {
        return `informe-${this.activo.id}`;
    }

    /** Abre el informe del activo, recuperando el borrador si lo hay. */
    async abrir(activo) {
        this.activo = activo;
        this.el.codigo.textContent = activo.codigo;
        this.el.id.textContent = activo.id;
        this.el.desc.textContent = activo.desc;

        const b = await leerBorrador(this.clave).catch(() => null);
        this.estado = b?.estado || '';
        this.tipo = b?.tipo || '';
        this.el.hecho.value = b?.hecho || '';
        this.el.pend.value = b?.pend || '';
        this.el.tecnico.value = b?.tecnico || nombreDelTurno();
        this.repuestos = b?.repuestos || [];
        this.fotos = b?.fotos || [];
        this.el.buscarRep.value = '';
        this.el.listaRep.innerHTML = '';
        this.pintarBotones();
        this.pintarRepuestos();
        this.pintarFotos();

        this.el.vista.hidden = false;
        abrirCapa(() => this.cerrar());
        document.getElementById('qrPage').scrollTo({ top: 0 });
        if (b) toast('Borrador recuperado', 'info', 1800);
    }

    cerrar() {
        this.el.vista.hidden = true;
        this.limpiarUrlsFotos();
        this.alCerrar();
    }

    guardar() {
        if (!this.activo) return;
        guardarBorrador(this.clave, {
            estado: this.estado,
            tipo: this.tipo,
            hecho: this.el.hecho.value,
            pend: this.el.pend.value,
            tecnico: this.el.tecnico.value,
            repuestos: this.repuestos,
            fotos: this.fotos,
            hora: Date.now(),
        }).catch(e => console.warn('No se pudo guardar el borrador', e));
    }

    pintarBotones() {
        for (const [grupo, valor] of [[this.el.estado, this.estado], [this.el.tipo, this.tipo]]) {
            grupo.querySelectorAll('[data-v]').forEach(b => {
                const activo = b.dataset.v === valor;
                b.classList.toggle('on', activo);
                b.setAttribute('aria-checked', activo);
            });
        }
        this.el.pendBox.hidden = this.estado !== 'pend';
    }

    buscarRepuesto() {
        const q = this.el.buscarRep.value.trim();
        this.sugerencias = q.length < 2 ? [] : buscar(this.stockItems(), q).slice(0, 6);
        this.el.listaRep.innerHTML = this.sugerencias.map((it, i) => `
            <li><button type="button" data-i="${i}">
                <b class="mono">${escapeHtml(it.referencia)}</b> ${escapeHtml(it.descripcion)}
                <span class="loc mono">📍 ${escapeHtml(it.ubicacion)}</span>
            </button></li>`).join('')
            || (q.length >= 2 ? '<li class="mini-empty">Sin resultados</li>' : '');
    }

    pintarRepuestos() {
        this.el.chips.innerHTML = this.repuestos.map((r, i) => `
            <li><span><b class="mono">${escapeHtml(r.referencia)}</b> ${escapeHtml(r.descripcion)}</span>
                <button type="button" data-quitar="${i}" aria-label="Quitar repuesto">✕</button></li>`).join('');
    }

    pintarFotos() {
        this.limpiarUrlsFotos();
        this.urlsFotos = this.fotos.map(f => URL.createObjectURL(f));
        this.el.fotos.innerHTML = this.urlsFotos.map((u, i) => `
            <div class="photo"><img src="${u}" alt="Foto ${i + 1}">
                <button type="button" data-quitar="${i}" aria-label="Quitar foto">✕</button></div>`).join('');
    }

    limpiarUrlsFotos() {
        this.urlsFotos.forEach(u => URL.revokeObjectURL(u));
        this.urlsFotos = [];
    }

    /** Texto del mensaje, con el formato de WhatsApp (*negrita*). */
    componerTexto() {
        const a = this.activo;
        const ahora = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
        const l = [];
        l.push('📝 *INFORME DE TRABAJO*');
        l.push(this.estado === 'fin' ? '✅ *FINALIZADO*' : '⏳ *PENDIENTE PARA EL RELEVO*');
        if (this.tipo) l.push(`🔧 ${this.tipo}`);
        l.push('');
        l.push(`🏭 *${a.codigo}* (ID ${a.id})`);
        l.push(a.desc);
        l.push(`👷 ${this.el.tecnico.value.trim()} · ${ahora}`);
        if (this.el.hecho.value.trim()) {
            l.push('', '*Trabajo realizado:*', this.el.hecho.value.trim());
        }
        if (this.estado === 'pend' && this.el.pend.value.trim()) {
            l.push('', '*Pendiente:*', this.el.pend.value.trim());
        }
        if (this.repuestos.length) {
            l.push('', '*Repuestos usados:*');
            this.repuestos.forEach(r => l.push(`• ${r.referencia} — ${r.descripcion} (📍 ${r.ubicacion})`));
        }
        if (this.fotos.length) l.push('', `📷 ${this.fotos.length} foto${this.fotos.length === 1 ? '' : 's'} adjunta${this.fotos.length === 1 ? '' : 's'}`);
        if (this.estado === 'pend') {
            // Enlace que abre directamente el QR de este activo en la app del relevo.
            const url = new URL(location.pathname, location.origin);
            url.searchParams.set('activo', a.id);
            l.push('', `🔗 QR para cerrar el trabajo: ${url}`);
        }
        return l.join('\n');
    }

    /** Comprueba lo mínimo y abre el menú de compartir del móvil. */
    async enviar() {
        if (!this.estado) return this.aviso('Indica si el trabajo está finalizado o pendiente', this.el.estado);
        if (!this.el.hecho.value.trim() && !this.el.pend.value.trim()) {
            return this.aviso('Escribe qué se ha hecho', this.el.hecho);
        }
        if (!this.el.tecnico.value.trim()) return this.aviso('Escribe tu nombre', this.el.tecnico);
        recordarNombre(this.el.tecnico.value.trim());

        const texto = this.componerTexto();
        const archivos = this.fotos.map((f, i) =>
            new File([f], `${this.activo.codigo}-foto${i + 1}.jpg`.replace(/[^\w.\-]+/g, '_'), { type: 'image/jpeg' }));

        // Por si la app de destino no recoge el texto junto a las fotos: queda copiado para pegarlo.
        try { await navigator.clipboard.writeText(texto); } catch { /* sin permiso: no pasa nada */ }

        try {
            if (archivos.length && navigator.canShare?.({ files: archivos })) {
                await navigator.share({ files: archivos, text: texto });
            } else if (navigator.share) {
                await navigator.share({ text: texto });
            } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
            }
        } catch (e) {
            if (e.name === 'AbortError') return;   // el técnico cerró el menú: se conserva el borrador
            console.error(e);
            toast('No se pudo abrir el menú de compartir. El texto está copiado.', 'error', 4000);
            return;
        }

        await borrarBorrador(this.clave).catch(() => {});
        toast(archivos.length
            ? 'Informe enviado. Si no ves el texto junto a las fotos, pégalo: está copiado.'
            : 'Informe enviado', 'success', 4000);
        cerrarCapa();
    }

    aviso(texto, el) {
        toast(texto, 'error', 2500);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el.focus && el.tagName !== 'DIV') el.focus();
    }

    async descartar() {
        if (!confirm('¿Descartar este informe? Se borrará el borrador.')) return;
        await borrarBorrador(this.clave).catch(() => {});
        cerrarCapa();
    }
}
