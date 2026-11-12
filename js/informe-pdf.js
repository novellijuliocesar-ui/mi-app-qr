// PDF del informe de trabajo (se usa cuando el informe lleva fotos).
// Página 1: cabecera, QR del activo y el informe. Después, las fotos (dos por página).
// La librería jsPDF solo se descarga la primera vez que hace falta; luego queda guardada.
import { qrCanvas } from './render.js';

const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const AMARILLO = [242, 194, 0];
const OSCURO = [26, 26, 46];
const GRIS = [110, 110, 110];

let cargando;
function cargarJsPdf() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    cargando ??= new Promise((resolve, reject) => {
        const s = Object.assign(document.createElement('script'), { src: JSPDF_URL });
        s.onload = () => resolve(window.jspdf);
        s.onerror = () => {
            cargando = null;
            reject(new Error('No se pudo cargar el generador de PDF (¿sin conexión la primera vez?)'));
        };
        document.head.appendChild(s);
    });
    return cargando;
}

/** Descarga el generador en segundo plano (si falla, se reintentará al generar). */
export function precargarPdf() {
    cargarJsPdf().catch(() => {});
}

/** Las fuentes básicas del PDF solo tienen caracteres latinos: el resto se sustituye. */
const limpio = t => String(t ?? '').replace(/[^\n\x20-\x7E\xA0-\xFF€]/g, '');

function blobADataUrl(blob) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
    });
}

/**
 * @param {object} d  datos del informe: { tipo, estadoTexto, hecho, pendiente, activo, repuestos,
 *                    tecnico, fecha, fotos: Blob[] }
 * @returns {Promise<Blob>}
 */
export async function generarPdf(d) {
    const { jsPDF } = await cargarJsPdf();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 16, ANCHO = W - 2 * M;
    let y;

    // ---------- Cabecera ----------
    doc.setFillColor(...AMARILLO);
    doc.rect(0, 0, W, 30, 'F');
    doc.setTextColor(...OSCURO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(limpio(`Informe de trabajo${d.tipo ? ` · ${d.tipo}` : ''}`), M, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(limpio(`${d.fecha} · Técnico: ${d.tecnico}`), M, 22);

    // QR del activo arriba a la derecha (escaneable con la PDA desde el PDF)
    const qr = await qrCanvas(d.activo.id, 400);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W - M - 38, 36, 38, 38, 2, 2, 'F');
    doc.addImage(qr.toDataURL('image/png'), 'PNG', W - M - 35, 39, 32, 32);
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(limpio(`ID ${d.activo.id}`), W - M - 19, 79, { align: 'center' });

    y = 42;
    const anchoTexto = ANCHO - 44;   // a la izquierda del QR

    const titulo = (texto, ancho = ANCHO) => {
        nuevaPaginaSiHaceFalta(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...OSCURO);
        doc.text(limpio(texto).toUpperCase(), M, y);
        doc.setDrawColor(...AMARILLO);
        doc.setLineWidth(0.8);
        doc.line(M, y + 1.5, M + Math.min(ancho, 40), y + 1.5);
        y += 7;
    };
    const parrafo = (texto, ancho = ANCHO, tam = 11) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tam);
        doc.setTextColor(30, 30, 30);
        for (const linea of doc.splitTextToSize(limpio(texto), ancho)) {
            nuevaPaginaSiHaceFalta(6);
            doc.text(linea, M, y);
            y += tam * 0.45;
        }
        y += 4;
    };
    function nuevaPaginaSiHaceFalta(alto) {
        if (y + alto > H - 18) {
            doc.addPage();
            y = M + 6;
        }
    }

    // ---------- Contenido en el orden acordado ----------
    titulo('Trabajo realizado');
    parrafo(d.hecho || '—', anchoTexto);

    y = Math.max(y, 84);   // lo siguiente ya va por debajo del QR
    titulo('Estado');
    parrafo(d.estadoTexto);
    if (d.pendiente) {
        titulo('Queda pendiente');
        parrafo(d.pendiente);
    }

    titulo('Activo');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(limpio(`${d.activo.codigo}  (ID ${d.activo.id})`), M, y);
    y += 5.5;
    parrafo(d.activo.desc);

    if (d.repuestos.length) {
        titulo('Repuestos usados');
        for (const r of d.repuestos) {
            parrafo(`${r.referencia} · ${r.descripcion}\nUbicación: ${r.ubicacion}`, ANCHO, 10);
            y -= 2;
        }
        y += 2;
    }

    // ---------- Fotos: dos por página, ajustadas al espacio ----------
    if (d.fotos.length) {
        const altoHueco = (H - 2 * M - 20) / 2;
        for (let i = 0; i < d.fotos.length; i++) {
            if (i % 2 === 0) {
                doc.addPage();
                y = M;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(...OSCURO);
                doc.text(limpio(`Fotos · ${d.activo.codigo}`), M, y + 4);
                y += 10;
            }
            const img = await createImageBitmap(d.fotos[i]);
            const escala = Math.min(ANCHO / img.width, (altoHueco - 8) / img.height);
            const w = img.width * escala, h = img.height * escala;
            img.close();
            doc.addImage(await blobADataUrl(d.fotos[i]), 'JPEG', M + (ANCHO - w) / 2, y, w, h);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...GRIS);
            doc.text(`Foto ${i + 1} de ${d.fotos.length}`, W / 2, y + h + 4, { align: 'center' });
            y += altoHueco;
        }
    }

    // ---------- Pie con número de página ----------
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...GRIS);
        doc.text(limpio(`${d.activo.codigo} · ${d.fecha}`), M, H - 8);
        doc.text(`Página ${p} de ${total}`, W - M, H - 8, { align: 'right' });
    }

    return doc.output('blob');
}
