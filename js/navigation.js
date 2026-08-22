// ========== NAVEGACIÓN POR SWIPE ==========

export class SwipeNavigation {
    constructor() {
        this.wrapper = document.getElementById('pagesWrapper');
        this.pages = this.wrapper.querySelectorAll('.page');
        this.dots = document.querySelectorAll('.dot');
        this.currentPage = 0;
        this.totalPages = this.pages.length;
        this.isDragging = false;
        this.isAnimating = false;
        this.startX = 0;
        this.currentX = 0;
        this.diffX = 0;
        this.swipeEnabled = true;

        this._init();
    }

    _init() {
        if (!this.wrapper || this.pages.length === 0) {
            console.error('[SwipeNavigation] No se encontraron páginas');
            return;
        }

        this._updatePageSizes();
        this._setupEvents();
        this.goToPage(0, false);

        console.log('[SwipeNavigation] Inicializado correctamente');
    }

    _updatePageSizes() {
        this.pages.forEach(page => {
            page.style.flex = '0 0 100%';
            page.style.width = '100%';
            page.style.minHeight = '100vh';
            page.style.height = '100vh';
            page.style.overflowY = 'auto';
            page.style.overflowX = 'hidden';
            page.style.paddingBottom = '80px';
        });

        this.wrapper.style.display = 'flex';
        this.wrapper.style.width = '100%';
        this.wrapper.style.height = '100vh';
        this.wrapper.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.wrapper.style.willChange = 'transform';
        this.wrapper.style.touchAction = 'pan-y';
        this.wrapper.style.cursor = 'grab';
    }

    _setupEvents() {
        // Eventos táctiles
        this.wrapper.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: true });
        this.wrapper.addEventListener('touchmove', this._handleTouchMove.bind(this), { passive: false });
        this.wrapper.addEventListener('touchend', this._handleTouchEnd.bind(this), { passive: true });

        // Eventos mouse
        this.wrapper.addEventListener('mousedown', this._handleMouseDown.bind(this));
        this.wrapper.addEventListener('mousemove', this._handleMouseMove.bind(this));
        this.wrapper.addEventListener('mouseup', this._handleMouseUp.bind(this));
        this.wrapper.addEventListener('mouseleave', this._handleMouseLeave.bind(this));

        // Dots click
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                if (!this.isAnimating && this.swipeEnabled) {
                    this.goToPage(index);
                }
            });
        });

        // Redimensionar
        window.addEventListener('resize', () => {
            this._updatePageSizes();
            this.goToPage(this.currentPage, false);
        });
    }

    enableSwipe() {
        this.swipeEnabled = true;
        this.wrapper.style.cursor = 'grab';
        this.wrapper.style.touchAction = 'pan-y';
        console.log('[SwipeNavigation] ✅ Swipe habilitado');
    }

    disableSwipe() {
        this.swipeEnabled = false;
        this.wrapper.style.cursor = 'default';
        this.wrapper.style.touchAction = 'none';
        console.log('[SwipeNavigation] ❌ Swipe deshabilitado');
    }

    setSwipeEnabled(enabled) {
        if (enabled) {
            this.enableSwipe();
        } else {
            this.disableSwipe();
        }
    }

    _handleTouchStart(e) {
        if (!this.swipeEnabled || this.isAnimating) return;
        this.isDragging = true;
        this.startX = e.touches[0].clientX;
        this.currentX = this.startX;
        this.diffX = 0;
        this.wrapper.style.transition = 'none';
        this.wrapper.style.cursor = 'grabbing';
    }

    _handleTouchMove(e) {
        if (!this.swipeEnabled || !this.isDragging || this.isAnimating) return;
        
        this.currentX = e.touches[0].clientX;
        this.diffX = this.currentX - this.startX;
        
        const maxOffset = 100;
        const limitedDiff = Math.max(-maxOffset, Math.min(maxOffset, this.diffX));
        const offset = -this.currentPage * window.innerWidth + limitedDiff;
        
        this.wrapper.style.transform = `translateX(${offset}px)`;
    }

    _handleTouchEnd(e) {
        if (!this.swipeEnabled || !this.isDragging || this.isAnimating) {
            this.isDragging = false;
            return;
        }
        
        this.isDragging = false;
        this.wrapper.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.wrapper.style.cursor = 'grab';
        
        const threshold = window.innerWidth * 0.2;

        if (this.diffX < -threshold && this.currentPage < this.totalPages - 1) {
            this.goToPage(this.currentPage + 1);
        } else if (this.diffX > threshold && this.currentPage > 0) {
            this.goToPage(this.currentPage - 1);
        } else {
            this.goToPage(this.currentPage);
        }
    }

    _handleMouseDown(e) {
        if (!this.swipeEnabled || this.isAnimating) return;
        if (e.button !== 0) return;
        
        this.isDragging = true;
        this.startX = e.clientX;
        this.currentX = this.startX;
        this.diffX = 0;
        this.wrapper.style.transition = 'none';
        this.wrapper.style.cursor = 'grabbing';
        e.preventDefault();
    }

    _handleMouseMove(e) {
        if (!this.swipeEnabled || !this.isDragging || this.isAnimating) return;
        
        this.currentX = e.clientX;
        this.diffX = this.currentX - this.startX;
        
        const maxOffset = 100;
        const limitedDiff = Math.max(-maxOffset, Math.min(maxOffset, this.diffX));
        const offset = -this.currentPage * window.innerWidth + limitedDiff;
        
        this.wrapper.style.transform = `translateX(${offset}px)`;
        e.preventDefault();
    }

    _handleMouseUp(e) {
        if (!this.swipeEnabled || !this.isDragging || this.isAnimating) {
            this.isDragging = false;
            return;
        }
        
        this.isDragging = false;
        this.wrapper.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.wrapper.style.cursor = 'grab';
        
        const threshold = window.innerWidth * 0.2;

        if (this.diffX < -threshold && this.currentPage < this.totalPages - 1) {
            this.goToPage(this.currentPage + 1);
        } else if (this.diffX > threshold && this.currentPage > 0) {
            this.goToPage(this.currentPage - 1);
        } else {
            this.goToPage(this.currentPage);
        }
    }

    _handleMouseLeave(e) {
        if (this.isDragging) {
            this._handleMouseUp(e);
        }
    }

    goToPage(index, animate = true) {
        if (this.isAnimating) return;
        if (index < 0 || index >= this.totalPages) return;

        this.isAnimating = true;
        this.currentPage = index;

        if (!animate) {
            this.wrapper.style.transition = 'none';
        } else {
            this.wrapper.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }

        const offset = -index * window.innerWidth;
        this.wrapper.style.transform = `translateX(${offset}px)`;

        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        const event = new CustomEvent('pagechange', { 
            detail: { 
                page: index, 
                pageId: this.pages[index].id
            }
        });
        document.dispatchEvent(event);

        this.pages[index].scrollTop = 0;

        setTimeout(() => {
            this.isAnimating = false;
        }, 350);
    }

    next() {
        if (this.currentPage < this.totalPages - 1) {
            this.goToPage(this.currentPage + 1);
        }
    }

    prev() {
        if (this.currentPage > 0) {
            this.goToPage(this.currentPage - 1);
        }
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.navigation = new SwipeNavigation();
    }, 100);
});