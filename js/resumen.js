// NipinFinan, resumen AE2 de Luciano Fohrholtz con demostración separada.
const NipinResumen = (() => {
    // Localiza "#resumen" en el HTML para controlar ese elemento.
    if (!document.querySelector("#resumen")) return null;
    // Inicia modo: modo real o demostración.
    let modo = "real";
    // Inicia sinSesion: si falta una cuenta autenticada.
    let sinSesion = true;
    // Inicia datosDisponibles: si hay datos disponibles para mostrar.
    let datosDisponibles = false;
    // Inicia movimientos: lista de ingresos y gastos.
    let movimientos = [];
    // Inicia cargando: estado de carga.
    let cargando = false;
    // Inicia activa: estado de la vista actual.
    let activa = false;
    // Inicia revisionDatos: versión de los datos para descartar respuestas antiguas.
    let revisionDatos = 0;
    // Inicia ultimaLimpieza: versión de la última limpieza de datos.
    let ultimaLimpieza = 0;
    // Inicia filtros: selección guardada por modo.
    const filtros = { real: null, demo: null };

    // Localiza "#resumen" en el HTML para controlar ese elemento.
    const panel = document.querySelector("#resumen");
    // Localiza "#resumen-mes" en el HTML para controlar ese elemento.
    const mes = panel.querySelector("#resumen-mes");
    // Localiza "#resumen-filtro-categoria" en el HTML para controlar ese elemento.
    const categoria = panel.querySelector("#resumen-filtro-categoria");
    // Localiza "#resumen-demo" en el HTML para controlar ese elemento.
    const botonDemo = panel.querySelector("#resumen-demo");
    // Localiza "#resumen-actualizar" en el HTML para controlar ese elemento.
    const botonActualizar = panel.querySelector("#resumen-actualizar");
    // Localiza "#resumen-aviso" en el HTML para controlar ese elemento.
    const aviso = panel.querySelector("#resumen-aviso");
    // Localiza "#resumen-estado" en el HTML para controlar ese elemento.
    const estado = panel.querySelector("#resumen-estado");

    // Define bloquear con sus entradas y el resultado que devuelve.
    function bloquear(ocupado) {
        // Actualiza estado de carga.
        cargando = ocupado;
        // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        panel.setAttribute("aria-busy", String(ocupado));
        // Habilita o bloquea el control según el estado de la operación.
        botonDemo.disabled = botonActualizar.disabled = ocupado;
        // Habilita o bloquea el control según el estado de la operación.
        mes.disabled = categoria.disabled = ocupado || !datosDisponibles;
    }

    // Define mesActual con sus entradas y el resultado que devuelve.
    function mesActual() {
        // Obtiene el año y mes de la fecha local.
        const hoy = new Date();
        // Devuelve hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") al código que llamó.
        return hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0");
    }

    // Define nombreMes con sus entradas y el resultado que devuelve.
    function nombreMes(valor) {
        // Separa los valores recibidos en las variables [anio, numero].
        const [anio, numero] = valor.split("-");
        // Inicializa nombres.
        const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        // Devuelve nombres[Number(numero) - 1] + " de " + anio al código que llamó.
        return nombres[Number(numero) - 1] + " de " + anio;
    }

    // Define mesAnterior con sus entradas y el resultado que devuelve.
    function mesAnterior(valor) {
        // Separa los valores recibidos en las variables [anio, numero].
        const [anio, numero] = valor.split("-").map(Number);
        // Devuelve (numero === 1 ? anio - 1 : anio) + "-" + String(numero === 1 ? 12 : n… al código que llamó.
        return (numero === 1 ? anio - 1 : anio) + "-" + String(numero === 1 ? 12 : numero - 1).padStart(2, "0");
    }

    // Define pesos con sus entradas y el resultado que devuelve.
    function pesos(centavos) {
        // Devuelve (centavos / 100).toLocaleString("es-AR", { style: "currency", currenc… al código que llamó.
        return (centavos / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: centavos % 100 === 0 ? 0 : 2 });
    }

    // Define porcentaje con sus entradas y el resultado que devuelve.
    function porcentaje(valor) {
        // Devuelve valor.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%" al código que llamó.
        return valor.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%";
    }

    // Define mostrarAviso con sus entradas y el resultado que devuelve.
    function mostrarAviso(texto, error = false) {
        // Muestra texto sin interpretarlo como HTML.
        aviso.textContent = texto;
        // Muestra u oculta el elemento según el estado actual.
        aviso.hidden = !texto;
        // Ajusta las clases CSS para reflejar el estado visual.
        aviso.classList.toggle("error", error);
        // Actualiza role: función accesible del elemento.
        aviso.setAttribute("role", error ? "alert" : "status");
        // Actualiza aria-live: prioridad del anuncio para lectores de pantalla.
        aviso.setAttribute("aria-live", error ? "assertive" : "polite");
    }

    // Validamos sin corregir ni escribir los registros del módulo de Santiago.
    function validarMovimientos(datos) {
        // Interrumpe la función y comunica el error.
        if (!Array.isArray(datos)) throw new Error("Los movimientos no son una lista.");
        // Devuelve datos.filter(m => { al código que llamó.
        return datos.filter(m => {
            // Descarta el registro que no cumple la condición comprobada.
            if (!m || !["ingreso", "gasto"].includes(m.tipo)) return false;
            // Comprueba esta condición.
            if (typeof m.total !== "number" || m.total <= 0 || !Number.isFinite(m.total) || !Number.isSafeInteger(Math.round(m.total * 100)) || Number(m.total.toFixed(2)) !== m.total) return false;
            // Comprueba esta condición.
            if (typeof m.categoria !== "string" || !m.categoria.trim()) return false;
            // Comprueba esta condición.
            if (typeof m.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha)) return false;
            // Separa los valores recibidos en las variables [anio, numero, dia].
            const [anio, numero, dia] = m.fecha.split("-").map(Number);
            // Inicializa ultimoDia.
            const ultimoDia = new Date(anio, numero, 0).getDate();
            // Devuelve anio >= 1900 && anio <= 2100 && numero >= 1 && numero <= 12 && dia >=… al código que llamó.
            return anio >= 1900 && anio <= 2100 && numero >= 1 && numero <= 12 && dia >= 1 && dia <= ultimoDia;
        });
    }

    // Una petición HTTP real; los ejemplos nunca se guardan en la cuenta.
    async function cargarEjemplo() {
        // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
        const datos = await NipinAPI.solicitarJSON("data/metricas.json");
        // Devuelve datos.movimientos al código que llamó.
        return datos.movimientos;
    }

    // Define agregarOpcion con sus entradas y el resultado que devuelve.
    function agregarOpcion(select, valor, texto) {
        // Crea un elemento option que se completará antes de insertarlo.
        const opcion = document.createElement("option");
        // Actualiza el valor visible del campo del formulario.
        opcion.value = valor;
        // Muestra texto sin interpretarlo como HTML.
        opcion.textContent = texto;
        // Inserta los elementos construidos en la estructura del documento.
        select.append(opcion);
    }

    // Define prepararFiltros con sus entradas y el resultado que devuelve.
    function prepararFiltros() {
        // Inicia seleccionado: valor seleccionado.
        const seleccionado = filtros[modo]?.mes;
        // Inicia seleccionCategoria: categoría elegida.
        const seleccionCategoria = filtros[modo]?.categoria;
        // Inicia meses: períodos disponibles.
        const meses = [...new Set(movimientos.map(m => m.fecha.slice(0, 7)))];
        // Comprueba esta condición.
        if (modo === "real" && !meses.includes(mesActual())) meses.push(mesActual());
        // Llama a meses.sort con los datos indicados.
        meses.sort().reverse();
        // Reemplaza los elementos hijos sin interpretar texto como HTML.
        mes.replaceChildren();
        // Llama a agregarOpcion con los datos indicados.
        agregarOpcion(mes, "todos", "Todo el período");
        // Ejecuta la función indicada para cada elemento de la lista.
        meses.forEach(valor => agregarOpcion(mes, valor, nombreMes(valor)));
        // Inicializa inicial.
        const inicial = modo === "real" ? mesActual() : (meses[0] || "todos");
        // Actualiza el valor visible del campo del formulario.
        mes.value = seleccionado === "todos" || meses.includes(seleccionado) ? seleccionado : inicial;

        // Inicia categorias: categorías admitidas.
        const categorias = [...new Set(movimientos.map(m => m.categoria))].sort((a, b) => a.localeCompare(b, "es"));
        // Reemplaza los elementos hijos sin interpretar texto como HTML.
        categoria.replaceChildren();
        // Llama a agregarOpcion con los datos indicados.
        agregarOpcion(categoria, "todas", "Todas las categorías");
        // Ejecuta la función indicada para cada elemento de la lista.
        categorias.forEach(valor => agregarOpcion(categoria, valor, valor));
        // Actualiza el valor visible del campo del formulario.
        categoria.value = categorias.includes(seleccionCategoria) ? seleccionCategoria : "todas";
        // Llama a guardarFiltros con los datos indicados.
        guardarFiltros();
    }

    // Define guardarFiltros con sus entradas y el resultado que devuelve.
    function guardarFiltros() {
        // Actualiza los datos de la estructura indicada.
        filtros[modo] = { mes: mes.value, categoria: categoria.value };
    }

    // Define filtrar con sus entradas y el resultado que devuelve.
    function filtrar(periodo) {
        // Actualiza el valor visible del campo del formulario.
        return movimientos.filter(m => (periodo === "todos" || m.fecha.slice(0, 7) === periodo) && (categoria.value === "todas" || m.categoria === categoria.value));
    }

    // Sumamos en centavos y usamos total, sin volver a calcular las cuotas.
    function sumar(lista, tipo) {
        // Devuelve lista.filter(m => m.tipo === tipo).reduce((total, m) => { al código que llamó.
        return lista.filter(m => m.tipo === tipo).reduce((total, m) => {
            // Acumula el total en centavos y controla que siga siendo un entero seguro.
            const suma = total + Math.round(m.total * 100);
            // Interrumpe la función y comunica el error.
            if (!Number.isSafeInteger(suma)) throw new Error("Los importes acumulados superan el rango seguro del tablero.");
            // Devuelve suma al código que llamó.
            return suma;
        }, 0);
    }

    // Define gastosPorCategoria con sus entradas y el resultado que devuelve.
    function gastosPorCategoria(lista) {
        // Agrupa los gastos y los ordena de mayor a menor importe.
        const grupos = new Map();
        // Ejecuta la función indicada para cada elemento de la lista.
        lista.filter(m => m.tipo === "gasto").forEach(m => {
            // Llama a grupos.set con los datos indicados.
            grupos.set(m.categoria, (grupos.get(m.categoria) || 0) + Math.round(m.total * 100));
        });
        // Devuelve [...grupos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "e… al código que llamó.
        return [...grupos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    }

    // Define mostrarBarras con sus entradas y el resultado que devuelve.
    function mostrarBarras(grupos, gastos) {
        // Localiza "#resumen-barras" en el HTML para controlar ese elemento.
        const lista = panel.querySelector("#resumen-barras");
        // Reemplaza los elementos hijos sin interpretar texto como HTML.
        lista.replaceChildren();
        // Localiza "#resumen-sin-gastos" en el HTML para controlar ese elemento.
        panel.querySelector("#resumen-sin-gastos").hidden = grupos.length > 0;
        // Ejecuta la función indicada para cada elemento de la lista.
        grupos.forEach(([nombre, importe]) => {
            // Crea un elemento li que se completará antes de insertarlo.
            const item = document.createElement("li");
            // Crea un elemento div que se completará antes de insertarlo.
            const texto = document.createElement("div");
            // Actualiza texto.className.
            texto.className = "resumen-barra-texto";
            // Crea un elemento strong que se completará antes de insertarlo.
            const etiqueta = document.createElement("strong");
            // Muestra texto sin interpretarlo como HTML.
            etiqueta.textContent = nombre;
            // Crea un elemento span que se completará antes de insertarlo.
            const detalle = document.createElement("span");
            // Inicializa parte.
            const parte = importe / gastos * 100;
            // Muestra texto sin interpretarlo como HTML.
            detalle.textContent = pesos(importe) + " · " + porcentaje(parte);
            // Inserta los elementos construidos en la estructura del documento.
            texto.append(etiqueta, detalle);
            // Crea un elemento div que se completará antes de insertarlo.
            const base = document.createElement("div");
            // Actualiza base.className.
            base.className = "resumen-barra-base";
            // Actualiza aria-hidden: propiedad del elemento en el DOM.
            base.setAttribute("aria-hidden", "true");
            // Crea un elemento span que se completará antes de insertarlo.
            const barra = document.createElement("span");
            // Actualiza barra.className.
            barra.className = "resumen-barra-valor";
            // Actualiza barra.style.width.
            barra.style.width = parte + "%";
            // Inserta los elementos construidos en la estructura del documento.
            base.append(barra);
            // Inserta los elementos construidos en la estructura del documento.
            item.append(texto, base);
            // Inserta los elementos construidos en la estructura del documento.
            lista.append(item);
        });
    }

    // Define diferencia con sus entradas y el resultado que devuelve.
    function diferencia(actual, anterior) {
        // Inicia valor: valor que se va a comprobar.
        const valor = actual - anterior;
        // Devuelve valor === 0 ? "Sin cambios" : (valor > 0 ? "+" : "−") + pesos(Math.ab… al código que llamó.
        return valor === 0 ? "Sin cambios" : (valor > 0 ? "+" : "−") + pesos(Math.abs(valor));
    }

    // Define mostrarComparacion con sus entradas y el resultado que devuelve.
    function mostrarComparacion(ingresos, gastos) {
        // Localiza "#resumen-comparacion" en el HTML para controlar ese elemento.
        const bloque = panel.querySelector("#resumen-comparacion");
        // Muestra u oculta el elemento según el estado actual.
        bloque.hidden = !datosDisponibles || mes.value === "todos";
        // Comprueba esta condición.
        if (bloque.hidden) return;
        // Inicializa anterior.
        const anterior = mesAnterior(mes.value);
        // Inicializa lista.
        const lista = filtrar(anterior);
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-comparacion-titulo").textContent = "Comparación con " + nombreMes(anterior).toLowerCase();
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-diferencia-ingresos").textContent = diferencia(ingresos, sumar(lista, "ingreso"));
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-diferencia-gastos").textContent = diferencia(gastos, sumar(lista, "gasto"));
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-comparacion-nota").textContent = lista.length ? "Diferencia de importes con el mismo filtro de categoría." : "No hay movimientos con estos filtros en el mes anterior; se compara con $0.";
    }

    // Define mostrarResumen con sus entradas y el resultado que devuelve.
    function mostrarResumen() {
        // Actualiza indicadores, estados vacíos, barras y anuncios del resumen.
        const lista = filtrar(mes.value);
        // Inicializa ingresos.
        const ingresos = sumar(lista, "ingreso");
        // Inicializa gastos.
        const gastos = sumar(lista, "gasto");
        // Inicializa saldo.
        const saldo = ingresos - gastos;
        // Inicializa grupos.
        const grupos = gastosPorCategoria(lista);
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-ingresos").textContent = pesos(ingresos);
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-gastos").textContent = pesos(gastos);
        // Localiza "#resumen-saldo" en el HTML para controlar ese elemento.
        const disponible = panel.querySelector("#resumen-saldo");
        // Muestra texto sin interpretarlo como HTML.
        disponible.textContent = pesos(saldo);
        // Ajusta las clases CSS para reflejar el estado visual.
        disponible.classList.toggle("gasto", saldo < 0);
        // Ajusta las clases CSS para reflejar el estado visual.
        disponible.classList.toggle("ingreso", saldo > 0);
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-porcentaje").textContent = ingresos ? porcentaje(saldo / ingresos * 100) : "—";
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-cantidad").textContent = lista.length;
        // Inicializa mayores.
        const mayores = grupos.length ? grupos.filter(g => g[1] === grupos[0][1]).map(g => g[0]) : [];
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-categoria-mayor").textContent = mayores.length ? mayores.join(" / ") : "Sin gastos";
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-categoria-importe").textContent = grupos.length ? pesos(grupos[0][1]) + (mayores.length > 1 ? " en cada categoría (empate)" : " en el período") : "Todavía no hay una categoría de mayor gasto.";
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-contexto").textContent = (mes.value === "todos" ? "Todo el período" : nombreMes(mes.value)) + " · " + (categoria.value === "todas" ? "Todas las categorías" : categoria.value);
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-fuente").textContent = modo === "real" ? "Mis movimientos" : "Datos de ejemplo";
        // Actualiza panel.dataset.modo.
        panel.dataset.modo = modo;
        // Localiza "#resumen-demostracion" en el HTML para controlar ese elemento.
        panel.querySelector("#resumen-demostracion").hidden = modo !== "demo";
        // Muestra texto sin interpretarlo como HTML.
        botonDemo.textContent = modo === "real" ? "Ver demostración" : "Volver a mis movimientos";
        // Actualiza aria-pressed: propiedad del elemento en el DOM.
        botonDemo.setAttribute("aria-pressed", String(modo === "demo"));
        // Localiza ".tarjetas" en el HTML para controlar ese elemento.
        panel.querySelector(".tarjetas").hidden = !datosDisponibles;
        // Localiza ".resumen-grafico" en el HTML para controlar ese elemento.
        panel.querySelector(".resumen-grafico").hidden = !datosDisponibles;
        // Localiza "#resumen-vacio" en el HTML para controlar ese elemento.
        panel.querySelector("#resumen-vacio").hidden = datosDisponibles && lista.length > 0;
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector("#resumen-vacio-texto").textContent = sinSesion && modo === "real" ? "Iniciá sesión para consultar tus movimientos." : !datosDisponibles ? "Actualizá el resumen para consultar los indicadores." : movimientos.length ? "No hay movimientos para los filtros seleccionados." : "Todavía no hay movimientos para mostrar.";
        // Localiza "#resumen-registrar" en el HTML para controlar ese elemento.
        const registrar = panel.querySelector("#resumen-registrar");
        // Muestra u oculta el elemento según el estado actual.
        registrar.hidden = modo === "demo";
        // Actualiza registrar.href.
        registrar.href = sinSesion ? "index.html#/acceso" : "index.html#/registrar";
        // Comprueba esta condición.
        if (sinSesion) registrar.dataset.ruta = "acceso";
        // Ejecuta la alternativa cuando no se cumple la condición anterior.
        else registrar.dataset.ruta = "registrar";
        // Muestra texto sin interpretarlo como HTML.
        registrar.textContent = sinSesion ? "Iniciar sesión →" : "Registrar un movimiento →";
        // Llama a mostrarBarras con los datos indicados.
        mostrarBarras(grupos, gastos);
        // Llama a mostrarComparacion con los datos indicados.
        mostrarComparacion(ingresos, gastos);
        // Muestra texto sin interpretarlo como HTML.
        estado.textContent = datosDisponibles ? (modo === "demo" ? "Demostración. " : "Mis movimientos. ") + panel.querySelector("#resumen-contexto").textContent + ". " + lista.length + " movimientos. Ingresos: " + pesos(ingresos) + ". Gastos: " + pesos(gastos) + ". Saldo: " + pesos(saldo) + "." : "No hay indicadores cargados.";
    }

    // Define actualizarDatos con sus entradas y el resultado que devuelve.
    async function actualizarDatos(destino = modo) {
        // Carga datos reales o ficticios y conserva la última vista válida ante errores.
        if (cargando) return;
        // Inicia revision: versión usada para descartar respuestas anteriores.
        const revision = ++revisionDatos;
        // Inicializa foco.
        const foco = document.activeElement;
        // Inicializa devolverFoco.
        const devolverFoco = foco === botonDemo || foco === botonActualizar;
        // Llama a bloquear con los datos indicados.
        bloquear(true);
        // Llama a mostrarAviso con los datos indicados.
        mostrarAviso(destino === "demo" ? "Cargando datos de ejemplo…" : "Actualizando resumen…");
        // Intenta la operación y permite capturar sus errores.
        try {
            // Declara datos: datos que se van a procesar.
            let datos;
            // Comprueba esta condición.
            if (destino === "demo") datos = await cargarEjemplo();
            // Ejecuta la alternativa cuando no se cumple la condición anterior.
            else {
                // Inicia sesion: datos de sesión recibidos de PHP.
                const sesion = await NipinSesion.consultar(true);
                // Comprueba esta condición.
                if (revision !== revisionDatos) {
                    // Relee los datos de la cuenta comprobada cuando la lectura anterior provocó una limpieza.
                    if (activa && !cargando && revisionDatos === ultimaLimpieza && sesion?.usuario && NipinSesion.esUsuario(sesion.usuario.email)) return actualizarDatos("real");
                    // Sale de esta función sin continuar con las instrucciones siguientes.
                    return;
                }
                // Actualiza si falta una cuenta autenticada.
                sinSesion = sesion === null;
                // Actualiza datos que se van a procesar.
                datos = sesion ? sesion.movimientos : [];
            }
            // Comprueba esta condición.
            if (revision !== revisionDatos) return;
            // Inicializa validos.
            const validos = validarMovimientos(datos);
            // Llama a sumar con los datos indicados.
            sumar(validos, "ingreso");
            // Llama a sumar con los datos indicados.
            sumar(validos, "gasto");
            // Comprueba esta condición.
            if (datosDisponibles) guardarFiltros();
            // Actualiza modo real o demostración.
            modo = destino;
            // Actualiza lista de ingresos y gastos.
            movimientos = validos;
            // Actualiza si hay datos disponibles para mostrar.
            datosDisponibles = true;
            // Llama a prepararFiltros con los datos indicados.
            prepararFiltros();
            // Llama a mostrarResumen con los datos indicados.
            mostrarResumen();
            // Inicializa ignorados.
            const ignorados = datos.length - validos.length;
            // Llama a mostrarAviso con los datos indicados.
            mostrarAviso(ignorados ? "Se omitieron " + ignorados + " movimientos con datos incompletos o inválidos. Los indicadores incluyen solo registros válidos." : "", ignorados > 0);
            // Comprueba esta condición.
            if (modo === "real" && sinSesion) mostrarAviso("Iniciá sesión para ver tus movimientos. Mientras tanto podés ver la demostración.");
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (revision !== revisionDatos) return;
            // Llama a console.warn con los datos indicados.
            console.warn("No se pudo actualizar el resumen:", error.message);
            // Inicializa anterior.
            const anterior = datosDisponibles ? " La vista anterior se conserva y puede estar desactualizada." : " No hay indicadores cargados.";
            // Llama a mostrarAviso con los datos indicados.
            mostrarAviso((destino === "demo" ? "No pudimos cargar la demostración." : "No pudimos leer tus movimientos.") + anterior + " Intentá nuevamente.", true);
            // Muestra texto sin interpretarlo como HTML.
            if (destino === "demo" && modo === "real") botonDemo.textContent = "Reintentar demostración";
        // Limpia el estado, incluso si la operación falló.
        } finally {
            // Restablece los controles y el estado al finalizar la operación.
            if (revision !== revisionDatos) return;
            // Llama a bloquear con los datos indicados.
            bloquear(false);
            // Lleva el foco al control.
            if (activa && devolverFoco && document.activeElement === document.body) foco.focus({ preventScroll: true });
        }
    }

    // Los eventos se registran una sola vez, sin atributos on*.
    function cambiarFiltro() {
        // Guarda la selección y recalcula el resumen cuando hay datos disponibles.
        if (!cargando && datosDisponibles) {
            // Llama a guardarFiltros con los datos indicados.
            guardarFiltros();
            // Llama a mostrarResumen con los datos indicados.
            mostrarResumen();
        }
    }
    // Registra la acción que se ejecuta al recibir change.
    mes.addEventListener("change", cambiarFiltro);
    // Registra la acción que se ejecuta al recibir change.
    categoria.addEventListener("change", cambiarFiltro);
    // Registra la acción que se ejecuta al recibir click.
    botonActualizar.addEventListener("click", () => actualizarDatos());
    // Registra la acción que se ejecuta al recibir click.
    botonDemo.addEventListener("click", () => actualizarDatos(modo === "real" ? "demo" : "real"));
    // Llama a prepararFiltros con los datos indicados.
    prepararFiltros();
    // Llama a mostrarResumen con los datos indicados.
    mostrarResumen();
    // Llama a bloquear con los datos indicados.
    bloquear(false);
    // Devuelve las funciones o datos públicos al código que llamó.
    return {
        // Llama a actualizarTrasCambio con los datos indicados.
        actualizarTrasCambio() {
            // Incrementa versión de los datos para descartar respuestas antiguas en uno.
            revisionDatos++;
            // Llama a bloquear con los datos indicados.
            bloquear(false);
            // Devuelve actualizarDatos('real') al código que llamó.
            return actualizarDatos('real');
        },
        // Llama a limpiar con los datos indicados.
        limpiar(usuario = null) {
            // Incrementa versión de los datos para descartar respuestas antiguas en uno.
            revisionDatos++;
            // Actualiza versión de la última limpieza de datos.
            ultimaLimpieza = revisionDatos;
            // Actualiza lista de ingresos y gastos.
            movimientos = [];
            // Actualiza modo real o demostración.
            modo = "real";
            // Actualiza si falta una cuenta autenticada.
            sinSesion = !usuario;
            // Actualiza si hay datos disponibles para mostrar.
            datosDisponibles = false;
            // Actualiza filtros.real.
            filtros.real = filtros.demo = null;
            // Llama a prepararFiltros con los datos indicados.
            prepararFiltros();
            // Llama a mostrarResumen con los datos indicados.
            mostrarResumen();
            // Llama a bloquear con los datos indicados.
            bloquear(false);
            // Llama a mostrarAviso con los datos indicados.
            mostrarAviso(usuario ? "Actualizá el resumen para consultar los movimientos de tu cuenta." : "Iniciá sesión para ver tus movimientos. Mientras tanto podés ver la demostración.");
        },
        // Llama a entrar con los datos indicados.
        entrar() {
            // Actualiza estado de la vista actual.
            activa = true;
            // Incrementa versión de los datos para descartar respuestas antiguas en uno.
            revisionDatos++;
            // Llama a bloquear con los datos indicados.
            bloquear(false);
            // Llama a actualizarDatos con los datos indicados.
            actualizarDatos();
        },
        // Llama a salir con los datos indicados.
        salir() {
            // Actualiza estado de la vista actual.
            activa = false;
            // Incrementa versión de los datos para descartar respuestas antiguas en uno.
            revisionDatos++;
            // Llama a bloquear con los datos indicados.
            bloquear(false);
        }
    };
})();
