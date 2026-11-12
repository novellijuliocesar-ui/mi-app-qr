# QR & Stock — contexto del proyecto

App web instalable (PWA) para el equipo de mantenimiento de una planta de logística. Se publica con
GitHub Pages desde la rama `main`. No hay servidor ni cuentas: todo funciona en el navegador y los
datos salen de dos archivos Excel de la carpeta `data/`.

Idioma de trabajo: **español** (interfaz, comentarios del código, mensajes de commit y respuestas).
Quien lo mantiene no es programador: explica en lenguaje sencillo, empieza por el resultado y evita jerga.

## Cómo se usa en la planta (importante para decidir cualquier cambio)

- La planta tiene 4 naves de paquetería y ropa colgada, con muchas máquinas y sobre todo transportadores.
- Cada máquina o módulo tiene un **QR asociado a un ID**. El técnico escanea ese QR con una **PDA** y,
  desde otra aplicación, **inicia** el trabajo; al acabar vuelve a escanearlo para **cerrarlo**.
- Muchos sitios no tienen QR, está mal colocado o es ilegible. Por eso existe esta app: el técnico busca
  la máquina, la app **genera el QR en la pantalla del móvil** y lo escanea con la PDA.
- **Los móviles son compartidos**: cada técnico lleva uno durante su turno y rota entre los **tres turnos**.
  Nada personal debe quedarse guardado (ni favoritos ni historial por persona).
- **Es habitual que un trabajo lo empiece un técnico y lo acabe otro.** Los avisos de relevo viajan por
  WhatsApp, no por un sistema común.
- **La app debe funcionar sin depender de nada más** (sin servidor, sin base de datos, sin cuentas).
  Hay que poder usarla con poca cobertura.
- Los informes de trabajo son un aviso rápido para el RT (responsable técnico) o el relevo; **no
  sustituyen** el registro en la aplicación de la PDA.

## Qué hace la app

Dos páginas (se cambia con la barra inferior o deslizando):

1. **Tarjetas QR** (`js/qr-page.js`): búsqueda de activos del Excel de activos y generación de su tarjeta.
2. **Stock** (`js/stock-page.js`): búsqueda de repuestos del almacén, con selección y exportación.

Además: modo oscuro, funcionamiento sin conexión, enlaces directos (`?activo=ID`, `?ref=REFERENCIA`),
botón «atrás» del móvil que cierra tarjeta/selección/informe, y accesos directos en el icono.

## Decisiones ya tomadas por el usuario (no deshacer sin preguntar)

**Tarjetas QR**
- Con el buscador vacío **no se lista ningún activo**; solo aparece el desplegable «O elige de la lista
  completa». El desplegable **desaparece en cuanto se escribe**.
- Al escribir un **ID completo** la tarjeta se genera sola. Si el ID está repetido en el Excel
  (hoy: 164306 y 178229) se deja elegir.
- Orden de botones en la tarjeta: Compartir → Descargar → **Hacer informe** → Volver a la búsqueda.

**Stock**
- **No mostrar cantidades ni criticidad** (ni en lista, ni en filtros, ni en el texto o imagen exportados).
- Cada repuesto muestra referencia, descripción, ubicación, referencia del fabricante y clasificación,
  y «También en…» si la misma referencia está en otras ubicaciones.
- Se exporta como texto o imagen, todo o solo lo seleccionado.

**Informe de trabajo** (`js/informe.js`, `js/informe-pdf.js`)
- Se abre desde la tarjeta QR de un activo y se envía **siempre como un único PDF** por el menú de
  compartir (pensado para WhatsApp). **No usar varios pasos de envío**: se descartó por poco práctico.
- Orden del contenido: trabajo realizado → estado → activo → repuestos. Texto del mensaje **limpio y
  profesional, con pocos iconos**.
- El PDF lleva el QR del activo, el informe y las fotos. Las fotos se pueden hacer con la cámara o elegir
  de la galería.
- El borrador se guarda en el móvil (IndexedDB) y se borra al enviarlo. El nombre del técnico se recuerda
  solo 8 horas (un turno).

**Interfaz**
- Móvil primero. Tema claro/oscuro según el sistema, con botón para cambiarlo.

## Forma de trabajar (acordada)

1. **Nunca publicar sin que el usuario lo haya visto y aprobado.** Primero se trabaja en la rama
   `refactor-completo` (la rama de revisión), se enseña con capturas y, solo cuando el usuario dice que
   la pase a la versión publicada, se hace avance rápido (`--ff-only`) a `main`.
2. El usuario prueba la rama en el móvil con:
   `https://raw.githack.com/novellijuliocesar-ui/mi-app-qr/refactor-completo/index.html`
3. Antes de dar algo por hecho, **probarlo de verdad** en un navegador simulado (Playwright con
   Chromium preinstalado, móvil «Pixel 7») y revisar las capturas.
4. Tras cada commit en la rama de revisión, subirla (`git push origin refactor-completo`).
5. **Cada vez que se pase algo a `main`, actualizar este `CLAUDE.md` en ese mismo cambio** (petición
   expresa del usuario). Revisar y poner al día, según corresponda:
   - «Qué hace la app» y «Decisiones ya tomadas» (nuevas decisiones o cambios de criterio).
   - «Estructura del código» (archivos nuevos, renombrados o eliminados) y las librerías.
   - La versión de `sw.js` mencionada en «Detalles técnicos» (hoy `v16`).
   - «Ideas pendientes»: quitar las que ya se hicieron y añadir las nuevas.
   - «Historial breve»: una línea por cada cambio publicado.
   Decirle al usuario en el resumen final qué se ha actualizado en `CLAUDE.md`.
