import { limpiarId, mostrarMensaje } from './utils.js';

// ========== GESTOR DE EXCEL ==========

export class ExcelLoader {
    constructor() {
        this.datos = [];
        this.filtrados = [];
        this.estaCargando = false;
    }

    /**
     * Carga el archivo Excel desde la ruta especificada
     */
    async cargar(ruta = './data/DOC-20251215-WA0003..xlsx') {
        if (this.estaCargando) return;
        this.estaCargando = true;

        try {
            mostrarMensaje('Cargando archivo Excel...', 'info', 0);
            
            const response = await fetch(ruta);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: No se pudo cargar el archivo`);
            }

            const data = await response.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(primeraHoja);

            this.datos = json
                .filter(r => r.ID_ACTIVO_ARBOL && r.CODIGO_IDENTIFICATIVO)
                .map(r => ({
                    id: limpiarId(r.ID_ACTIVO_ARBOL),
                    codigo: String(r.CODIGO_IDENTIFICATIVO).trim(),
                    desc: r.DESCRIPCION ? String(r.DESCRIPCION).trim() : 'Sin descripción'
                }));

            this.filtrados = [];
            this.estaCargando = false;

            mostrarMensaje(`✅ ${this.datos.length} activos cargados correctamente`, 'success');
            return this.datos;

        } catch (error) {
            this.estaCargando = false;
            console.error('Error al cargar Excel:', error);
            mostrarMensaje(`⚠️ Error: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Filtra los datos según un término de búsqueda
     */
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

    /**
     * Obtiene un elemento por su índice original
     */
    obtenerPorIndice(indice) {
        if (isNaN(indice) || indice < 0 || indice >= this.datos.length) {
            return null;
        }
        return this.datos[indice];
    }

    /**
     * Obtiene todos los datos (usando filtro si existe)
     */
    obtenerDatos() {
        return this.filtrados.length > 0 ? this.filtrados : this.datos;
    }
}
