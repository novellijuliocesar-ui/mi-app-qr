// ========== GENERADOR DE QR ==========

export class QRGenerator {
    /**
     * Genera un canvas con el código QR
     */
    static async generarQR(texto, width = 200, margin = 1) {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                QRCode.toCanvas(canvas, texto, { width, margin }, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(canvas);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}