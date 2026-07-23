import { QRGenerator } from './qr-generator.js';

// ========== RENDERIZADOR DE TARJETAS ==========

export class CardRenderer {
    /**
     * Genera la imagen de la tarjeta como DataURL
     */
    static async generarImagen(id, codigo, descripcion) {
        return new Promise(async (resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 540;
                const ctx = canvas.getContext('2d');

                // Fondo
                ctx.fillStyle = '#F2C200';
                ctx.fillRect(0, 0, 400, 540);

                // Número ID
                this._dibujarId(ctx, id);

                // Código QR
                await this._dibujarQR(ctx, id);

                // Código identificativo
                this._dibujarCodigo(ctx, codigo);

                // Descripción
                this._dibujarDescripcion(ctx, descripcion || 'Sin descripción');

                resolve(canvas.toDataURL('image/png'));
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Dibuja el ID en la tarjeta
     */
    static _dibujarId(ctx, id) {
        const texto = String(id);
        ctx.font = 'bold 26px "Courier New", monospace';
        ctx.textAlign = 'center';
        const ancho = ctx.measureText(texto).width + 50;

        // Fondo blanco redondeado
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        this._dibujarRectRedondeado(ctx, 200 - ancho/2, 20, ancho, 48, 24);
        ctx.fill();

        // Texto
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText(texto, 200, 52);
    }

    /**
     * Dibuja el código QR en la tarjeta
     */
    static async _dibujarQR(ctx, id) {
        const qrCanvas = await QRGenerator.generarQR(id, 200, 1);

        // Fondo blanco para el QR
        ctx.fillStyle = '#FFFFFF';
        this._dibujarRectRedondeado(ctx, 200 - 110, 72, 220, 220, 20);
        ctx.fill();

        // QR centrado
        ctx.drawImage(qrCanvas, 200 - 100, 82, 200, 200);
    }

    /**
     * Dibuja el código identificativo
     */
    static _dibujarCodigo(ctx, codigo) {
        const texto = String(codigo);
        ctx.font = 'bold 15px "Courier New", monospace';
        const ancho = ctx.measureText(texto).width + 50;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this._dibujarRectRedondeado(ctx, 200 - ancho/2, 305, ancho, 40, 20);
        ctx.fill();

        ctx.fillStyle = '#1a1a2e';
        ctx.fillText(texto, 200, 333);
    }

    /**
     * Dibuja la descripción con ajuste de línea
     */
    static _dibujarDescripcion(ctx, descripcion) {
        const maxWidth = 300;
        const lineHeight = 20;
        const lines = this._dividirTexto(ctx, descripcion, maxWidth);
        const totalHeight = lines.length * lineHeight + 24;

        // Fondo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        this._dibujarRectRedondeado(ctx, 50, 365, 300, totalHeight, 16);
        ctx.fill();

        // Texto
        ctx.font = '12px "Segoe UI", monospace';
        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'center';
        lines.forEach((line, i) => {
            ctx.fillText(line, 200, 385 + i * lineHeight);
        });
    }

    /**
     * Dibuja un rectángulo redondeado
     */
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

    /**
     * Divide un texto en líneas según el ancho máximo
     */
    static _dividirTexto(ctx, texto, maxWidth) {
        const lines = [];
        let currentLine = '';
        ctx.font = '12px "Segoe UI", monospace';

        for (const char of texto) {
            const testLine = currentLine + char;
            if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }
}