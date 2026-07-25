// ========== UTILIDADES ==========

/**
 * Limpia un ID eliminando decimales
 */
export function limpiarId(idRaw) {
    const idStr = String(idRaw);
    return idStr.includes('.') ? idStr.split('.')[0] : idStr;
}

/**
 * Muestra un mensaje flotante (toast) en la pantalla
 * @param {string} texto - El mensaje a mostrar
 * @param {string} tipo - 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duración en milisegundos (0 = no desaparece)
 */
export function mostrarMensaje(texto, tipo = 'info', duration = 3000) {
    // Asegurar que el contenedor existe
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }

    // Eliminar toast anterior si existe
    const existingToasts = container.querySelectorAll('.toast-message');
    existingToasts.forEach(toast => {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    });

    // Crear nuevo toast
    const toast = document.createElement('div');
    toast.className = `toast-message ${tipo}`;
    toast.textContent = texto;
    
    // Forzar reflow para animación
    container.appendChild(toast);
    
    // Pequeño delay para activar la animación
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    // Auto-ocultar después de la duración especificada
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('hiding');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}

/**
 * Escapa caracteres especiales para nombres de archivo
 */
export function sanitizarNombre(nombre) {
    return nombre.replace(/[<>:"/\\|?*.]/g, '_');
}

/**
 * Debounce para búsquedas
 */
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}