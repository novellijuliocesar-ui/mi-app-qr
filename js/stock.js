import { mostrarMensaje, debounce } from './utils.js';

// ========== DATOS DE EJEMPLO (FALLBACK) ==========

const DATOS_EJEMPLO = [
    {
        ubicacion: 'S1/A1/P1/H1/D1/F1',
        referencia: '45837',
        refFabricante: '82014647-00001',
        descripcion: 'Motor-reductor engranaje. cilindricos R47DRS80M4BE2',
        clasificacion: 'MOTORES',
        tipoUnidad: 'UD.',
        cantidad: 2
    },
    {
        ubicacion: 'S1/A1/P1/H1/D2/F1',
        referencia: '45838',
        refFabricante: '82013047-00001',
        descripcion: 'Motor-reductor engranaje. cilindricos R47DRS90M4BE2/Z',
        clasificacion: 'MOTORES',
        tipoUnidad: 'UD.',
        cantidad: 1
    }
];

// ========== GESTOR DE REPUESTOS (STOCK) ==========

class StockLoader {
    constructor() {
        this.datos = [];
        this.filtrados = [];
        this.estaCargando = false;
        this.categorias = [];
        this.usaEjemplo = false;
    }

    async cargar(ruta = './data/Almacen.xlsx') {
        if (this.estaCargando) return;
        this.estaCargando = true;

        try {
            const rutas = [
                ruta,
                '/mi-app-qr/data/Almacen.xlsx',
                './data/Almacen.xlsx',
                'data/Almacen.xlsx',
                '../data/Almacen.xlsx'
            ];

            let dataCargada = null;

            for (const testRuta of rutas) {
                try {
                    console.log('[StockLoader] Probando ruta:', testRuta);
                    const response = await fetch(testRuta);
                    if (response.ok) {
                        const data = await response.arrayBuffer();
                        dataCargada = data;
                        console.log('[StockLoader] ✅ Cargado desde:', testRuta);
                        break;
                    }
                } catch (e) {
                    console.warn('[StockLoader] Falló ruta:', testRuta);
                }
            }

            if (!dataCargada) {
                console.warn('[StockLoader] ⚠️ No se pudo cargar el Excel. Usando datos de ejemplo.');
                this.usaEjemplo = true;
                this.datos = [...DATOS_EJEMPLO];
                this.categorias = [...new Set(this.datos.map(item => item.clasificacion))].sort();
                this.estaCargando = false;
                mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (Excel no encontrado)`, 'info', 5000);
                return this.datos;
            }

            // LEER CON CABECERAS EN LA PRIMERA FILA
            const workbook = XLSX.read(dataCargada, { type: 'array' });
            const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(primeraHoja, { defval: '' });

            console.log('[StockLoader] 📊 Registros encontrados:', json.length);

            if (json.length === 0) {
                console.warn('[StockLoader] ⚠️ El archivo está vacío. Usando datos de ejemplo.');
                this.usaEjemplo = true;
                this.datos = [...DATOS_EJEMPLO];
                this.categorias = [...new Set(this.datos.map(item => item.clasificacion))].sort();
                this.estaCargando = false;
                mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (archivo vacío)`, 'info', 5000);
                return this.datos;
            }

            // Mostrar primer registro para depuración
            console.log('[StockLoader] 📄 Primer registro:', json[0]);
            console.log('[StockLoader] 📋 Columnas disponibles:', Object.keys(json[0]));

            // PROCESAR DATOS
            this.datos = [];

            for (const row of json) {
                const ubicacion = row.Ubicación || row['Ubicación'] || '';
                const referencia = row.Referencia || row['Referencia'] || '';
                const refFabricante = row['Referencia Fabricante'] || '';
                const descripcion = row.Descripción || row['Descripción'] || '';
                const clasificacion = row.Clasificación || row['Clasificación'] || '';
                const tipoUnidad = row['Tipo Unidad'] || 'UD.';
                const cantidad = parseFloat(row.Cantidad || row['Cantidad'] || 0);

                if (referencia || descripcion) {
                    this.datos.push({
                        ubicacion: String(ubicacion).trim(),
                        referencia: String(referencia).trim(),
                        refFabricante: String(refFabricante).trim(),
                        descripcion: String(descripcion).trim(),
                        clasificacion: String(clasificacion).trim(),
                        tipoUnidad: String(tipoUnidad).trim(),
                        cantidad: isNaN(cantidad) ? 0 : cantidad
                    });
                }
            }

            if (this.datos.length === 0) {
                console.warn('[StockLoader] ⚠️ No se procesaron datos del Excel. Usando datos de ejemplo.');
                this.usaEjemplo = true;
                this.datos = [...DATOS_EJEMPLO];
                mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (Excel vacío)`, 'info', 5000);
            } else {
                console.log(`[StockLoader] ✅ ${this.datos.length} repuestos procesados desde Excel`);
                mostrarMensaje(`✅ ${this.datos.length} repuestos cargados`, 'success', 3000);
            }

            this.categorias = [...new Set(this.datos.map(item => item.clasificacion).filter(c => c))].sort();
            this.estaCargando = false;
            return this.datos;

        } catch (error) {
            console.error('[StockLoader] ❌ Error:', error);
            this.usaEjemplo = true;
            this.datos = [...DATOS_EJEMPLO];
            this.categorias = [...new Set(this.datos.map(item => item.clasificacion))].sort();
            this.estaCargando = false;
            mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (error: ${error.message})`, 'info', 5000);
            return this.datos;
        }
    }

    buscar(termino, categoria = '') {
        if (!termino && !categoria) {
            this.filtrados = [];
            return [];
        }

        const busqueda = termino.toLowerCase().trim();
        
        this.filtrados = this.datos.filter(item => {
            if (!busqueda) {
                if (categoria && item.clasificacion !== categoria) return false;
                return true;
            }

            const cumpleBusqueda = 
                item.referencia.toLowerCase().includes(busqueda) ||
                item.refFabricante.toLowerCase().includes(busqueda) ||
                item.descripcion.toLowerCase().includes(busqueda) ||
                item.ubicacion.toLowerCase().includes(busqueda) ||
                item.clasificacion.toLowerCase().includes(busqueda);

            if (!cumpleBusqueda) return false;
            if (categoria && item.clasificacion !== categoria) return false;

            return true;
        });

        return this.filtrados;
    }

    obtenerDatos() {
        return this.filtrados;
    }

    obtenerCategorias() {
        return this.categorias;
    }
}

