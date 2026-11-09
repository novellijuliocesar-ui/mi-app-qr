// Carga y lectura de los dos Excel, y motor de búsqueda.
import { normalizar } from './ui.js';

export const ARCHIVOS = {
    activos: './data/DOC-20251215-WA0003.xlsx',
    stock: './data/Almacen.xlsx',
};

/** Descarga un Excel y devuelve sus filas como objetos { cabecera: valor }. */
async function leerExcel(ruta, columnasClave) {
    if (typeof XLSX === 'undefined') {
        throw new Error('No se pudo cargar la librería de Excel (¿sin conexión la primera vez?)');
    }
    const resp = await fetch(ruta, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`No se encontró ${ruta.split('/').pop()} (HTTP ${resp.status})`);

    const libro = XLSX.read(await resp.arrayBuffer(), { type: 'array', cellDates: false });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', raw: true });

    // La fila de cabeceras es la primera (de las 10 primeras) que contiene las columnas clave.
    const clavesNorm = columnasClave.map(normalizar);
    const idxCab = filas.slice(0, 10).findIndex(f => {
        const celdas = f.map(normalizar);
        return clavesNorm.every(c => celdas.includes(c));
    });
    if (idxCab < 0) {
        throw new Error(`El Excel no tiene las columnas esperadas: ${columnasClave.join(', ')}`);
    }

    const cabeceras = filas[idxCab].map(normalizar);
    const registros = filas.slice(idxCab + 1)
        .filter(f => f.some(c => c !== ''))
        .map(f => Object.fromEntries(cabeceras.map((c, i) => [c, f[i]])));

    // El service worker marca la respuesta cuando no hay red y usa la última copia guardada.
    return { registros, copiaGuardada: resp.headers.get('X-Copia-Guardada') === '1' };
}

const texto = v => String(v ?? '').replace(/\s+/g, ' ').trim();

// ---------- Activos (tarjetas QR) ----------
export async function cargarActivos() {
    const { registros, copiaGuardada } = await leerExcel(ARCHIVOS.activos,
        ['ID_ACTIVO_ARBOL', 'CODIGO_IDENTIFICATIVO']);

    const items = registros
        .filter(r => r['id activo arbol'] !== '' && r['codigo identificativo'] !== '')
        .map(r => ({
            id: texto(r['id activo arbol']).replace(/\.0+$/, ''),
            codigo: texto(r['codigo identificativo']),
            desc: texto(r['descripcion']) || 'Sin descripción',
        }));
    return { items: indexar(items, it => [it.id, it.codigo, it.desc]), copiaGuardada };
}

// ---------- Stock ----------

export async function cargarStock() {
    const { registros, copiaGuardada } = await leerExcel(ARCHIVOS.stock, ['Ubicación', 'Referencia']);

    const items = registros
        .map(r => ({
            ubicacion: texto(r['ubicacion']),
            referencia: texto(r['referencia']),
            refFabricante: texto(r['referencia fabricante']),
            descripcion: texto(r['descripcion']),
            clasificacion: texto(r['clasificacion']),
            modificado: texto(r['ult modific']),
        }))
        .filter(it => it.referencia || it.descripcion);

    // Una misma referencia puede estar en varias ubicaciones: cada registro conoce las demás.
    const porReferencia = new Map();
    for (const it of items) {
        if (!it.referencia) continue;
        if (!porReferencia.has(it.referencia)) porReferencia.set(it.referencia, []);
        porReferencia.get(it.referencia).push(it);
    }
    for (const it of items) {
        const otras = (porReferencia.get(it.referencia) || [])
            .filter(o => o !== it && o.ubicacion && o.ubicacion !== it.ubicacion)
            .map(o => o.ubicacion);
        Object.defineProperty(it, 'otrasUbicaciones', { value: [...new Set(otras)] });
    }

    // Fecha del último movimiento registrado en el propio Excel (dd/mm/aaaa).
    const ultima = items.reduce((max, it) => {
        const m = it.modificado.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!m) return max;
        const iso = `${m[3]}-${m[2]}-${m[1]}`;
        return iso > max ? iso : max;
    }, '');

    const categorias = [...new Set(items.map(it => it.clasificacion).filter(Boolean))].sort();
    return {
        items: indexar(items, it => [it.referencia, it.refFabricante, it.descripcion, it.ubicacion, it.clasificacion]),
        categorias,
        ultimaFecha: ultima ? ultima.split('-').reverse().join('/') : null,
        copiaGuardada,
    };
}

// ---------- Búsqueda ----------

/** Precalcula el texto normalizado de cada registro para que buscar sea instantáneo. */
function indexar(items, campos) {
    for (const it of items) {
        const valores = campos(it);
        Object.defineProperty(it, '_texto', { value: ` ${valores.map(normalizar).join(' ')} ` });
        Object.defineProperty(it, '_claves', { value: valores.slice(0, 2).map(v => normalizar(v)) });
    }
    return items;
}

/**
 * Busca registros que contengan TODAS las palabras, en cualquier campo y orden,
 * sin importar mayúsculas ni acentos. Si la búsqueda tiene "/", se trata como
 * ubicación y devuelve las que empiecen por ese texto (p. ej. "S1/A13/").
 * Devuelve los resultados ordenados por relevancia.
 */
export function buscar(items, consulta, filtro = () => true) {
    const q = normalizar(consulta);
    const palabras = q.split(' ').filter(Boolean);
    const prefijoUbic = consulta.includes('/') ? consulta.trim().toUpperCase() : null;

    const res = [];
    for (const it of items) {
        if (!filtro(it)) continue;
        if (prefijoUbic) {
            if (it.ubicacion?.toUpperCase().startsWith(prefijoUbic)) res.push({ it, puntos: 1 });
            continue;
        }
        if (palabras.length && !palabras.every(p => it._texto.includes(p))) continue;
        res.push({ it, puntos: puntuar(it, q, palabras) });
    }
    return res.sort((a, b) => b.puntos - a.puntos).map(r => r.it);
}

function puntuar(it, q, palabras) {
    if (!q) return 0;
    const [clave1, clave2] = it._claves;
    if (clave1 === q || clave2 === q) return 100;          // coincidencia exacta de ID/código/referencia
    if (clave1.startsWith(q) || clave2.startsWith(q)) return 50;
    // Palabras completas puntúan más que trozos de palabra.
    return palabras.reduce((s, p) => s + (it._texto.includes(` ${p} `) ? 2 : 1), 0);
}
