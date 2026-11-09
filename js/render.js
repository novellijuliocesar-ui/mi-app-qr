// Dibujo de imágenes: tarjeta QR de un activo y listado de stock.
import { rectRedondeado, partirTexto, recortar } from './ui.js';

const AMARILLO = '#F2C200';
const OSCURO = '#1a1a2e';
const FUENTE = '-apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const MONO = '"SF Mono", Consolas, "Courier New", monospace';

function qrCanvas(texto, ancho) {
    return new Promise((resolve, reject) => {
        if (typeof QRCode === 'undefined') {
            reject(new Error('No se pudo cargar la librería de QR'));
            return;
        }
        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, String(texto), { width: ancho, margin: 0, errorCorrectionLevel: 'M' },
            err => (err ? reject(err) : resolve(canvas)));
    });
}

/**
 * Tarjeta de un activo. Se dibuja al doble de resolución para que se imprima nítida.
 * La altura se adapta a la longitud de la descripción.
 */
export async function dibujarTarjeta({ id, codigo, desc }) {
    const S = 2;               // escala
    const W = 400;
    const medir = document.createElement('canvas').getContext('2d');

    medir.font = `14px ${FUENTE}`;
    const lineasDesc = partirTexto(medir, desc, 296).slice(0, 6);
    medir.font = `bold 16px ${MONO}`;
    const lineasCod = partirTexto(medir, codigo, 320).slice(0, 2);

    const altoCod = lineasCod.length * 20 + 20;
    const altoDesc = lineasDesc.length * 19 + 24;
    const H = 20 + 48 + 16 + 236 + 16 + altoCod + 12 + altoDesc + 24;

    const canvas = document.createElement('canvas');
    canvas.width = W * S;
    canvas.height = H * S;
    const ctx = canvas.getContext('2d');
    ctx.scale(S, S);
    ctx.fillStyle = AMARILLO;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let y = 20;
    // ID
    ctx.font = `bold 28px ${MONO}`;
    const anchoId = ctx.measureText(id).width + 56;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    rectRedondeado(ctx, W / 2 - anchoId / 2, y, anchoId, 48, 24);
    ctx.fill();
    ctx.fillStyle = OSCURO;
    ctx.fillText(id, W / 2, y + 25);
    y += 48 + 16;

    // QR
    ctx.fillStyle = '#fff';
    rectRedondeado(ctx, W / 2 - 118, y, 236, 236, 20);
    ctx.fill();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(await qrCanvas(id, 200 * S), W / 2 - 100, y + 18, 200, 200);
    y += 236 + 16;

    // Código
    ctx.font = `bold 16px ${MONO}`;
    const anchoCod = Math.max(...lineasCod.map(l => ctx.measureText(l).width)) + 44;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    rectRedondeado(ctx, W / 2 - anchoCod / 2, y, anchoCod, altoCod, 20);
    ctx.fill();
    ctx.fillStyle = OSCURO;
    lineasCod.forEach((l, i) => ctx.fillText(l, W / 2, y + 20 + i * 20));
    y += altoCod + 12;

    // Descripción
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    rectRedondeado(ctx, 40, y, W - 80, altoDesc, 16);
    ctx.fill();
    ctx.font = `14px ${FUENTE}`;
    ctx.fillStyle = OSCURO;
    lineasDesc.forEach((l, i) => ctx.fillText(l, W / 2, y + 22 + i * 19));

    return canvas;
}

/**
 * Imagen con un listado de repuestos (para compartir por WhatsApp, etc.).
 * Incluye todas las filas hasta un máximo; si hay más, lo indica al final.
 */
export function dibujarListado(items, { titulo, subtitulo, max = 150 }) {
    const S = 2;
    const W = 900;
    const filas = items.slice(0, max);
    const sobran = items.length - filas.length;
    const altoFila = 30;
    const cols = [
        { t: 'Ubicación', x: 24, w: 170, mono: true, v: it => it.ubicacion },
        { t: 'Ref.', x: 200, w: 70, mono: true, bold: true, v: it => it.referencia },
        { t: 'Descripción', x: 276, w: 600, v: it => it.descripcion },
    ];
    const H = 96 + 34 + filas.length * altoFila + (sobran > 0 ? 34 : 0) + 40;

    const canvas = document.createElement('canvas');
    canvas.width = W * S;
    canvas.height = H * S;
    const ctx = canvas.getContext('2d');
    ctx.scale(S, S);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // Cabecera amarilla
    ctx.fillStyle = AMARILLO;
    ctx.fillRect(0, 0, W, 84);
    ctx.fillStyle = OSCURO;
    ctx.textBaseline = 'middle';
    ctx.font = `bold 24px ${FUENTE}`;
    ctx.fillText(titulo, 24, 32);
    ctx.font = `15px ${FUENTE}`;
    ctx.fillText(recortar(ctx, subtitulo, W - 48), 24, 62);

    // Cabecera de tabla
    let y = 96;
    ctx.fillStyle = OSCURO;
    ctx.fillRect(12, y, W - 24, 30);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 13px ${FUENTE}`;
    for (const c of cols) {
        ctx.textAlign = c.right ? 'right' : c.center ? 'center' : 'left';
        const x = c.right ? c.x + c.w : c.center ? c.x + c.w / 2 : c.x;
        ctx.fillText(c.t, x, y + 15);
    }
    y += 34;

    filas.forEach((it, i) => {
        if (i % 2 === 1) {
            ctx.fillStyle = '#f6f6f6';
            ctx.fillRect(12, y, W - 24, altoFila);
        }
        for (const c of cols) {
            const valor = c.v(it) || '—';
            ctx.font = `${c.bold ? 'bold ' : ''}13px ${c.mono ? MONO : FUENTE}`;
            ctx.fillStyle = '#222';
            ctx.textAlign = c.right ? 'right' : c.center ? 'center' : 'left';
            const x = c.right ? c.x + c.w : c.center ? c.x + c.w / 2 : c.x;
            ctx.fillText(recortar(ctx, valor, c.w), x, y + altoFila / 2);
        }
        y += altoFila;
    });

    ctx.textAlign = 'center';
    if (sobran > 0) {
        ctx.fillStyle = '#b26a00';
        ctx.font = `bold 14px ${FUENTE}`;
        ctx.fillText(`… y ${sobran} más (filtra o selecciona para incluirlos)`, W / 2, y + 17);
        y += 34;
    }
    ctx.fillStyle = '#999';
    ctx.font = `12px ${FUENTE}`;
    ctx.fillText(`Generado el ${new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`, W / 2, y + 20);
    return canvas;
}