// ========== CONTROLADOR DE STOCK ==========

class StockApp {
    constructor() {
        this.loader = new StockLoader();
        this.datos = [];
        this.filtrados = [];
        this.busquedaRealizada = false;

        this.container = document.getElementById('stockPage');
        this.elements = {};
        this.messageEl = null;

        this.init();
    }

    async init() {
        this._buildUI();
        this._setupEventListeners();
        await this._cargarDatos();
        this._poblarFiltros();
    }

    _buildUI() {
        this.container.innerHTML = `
            <div class="stock-header">
                <h1>🔧 Búsqueda de Repuestos</h1>
                <p>Consulta el stock del almacén</p>
            </div>

            <div id="stockMessage" class="message" role="alert" aria-live="polite"></div>

            <div class="search-section">
                <label for="stockSearchInput">🔍 Buscar</label>
                <input 
                    type="text" 
                    id="stockSearchInput" 
                    placeholder="Buscar por referencia, fabricante, descripción o ubicación..." 
                    autocomplete="off"
                >
            </div>

            <div class="filters-section">
                <div class="filter-group">
                    <label for="categoryFilter">🏷️ Clasificación</label>
                    <select id="categoryFilter">
                        <option value="">-- Todas --</option>
                    </select>
                </div>
            </div>

            <button class="btn btn-primary" id="searchBtn">
                🔍 Buscar Repuestos
            </button>

            <div id="resultsContainer" style="display: none;">
                <div class="results-header">
                    <span id="resultsCount">0 resultados</span>
                    <button class="btn btn-secondary btn-small" id="clearResultsBtn">
                        ✖ Limpiar
                    </button>
                </div>
                <div class="stock-table-container" id="tableContainer">
                    <table class="stock-table">
                        <thead>
                            <tr>
                                <th>📍 Ubicación</th>
                                <th>Referencia</th>
                                <th>Fabricante</th>
                                <th>Descripción</th>
                                <th>Clasificación</th>
                                <th>Cantidad</th>
                            </tr>
                        </thead>
                        <tbody id="stockTableBody">
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
                                    Introduce un criterio de búsqueda y pulsa "Buscar"
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.elements = {
            searchInput: this.container.querySelector('#stockSearchInput'),
            categoryFilter: this.container.querySelector('#categoryFilter'),
            searchBtn: this.container.querySelector('#searchBtn'),
            clearBtn: this.container.querySelector('#clearResultsBtn'),
            resultsContainer: this.container.querySelector('#resultsContainer'),
            tableBody: this.container.querySelector('#stockTableBody'),
            resultsCount: this.container.querySelector('#resultsCount'),
        };
        this.messageEl = this.container.querySelector('#stockMessage');
    }

    _setupEventListeners() {
        this.elements.searchBtn.addEventListener('click', () => this._buscar());

        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this._buscar();
            }
        });

        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => this._limpiar());
        }
    }

    async _cargarDatos() {
        this._showMessage('📂 Cargando datos de repuestos...', 'info', 0);
        this.datos = await this.loader.cargar();
        if (this.loader.usaEjemplo) {
            this._showMessage(`⚠️ Usando datos de ejemplo (${this.datos.length} repuestos)`, 'info', 4000);
        }
    }

    _poblarFiltros() {
        const select = this.elements.categoryFilter;
        const categorias = this.loader.obtenerCategorias();
        
        select.innerHTML = '<option value="">-- Todas --</option>';
        categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            select.appendChild(opt);
        });
    }

    _buscar() {
        const termino = this.elements.searchInput.value;
        const categoria = this.elements.categoryFilter.value;

        if (!termino && !categoria) {
            this._showMessage('⚠️ Introduce un término de búsqueda o selecciona una categoría', 'info', 3000);
            return;
        }

        this.filtrados = this.loader.buscar(termino, categoria);
        this.busquedaRealizada = true;
        this._renderResultados();
    }

    _renderResultados() {
        const container = this.elements.resultsContainer;
        const tbody = this.elements.tableBody;
        const count = this.elements.resultsCount;

        container.style.display = 'block';

        if (this.filtrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
                        🔍 No se encontraron resultados
                        <br><span style="font-size: 0.8rem;">Prueba con otros términos de búsqueda</span>
                    </td>
                </tr>
            `;
            count.textContent = '0 resultados';
            return;
        }

