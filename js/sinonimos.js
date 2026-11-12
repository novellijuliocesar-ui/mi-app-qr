// Palabras que significan lo mismo para la búsqueda (activos y stock).
//
// Cada línea es un grupo: buscar cualquiera de sus palabras encuentra también
// los registros que usan las demás. No cambia cómo se ven las descripciones.
//
// Para añadir una equivalencia, añade la palabra a su grupo o crea una línea nueva.
// Escríbelas en minúsculas y sin acentos. Incluye singular y plural si hace falta,
// y también las erratas que aparezcan en el Excel (p. ej. "tranporte").

export const SINONIMOS = [
    // ---------- Transportes y máquinas (activos) ----------
    ['transportador', 'transportadores', 'transporte', 'transportes', 'conveyor', 'conveyors', 'conv',
        'tranporte', 'trnsportador', 'transportandor'],
    ['rodillos', 'rodillo', 'roller', 'rollers'],
    ['curva', 'curvas', 'curve', 'curves'],
    ['banda', 'bandas', 'belt', 'belts'],
    ['desvio', 'desvios', 'spur', 'diverter'],
    ['transferencia', 'transfer'],
    ['clasificador', 'clasificadores', 'classificador', 'sorter', 'sorters'],
    ['induccion', 'inducciones', 'induction'],
    ['entrada', 'entradas', 'ingreso', 'inbound', 'infeed'],
    ['salida', 'salidas', 'outbound'],
    ['retorno', 'return'],
    ['rechazo', 'reject'],
    ['pulmon', 'pulmones', 'buffer'],
    ['recirculacion', 'loop'],
    ['vacia', 'vacias', 'vacio', 'vacios', 'empty'],
    ['linea', 'lineas', 'line'],
    ['gravedad', 'grabedad', 'gravity'],
    ['elevador', 'elevadores', 'lift'],
    ['palet', 'palets', 'pallet', 'pallets'],
    ['escaner', 'escaneres', 'scanner'],
    ['impresora', 'impresoras', 'printer'],
    ['cerradora', 'cerradoras'],
    ['precintadora', 'precintadoras'],
    ['formadora', 'formadoras'],
    ['telescopico', 'telescopicos'],
    ['instalacion', 'intalacion'],

    // ---------- Repuestos (stock) ----------
    ['rueda', 'ruedas', 'wheel', 'wheels'],
    ['cadena', 'cadenas', 'chain'],
    ['rodamiento', 'rodamientos', 'bearing', 'bearings'],
    ['polea', 'poleas', 'pulley'],
    ['engranaje', 'engranajes', 'gear'],
    ['resorte', 'resortes', 'spring'],
    ['interruptor', 'interruptores', 'switch'],
    ['conector', 'conectores', 'connector'],
    ['fotocelula', 'fotocelulas', 'photocell'],
    ['macho', 'male'],
    ['hembra', 'female'],
    ['tornillo', 'tornillos', 'screw'],
    ['tuerca', 'tuercas', 'nut'],
    ['arandela', 'arandelas', 'washer'],
    ['cilindro', 'cilindros', 'cylinder'],
    ['ventilador', 'ventiladores', 'fan'],
    ['variador', 'variadores', 'inverter'],
    ['motor', 'motores'],
    ['cable', 'cables'],
];
