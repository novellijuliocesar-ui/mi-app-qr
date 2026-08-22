import { mostrarMensaje, debounce, sanitizarNombre } from './utils.js';

// ========== FUNCIÓN DE NORMALIZACIÓN DE TEXTO ==========

function normalizarTexto(texto) {
    if (!texto) return '';
    return String(texto)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ========== GENERADOR DE IMAGEN DE RESULTADOS ==========

class ResultsRenderer {
    static async generarImagen(resultados, termino = '', categoria = '', titulo = 'Resultados de Búsqueda') {
        return new Promise((resolve, reject) => {
            try {
                if (!resultados || !Array.isArray(resultados) || resultados.length === 0) {
                    reject(new Error('No hay resultados para mostrar'));
                    return;
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const maxWidth = 800;
                const padding = 15;
                const rowHeight = 30;
                const headerHeight = 45;
                const titleHeight = 50;
                
                const resultsCount = Math.min(resultados.length, 50);
                const totalHeight = titleHeight + headerHeight + (resultsCount * rowHeight) + padding * 2 + 45;
                
                canvas.width = maxWidth;
                canvas.height = totalHeight;
                
                const gradiente = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradiente.addColorStop(0, '#F2C200');
                gradiente.addColorStop(0.3, '#F5D530');
                gradiente.addColorStop(1, '#1a1a2e');
                ctx.fillStyle = gradiente;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
                ResultsRenderer._dibujarRectRedondeado(ctx, padding, padding, canvas.width - padding * 2, canvas.height - padding * 2, 16);
                ctx.fill();
                
                let y = padding + 10;
                
                ctx.fillStyle = '#1a1a2e';
                ctx.font = 'bold 16px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`📦 ${titulo}`, canvas.width / 2, y + 16);
                y += 28;
                
                ctx.font = '11px "Segoe UI", sans-serif';
                ctx.fillStyle = '#666';
                let subtitulo = `🔍 ${resultados.length} elementos`;
                if (termino) subtitulo += ` - "${termino}"`;
                if (categoria) subtitulo += ` - ${categoria}`;
                ctx.fillText(subtitulo, canvas.width / 2, y + 10);
                y += 25;
                
                ctx.strokeStyle = '#e0e0e0';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(padding + 12, y);
                ctx.lineTo(canvas.width - padding - 12, y);
                ctx.stroke();
                y += 8;
                
                ctx.fillStyle = '#1a1a2e';
                ctx.font = 'bold 10px "Courier New", monospace';
                ctx.textAlign = 'left';
                
                const textos = ['📍 Ubicación', 'Referencia', 'Descripción'];
                const xInicial = padding + 12;
                const colWidths = [200, 120, 420];
                
                let x = xInicial;
                textos.forEach((text, i) => {
                    ctx.fillStyle = i === 0 ? '#1a1a2e' : i === 1 ? '#F2C200' : '#1a1a2e';
                    ctx.fillText(text, x, y + 10);
                    x += colWidths[i];
                });
                y += 16;
                
                ctx.strokeStyle = '#1a1a2e';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(xInicial, y - 4);
                ctx.lineTo(xInicial + colWidths.reduce((a, b) => a + b, 0), y - 4);
                ctx.stroke();
                
                const maxDisplay = Math.min(resultados.length, 50);
                ctx.font = '9px "Segoe UI", sans-serif';
                
                for (let i = 0; i < maxDisplay; i++) {
                    const item = resultados[i];
                    if (!item) continue;
                    
                    x = xInicial;
                    
                    ctx.fillStyle = '#333';
                    ctx.textAlign = 'left';
                    let texto = item.ubicacion || '—';
                    if (texto.length > 30) texto = texto.substring(0, 29) + '…';
                    ctx.fillText(texto, x, y + 9);
                    x += colWidths[0];
                    
                    ctx.fillStyle = '#1a1a2e';
                    ctx.font = 'bold 9px "Courier New", monospace';
                    texto = item.referencia || '—';
                    if (texto.length > 15) texto = texto.substring(0, 14) + '…';
                    ctx.fillText(texto, x, y + 9);
                    x += colWidths[1];
                    ctx.font = '9px "Segoe UI", sans-serif';
                    
                    ctx.fillStyle = '#333';
                    ctx.font = '9px "Segoe UI", sans-serif';
                    texto = item.descripcion || '—';
                    if (texto.length > 55) texto = texto.substring(0, 54) + '…';
                    ctx.fillText(texto, x, y + 9);
                    
                    y += rowHeight;
                }
                
                y += 8;
                ctx.fillStyle = 'rgba(26, 26, 46, 0.4)';
                ctx.font = '8px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                const fecha = new Date().toLocaleDateString('es-ES', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                ctx.fillText(`Generado: ${fecha} · mi-app-qr`, canvas.width / 2, y + 8);
                
                resolve(canvas.toDataURL('image/png'));
            } catch (error) {
                console.error('[ResultsRenderer] Error:', error);
                reject(error);
            }
        });
    }
    
    static _dibujarRectRedondeado(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

// ========== DATOS DE EJEMPLO ==========

const DATOS_EJEMPLO = [
    {
        ubicacion: 'S1/A1/P1/H1/D1/F1',
        referencia: '45837',
        descripcion: 'Motor-reductor engranaje. cilindricos R47DRS80M4BE2',
        clasificacion: 'MOTORES'
    },
    {
        ubicacion: 'S1/A1/P1/H1/D2/F1',
        referencia: '45838',
        descripcion: 'Motor-reductor engranaje. cilindricos R47DRS90M4BE2/Z',
        clasificacion: 'MOTORES'
    },
    {
        ubicacion: 'S1/A1/P1/H1/D4/F1',
        referencia: '21034',
        descripcion: 'MOTORREDUCTOR R67 DT90L4 1,5 KW 1410/27 REV/MIN',
        clasificacion: 'MOTORES'
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
        this.datosNormalizados = [];
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
                this._normalizarDatos();
                this.categorias = [...new Set(this.datos.map(item => item.clasificacion))].sort();
                this.estaCargando = false;
                mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (Excel no encontrado)`, 'info', 5000);
                return this.datos;
            }

            const workbook = XLSX.read(dataCargada, { type: 'array' });
            const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
            const filas = XLSX.utils.sheet_to_json(primeraHoja, { 
                defval: '',
                header: 1
            });

            console.log('[StockLoader] 📊 Total de filas en Excel:', filas.length);

            if (filas.length < 2) {
                console.warn('[StockLoader] ⚠️ El archivo tiene menos de 2 filas. Usando datos de ejemplo.');
                this.usaEjemplo = true;
                this.datos = [...DATOS_EJEMPLO];
                this._normalizarDatos();
                this.categorias = [...new Set(this.datos.map(item => item.clasificacion))].sort();
                this.estaCargando = false;
                mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (archivo sin datos)`, 'info', 5000);
                return this.datos;
            }

            let cabeceras = null;
            let inicioDatos = 0;

            const primeraFila = filas[0] || [];
            const esTitulo = primeraFila.some(celda => 
                typeof celda === 'string' && 
                (celda.includes('Listado') || celda.includes('mapa') || celda.includes('almacén'))
            );

            if (esTitulo) {
                cabeceras = filas[1] || [];
                inicioDatos = 2;
                console.log('[StockLoader] 📋 Cabeceras encontradas en fila 2:', cabeceras);
            } else {
                cabeceras = filas[0] || [];
                inicioDatos = 1;
                console.log('[StockLoader] 📋 Cabeceras encontradas en fila 1:', cabeceras);
            }

            const idxUbicacion = cabeceras.indexOf('Ubicación');
            const idxReferencia = cabeceras.indexOf('Referencia');
            const idxDescripcion = cabeceras.indexOf('Descripción');
            const idxClasificacion = cabeceras.indexOf('Clasificación');

            this.datos = [];

            for (let i = inicioDatos; i < filas.length; i++) {
                const row = filas[i];
                if (!row || row.length === 0) continue;

                const ubicacion = idxUbicacion >= 0 ? String(row[idxUbicacion] || '').trim() : '';
                const referencia = idxReferencia >= 0 ? String(row[idxReferencia] || '').trim() : '';
                const descripcion = idxDescripcion >= 0 ? String(row[idxDescripcion] || '').trim() : '';
                const clasificacion = idxClasificacion >= 0 ? String(row[idxClasificacion] || '').trim() : '';

                if (referencia || descripcion) {
                    this.datos.push({
                        ubicacion: ubicacion || '—',
                        referencia: referencia || '—',
                        descripcion: descripcion || '—',
                        clasificacion: clasificacion || '—'
                    });
                }
            }

            if (this.datos.length === 0) {
                console.warn('[StockLoader] ⚠️ No se procesaron datos del Excel. Usando datos de ejemplo.');
                this.usaEjemplo = true;
                this.datos = [...DATOS_EJEMPLO];
                this._normalizarDatos();
                mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (Excel vacío)`, 'info', 5000);
            } else {
                this._normalizarDatos();
                console.log(`[StockLoader] ✅ ${this.datos.length} repuestos procesados desde Excel`);
                mostrarMensaje(`✅ ${this.datos.length} repuestos cargados`, 'success', 3000);
            }

            this.categorias = [...new Set(this.datos.map(item => item.clasificacion).filter(c => c && c !== '—'))].sort();
            this.estaCargando = false;
            return this.datos;

        } catch (error) {
            console.error('[StockLoader] ❌ Error:', error);
            this.usaEjemplo = true;
            this.datos = [...DATOS_EJEMPLO];
            this._normalizarDatos();
            this.categorias = [...new Set(this.datos.map(item => item.clasificacion))].sort();
            this.estaCargando = false;
            mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (error: ${error.message})`, 'info', 5000);
            return this.datos;
        }
    }

    _normalizarDatos() {
        if (!this.datos || this.datos.length === 0) {
            this.datosNormalizados = [];
            return;
        }
        
        this.datosNormalizados = this.datos.map(item => ({
            ...item,
            _normalizado: {
                ubicacion: normalizarTexto(item.ubicacion || ''),
                referencia: normalizarTexto(item.referencia || ''),
                descripcion: normalizarTexto(item.descripcion || ''),
                clasificacion: normalizarTexto(item.clasificacion || ''),
                _original: { ...item }
            }
        }));
    }

    buscar(termino, categoria = '') {
        if (!this.datos || this.datos.length === 0) {
            this.filtrados = [];
            return [];
        }

        if (!this.datosNormalizados || this.datosNormalizados.length === 0) {
            this.filtrados = [];
            return [];
        }

        const busquedaNormalizada = normalizarTexto(termino);
        const categoriaNormalizada = normalizarTexto(categoria);

        const resultados = this.datosNormalizados
            .filter(item => {
                const norm = item._normalizado;
                if (!norm) return false;

                if (busquedaNormalizada) {
                    const cumpleBusqueda = 
                        (norm.referencia || '').includes(busquedaNormalizada) ||
                        (norm.descripcion || '').includes(busquedaNormalizada) ||
                        (norm.ubicacion || '').includes(busquedaNormalizada);
                    if (!cumpleBusqueda) return false;
                }

                if (categoriaNormalizada) {
                    if ((norm.clasificacion || '') !== categoriaNormalizada) return false;
                }

                return true;
            })
            .map(item => {
                const original = item._original || item;
                return {
                    ubicacion: original.ubicacion || '—',
                    referencia: original.referencia || '—',
                    descripcion: original.descripcion || '—',
                    clasificacion: original.clasificacion || '—'
                };
            });

        this.filtrados = resultados;
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
        this.terminoBusqueda = '';
        this.categoriaBusqueda = '';
        this.cachedImage = null;
        this._ultimaOrden = null;
        this._ordenAscendente = true;
        this.scrollThreshold = 300;

        // ===== Estado de selección =====
        this.seleccionados = new Set();
        this.modoSeleccion = false;
        this.longPressTimer = null;
        this.pressStartX = 0;
        this.pressStartY = 0;

        this.container = document.getElementById('stockPage');
        this.elements = {};

        this.init();
    }

    async init() {
        this._buildUI();
        await this._cargarDatos();
        this._poblarFiltros();
        this._setupEventListeners();
        
        const wrapper = this.container.querySelector('.stock-wrapper');
        if (wrapper) {
            wrapper.classList.add('centered');
        }
    }

    _buildUI() {
        this.container.innerHTML = `
            <div class="stock-wrapper centered">
                <!-- ====== PANTALLA DE BÚSQUEDA ====== -->
                <div id="searchScreen" class="stock-card">
                    <div class="stock-header">
                        <h1>🔧 Búsqueda de Repuestos</h1>
                        <p>Consulta el stock del almacén</p>
                    </div>

                    <div class="stock-search-section">
                        <label for="stockSearchInput">🔍 Buscar</label>
                        <input 
                            type="text" 
                            id="stockSearchInput" 
                            placeholder="Buscar por referencia, descripción o ubicación..." 
                            autocomplete="off"
                        >
                    </div>

                    <div class="stock-filters-section">
                        <div class="stock-filter-group">
                            <label for="categoryFilter">🏷️ Clasificación</label>
                            <select id="categoryFilter">
                                <option value="">-- Todas --</option>
                            </select>
                        </div>
                    </div>

                    <button class="stock-btn stock-btn-primary" id="searchBtn">
                        🔍 Buscar Repuestos
                    </button>
                </div>

                <!-- ====== PANTALLA DE RESULTADOS ====== -->
                <div id="resultsScreen" class="stock-card" style="display: none;">
                    <div class="stock-header" style="text-align: center; padding: 15px;">
                        <h1 style="margin: 0; font-size: 1.2rem;">📊 Resultados de Búsqueda</h1>
                        <p id="resultsSubtitle" style="margin: 4px 0 10px 0; font-size: 0.8rem;">0 resultados encontrados</p>
                        
                        <!-- ====== BARRA DE SELECCIÓN (SOLO CONTADOR + BOTÓN LIMPIAR) ====== -->
                        <div id="selectionBar" style="display: none; background: rgba(26,26,46,0.9); border-radius: 12px; padding: 8px 15px; margin: 8px 0; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
                            <span id="selectionCount" style="color: white; font-size: 0.85rem; font-weight: 600;">0 seleccionados</span>
                            <button class="btn btn-small btn-back" id="clearSelectionBtn" style="padding: 4px 14px; font-size: 0.7rem; margin: 0; background: #dc3545; border-radius: 8px;">
                                ✕ Limpiar
                            </button>
                        </div>

                        <!-- ====== BOTONES DE ACCIÓN (ARRIBA) ====== -->
                        <div class="action-buttons-top" id="actionButtonsTop" style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; justify-content: center; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 10px;">
                            <button class="btn btn-small btn-secondary" id="downloadImageBtnTop" style="padding: 6px 12px; font-size: 0.7rem; margin: 0; flex: 1; min-width: 80px;">
                                📥 Descargar
                            </button>
                            <button class="btn btn-small btn-success" id="shareImageBtnTop" style="padding: 6px 12px; font-size: 0.7rem; margin: 0; flex: 1; min-width: 80px;">
                                📤 Compartir
                            </button>
                            <button class="btn btn-small btn-back" id="newSearchBtnTop" style="padding: 6px 12px; font-size: 0.7rem; margin: 0; flex: 1; min-width: 80px;">
                                ◀ Nueva
                            </button>
                        </div>
                    </div>

                    <div class="stock-table-container" id="tableContainer">
                        <div id="resultsTableWrapper" style="overflow-x: auto;">
                            <table class="stock-table" id="resultsTable">
                                <thead>
                                    <tr>
                                        <th style="width: 30px; text-align: center; display: none;" id="checkboxHeader">
                                            <input type="checkbox" id="selectAllCheckbox" style="cursor: pointer; width: 16px; height: 16px; accent-color: #F2C200;">
                                        </th>
                                        <th data-sort="ubicacion" style="cursor: pointer;">📍 Ubicación</th>
                                        <th data-sort="referencia" style="cursor: pointer;">Referencia</th>
                                        <th data-sort="descripcion" style="cursor: pointer;">Descripción</th>
                                    </tr>
                                </thead>
                                <tbody id="resultsTableBody">
                                    <tr>
                                        <td colspan="4" style="text-align: center; padding: 40px; color: #999;">
                                            No hay resultados para mostrar
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- ====== BOTÓN VOLVER ARRIBA ====== -->
                <button id="scrollTopBtn" class="scroll-top-btn" style="display: none;" title="Volver arriba">
                    ⬆
                </button>
            </div>
        `;

        this.elements = {
            searchScreen: this.container.querySelector('#searchScreen'),
            resultsScreen: this.container.querySelector('#resultsScreen'),
            resultsSubtitle: this.container.querySelector('#resultsSubtitle'),
            resultsTableBody: this.container.querySelector('#resultsTableBody'),
            resultsTable: this.container.querySelector('#resultsTable'),
            resultsTableWrapper: this.container.querySelector('#resultsTableWrapper'),
            searchInput: this.container.querySelector('#stockSearchInput'),
            categoryFilter: this.container.querySelector('#categoryFilter'),
            searchBtn: this.container.querySelector('#searchBtn'),
            downloadImageBtnTop: this.container.querySelector('#downloadImageBtnTop'),
            shareImageBtnTop: this.container.querySelector('#shareImageBtnTop'),
            newSearchBtnTop: this.container.querySelector('#newSearchBtnTop'),
            actionButtonsTop: this.container.querySelector('#actionButtonsTop'),
            scrollTopBtn: this.container.querySelector('#scrollTopBtn'),
            // Elementos de selección
            selectionBar: this.container.querySelector('#selectionBar'),
            selectionCount: this.container.querySelector('#selectionCount'),
            selectAllCheckbox: this.container.querySelector('#selectAllCheckbox'),
            checkboxHeader: this.container.querySelector('#checkboxHeader'),
            clearSelectionBtn: this.container.querySelector('#clearSelectionBtn'),
        };
    }

    _setupEventListeners() {
        if (this.elements.searchBtn) {
            this.elements.searchBtn.addEventListener('click', () => this._buscar());
        }
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this._buscar();
            });
        }

        if (this.elements.downloadImageBtnTop) {
            this.elements.downloadImageBtnTop.addEventListener('click', () => this._descargarImagen());
        }
        if (this.elements.shareImageBtnTop) {
            this.elements.shareImageBtnTop.addEventListener('click', () => this._compartirImagen());
        }
        if (this.elements.newSearchBtnTop) {
            this.elements.newSearchBtnTop.addEventListener('click', () => this._volver());
        }

        // ===== Eventos de selección =====
        if (this.elements.selectAllCheckbox) {
            this.elements.selectAllCheckbox.addEventListener('change', (e) => {
                this._seleccionarTodos(e.target.checked);
            });
        }

        if (this.elements.clearSelectionBtn) {
            this.elements.clearSelectionBtn.addEventListener('click', () => this._limpiarSeleccion());
        }

        // ===== Click en checkbox de fila =====
        if (this.elements.resultsTable) {
            this.elements.resultsTable.addEventListener('click', (e) => {
                // Ordenar
                const th = e.target.closest('th[data-sort]');
                if (th) {
                    this._ordenarPor(th.dataset.sort);
                    return;
                }

                // Checkbox de fila - SOLO funciona si estamos en modo selección
                const checkbox = e.target.closest('input[type="checkbox"][data-index]');
                if (checkbox) {
                    if (!this.modoSeleccion) return;
                    const index = parseInt(checkbox.dataset.index);
                    this._toggleSeleccion(index);
                    e.stopPropagation();
                }
            });
        }

        // ===== LONG PRESS: Activar modo selección =====
        if (this.elements.resultsTableBody) {
            // Eventos táctiles
            this.elements.resultsTableBody.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: true });
            this.elements.resultsTableBody.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: true });
            this.elements.resultsTableBody.addEventListener('touchend', (e) => this._handleTouchEnd(e), { passive: true });
            this.elements.resultsTableBody.addEventListener('touchcancel', (e) => this._handleTouchEnd(e), { passive: true });

            // Eventos de ratón
            this.elements.resultsTableBody.addEventListener('mousedown', (e) => this._handleMouseDown(e));
            this.elements.resultsTableBody.addEventListener('mouseup', (e) => this._handleMouseUp(e));
            this.elements.resultsTableBody.addEventListener('mouseleave', (e) => this._handleMouseLeave(e));
        }

        // Scroll
        if (this.elements.resultsTableWrapper) {
            this.elements.resultsTableWrapper.addEventListener('scroll', () => this._handleScroll());
        }

        if (this.elements.scrollTopBtn) {
            this.elements.scrollTopBtn.addEventListener('click', () => this._scrollToTop());
        }
    }

    // ===== LONG PRESS - Manejo táctil =====
    _handleTouchStart(e) {
        if (this.modoSeleccion) return;
        
        const touch = e.touches[0];
        const row = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('tr[data-index]');
        if (!row) return;

        const index = parseInt(row.dataset.index);
        if (isNaN(index)) return;

        this.pressStartX = touch.clientX;
        this.pressStartY = touch.clientY;
        
        this.longPressTimer = setTimeout(() => {
            this._activarModoSeleccion(index);
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        }, 500);
    }

    _handleTouchMove(e) {
        if (this.longPressTimer) {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - this.pressStartX);
            const dy = Math.abs(touch.clientY - this.pressStartY);
            if (dx > 10 || dy > 10) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }
    }

    _handleTouchEnd(e) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
    }

    // ===== LONG PRESS - Manejo con ratón =====
    _handleMouseDown(e) {
        if (this.modoSeleccion) return;
        if (e.button !== 0) return;
        
        const row = e.target.closest('tr[data-index]');
        if (!row) return;

        const index = parseInt(row.dataset.index);
        if (isNaN(index)) return;

        this.pressStartX = e.clientX;
        this.pressStartY = e.clientY;
        
        this.longPressTimer = setTimeout(() => {
            this._activarModoSeleccion(index);
        }, 500);
    }

    _handleMouseUp(e) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
    }

    _handleMouseLeave(e) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
    }

    // ===== Activar modo selección =====
    _activarModoSeleccion(index) {
        if (this.modoSeleccion) return;
        
        this.modoSeleccion = true;
        
        // Seleccionar el elemento que activó el long press
        this.seleccionados.clear();
        this.seleccionados.add(index);
        
        // Mostrar columna de checkboxes
        if (this.elements.checkboxHeader) {
            this.elements.checkboxHeader.style.display = 'table-cell';
        }
        
        // Mostrar checkboxes en las filas
        const rows = this.elements.resultsTableBody.querySelectorAll('tr[data-index]');
        rows.forEach(row => {
            const td = row.querySelector('td:first-child');
            if (td) {
                td.style.display = 'table-cell';
            }
        });
        
        // Mostrar barra de selección
        if (this.elements.selectionBar) {
            this.elements.selectionBar.style.display = 'flex';
        }
        
        this._actualizarSeleccion();
        mostrarMensaje(`📌 Modo selección activado (${this.seleccionados.size} seleccionado)`, 'info', 2000);
    }

    // ===== Salir del modo selección =====
    _salirModoSeleccion() {
        this.modoSeleccion = false;
        this.seleccionados.clear();
        
        // Ocultar columna de checkboxes
        if (this.elements.checkboxHeader) {
            this.elements.checkboxHeader.style.display = 'none';
        }
        
        // Ocultar checkboxes en las filas
        const rows = this.elements.resultsTableBody.querySelectorAll('tr[data-index]');
        rows.forEach(row => {
            const td = row.querySelector('td:first-child');
            if (td) {
                td.style.display = 'none';
            }
            row.style.background = '';
            row.style.borderLeft = '';
        });
        
        if (this.elements.selectionBar) {
            this.elements.selectionBar.style.display = 'none';
        }
        if (this.elements.selectAllCheckbox) {
            this.elements.selectAllCheckbox.checked = false;
        }
        
        this._actualizarSeleccion();
    }

    // ===== Toggle selección de un elemento =====
    _toggleSeleccion(index) {
        if (!this.modoSeleccion) return;

        if (this.seleccionados.has(index)) {
            this.seleccionados.delete(index);
        } else {
            this.seleccionados.add(index);
        }

        // Si no hay seleccionados, salir del modo
        if (this.seleccionados.size === 0) {
            this._salirModoSeleccion();
            mostrarMensaje('🔄 Selección limpiada', 'info', 1500);
            return;
        }

        this._actualizarSeleccion();
    }

    // ===== Seleccionar todos =====
    _seleccionarTodos(seleccionar) {
        if (!this.modoSeleccion) {
            if (seleccionar && this.filtrados.length > 0) {
                this._activarModoSeleccion(0);
                this.seleccionados.clear();
                this.filtrados.forEach((_, index) => {
                    this.seleccionados.add(index);
                });
                this._actualizarSeleccion();
                mostrarMensaje(`✅ ${this.seleccionados.size} elementos seleccionados`, 'success', 1500);
            }
            return;
        }

        if (seleccionar) {
            this.seleccionados.clear();
            this.filtrados.forEach((_, index) => {
                this.seleccionados.add(index);
            });
            if (this.elements.selectionBar) {
                this.elements.selectionBar.style.display = 'flex';
            }
        } else {
            this.seleccionados.clear();
            this._salirModoSeleccion();
        }
        this._actualizarSeleccion();
    }

    // ===== Limpiar selección =====
    _limpiarSeleccion() {
        this._salirModoSeleccion();
        mostrarMensaje('🔄 Selección limpiada', 'info', 1500);
    }

    // ===== Actualizar UI de selección =====
    _actualizarSeleccion() {
        const total = this.filtrados.length;
        const seleccionados = this.seleccionados.size;

        // Actualizar contador
        if (this.elements.selectionCount) {
            this.elements.selectionCount.textContent = `${seleccionados} de ${total} seleccionados`;
        }

        // Actualizar checkbox "Seleccionar todos"
        if (this.elements.selectAllCheckbox) {
            if (seleccionados === 0) {
                this.elements.selectAllCheckbox.checked = false;
                this.elements.selectAllCheckbox.indeterminate = false;
            } else if (seleccionados === total && total > 0) {
                this.elements.selectAllCheckbox.checked = true;
                this.elements.selectAllCheckbox.indeterminate = false;
            } else {
                this.elements.selectAllCheckbox.checked = false;
                this.elements.selectAllCheckbox.indeterminate = true;
            }
        }

        // Actualizar checkboxes de cada fila
        const checkboxes = this.elements.resultsTableBody.querySelectorAll('input[type="checkbox"][data-index]');
        checkboxes.forEach(cb => {
            const index = parseInt(cb.dataset.index);
            cb.checked = this.seleccionados.has(index);
        });

        // Resaltar filas seleccionadas
        const rows = this.elements.resultsTableBody.querySelectorAll('tr[data-index]');
        rows.forEach(row => {
            const index = parseInt(row.dataset.index);
            if (this.seleccionados.has(index)) {
                row.style.background = '#fff8e1';
                row.style.borderLeft = '3px solid #F2C200';
            } else {
                row.style.background = '';
                row.style.borderLeft = '';
            }
        });

        // Mostrar/ocultar barra de selección
        if (this.elements.selectionBar) {
            if (this.seleccionados.size > 0) {
                this.elements.selectionBar.style.display = 'flex';
            } else {
                this.elements.selectionBar.style.display = 'none';
            }
        }
    }

    // ===== Obtener elementos a exportar =====
    _obtenerElementosAExportar() {
        // Si hay selección, devolver solo los seleccionados
        if (this.modoSeleccion && this.seleccionados.size > 0) {
            const seleccionados = [];
            const indices = Array.from(this.seleccionados).sort((a, b) => a - b);
            indices.forEach(index => {
                if (this.filtrados[index]) {
                    seleccionados.push(this.filtrados[index]);
                }
            });
            return seleccionados;
        }
        // Si no hay selección, devolver todos
        return this.filtrados;
    }

    // ===== Scroll =====
    _handleScroll() {
        const wrapper = this.elements.resultsTableWrapper;
        const btn = this.elements.scrollTopBtn;
        if (!wrapper || !btn) return;

        if (wrapper.scrollTop > this.scrollThreshold) {
            btn.style.display = 'flex';
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
        } else {
            btn.style.display = 'none';
            btn.style.opacity = '0';
            btn.style.transform = 'scale(0.8)';
        }
    }

    _scrollToTop() {
        const wrapper = this.elements.resultsTableWrapper;
        if (wrapper) {
            wrapper.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    async _cargarDatos() {
        mostrarMensaje('📂 Cargando datos de repuestos...', 'info', 0);
        this.datos = await this.loader.cargar();
        if (this.loader.usaEjemplo) {
            mostrarMensaje(`⚠️ Usando datos de ejemplo (${this.datos.length} repuestos)`, 'info', 4000);
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

    async _buscar() {
        const termino = this.elements.searchInput.value.trim();
        const categoria = this.elements.categoryFilter.value;

        if (!termino && !categoria) {
            mostrarMensaje('⚠️ Introduce un término de búsqueda o selecciona una categoría', 'info', 3000);
            return;
        }

        this.terminoBusqueda = termino;
        this.categoriaBusqueda = categoria;

        this.filtrados = this.loader.buscar(termino, categoria);
        this.cachedImage = null;

        // Limpiar selección al hacer nueva búsqueda
        this._salirModoSeleccion();

        if (this.elements.scrollTopBtn) {
            this.elements.scrollTopBtn.style.display = 'none';
        }

        if (this.filtrados.length === 0) {
            mostrarMensaje(`🔍 No se encontraron resultados${termino ? ` para "${termino}"` : ''}${categoria ? ` en ${categoria}` : ''}`, 'info', 3000);
            
            const wrapper = this.container.querySelector('.stock-wrapper');
            if (wrapper) {
                wrapper.classList.add('centered');
            }

            if (window.navigation) {
                window.navigation.enableSwipe();
            }
            
            this.elements.resultsScreen.style.display = 'block';
            this.elements.searchScreen.style.display = 'none';
            this.elements.resultsSubtitle.textContent = `🔍 0 resultados encontrados${termino ? ` para "${termino}"` : ''}${categoria ? ` en ${categoria}` : ''}`;
            this.elements.resultsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #999;">
                        🔍 No se encontraron resultados
                        <br><span style="font-size: 0.8rem;">Prueba con otros términos de búsqueda</span>
                    </td>
                </tr>
            `;
            return;
        }

        await this._mostrarResultados();
    }

    async _mostrarResultados() {
        const wrapper = this.container.querySelector('.stock-wrapper');
        if (wrapper) {
            wrapper.classList.remove('centered');
        }

        if (window.navigation) {
            window.navigation.disableSwipe();
        }

        this.elements.searchScreen.style.display = 'none';
        this.elements.resultsScreen.style.display = 'block';

        this.elements.resultsSubtitle.textContent = 
            `🔍 ${this.filtrados.length} resultados encontrados${this.terminoBusqueda ? ` para "${this.terminoBusqueda}"` : ''}${this.categoriaBusqueda ? ` en ${this.categoriaBusqueda}` : ''}`;

        this._renderResultados();
        mostrarMensaje(`✅ ${this.filtrados.length} resultados encontrados`, 'success', 2000);
    }

    _renderResultados() {
        const tbody = this.elements.resultsTableBody;
        
        if (this.filtrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #999;">
                        No hay resultados para mostrar
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filtrados.map((item, index) => {
            return `
                <tr data-index="${index}" style="cursor: default; transition: background 0.2s, border-left 0.2s;">
                    <td style="text-align: center; width: 30px; display: none;">
                        <input type="checkbox" data-index="${index}" style="cursor: pointer; width: 16px; height: 16px; accent-color: #F2C200;">
                    </td>
                    <td><code style="font-size: 0.7rem; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${item.ubicacion}</code></td>
                    <td><strong>${item.referencia}</strong></td>
                    <td>${item.descripcion}</td>
                </tr>
            `;
        }).join('');

        this.cachedImage = null;
        this._salirModoSeleccion();
    }

    _ordenarPor(key) {
        if (this.filtrados.length === 0) return;
        
        if (this._ultimaOrden === key) {
            this._ordenAscendente = !this._ordenAscendente;
        } else {
            this._ultimaOrden = key;
            this._ordenAscendente = true;
        }
        
        const asc = this._ordenAscendente;
        
        this.filtrados.sort((a, b) => {
            let valA = a[key] || '';
            let valB = b[key] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return asc ? -1 : 1;
            if (valA > valB) return asc ? 1 : -1;
            return 0;
        });
        
        this.cachedImage = null;
        this._salirModoSeleccion();
        this._renderResultados();
        
        this.elements.resultsTable.querySelectorAll('th[data-sort]').forEach(th => {
            th.style.color = th.dataset.sort === key ? '#F2C200' : '';
        });
    }

    async _generarImagen(resultados, titulo = 'Resultados de Búsqueda') {
        if (!resultados || resultados.length === 0) {
            mostrarMensaje('⚠️ No hay datos para generar imagen', 'info', 3000);
            return null;
        }

        try {
            const imageData = await ResultsRenderer.generarImagen(
                resultados,
                this.terminoBusqueda,
                this.categoriaBusqueda,
                titulo
            );
            return imageData;
        } catch (error) {
            console.error('[StockApp] Error generando imagen:', error);
            mostrarMensaje('❌ Error al generar la imagen', 'error', 3000);
            return null;
        }
    }

    async _descargarImagen() {
        const elementos = this._obtenerElementosAExportar();
        
        if (elementos.length === 0) {
            mostrarMensaje('⚠️ No hay elementos para descargar', 'info', 3000);
            return;
        }

        const tieneSeleccion = this.modoSeleccion && this.seleccionados.size > 0;
        const titulo = tieneSeleccion ? `Selección (${elementos.length} elementos)` : 'Resultados de Búsqueda';
        
        mostrarMensaje(`🖼️ Generando imagen con ${elementos.length} elementos...`, 'info', 0);

        const imageData = await this._generarImagen(elementos, titulo);
        if (!imageData) return;

        try {
            const link = document.createElement('a');
            const fecha = new Date().toISOString().slice(0, 10);
            const sufijo = tieneSeleccion ? `-seleccion-${elementos.length}` : '';
            link.download = `stock${sufijo}-${fecha}.png`;
            link.href = imageData;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            mostrarMensaje(`📥 ${elementos.length} elementos descargados`, 'success', 2000);
        } catch (error) {
            console.error('[StockApp] Error descargando:', error);
            mostrarMensaje('❌ Error al descargar', 'error', 3000);
        }
    }

    async _compartirImagen() {
        const elementos = this._obtenerElementosAExportar();
        
        if (elementos.length === 0) {
            mostrarMensaje('⚠️ No hay elementos para compartir', 'info', 3000);
            return;
        }

        const tieneSeleccion = this.modoSeleccion && this.seleccionados.size > 0;
        const titulo = tieneSeleccion ? `Selección (${elementos.length} elementos)` : 'Resultados de Búsqueda';
        
        mostrarMensaje(`🖼️ Generando imagen con ${elementos.length} elementos...`, 'info', 0);

        const imageData = await this._generarImagen(elementos, titulo);
        if (!imageData) return;

        try {
            const blob = await (await fetch(imageData)).blob();
            const file = new File([blob], `stock${tieneSeleccion ? '-seleccion' : ''}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                const mensaje = tieneSeleccion 
                    ? `📦 ${elementos.length} repuestos seleccionados${this.terminoBusqueda ? ` para "${this.terminoBusqueda}"` : ''}`
                    : `📦 ${elementos.length} repuestos encontrados${this.terminoBusqueda ? ` para "${this.terminoBusqueda}"` : ''}`;
                await navigator.share({
                    title: 'Stock',
                    text: mensaje,
                    files: [file]
                });
                mostrarMensaje('📤 Compartido correctamente', 'success', 2000);
            } else {
                mostrarMensaje('📱 Compartir no soportado, se descargará', 'info', 2000);
                this._descargarImagen();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('[StockApp] Error compartiendo:', error);
                mostrarMensaje('❌ Error al compartir', 'error', 3000);
            }
        }
    }

    _volver() {
        const wrapper = this.container.querySelector('.stock-wrapper');
        if (wrapper) {
            wrapper.classList.add('centered');
        }

        if (window.navigation) {
            window.navigation.enableSwipe();
        }

        // Limpiar selección
        this._salirModoSeleccion();

        if (this.elements.scrollTopBtn) {
            this.elements.scrollTopBtn.style.display = 'none';
        }

        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.value = '';
        }
        
        this.elements.resultsScreen.style.display = 'none';
        this.elements.searchScreen.style.display = 'block';
        
        this.filtrados = [];
        this.cachedImage = null;
        this._ultimaOrden = null;
        this._ordenAscendente = true;
        this.terminoBusqueda = '';
        this.categoriaBusqueda = '';
        
        mostrarMensaje('🔄 Campos limpiados. Realiza una nueva búsqueda.', 'info', 2000);
    }
}

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('[StockApp] DOM cargado, iniciando...');
    setTimeout(() => {
        window.stockApp = new StockApp();
    }, 150);
});