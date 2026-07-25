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
    // Eliminar toast anterior si existe
    const existingToast = document.getElementById('toastMessage');
    if (existingToast) {
        // Añadir clase de salida
        existingToast.classList.add('hiding');
        setTimeout(() => {
            existingToast.remove();
        }, 300);
    }

    // Crear nuevo toast
    const toast = document.createElement('div');
    toast.id = 'toastMessage';
    toast.className = `toast-message ${tipo} show`;
    toast.textContent = texto;
    
    // Añadir al contenedor
    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
    } else {
        // Fallback: crear contenedor si no existe
        const newContainer = document.createElement('div');
        newContainer.className = 'toast-container';
        newContainer.id = 'toastContainer';
        newContainer.appendChild(toast);
        document.body.appendChild(newContainer);
    }

    // Auto-ocultar después de la duración especificada
    if (duration > 0) {
        setTimeout(() => {
            const currentToast = document.getElementById('toastMessage');
            if (currentToast) {
                currentToast.classList.add('hiding');
                setTimeout(() => {
                    currentToast.remove();
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