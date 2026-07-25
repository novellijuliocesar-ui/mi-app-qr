import { limpiarId, mostrarMensaje } from './utils.js';

// ========== GESTOR DE EXCEL ==========

export class ExcelLoader {
    constructor() {
        this.datos = [];
        this.filtrados = [];
        this.estaCargando = false;
        this.datosDeEjemplo = this._generarDatosEjemplo();
    }

    _generarDatosEjemplo() {
        return [
            { id: '162511', codigo: 'CD_SALLENT', desc: 'CENTRO DE DISTRIBUCIÓN SALLENT - STRADIVARIUS LOGÍSTICA' },
            { id: '162512', codigo: 'SISTEMAS LOGÍSTICOS', desc: 'SISTEMAS LOGÍSTICOS DE PRODUCCIÓN' },
            { id: '162513', codigo: 'INFRAESTRUCTURAS', desc: 'SISTEMAS DE INFRAESTRUCTURA' },
            { id: '162514', codigo: 'TALLER', desc: 'TALLER DE MANTENIMIENTO' },
            { id: '162515', codigo: 'ALMACEN', desc: 'ALMACÉN DE REPUESTOS' },
            { id: '182386', codigo: 'OFICINA TÉCNICA', desc: 'TRABAJOS OFICINA TÉCNICA' },
            { id: '193616', codigo: 'INSTALACION', desc: 'ARRANQUE Y PARADA INSTALACION' },
            { id: '162516', codigo: 'PAQUETERIA CAJAS', desc: 'TRANSPORTADORES PAQUETERÍA' },
            { id: '162517', codigo: 'PRENDA COLGADA', desc: 'TRANSPORTADORES PRENDA COLGADA' },
            { id: '162518', codigo: 'SILOS PAQUETERÍA', desc: 'TRANSELEVADORES PAQUETERÍA' },
            { id: '162519', codigo: 'SILOS DE PRENDA COLGADA', desc: 'TRANSELEVADORES PRENDA COLGADA' },
            { id: '162520', codigo: 'MULTISHUTTLE PAQUETERÍA', desc: 'MULTISHUTTLE PAQUETERÍA' },
            { id: '162521', codigo: 'MULTISHUTTLE PRENDA COLGADA', desc: 'MULTISHUTTLE PRENDA COLGADA' },
            { id: '162522', codigo: 'SORTER PAQUETERÍA', desc: 'CLASIFICADORES PAQUETERÍA' },
            { id: '162523', codigo: 'SORTER PRENDA COLGADA', desc: 'CLASIFICADORES PRENDA COLGADA' },
            { id: '162524', codigo: 'PAQUETERÍA PALETS', desc: 'TRANSPORTADORES PALETS' },
            { id: '162525', codigo: 'SILO PALETS', desc: 'TRANSELEVADORES PALETS' },
            { id: '178006', codigo: 'MAQUINAS AUXILIARES PAQUETERÍA', desc: 'MÁQUINAS AUXILIARES PAQUETERÍA' },
            { id: '178007', codigo: 'MAQUINAS AUXILIARES PRENDA COLGADA', desc: 'MÁQUINAS AUXILIARES PRENDA COLGADA' },
            { id: '222881', codigo: 'INFRA_ESTANT_ TEJIDOS', desc: 'Estanterías Tejidos' },
            { id: '222882', codigo: 'INFRA_ESTANT_ SSGG', desc: 'Estanterías Servicios Generales' },
        ];
    }