6. Al ofrecer nuevas ideas, dar una recomendación concreta en lugar de una lista larga.

## Estructura del código

```
index.html          Esqueleto de las dos páginas, barra inferior, avisos
manifest.json       Datos de la app instalable y accesos directos
sw.js               Service worker (modo sin conexión y actualizaciones)
css/app.css         Todos los estilos, con variables para el tema claro/oscuro
data/               Los dos Excel (ver abajo)
js/main.js          Navegación entre páginas, tema, registro del service worker
js/data.js          Lectura de los Excel y motor de búsqueda
js/sinonimos.js     Palabras equivalentes para la búsqueda (editable)
js/ui.js            Utilidades: avisos, compartir, «atrás» del móvil, lista paginada
js/render.js        Dibujo de la tarjeta QR y de la imagen de listado
js/qr-page.js       Página de tarjetas QR
js/stock-page.js    Página de stock
js/informe.js       Formulario del informe de trabajo y su borrador
js/informe-pdf.js   Generación del PDF del informe (jsPDF)
```

Librerías externas (CDN, versión fijada): SheetJS `xlsx.mini` 0.20.2 (leer Excel), `qrcode` 1.5.1 (QR),
`jsPDF` 2.5.1 (PDF; se descarga solo cuando hace falta). El service worker las guarda para el modo sin conexión.

## Datos (Excel)

- `data/DOC-20251215-WA0003.xlsx` — **activos** (≈3.157). Columnas: `ID_ACTIVO_ARBOL`,
  `CODIGO_IDENTIFICATIVO`, `DESCRIPCION`. Lo exporta el programa de mantenimiento de la planta.
- `data/Almacen.xlsx` — **stock** (≈6.755 ubicaciones). Columnas usadas: Ubicación, Referencia,
  Referencia Fabricante, Descripción, Clasificación, Últ. Modific. (hay más columnas que no se usan).
- Las rutas están en `js/data.js` (`ARCHIVOS`). Si se cambia el nombre de un Excel, hay que cambiarlo ahí.
  Se sustituyen subiendo el archivo nuevo **con el mismo nombre**.
- El lector detecta la fila de cabeceras por el nombre de las columnas, no por su posición.
- Cosas conocidas de los datos: el Excel de activos no está ordenado por ID; el 54 % de las descripciones
  se repite en 5 o más activos (p. ej. «TRANSPORTADOR DE RODILLOS RFM» ×272); se mezclan español, inglés y
  abreviaturas; hay erratas («TRANPORTE»); los prefijos de los códigos (A111, A271, F422…) son en su mayoría
  PLC y no todos tienen nombre en el Excel; 262 referencias del stock están en varias ubicaciones.

## Detalles técnicos que es fácil olvidar

- **Cada vez que se cambie cualquier archivo de la app, subir `VERSION` en `sw.js`** (ahora `v16`) y,
  si se añade un archivo nuevo, incluirlo en la lista `APP` de `sw.js`. Si no, los móviles siguen con
  la versión antigua.
- Los Excel no usan el caché de la app: el service worker los pide a la red (máximo 4 s) y, si falla,
  usa la última copia guardada y la app lo indica con «sin conexión (copia guardada)».
- **Búsqueda con sinónimos:** se edita `js/sinonimos.js` (grupos de palabras en minúsculas y sin
  acentos). No cambia lo que se ve, solo lo que se encuentra.
- Los textos del Excel se escapan con `escapeHtml` antes de pintarlos. Mantenerlo.
- Las rutas son relativas (`./`) porque la app se sirve desde `/mi-app-qr/`.
- Entorno de pruebas en la nube: las librerías del CDN están bloqueadas. Para probar, servir la carpeta
  con `python3 -m http.server` y, en Playwright, sustituir las librerías por copias locales
  (`npm pack qrcode@1.5.1 @e965/xlsx@0.20.2 jspdf@2.5.1`).
- El menú de compartir y la cámara no se pueden probar en el navegador simulado: se simulan
  (`navigator.share`) y se comprueba lo que se enviaría.

## Ideas pendientes (en este orden de interés)

1. **Navegación por zonas (PLC)** y **descripciones más intuitivas** para buscar. Requiere que el equipo
   aporte el nombre de cada PLC y el significado de las siglas (RFM, KRF, GF, RSPN, ZKRF, PAS, XK…); se
   propuso un Excel «diccionario» aparte. **No modificar el Excel original** (se sobrescribe en cada
   exportación) y mantener siempre visible la descripción original, que es la que aparece en la PDA.
2. Mejorar la efectividad de las búsquedas (el usuario lo considera lo más importante a corto plazo).
3. Modo escaneo a pantalla completa (QR grande, pantalla encendida).
4. Escanear QR con la cámara para abrir un activo.
5. Hoja de etiquetas para imprimir; avisos de «QR que falta» compartibles por WhatsApp.
6. Informe: notas de voz y plantillas por tipo de trabajo (descartado por ahora: favoritos/historial
   por persona, por ser móviles compartidos).
7. Renombrar el Excel de activos a `Activos.xlsx` (el nombre actual viene de un WhatsApp) y corregir en
   el Excel los dos ID repetidos.

## Historial breve

- Refactorización completa (código en módulos, modo sin conexión real, buscador en vivo).
- Stock sin cantidades ni criticidad; modo oscuro; «También en» otras ubicaciones.
- Buscador QR vacío + desplegable; ID completo genera la tarjeta; botón «atrás» del móvil.
- Búsqueda con sinónimos (español/inglés, abreviaturas y erratas).
- Informe de trabajo en PDF para WhatsApp, con fotos y repuestos. Publicado en `main`.
