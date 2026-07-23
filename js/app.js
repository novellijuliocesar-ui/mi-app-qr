import { ExcelLoader } from './excel-loader.js';
import { CardRenderer } from './card-renderer.js';
import { QRGenerator } from './qr-generator.js';
import { mostrarMensaje, sanitizarNombre, debounce } from './utils.js';

// ========== CONTROLADOR PRINCIPAL ==========

class App {
    constructor() {
        // Estado
        this.excelLoader = new ExcelLoader();
        this.datos = [];
        this.currentItem = null;
        this.cachedImage = null;

        // Elementos DOM
        this.elements = {
            selectionScreen: document.getElementById('selectionScreen'),
            cardScreen: document.getElementById('cardScreen'),
            loading: document.getElementById('loading'),
            searchInput: document.getElementById('searchInput'),
            activoSelect: document.getElementById('activoSelect'),
            generateBtn: document.getElementById('generateBtn'),
            downloadBtn: document.getElementById('downloadCardBtn'),
            shareBtn: document.getElementById('shareCardBtn'),
            backBtn: document.getElementById('backBtn'),
            cardNumber: document.getElementById('cardNumber'),
            cardQr: document.getElementById('cardQr'),
            cardCode: document.getElementById('cardCode'),
            cardDesc: document.getElementById('cardDesc'),
        };

        // Inicializar
        this.init();
    }

    async init() {
        this._setupEventListeners();
        await this._cargarDatos();
    }

    // ===== EVENTOS =====
    _setupEventListeners() {
        // Búsqueda con debounce
        const debouncedSearch = debounce(this._handleSearch.bind(this), 300);
        this.elements.searchInput.addEventListener('input', debouncedSearch);

        // Selección
        this.elements.activoSelect.addEventListener('change', this._handleSelect.bind(this));

        // Botones
        this.elements.generateBtn.addEventListener('click', this._handleGenerate.bind(this));
        this.elements.downloadBtn.addEventListener('click', this._handleDownload.bind(this));
        this.elements.shareBtn.addEventListener('click', this._handleShare.bind(this));
        this.elements.backBtn.addEventListener('click', this._handleBack.bind(this));
    }

    // ===== CARGA DE DATOS =====
    async _cargarDatos() {
        this.datos = await this.excelLoader.cargar();
        this._poblarSelect();
    }

    // ===== SELECT =====
    _poblarSelect() {
        const select = this.elements.activoSelect;
        const data = this.excelLoader.obtenerDatos();
        
        select.innerHTML = '<option value="">-- Seleccionar --</option>';
        
        if (data.length === 0) {
            select.innerHTML = '<option value="">-- Sin datos --</option>';
            return;
        }

        data.forEach((item) => {
            const opt = document.createElement('option');
            // Buscar el índice real en this.datos
            const realIndex = this.datos.findIndex(d => d.id === item.id && d.codigo === item.codigo);
            opt.value = realIndex;
            const label = item.desc.length > 50 ? item.desc.substring(0, 50) + '...' : item.desc;
            opt.textContent = `${item.codigo} - ${label}`;
            select.appendChild(opt);
        });
    }

    // ===== BÚSQUEDA =====
    _handleSearch() {
        const term = this.elements.searchInput.value;
        this.excelLoader.filtrar(term);
        this._poblarSelect();

        const count = this.excelLoader.obtenerDatos().length;
        if (term.trim() && count > 0) {
            mostrarMensaje(`🔍 ${count} resultados encontrados`, 'success');
        } else if (term.trim() && count === 0) {
            mostrarMensaje('🔍 No se encontraron resultados', 'info');
        }
    }

    // ===== SELECCIÓN =====
    _handleSelect() {
        const index = parseInt(this.elements.activoSelect.value);
        this.currentItem = this.excelLoader.obtenerPorIndice(index);
        
        if (this.currentItem) {
            mostrarMensaje(`✅ Seleccionado: ${this.currentItem.codigo}`, 'success');
        }
    }

    // ===== GENERAR TARJETA =====
    async _handleGenerate() {
        if (!this.currentItem) {
            mostrarMensaje('❌ Primero selecciona un activo de la lista', 'error');
            return;
        }

        this._showLoading(true);
        this._hideCard();

        try {
            const { id, codigo, desc } = this.currentItem;
            
            // Mostrar QR en pantalla
            await this._mostrarQR(id);
            
            // Generar imagen para descarga
            this.cachedImage = await CardRenderer.generarImagen(id, codigo, desc);
            
            // Mostrar datos
            this.elements.cardNumber.textContent = id;
            this.elements.cardCode.textContent = codigo;
            this.elements.cardDesc.textContent = desc || 'Sin descripción';

            this._showCard();

        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('❌ Error al generar la tarjeta', 'error');
            this._showSelection();
        } finally {
            this._showLoading(false);
        }
    }

    async _mostrarQR(id) {
        const container = this.elements.cardQr;
        container.innerHTML = '';
        const canvas = await QRGenerator.generarQR(id, 200, 1);
        container.appendChild(canvas);
    }

    // ===== DESCARGA =====
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
            link.click();
            mostrarMensaje('📥 Tarjeta descargada', 'success');
        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('❌ Error al descargar', 'error');
        }
    }

    // ===== COMPARTIR =====
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
                mostrarMensaje('📤 Compartido correctamente', 'success');
            } else {
                mostrarMensaje('📱 Compartir no soportado, se descargará', 'info');
                this._handleDownload();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error:', error);
                mostrarMensaje('❌ Error al compartir', 'error');
            }
        }
    }

    // ===== VOLVER =====
    _handleBack() {
        // Limpiar selección
        this.currentItem = null;
        this.cachedImage = null;
        this.elements.searchInput.value = '';
        this.elements.activoSelect.value = '';
        this.excelLoader.filtrar('');
        this._poblarSelect();
        
        this._showSelection();
        mostrarMensaje('🔄 Campos limpiados', 'info', 2000);
    }

    // ===== UTILIDADES DE UI =====
    _showLoading(show) {
        this.elements.loading.hidden = !show;
    }

    _showCard() {
        this.elements.selectionScreen.hidden = true;
        this.elements.cardScreen.hidden = false;
        this.elements.loading.hidden = true;
    }

    _hideCard() {
        this.elements.cardScreen.hidden = true;
    }

    _showSelection() {
        this.elements.selectionScreen.hidden = false;
        this.elements.cardScreen.hidden = true;
        this.elements.loading.hidden = true;
    }
}

// ===== INICIALIZAR =====
document.addEventListener('DOMContentLoaded', () => {
    new App();
});