        tbody.innerHTML = this.filtrados.map(item => {
            const cantidad = item.cantidad;
            const stockClass = cantidad > 10 ? 'high' : cantidad > 5 ? 'medium' : 'low';
            const unidad = item.tipoUnidad || 'UD.';

            return `
                <tr>
                    <td><code style="font-size: 0.7rem; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${item.ubicacion}</code></td>
                    <td><strong>${item.referencia}</strong></td>
                    <td style="font-size: 0.75rem; color: #666;">${item.refFabricante}</td>
                    <td>${item.descripcion.substring(0, 60)}${item.descripcion.length > 60 ? '...' : ''}</td>
                    <td><span style="font-size: 0.75rem; background: #e8e8e8; padding: 2px 8px; border-radius: 12px;">${item.clasificacion}</span></td>
                    <td><span class="stock-badge ${stockClass}">${cantidad} ${unidad}</span></td>
                </tr>
            `;
        }).join('');

        count.textContent = `${this.filtrados.length} resultados`;
        this._showMessage(`✅ ${this.filtrados.length} repuestos encontrados`, 'success', 2000);
    }

    _limpiar() {
        this.filtrados = [];
        this.busquedaRealizada = false;
        this.elements.searchInput.value = '';
        this.elements.categoryFilter.value = '';
        this.elements.resultsContainer.style.display = 'none';
        this._showMessage('🔄 Búsqueda limpiada', 'info', 2000);
    }

    _showMessage(texto, tipo = 'info', duration = 3000) {
        if (!this.messageEl) return;
        this.messageEl.textContent = texto;
        this.messageEl.className = `message message-${tipo}`;
        this.messageEl.style.display = 'block';
        
        if (duration > 0) {
            setTimeout(() => {
                this.messageEl.style.display = 'none';
            }, duration);
        }
    }
}

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.stockApp = new StockApp();
    }, 150);
});
