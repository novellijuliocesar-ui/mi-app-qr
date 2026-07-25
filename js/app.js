import { ExcelLoader } from './excel-loader.js';
import { CardRenderer } from './card-renderer.js';
import { QRGenerator } from './qr-generator.js';
import { mostrarMensaje, sanitizarNombre, debounce } from './utils.js';

// ========== CONTROLADOR PRINCIPAL ==========

class App {
    constructor() {
        this.excelLoader = new ExcelLoader();
        this.datos = [];
        this.currentItem = null;
        this.cachedImage = null;
        this.container = document.getElementById('qrPage');
        this.elements = {};
        this.messageEl = null;
        this.isLoading = false;

        this.init();
    }

    async init() {
        console.log('[App] Inicializando...');
        this._buildUI();
        this._setupEventListeners();
        await this._cargarDatos();
        console.log('[App] Inicialización completada');
    }

    _buildUI() {
        if (!this.container) {
            console.error('[App] ❌ No se encontró el contenedor qrPage');
            return;
        }

        this.container.innerHTML = `
            <section class="selection-screen">
                <header class="header">
                    <h1>📱 Generador de Tarjetas QR</h1>
                    <p>Selecciona o busca un activo del archivo Excel</p>
                </header>

                <div id="qrMessage" class="message" role="alert" aria-live="polite"></div>

                <div class="search-section">
                    <label for="searchInput">🔍 Buscar (por ID o Código)</label>
                    <input 
                        type="text" 
                        id="searchInput" 
                        placeholder="Ej: 162514 o TALLER..." 
                        autocomplete="off"
                        aria-label="Buscar activo"
                    >
                </div>

                <div class="form-group">
                    <label for="activoSelect">📋 Seleccionar activo</label>
                    <select id="activoSelect" aria-label="Lista de activos">
                        <option value="">-- Cargando... --</option>
                    </select>
                </div>

                <button class="btn btn-primary" id="generateBtn">
                    ✨ Generar Tarjeta
                </button>
            </section>

            <section class="card-screen" id="cardScreen" hidden>
                <div class="card-container">
                    <div id="cardNumber" class="card-number"></div>
                    <div id="cardQr" class="card-qr"></div>
                    <div id="cardCode" class="card-code"></div>
                    <div id="cardDesc" class="card-desc"></div>
                </div>

                <div class="action-buttons">
                    <button class="btn btn-secondary" id="downloadCardBtn">
                        📥 Descargar
                    </button>
                    <button class="btn btn-success" id="shareCardBtn">
                        📤 Compartir
                    </button>
                    <button class="btn btn-back" id="backBtn">
                        ◀ Nueva Tarjeta
                    </button>
                </div>
            </section>

            <div id="qrLoading" class="loading" hidden>
                <div class="spinner"></div>
                <p>Generando tarjeta...</p>
            </div>
        `;

        // Obtener referencias con querySelector
        this.elements = {
            selectionScreen: this.container.querySelector('.selection-screen'),
            cardScreen: this.container.querySelector('#cardScreen'),
            loading: this.container.querySelector('#qrLoading'),
            searchInput: this.container.querySelector('#searchInput'),
            activoSelect: this.container.querySelector('#activoSelect'),
            generateBtn: this.container.querySelector('#generateBtn'),
            downloadBtn: this.container.querySelector('#downloadCardBtn'),
            shareBtn: this.container.querySelector('#shareCardBtn'),
            backBtn: this.container.querySelector('#backBtn'),
            cardNumber: this.container.querySelector('#cardNumber'),
            cardQr: this.container.querySelector('#cardQr'),
            cardCode: this.container.querySelector('#cardCode'),
            cardDesc: this.container.querySelector('#cardDesc'),
        };
        this.messageEl = this.container.querySelector('#qrMessage');

        console.log('[App] UI construida');
    }

    _setupEventListeners() {
        const debouncedSearch = debounce(this._handleSearch.bind(this), 300);
        
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', debouncedSearch);
        }
        if (this.elements.activoSelect) {
            this.elements.activoSelect.addEventListener('change', this._handleSelect.bind(this));
        }
        if (this.elements.generateBtn) {
            this.elements.generateBtn.addEventListener('click', this._handleGenerate.bind(this));
        }
        if (this.elements.downloadBtn) {
            this.elements.downloadBtn.addEventListener('click', this._handleDownload.bind(this));
        }
        if (this.elements.shareBtn) {
            this.elements.shareBtn.addEventListener('click', this._handleShare.bind(this));
        }
        if (this.elements.backBtn) {
            this.elements.backBtn.addEventListener('click', this._handleBack.bind(this));
        }

