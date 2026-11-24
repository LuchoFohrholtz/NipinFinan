// NipinFinan, resumen AE2 de Luciano Fohrholtz con demostración separada.
const NipinResumen = (() => { // Inicializa NipinResumen.
    // Conserva filtros y datos separados para resumen real y demostración.
    if (!document.querySelector("#resumen")) return null; // Localiza "#resumen" en el HTML para controlar ese elemento.
    let modo = "real"; // Inicializa la variable modo: modo real o demostración.
    let sinSesion = true; // Inicializa la variable sinSesion: si falta una cuenta autenticada.
    let datosDisponibles = false; // Inicializa la variable datosDisponibles: si hay datos disponibles para mostrar.
    let movimientos = []; // Inicializa la variable movimientos: lista de ingresos y gastos.
    let cargando = false; // Inicializa la variable cargando: estado de carga.
    let activa = false; // Inicializa la variable activa: estado de la vista actual.
    let revisionDatos = 0; // Inicializa la variable revisionDatos: versión de los datos para descartar respuestas antiguas.
    let ultimaLimpieza = 0; // Inicializa la variable ultimaLimpieza: versión de la última limpieza de datos.
    const filtros = { real: null, demo: null }; // Inicializa la variable filtros: selección guardada por modo.

    const panel = document.querySelector("#resumen"); // Localiza "#resumen" en el HTML para controlar ese elemento.
    const mes = panel.querySelector("#resumen-mes"); // Localiza "#resumen-mes" en el HTML para controlar ese elemento.
    const categoria = panel.querySelector("#resumen-filtro-categoria"); // Localiza "#resumen-filtro-categoria" en el HTML para controlar ese elemento.
    const botonDemo = panel.querySelector("#resumen-demo"); // Localiza "#resumen-demo" en el HTML para controlar ese elemento.
    const botonActualizar = panel.querySelector("#resumen-actualizar"); // Localiza "#resumen-actualizar" en el HTML para controlar ese elemento.
    const aviso = panel.querySelector("#resumen-aviso"); // Localiza "#resumen-aviso" en el HTML para controlar ese elemento.
    const estado = panel.querySelector("#resumen-estado"); // Localiza "#resumen-estado" en el HTML para controlar ese elemento.

    function bloquear(ocupado) { // Define bloquear con sus entradas y el resultado que devuelve.
        // Habilita o bloquea los controles durante la operación.
        cargando = ocupado; // Actualiza estado de carga.
        panel.setAttribute("aria-busy", String(ocupado)); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        botonDemo.disabled = botonActualizar.disabled = ocupado; // Habilita o bloquea el control según el estado de la operación.
        mes.disabled = categoria.disabled = ocupado || !datosDisponibles; // Habilita o bloquea el control según el estado de la operación.
    } // Finaliza este bloque.

    function mesActual() { // Define mesActual con sus entradas y el resultado que devuelve.
        // Obtiene el año y mes de la fecha local.
        const hoy = new Date(); // Inicializa hoy.
        return hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0"); // Devuelve hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") al código que llamó.
    } // Finaliza este bloque.

    function nombreMes(valor) { // Define nombreMes con sus entradas y el resultado que devuelve.
        // Convierte año-mes en un nombre de mes legible.
        const [anio, numero] = valor.split("-"); // Separa los valores recibidos en las variables [anio, numero].
        const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]; // Inicializa nombres.
        return nombres[Number(numero) - 1] + " de " + anio; // Devuelve nombres[Number(numero) - 1] + " de " + anio al código que llamó.
    } // Finaliza este bloque.

    function mesAnterior(valor) { // Define mesAnterior con sus entradas y el resultado que devuelve.
        // Calcula el mes anterior contemplando el cambio de año.
        const [anio, numero] = valor.split("-").map(Number); // Separa los valores recibidos en las variables [anio, numero].
        return (numero === 1 ? anio - 1 : anio) + "-" + String(numero === 1 ? 12 : numero - 1).padStart(2, "0"); // Devuelve (numero === 1 ? anio - 1 : anio) + "-" + String(numero === 1 ? 12 : n… al código que llamó.
    } // Finaliza este bloque.

    function pesos(centavos) { // Define pesos con sus entradas y el resultado que devuelve.
        // Formatea el importe como moneda argentina.
        return (centavos / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: centavos % 100 === 0 ? 0 : 2 }); // Devuelve (centavos / 100).toLocaleString("es-AR", { style: "currency", currenc… al código que llamó.
    } // Finaliza este bloque.

    function porcentaje(valor) { // Define porcentaje con sus entradas y el resultado que devuelve.
        // Presenta un porcentaje con un decimal como máximo.
        return valor.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%"; // Devuelve valor.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%" al código que llamó.
    } // Finaliza este bloque.

    function mostrarAviso(texto, error = false) { // Define mostrarAviso con sus entradas y el resultado que devuelve.
        // Muestra u oculta el aviso y ajusta su prioridad para lectores de pantalla.
        aviso.textContent = texto; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        aviso.hidden = !texto; // Muestra u oculta el elemento según el estado actual.
        aviso.classList.toggle("error", error); // Ajusta las clases CSS para reflejar el estado visual.
        aviso.setAttribute("role", error ? "alert" : "status"); // Actualiza role: función accesible del elemento.
        aviso.setAttribute("aria-live", error ? "assertive" : "polite"); // Actualiza aria-live: prioridad del anuncio para lectores de pantalla.
    } // Finaliza este bloque.

    // Validamos sin corregir ni escribir los registros del módulo de Santiago.
    function validarMovimientos(datos) { // Define validarMovimientos con sus entradas y el resultado que devuelve.
        // Filtra registros incompletos o inválidos antes de resumirlos.
        if (!Array.isArray(datos)) throw new Error("Los movimientos no son una lista."); // Interrumpe el recorrido y comunica el error al código que llamó.
        return datos.filter(m => { // Devuelve datos.filter(m => { al código que llamó.
            // Descarta el registro que no cumple la condición comprobada.
            if (!m || !["ingreso", "gasto"].includes(m.tipo)) return false; // Descarta el registro que no cumple la condición comprobada.
            if (typeof m.total !== "number" || m.total <= 0 || !Number.isFinite(m.total) || !Number.isSafeInteger(Math.round(m.total * 100)) || Number(m.total.toFixed(2)) !== m.total) return false; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            if (typeof m.categoria !== "string" || !m.categoria.trim()) return false; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            if (typeof m.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha)) return false; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            const [anio, numero, dia] = m.fecha.split("-").map(Number); // Separa los valores recibidos en las variables [anio, numero, dia].
            const ultimoDia = new Date(anio, numero, 0).getDate(); // Inicializa ultimoDia.
            return anio >= 1900 && anio <= 2100 && numero >= 1 && numero <= 12 && dia >= 1 && dia <= ultimoDia; // Devuelve anio >= 1900 && anio <= 2100 && numero >= 1 && numero <= 12 && dia >=… al código que llamó.
        }); // Cierra la función de respuesta y su registro o llamada.
    } // Finaliza este bloque.

    // Una petición HTTP real; los ejemplos nunca se guardan en la cuenta.
    async function cargarEjemplo() { // Define cargarEjemplo con sus entradas y el resultado que devuelve.
        // Obtiene los movimientos ficticios sin guardarlos en la cuenta.
        const datos = await NipinAPI.solicitarJSON("data/metricas.json"); // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
        return datos.movimientos; // Devuelve datos.movimientos al código que llamó.
    } // Finaliza este bloque.

    function agregarOpcion(select, valor, texto) { // Define agregarOpcion con sus entradas y el resultado que devuelve.
        // Agrega una opción al selector con texto seguro.
        const opcion = document.createElement("option"); // Crea un elemento option que se completará antes de insertarlo.
        opcion.value = valor; // Actualiza el valor visible del campo del formulario.
        opcion.textContent = texto; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        select.append(opcion); // Inserta los elementos construidos en la estructura del documento.
    } // Finaliza este bloque.

    function prepararFiltros() { // Define prepararFiltros con sus entradas y el resultado que devuelve.
        // Reconstruye meses y categorías conservando una selección válida.
        const seleccionado = filtros[modo]?.mes; // Inicializa la variable seleccionado: valor seleccionado.
        const seleccionCategoria = filtros[modo]?.categoria; // Inicializa la variable seleccionCategoria: categoría elegida.
        const meses = [...new Set(movimientos.map(m => m.fecha.slice(0, 7)))]; // Inicializa la variable meses: períodos disponibles.
        if (modo === "real" && !meses.includes(mesActual())) meses.push(mesActual()); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        meses.sort().reverse(); // Llama a meses.sort con los datos indicados.
        mes.replaceChildren(); // Reemplaza los elementos hijos sin interpretar texto como HTML.
        agregarOpcion(mes, "todos", "Todo el período"); // Llama a agregarOpcion con los datos indicados.
        meses.forEach(valor => agregarOpcion(mes, valor, nombreMes(valor))); // Ejecuta la función indicada para cada elemento de la lista.
        const inicial = modo === "real" ? mesActual() : (meses[0] || "todos"); // Inicializa inicial.
        mes.value = seleccionado === "todos" || meses.includes(seleccionado) ? seleccionado : inicial; // Actualiza el valor visible del campo del formulario.

        const categorias = [...new Set(movimientos.map(m => m.categoria))].sort((a, b) => a.localeCompare(b, "es")); // Inicializa la variable categorias: categorías admitidas.
        categoria.replaceChildren(); // Reemplaza los elementos hijos sin interpretar texto como HTML.
        agregarOpcion(categoria, "todas", "Todas las categorías"); // Llama a agregarOpcion con los datos indicados.
        categorias.forEach(valor => agregarOpcion(categoria, valor, valor)); // Ejecuta la función indicada para cada elemento de la lista.
        categoria.value = categorias.includes(seleccionCategoria) ? seleccionCategoria : "todas"; // Actualiza el valor visible del campo del formulario.
        guardarFiltros(); // Llama a guardarFiltros con los datos indicados.
    } // Finaliza este bloque.

    function guardarFiltros() { // Define guardarFiltros con sus entradas y el resultado que devuelve.
        // Conserva los filtros separados para datos reales y demostración.
        filtros[modo] = { mes: mes.value, categoria: categoria.value }; // Actualiza los datos de la estructura indicada.
    } // Finaliza este bloque.

    function filtrar(periodo) { // Define filtrar con sus entradas y el resultado que devuelve.
        // Selecciona movimientos por período y categoría.
        return movimientos.filter(m => (periodo === "todos" || m.fecha.slice(0, 7) === periodo) && (categoria.value === "todas" || m.categoria === categoria.value)); // Actualiza el valor visible del campo del formulario.
    } // Finaliza este bloque.

    // Sumamos en centavos y usamos total, sin volver a calcular las cuotas.
    function sumar(lista, tipo) { // Define sumar con sus entradas y el resultado que devuelve.
        // Acumula importes en centavos y comprueba el rango numérico seguro.
        return lista.filter(m => m.tipo === tipo).reduce((total, m) => { // Devuelve lista.filter(m => m.tipo === tipo).reduce((total, m) => { al código que llamó.
            // Acumula el total en centavos y controla que siga siendo un entero seguro.
            const suma = total + Math.round(m.total * 100); // Inicializa suma.
            if (!Number.isSafeInteger(suma)) throw new Error("Los importes acumulados superan el rango seguro del tablero."); // Interrumpe el recorrido y comunica el error al código que llamó.
            return suma; // Devuelve suma al código que llamó.
        }, 0); // Programa la acción para el siguiente turno del ciclo de eventos.
    } // Finaliza este bloque.

    function gastosPorCategoria(lista) { // Define gastosPorCategoria con sus entradas y el resultado que devuelve.
        // Agrupa los gastos y los ordena de mayor a menor importe.
        const grupos = new Map(); // Inicializa grupos.
        lista.filter(m => m.tipo === "gasto").forEach(m => { // Ejecuta la función indicada para cada elemento de la lista.
            // Acumula los gastos en centavos para cada categoría.
            grupos.set(m.categoria, (grupos.get(m.categoria) || 0) + Math.round(m.total * 100)); // Llama a grupos.set con los datos indicados.
        }); // Cierra la función de respuesta y su registro o llamada.
        return [...grupos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")); // Devuelve [...grupos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "e… al código que llamó.
    } // Finaliza este bloque.

    function mostrarBarras(grupos, gastos) { // Define mostrarBarras con sus entradas y el resultado que devuelve.
        // Construye las barras y sus etiquetas de distribución de gastos.
        const lista = panel.querySelector("#resumen-barras"); // Localiza "#resumen-barras" en el HTML para controlar ese elemento.
        lista.replaceChildren(); // Reemplaza los elementos hijos sin interpretar texto como HTML.
        panel.querySelector("#resumen-sin-gastos").hidden = grupos.length > 0; // Localiza "#resumen-sin-gastos" en el HTML para controlar ese elemento.
        grupos.forEach(([nombre, importe]) => { // Ejecuta la función indicada para cada elemento de la lista.
            // Construye una barra con su categoría, importe y porcentaje.
            const item = document.createElement("li"); // Crea un elemento li que se completará antes de insertarlo.
            const texto = document.createElement("div"); // Crea un elemento div que se completará antes de insertarlo.
            texto.className = "resumen-barra-texto"; // Actualiza texto.className.
            const etiqueta = document.createElement("strong"); // Crea un elemento strong que se completará antes de insertarlo.
            etiqueta.textContent = nombre; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            const detalle = document.createElement("span"); // Crea un elemento span que se completará antes de insertarlo.
            const parte = importe / gastos * 100; // Inicializa parte.
            detalle.textContent = pesos(importe) + " · " + porcentaje(parte); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            texto.append(etiqueta, detalle); // Inserta los elementos construidos en la estructura del documento.
            const base = document.createElement("div"); // Crea un elemento div que se completará antes de insertarlo.
            base.className = "resumen-barra-base"; // Actualiza base.className.
            base.setAttribute("aria-hidden", "true"); // Actualiza aria-hidden: propiedad del elemento en el DOM.
            const barra = document.createElement("span"); // Crea un elemento span que se completará antes de insertarlo.
            barra.className = "resumen-barra-valor"; // Actualiza barra.className.
            barra.style.width = parte + "%"; // Actualiza barra.style.width.
            base.append(barra); // Inserta los elementos construidos en la estructura del documento.
            item.append(texto, base); // Inserta los elementos construidos en la estructura del documento.
            lista.append(item); // Inserta los elementos construidos en la estructura del documento.
        }); // Cierra la función de respuesta y su registro o llamada.
    } // Finaliza este bloque.

    function diferencia(actual, anterior) { // Define diferencia con sus entradas y el resultado que devuelve.
        // Describe la diferencia de importe respecto del período anterior.
        const valor = actual - anterior; // Inicializa la variable valor: valor que se va a comprobar.
        return valor === 0 ? "Sin cambios" : (valor > 0 ? "+" : "−") + pesos(Math.abs(valor)); // Devuelve valor === 0 ? "Sin cambios" : (valor > 0 ? "+" : "−") + pesos(Math.ab… al código que llamó.
    } // Finaliza este bloque.

    function mostrarComparacion(ingresos, gastos) { // Define mostrarComparacion con sus entradas y el resultado que devuelve.
        // Compara ingresos y gastos contra el mes anterior con el mismo filtro.
        const bloque = panel.querySelector("#resumen-comparacion"); // Localiza "#resumen-comparacion" en el HTML para controlar ese elemento.
        bloque.hidden = !datosDisponibles || mes.value === "todos"; // Muestra u oculta el elemento según el estado actual.
        if (bloque.hidden) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const anterior = mesAnterior(mes.value); // Inicializa anterior.
        const lista = filtrar(anterior); // Inicializa lista.
        panel.querySelector("#resumen-comparacion-titulo").textContent = "Comparación con " + nombreMes(anterior).toLowerCase(); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector("#resumen-diferencia-ingresos").textContent = diferencia(ingresos, sumar(lista, "ingreso")); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector("#resumen-diferencia-gastos").textContent = diferencia(gastos, sumar(lista, "gasto")); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector("#resumen-comparacion-nota").textContent = lista.length ? "Diferencia de importes con el mismo filtro de categoría." : "No hay movimientos con estos filtros en el mes anterior; se compara con $0."; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
    } // Finaliza este bloque.

    function mostrarResumen() { // Define mostrarResumen con sus entradas y el resultado que devuelve.
        // Actualiza indicadores, estados vacíos, barras y anuncios del resumen.
        const lista = filtrar(mes.value); // Inicializa lista.
        const ingresos = sumar(lista, "ingreso"); // Inicializa ingresos.
        const gastos = sumar(lista, "gasto"); // Inicializa gastos.
        const saldo = ingresos - gastos; // Inicializa saldo.
        const grupos = gastosPorCategoria(lista); // Inicializa grupos.
        panel.querySelector("#resumen-ingresos").textContent = pesos(ingresos); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector("#resumen-gastos").textContent = pesos(gastos); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        const disponible = panel.querySelector("#resumen-saldo"); // Localiza "#resumen-saldo" en el HTML para controlar ese elemento.
        disponible.textContent = pesos(saldo); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        disponible.classList.toggle("gasto", saldo < 0); // Ajusta las clases CSS para reflejar el estado visual.
        disponible.classList.toggle("ingreso", saldo > 0); // Ajusta las clases CSS para reflejar el estado visual.
        panel.querySelector("#resumen-porcentaje").textContent = ingresos ? porcentaje(saldo / ingresos * 100) : "—"; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector("#resumen-cantidad").textContent = lista.length; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        const mayores = grupos.length ? grupos.filter(g => g[1] === grupos[0][1]).map(g => g[0]) : []; // Inicializa mayores.
        panel.querySelector("#resumen-categoria-mayor").textContent = mayores.length ? mayores.join(" / ") : "Sin gastos"; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector("#resumen-categoria-importe").textContent = grupos.length ? pesos(grupos[0][1]) + (mayores.length > 1 ? " en cada categoría (empate)" : " en el período") : "Todavía no hay una categoría de mayor gasto."; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector("#resumen-contexto").textContent = (mes.value === "todos" ? "Todo el período" : nombreMes(mes.value)) + " · " + (categoria.value === "todas" ? "Todas las categorías" : categoria.value); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector("#resumen-fuente").textContent = modo === "real" ? "Mis movimientos" : "Datos de ejemplo"; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.dataset.modo = modo; // Actualiza panel.dataset.modo.
        panel.querySelector("#resumen-demostracion").hidden = modo !== "demo"; // Localiza "#resumen-demostracion" en el HTML para controlar ese elemento.
        botonDemo.textContent = modo === "real" ? "Ver demostración" : "Volver a mis movimientos"; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        botonDemo.setAttribute("aria-pressed", String(modo === "demo")); // Actualiza aria-pressed: propiedad del elemento en el DOM.
        panel.querySelector(".tarjetas").hidden = !datosDisponibles; // Localiza ".tarjetas" en el HTML para controlar ese elemento.
        panel.querySelector(".resumen-grafico").hidden = !datosDisponibles; // Localiza ".resumen-grafico" en el HTML para controlar ese elemento.
        panel.querySelector("#resumen-vacio").hidden = datosDisponibles && lista.length > 0; // Localiza "#resumen-vacio" en el HTML para controlar ese elemento.
        panel.querySelector("#resumen-vacio-texto").textContent = sinSesion && modo === "real" ? "Iniciá sesión para consultar tus movimientos." : !datosDisponibles ? "Actualizá el resumen para consultar los indicadores." : movimientos.length ? "No hay movimientos para los filtros seleccionados." : "Todavía no hay movimientos para mostrar."; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        const registrar = panel.querySelector("#resumen-registrar"); // Localiza "#resumen-registrar" en el HTML para controlar ese elemento.
        registrar.hidden = modo === "demo"; // Muestra u oculta el elemento según el estado actual.
        registrar.href = sinSesion ? "index.html#/acceso" : "index.html#/registrar"; // Actualiza registrar.href.
        if (sinSesion) registrar.dataset.ruta = "acceso"; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        else registrar.dataset.ruta = "registrar"; // Ejecuta la alternativa cuando no se cumple la condición anterior.
        registrar.textContent = sinSesion ? "Iniciar sesión →" : "Registrar un movimiento →"; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        mostrarBarras(grupos, gastos); // Llama a mostrarBarras con los datos indicados.
        mostrarComparacion(ingresos, gastos); // Llama a mostrarComparacion con los datos indicados.
        estado.textContent = datosDisponibles ? (modo === "demo" ? "Demostración. " : "Mis movimientos. ") + panel.querySelector("#resumen-contexto").textContent + ". " + lista.length + " movimientos. Ingresos: " + pesos(ingresos) + ". Gastos: " + pesos(gastos) + ". Saldo: " + pesos(saldo) + "." : "No hay indicadores cargados."; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
    } // Finaliza este bloque.

    async function actualizarDatos(destino = modo) { // Define actualizarDatos con sus entradas y el resultado que devuelve.
        // Carga datos reales o ficticios y conserva la última vista válida ante errores.
        if (cargando) return; // Carga datos reales o ficticios y conserva la última vista válida ante errores.
        const revision = ++revisionDatos; // Inicializa la variable revision: versión usada para descartar respuestas anteriores.
        const foco = document.activeElement; // Inicializa foco.
        const devolverFoco = foco === botonDemo || foco === botonActualizar; // Inicializa devolverFoco.
        bloquear(true); // Llama a bloquear con los datos indicados.
        mostrarAviso(destino === "demo" ? "Cargando datos de ejemplo…" : "Actualizando resumen…"); // Llama a mostrarAviso con los datos indicados.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            let datos; // Declara la variable datos: datos que se van a procesar.
            if (destino === "demo") datos = await cargarEjemplo(); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            else { // Ejecuta la alternativa cuando no se cumple la condición anterior.
                // Consulta los movimientos propios mediante una sesión comprobada.
                const sesion = await NipinSesion.consultar(true); // Inicializa la variable sesion: datos de sesión recibidos de PHP.
                if (revision !== revisionDatos) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                    // Relee los datos de la cuenta comprobada cuando la lectura anterior provocó una limpieza.
                    if (activa && !cargando && revisionDatos === ultimaLimpieza && sesion?.usuario && NipinSesion.esUsuario(sesion.usuario.email)) return actualizarDatos("real"); // Relee los datos de la cuenta comprobada cuando la lectura anterior provocó una limpieza.
                    return; // Sale de esta función sin continuar con las instrucciones siguientes.
                } // Finaliza este bloque.
                sinSesion = sesion === null; // Actualiza si falta una cuenta autenticada.
                datos = sesion ? sesion.movimientos : []; // Actualiza datos que se van a procesar.
            } // Finaliza este bloque.
            if (revision !== revisionDatos) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            const validos = validarMovimientos(datos); // Inicializa validos.
            // Comprobar el acumulado antes de reemplazar la última vista válida.
            sumar(validos, "ingreso"); // Llama a sumar con los datos indicados.
            sumar(validos, "gasto"); // Llama a sumar con los datos indicados.
            if (datosDisponibles) guardarFiltros(); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            modo = destino; // Actualiza modo real o demostración.
            movimientos = validos; // Actualiza lista de ingresos y gastos.
            datosDisponibles = true; // Actualiza si hay datos disponibles para mostrar.
            prepararFiltros(); // Llama a prepararFiltros con los datos indicados.
            mostrarResumen(); // Llama a mostrarResumen con los datos indicados.
            const ignorados = datos.length - validos.length; // Inicializa ignorados.
            mostrarAviso(ignorados ? "Se omitieron " + ignorados + " movimientos con datos incompletos o inválidos. Los indicadores incluyen solo registros válidos." : "", ignorados > 0); // Llama a mostrarAviso con los datos indicados.
            if (modo === "real" && sinSesion) mostrarAviso("Iniciá sesión para ver tus movimientos. Mientras tanto podés ver la demostración."); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (revision !== revisionDatos) return; // Informa el fallo sin sustituir el resultado por un éxito.
            // Mantenemos la última vista correcta y ofrecemos reintentar.
            console.warn("No se pudo actualizar el resumen:", error.message); // Llama a console.warn con los datos indicados.
            const anterior = datosDisponibles ? " La vista anterior se conserva y puede estar desactualizada." : " No hay indicadores cargados."; // Inicializa anterior.
            mostrarAviso((destino === "demo" ? "No pudimos cargar la demostración." : "No pudimos leer tus movimientos.") + anterior + " Intentá nuevamente.", true); // Llama a mostrarAviso con los datos indicados.
            if (destino === "demo" && modo === "real") botonDemo.textContent = "Reintentar demostración"; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        } finally { // Ejecuta la limpieza final aunque la operación haya fallado.
            // Restablece los controles y el estado al finalizar la operación.
            if (revision !== revisionDatos) return; // Restablece los controles y el estado al finalizar la operación.
            bloquear(false); // Llama a bloquear con los datos indicados.
            if (activa && devolverFoco && document.activeElement === document.body) foco.focus({ preventScroll: true }); // Lleva el foco al control para continuar con teclado.
        } // Finaliza este bloque.
    } // Finaliza este bloque.

    // Los eventos se registran una sola vez, sin atributos on*.
    function cambiarFiltro() { // Define cambiarFiltro con sus entradas y el resultado que devuelve.
        // Guarda la selección y recalcula el resumen cuando hay datos disponibles.
        if (!cargando && datosDisponibles) { // Guarda la selección y recalcula el resumen cuando hay datos disponibles.
            // Conserva la nueva selección antes de volver a representar el resumen.
            guardarFiltros(); // Llama a guardarFiltros con los datos indicados.
            mostrarResumen(); // Llama a mostrarResumen con los datos indicados.
        } // Finaliza este bloque.
    } // Finaliza este bloque.
    mes.addEventListener("change", cambiarFiltro); // Registra la acción que se ejecuta al recibir change.
    categoria.addEventListener("change", cambiarFiltro); // Registra la acción que se ejecuta al recibir change.
    botonActualizar.addEventListener("click", () => actualizarDatos()); // Registra la acción que se ejecuta al recibir click.
    botonDemo.addEventListener("click", () => actualizarDatos(modo === "real" ? "demo" : "real")); // Registra la acción que se ejecuta al recibir click.
    prepararFiltros(); // Llama a prepararFiltros con los datos indicados.
    mostrarResumen(); // Llama a mostrarResumen con los datos indicados.
    bloquear(false); // Llama a bloquear con los datos indicados.
    return { // Devuelve las funciones o datos públicos al código que llamó.
        actualizarTrasCambio() { // Llama a actualizarTrasCambio con los datos indicados.
            // Invalida el resumen anterior y consulta nuevamente los datos reales.
            revisionDatos++; // Incrementa versión de los datos para descartar respuestas antiguas en uno.
            bloquear(false); // Llama a bloquear con los datos indicados.
            return actualizarDatos('real'); // Devuelve actualizarDatos('real') al código que llamó.
        }, // Completa la estructura o llamada iniciada arriba.
        limpiar(usuario = null) { // Llama a limpiar con los datos indicados.
            // Impide que una lectura pendiente restaure movimientos de una sesión cerrada.
            revisionDatos++; // Incrementa versión de los datos para descartar respuestas antiguas en uno.
            ultimaLimpieza = revisionDatos; // Actualiza versión de la última limpieza de datos.
            movimientos = []; // Actualiza lista de ingresos y gastos.
            modo = "real"; // Actualiza modo real o demostración.
            sinSesion = !usuario; // Actualiza si falta una cuenta autenticada.
            datosDisponibles = false; // Actualiza si hay datos disponibles para mostrar.
            filtros.real = filtros.demo = null; // Actualiza filtros.real.
            prepararFiltros(); // Llama a prepararFiltros con los datos indicados.
            mostrarResumen(); // Llama a mostrarResumen con los datos indicados.
            bloquear(false); // Llama a bloquear con los datos indicados.
            mostrarAviso(usuario ? "Actualizá el resumen para consultar los movimientos de tu cuenta." : "Iniciá sesión para ver tus movimientos. Mientras tanto podés ver la demostración."); // Llama a mostrarAviso con los datos indicados.
        }, // Completa la estructura o llamada iniciada arriba.
        entrar() { // Llama a entrar con los datos indicados.
            // Activa la vista y prepara sus datos antes de habilitar controles.
            activa = true; // Actualiza estado de la vista actual.
            revisionDatos++; // Incrementa versión de los datos para descartar respuestas antiguas en uno.
            bloquear(false); // Llama a bloquear con los datos indicados.
            actualizarDatos(); // Llama a actualizarDatos con los datos indicados.
        }, // Completa la estructura o llamada iniciada arriba.
        salir() { // Llama a salir con los datos indicados.
            // Desactiva la vista para que las respuestas pendientes no la actualicen.
            activa = false; // Actualiza estado de la vista actual.
            revisionDatos++; // Incrementa versión de los datos para descartar respuestas antiguas en uno.
            bloquear(false); // Llama a bloquear con los datos indicados.
        } // Finaliza este bloque.
    }; // Completa la estructura o llamada iniciada arriba.
})(); // Ejecuta el módulo y conserva sus funciones públicas.