    async cargar(ruta = null) {
        if (this.estaCargando) return;
        this.estaCargando = true;

        // Obtener la ruta base actual
        const basePath = this._getBasePath();
        console.log('[ExcelLoader] Ruta base detectada:', basePath);

        // Lista de rutas a probar (con el nuevo nombre)
        const rutas = [
            ruta,
            './data/DOC-20251215-WA0003.xlsx',  // Un solo punto
            '/mi-app-qr/data/DOC-20251215-WA0003.xlsx',
            'data/DOC-20251215-WA0003.xlsx',
            './DOC-20251215-WA0003.xlsx',
            '/data/DOC-20251215-WA0003.xlsx',
            `${basePath}data/DOC-20251215-WA0003.xlsx`,
            `${basePath}DOC-20251215-WA0003.xlsx`,
        ].filter(r => r !== null);

        // Eliminar duplicados
        const rutasUnicas = [...new Set(rutas)];
        console.log('[ExcelLoader] Probando rutas:', rutasUnicas);

        // Intentar cada ruta
        for (const testRuta of rutasUnicas) {
            try {
                console.log('[ExcelLoader] Intentando:', testRuta);
                const response = await fetch(testRuta, { cache: 'no-cache' });
                
                if (response.ok) {
                    console.log('[ExcelLoader] ✅ Éxito en:', testRuta);
                    const data = await response.arrayBuffer();
                    this.estaCargando = false;
                    const resultado = this._procesarExcel(data);
                    if (resultado.length > 0) {
                        mostrarMensaje(`✅ ${resultado.length} activos cargados desde Excel`, 'success', 3000);
                        return resultado;
                    }
                } else {
                    console.warn('[ExcelLoader] ❌ Falló (HTTP', response.status, '):', testRuta);
                }
            } catch (e) {
                console.warn('[ExcelLoader] ❌ Error en:', testRuta, e.message);
            }
        }

        // Si llegamos aquí, no se pudo cargar el Excel
        console.log('[ExcelLoader] ⚠️ No se encontró el archivo Excel, usando datos de ejemplo');
        this.datos = [...this.datosDeEjemplo];
        this.filtrados = [];
        this.estaCargando = false;
        
        mostrarMensaje(
            `⚠️ No se encontró el archivo Excel. Usando ${this.datos.length} datos de ejemplo.`, 
            'info', 
            5000
        );
        return this.datos;
    }

    /**
     * Detecta la ruta base de la aplicación
     */
    _getBasePath() {
        const path = window.location.pathname;
        console.log('[ExcelLoader] Path actual:', path);
        
        // Si estamos en /mi-app-qr/ o similar
        if (path.includes('/mi-app-qr/')) {
            const match = path.match(/^(.*\/mi-app-qr\/)/);
            if (match) return match[1];
            return '/mi-app-qr/';
        }
        
        // Si estamos en la raíz
        if (path === '/' || path === '/index.html') {
            return '/';
        }
        
        // Si estamos en una subcarpeta (ej: /proyecto/)
        const match = path.match(/^(.*\/)[^\/]+$/);
        if (match) {
            return match[1];
        }
        
        return './';
    }

    _procesarExcel(data) {
        try {
            const workbook = XLSX.read(data, { type: 'array' });
            const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(primeraHoja);

            console.log('[ExcelLoader] Registros encontrados en Excel:', json.length);

            const datos = json
                .filter(r => r.ID_ACTIVO_ARBOL && r.CODIGO_IDENTIFICATIVO)
                .map(r => ({
                    id: limpiarId(r.ID_ACTIVO_ARBOL),
                    codigo: String(r.CODIGO_IDENTIFICATIVO).trim(),
                    desc: r.DESCRIPCION ? String(r.DESCRIPCION).trim() : 'Sin descripción'
                }));

            console.log('[ExcelLoader] Registros procesados:', datos.length);

            if (datos.length > 0) {
                this.datos = datos;
                this.filtrados = [];
                return datos;
            }
            return [];

        } catch (error) {
            console.error('[ExcelLoader] Error procesando Excel:', error);
            return [];
        }
    }

    filtrar(termino) {
        if (!termino || termino.trim() === '') {
            this.filtrados = [];
            return this.datos;
        }

        const busqueda = termino.toLowerCase().trim();
        this.filtrados = this.datos.filter(item =>
            item.id === busqueda ||
            item.id.includes(busqueda) ||
            item.codigo.toLowerCase().includes(busqueda) ||
            item.desc.toLowerCase().includes(busqueda)
        );

        return this.filtrados;
    }

    obtenerPorIndice(indice) {
        if (isNaN(indice) || indice < 0 || indice >= this.datos.length) {
            return null;
        }
        return this.datos[indice];
    }

    obtenerDatos() {
        return this.filtrados.length > 0 ? this.filtrados : this.datos;
    }
}