        console.log('[App] Event listeners configurados');
    }

    async _cargarDatos() {
        console.log('[App] Cargando datos...');
        this.datos = await this.excelLoader.cargar();
        this._poblarSelect();
        console.log('[App] Datos cargados:', this.datos.length);
        
        if (this.datos.length === 0) {
            this._showMessage('⚠️ No se pudieron cargar los datos. Verifica la consola.', 'error', 5000);
        } else {
            this._showMessage(`✅ ${this.datos.length} activos disponibles`, 'success', 2000);
        }
    }

    _poblarSelect() {
        const select = this.elements.activoSelect;
        if (!select) return;
        
        const data = this.excelLoader.obtenerDatos();
        
        select.innerHTML = '<option value="">-- Seleccionar --</option>';
        
        if (data.length === 0) {
            select.innerHTML = '<option value="">-- Sin datos --</option>';
            return;
        }

        data.forEach((item) => {
            const opt = document.createElement('option');
            const realIndex = this.datos.findIndex(d => d.id === item.id && d.codigo === item.codigo);
            opt.value = realIndex;
            const label = item.desc.length > 50 ? item.desc.substring(0, 50) + '...' : item.desc;
            opt.textContent = `${item.codigo} - ${label}`;
            select.appendChild(opt);
        });
    }

    _handleSearch() {
        const term = this.elements.searchInput?.value || '';
        this.excelLoader.filtrar(term);
        this._poblarSelect();

        const count = this.excelLoader.obtenerDatos().length;
        if (term.trim() && count > 0) {
            this._showMessage(`🔍 ${count} resultados encontrados`, 'success');
        } else if (term.trim() && count === 0) {
            this._showMessage('🔍 No se encontraron resultados', 'info');
        }
    }

    _handleSelect() {
        const index = parseInt(this.elements.activoSelect?.value || '');
        this.currentItem = this.excelLoader.obtenerPorIndice(index);
        
        if (this.currentItem) {
            this._showMessage(`✅ Seleccionado: ${this.currentItem.codigo}`, 'success');
        }
    }

    async _handleGenerate() {
        if (!this.currentItem) {
            this._showMessage('❌ Primero selecciona un activo de la lista', 'error');
            return;
        }

        this._showLoading(true);
        this._hideCard();

        try {
            const { id, codigo, desc } = this.currentItem;
            
            await this._mostrarQR(id);
            this.cachedImage = await CardRenderer.generarImagen(id, codigo, desc);
            
            if (this.elements.cardNumber) {
                this.elements.cardNumber.textContent = id;
            }
            if (this.elements.cardCode) {
                this.elements.cardCode.textContent = codigo;
            }
            if (this.elements.cardDesc) {
                this.elements.cardDesc.textContent = desc || 'Sin descripción';
            }

            this._showCard();

        } catch (error) {
            console.error('[App] Error al generar:', error);
            this._showMessage('❌ Error al generar la tarjeta', 'error');
            this._showSelection();
        } finally {
            this._showLoading(false);
        }
    }

    async _mostrarQR(id) {
        const container = this.elements.cardQr;
        if (!container) return;
        
        container.innerHTML = '';
        const canvas = await QRGenerator.generarQR(id, 200, 1);
        container.appendChild(canvas);
    }

    async _handleDownload() {
        if (!this.currentItem) return;

        try {
            let img = this.cachedImage;
            if (!img) {
                const { id, codigo, desc } = this.currentItem;
                img = await CardRenderer.generarImagen(id, codigo, desc);
            }

            const link = document.createElement('a');
            const nombre = sanitizarNombre(this.currentItem.codigo);
            link.download = `tarjeta-${nombre}.png`;
            link.href = img;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this._showMessage('📥 Tarjeta descargada', 'success');
        } catch (error) {
            console.error('[App] Error al descargar:', error);
            this._showMessage('❌ Error al descargar', 'error');
        }
    }

    async _handleShare() {
        if (!this.currentItem) return;

        try {
            let img = this.cachedImage;
            if (!img) {
                const { id, codigo, desc } = this.currentItem;
                img = await CardRenderer.generarImagen(id, codigo, desc);
            }

            const blob = await (await fetch(img)).blob();
            const file = new File([blob], 'tarjeta.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: 'Tarjeta QR',
                    text: `Tarjeta para ${this.currentItem.codigo}`,
                    files: [file]
                });
                this._showMessage('📤 Compartido correctamente', 'success');
            } else {
                this._showMessage('📱 Compartir no soportado, se descargará', 'info');
                this._handleDownload();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('[App] Error al compartir:', error);
                this._showMessage('❌ Error al compartir', 'error');
            }
        }
    }

    _handleBack() {
        this.currentItem = null;
        this.cachedImage = null;
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.activoSelect) {
            this.elements.activoSelect.value = '';
        }
        this.excelLoader.filtrar('');
        this._poblarSelect();
        
        this._showSelection();
        this._showMessage('🔄 Campos limpiados', 'info', 2000);
    }

    _showLoading(show) {
        if (this.elements.loading) {
            this.elements.loading.hidden = !show;
        }
    }

    _showCard() {
        if (this.elements.selectionScreen) {
            this.elements.selectionScreen.hidden = true;
        }
        if (this.elements.cardScreen) {
            this.elements.cardScreen.hidden = false;
        }
        if (this.elements.loading) {
            this.elements.loading.hidden = true;
        }
    }

    _hideCard() {
        if (this.elements.cardScreen) {
            this.elements.cardScreen.hidden = true;
        }
    }

    _showSelection() {
        if (this.elements.selectionScreen) {
            this.elements.selectionScreen.hidden = false;
        }
        if (this.elements.cardScreen) {
            this.elements.cardScreen.hidden = true;
        }
        if (this.elements.loading) {
            this.elements.loading.hidden = true;
        }
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
    console.log('[App] DOM cargado, iniciando...');
    setTimeout(() => {
        window.qrApp = new App();
    }, 150);
});
