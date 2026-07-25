// ========== UTILIDADES ==========

export function limpiarId(idRaw) {
    const idStr = String(idRaw);
    return idStr.includes('.') ? idStr.split('.')[0] : idStr;
}

export function mostrarMensaje(texto, tipo = 'info', duration = 3000) {
    const msg = document.getElementById('message');
    if (!msg) return;
    
    msg.textContent = texto;
    msg.className = `message message-${tipo}`;
    msg.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            msg.style.display = 'none';
        }, duration);
    }
}

export function sanitizarNombre(nombre) {
    return nombre.replace(/[<>:"/\\|?*.]/g, '_');
}

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
