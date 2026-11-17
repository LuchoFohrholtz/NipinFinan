// NipinFinan, resumen AE2 de Luciano Fohrholtz con demostración separada.
const NipinResumen = (() => {
    // Conserva filtros y datos separados para resumen real y demostración.
    if (!document.querySelector("#resumen")) return null;
    let modo = "real";
    let sinSesion = true;
    let datosDisponibles = false;
    let movimientos = [];
    let cargando = false;
    let activa = false;
    let revisionDatos = 0;
    let ultimaLimpieza = 0;
    const filtros = { real: null, demo: null };

    const panel = document.querySelector("#resumen");
    const mes = panel.querySelector("#resumen-mes");
    const categoria = panel.querySelector("#resumen-filtro-categoria");
    const botonDemo = panel.querySelector("#resumen-demo");
    const botonActualizar = panel.querySelector("#resumen-actualizar");
    const aviso = panel.querySelector("#resumen-aviso");
    const estado = panel.querySelector("#resumen-estado");

    function bloquear(ocupado) {
        // Habilita o bloquea los controles durante la operación.
        cargando = ocupado;
        panel.setAttribute("aria-busy", String(ocupado));
        botonDemo.disabled = botonActualizar.disabled = ocupado;
        mes.disabled = categoria.disabled = ocupado || !datosDisponibles;
    }

    function mesActual() {
        // Obtiene el año y mes de la fecha local.
        const hoy = new Date();
        return hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0");
    }

    function nombreMes(valor) {
        // Convierte año-mes en un nombre de mes legible.
        const [anio, numero] = valor.split("-");
        const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return nombres[Number(numero) - 1] + " de " + anio;
    }

    function mesAnterior(valor) {
        // Calcula el mes anterior contemplando el cambio de año.
        const [anio, numero] = valor.split("-").map(Number);
        return (numero === 1 ? anio - 1 : anio) + "-" + String(numero === 1 ? 12 : numero - 1).padStart(2, "0");
    }

    function pesos(centavos) {
        // Formatea el importe como moneda argentina.
        return (centavos / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: centavos % 100 === 0 ? 0 : 2 });
    }

    function porcentaje(valor) {
        // Presenta un porcentaje con un decimal como máximo.
        return valor.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%";
    }

    function mostrarAviso(texto, error = false) {
        // Muestra u oculta el aviso y ajusta su prioridad para lectores de pantalla.
        aviso.textContent = texto;
        aviso.hidden = !texto;
        aviso.classList.toggle("error", error);
        aviso.setAttribute("role", error ? "alert" : "status");
        aviso.setAttribute("aria-live", error ? "assertive" : "polite");
    }

    // Validamos sin corregir ni escribir los registros del módulo de Santiago.
    function validarMovimientos(datos) {
        // Filtra registros incompletos o inválidos antes de resumirlos.
        if (!Array.isArray(datos)) throw new Error("Los movimientos no son una lista.");
        return datos.filter(m => {
            // Descarta el registro que no cumple la condición comprobada.
            if (!m || !["ingreso", "gasto"].includes(m.tipo)) return false;
            if (typeof m.total !== "number" || m.total <= 0 || !Number.isFinite(m.total) || !Number.isSafeInteger(Math.round(m.total * 100)) || Number(m.total.toFixed(2)) !== m.total) return false;
            if (typeof m.categoria !== "string" || !m.categoria.trim()) return false;
            if (typeof m.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha)) return false;
            const [anio, numero, dia] = m.fecha.split("-").map(Number);
            const ultimoDia = new Date(anio, numero, 0).getDate();
            return anio >= 1900 && anio <= 2100 && numero >= 1 && numero <= 12 && dia >= 1 && dia <= ultimoDia;
        });
    }

    // Una petición HTTP real; los ejemplos nunca se guardan en la cuenta.
    async function cargarEjemplo() {
        // Obtiene los movimientos ficticios sin guardarlos en la cuenta.
        const datos = await NipinAPI.solicitarJSON("data/metricas.json");
        return datos.movimientos;
    }

    function agregarOpcion(select, valor, texto) {
        // Agrega una opción al selector con texto seguro.
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        select.append(opcion);
    }

    function prepararFiltros() {
        // Reconstruye meses y categorías conservando una selección válida.
        const seleccionado = filtros[modo]?.mes;
        const seleccionCategoria = filtros[modo]?.categoria;
        const meses = [...new Set(movimientos.map(m => m.fecha.slice(0, 7)))];
        if (modo === "real" && !meses.includes(mesActual())) meses.push(mesActual());
        meses.sort().reverse();
        mes.replaceChildren();
        agregarOpcion(mes, "todos", "Todo el período");
        meses.forEach(valor => agregarOpcion(mes, valor, nombreMes(valor)));
        const inicial = modo === "real" ? mesActual() : (meses[0] || "todos");
        mes.value = seleccionado === "todos" || meses.includes(seleccionado) ? seleccionado : inicial;

        const categorias = [...new Set(movimientos.map(m => m.categoria))].sort((a, b) => a.localeCompare(b, "es"));
        categoria.replaceChildren();
        agregarOpcion(categoria, "todas", "Todas las categorías");
        categorias.forEach(valor => agregarOpcion(categoria, valor, valor));
        categoria.value = categorias.includes(seleccionCategoria) ? seleccionCategoria : "todas";
        guardarFiltros();
    }

    function guardarFiltros() {
        // Conserva los filtros separados para datos reales y demostración.
        filtros[modo] = { mes: mes.value, categoria: categoria.value };
    }

    function filtrar(periodo) {
        // Selecciona movimientos por período y categoría.
        return movimientos.filter(m => (periodo === "todos" || m.fecha.slice(0, 7) === periodo) && (categoria.value === "todas" || m.categoria === categoria.value));
    }

    // Sumamos en centavos y usamos total, sin volver a calcular las cuotas.
    function sumar(lista, tipo) {
        // Acumula importes en centavos y comprueba el rango numérico seguro.
        return lista.filter(m => m.tipo === tipo).reduce((total, m) => {
            // Acumula el total en centavos y controla que siga siendo un entero seguro.
            const suma = total + Math.round(m.total * 100);
            if (!Number.isSafeInteger(suma)) throw new Error("Los importes acumulados superan el rango seguro del tablero.");
            return suma;
        }, 0);
    }

    function gastosPorCategoria(lista) {
        // Agrupa los gastos y los ordena de mayor a menor importe.
        const grupos = new Map();
        lista.filter(m => m.tipo === "gasto").forEach(m => {
            // Acumula los gastos en centavos para cada categoría.
            grupos.set(m.categoria, (grupos.get(m.categoria) || 0) + Math.round(m.total * 100));
        });
        return [...grupos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    }

    function mostrarBarras(grupos, gastos) {
        // Construye las barras y sus etiquetas de distribución de gastos.
        const lista = panel.querySelector("#resumen-barras");
        lista.replaceChildren();
        panel.querySelector("#resumen-sin-gastos").hidden = grupos.length > 0;
        grupos.forEach(([nombre, importe]) => {
            // Construye una barra con su categoría, importe y porcentaje.
            const item = document.createElement("li");
            const texto = document.createElement("div");
            texto.className = "resumen-barra-texto";
            const etiqueta = document.createElement("strong");
            etiqueta.textContent = nombre;
            const detalle = document.createElement("span");
            const parte = importe / gastos * 100;
            detalle.textContent = pesos(importe) + " · " + porcentaje(parte);
            texto.append(etiqueta, detalle);
            const base = document.createElement("div");
            base.className = "resumen-barra-base";
            base.setAttribute("aria-hidden", "true");
            const barra = document.createElement("span");
            barra.className = "resumen-barra-valor";
            barra.style.width = parte + "%";
            base.append(barra);
            item.append(texto, base);
            lista.append(item);
        });
    }

    function diferencia(actual, anterior) {
        // Describe la diferencia de importe respecto del período anterior.
        const valor = actual - anterior;
        return valor === 0 ? "Sin cambios" : (valor > 0 ? "+" : "−") + pesos(Math.abs(valor));
    }

    function mostrarComparacion(ingresos, gastos) {
        // Compara ingresos y gastos contra el mes anterior con el mismo filtro.
        const bloque = panel.querySelector("#resumen-comparacion");
        bloque.hidden = !datosDisponibles || mes.value === "todos";
        if (bloque.hidden) return;
        const anterior = mesAnterior(mes.value);
        const lista = filtrar(anterior);
        panel.querySelector("#resumen-comparacion-titulo").textContent = "Comparación con " + nombreMes(anterior).toLowerCase();
        panel.querySelector("#resumen-diferencia-ingresos").textContent = diferencia(ingresos, sumar(lista, "ingreso"));
        panel.querySelector("#resumen-diferencia-gastos").textContent = diferencia(gastos, sumar(lista, "gasto"));
        panel.querySelector("#resumen-comparacion-nota").textContent = lista.length ? "Diferencia de importes con el mismo filtro de categoría." : "No hay movimientos con estos filtros en el mes anterior; se compara con $0.";
    }

    function mostrarResumen() {
        // Actualiza indicadores, estados vacíos, barras y anuncios del resumen.
        const lista = filtrar(mes.value);
        const ingresos = sumar(lista, "ingreso");
        const gastos = sumar(lista, "gasto");
        const saldo = ingresos - gastos;
        const grupos = gastosPorCategoria(lista);
        panel.querySelector("#resumen-ingresos").textContent = pesos(ingresos);
        panel.querySelector("#resumen-gastos").textContent = pesos(gastos);
        const disponible = panel.querySelector("#resumen-saldo");
        disponible.textContent = pesos(saldo);
        disponible.classList.toggle("gasto", saldo < 0);
        disponible.classList.toggle("ingreso", saldo > 0);
        panel.querySelector("#resumen-porcentaje").textContent = ingresos ? porcentaje(saldo / ingresos * 100) : "—";
        panel.querySelector("#resumen-cantidad").textContent = lista.length;
        const mayores = grupos.length ? grupos.filter(g => g[1] === grupos[0][1]).map(g => g[0]) : [];
        panel.querySelector("#resumen-categoria-mayor").textContent = mayores.length ? mayores.join(" / ") : "Sin gastos";
        panel.querySelector("#resumen-categoria-importe").textContent = grupos.length ? pesos(grupos[0][1]) + (mayores.length > 1 ? " en cada categoría (empate)" : " en el período") : "Todavía no hay una categoría de mayor gasto.";
        panel.querySelector("#resumen-contexto").textContent = (mes.value === "todos" ? "Todo el período" : nombreMes(mes.value)) + " · " + (categoria.value === "todas" ? "Todas las categorías" : categoria.value);
        panel.querySelector("#resumen-fuente").textContent = modo === "real" ? "Mis movimientos" : "Datos de ejemplo";
        panel.dataset.modo = modo;
        panel.querySelector("#resumen-demostracion").hidden = modo !== "demo";
        botonDemo.textContent = modo === "real" ? "Ver demostración" : "Volver a mis movimientos";
        botonDemo.setAttribute("aria-pressed", String(modo === "demo"));
        panel.querySelector(".tarjetas").hidden = !datosDisponibles;
        panel.querySelector(".resumen-grafico").hidden = !datosDisponibles;
        panel.querySelector("#resumen-vacio").hidden = datosDisponibles && lista.length > 0;
        panel.querySelector("#resumen-vacio-texto").textContent = sinSesion && modo === "real" ? "Iniciá sesión para consultar tus movimientos." : !datosDisponibles ? "Actualizá el resumen para consultar los indicadores." : movimientos.length ? "No hay movimientos para los filtros seleccionados." : "Todavía no hay movimientos para mostrar.";
        const registrar = panel.querySelector("#resumen-registrar");
        registrar.hidden = modo === "demo";
        registrar.href = sinSesion ? "index.html#/acceso" : "index.html#/registrar";
        if (sinSesion) registrar.dataset.ruta = "acceso";
        else registrar.dataset.ruta = "registrar";
        registrar.textContent = sinSesion ? "Iniciar sesión →" : "Registrar un movimiento →";
        mostrarBarras(grupos, gastos);
        mostrarComparacion(ingresos, gastos);
        estado.textContent = datosDisponibles ? (modo === "demo" ? "Demostración. " : "Mis movimientos. ") + panel.querySelector("#resumen-contexto").textContent + ". " + lista.length + " movimientos. Ingresos: " + pesos(ingresos) + ". Gastos: " + pesos(gastos) + ". Saldo: " + pesos(saldo) + "." : "No hay indicadores cargados.";
    }

    async function actualizarDatos(destino = modo) {
        // Carga datos reales o ficticios y conserva la última vista válida ante errores.
        if (cargando) return;
        const revision = ++revisionDatos;
        const foco = document.activeElement;
        const devolverFoco = foco === botonDemo || foco === botonActualizar;
        bloquear(true);
        mostrarAviso(destino === "demo" ? "Cargando datos de ejemplo…" : "Actualizando resumen…");
        try {
            // Ejecuta la operación y permite tratar sus errores.
            let datos;
            if (destino === "demo") datos = await cargarEjemplo();
            else {
                // Consulta los movimientos propios mediante una sesión comprobada.
                const sesion = await NipinSesion.consultar(true);
                if (revision !== revisionDatos) {
                    // Relee los datos de la cuenta comprobada cuando la lectura anterior provocó una limpieza.
                    if (activa && !cargando && revisionDatos === ultimaLimpieza && sesion?.usuario && NipinSesion.esUsuario(sesion.usuario.email)) return actualizarDatos("real");
                    return;
                }
                sinSesion = sesion === null;
                datos = sesion ? sesion.movimientos : [];
            }
            if (revision !== revisionDatos) return;
            const validos = validarMovimientos(datos);
            // Comprobar el acumulado antes de reemplazar la última vista válida.
            sumar(validos, "ingreso");
            sumar(validos, "gasto");
            if (datosDisponibles) guardarFiltros();
            modo = destino;
            movimientos = validos;
            datosDisponibles = true;
            prepararFiltros();
            mostrarResumen();
            const ignorados = datos.length - validos.length;
            mostrarAviso(ignorados ? "Se omitieron " + ignorados + " movimientos con datos incompletos o inválidos. Los indicadores incluyen solo registros válidos." : "", ignorados > 0);
            if (modo === "real" && sinSesion) mostrarAviso("Iniciá sesión para ver tus movimientos. Mientras tanto podés ver la demostración.");
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (revision !== revisionDatos) return;
            // Mantenemos la última vista correcta y ofrecemos reintentar.
            console.warn("No se pudo actualizar el resumen:", error.message);
            const anterior = datosDisponibles ? " La vista anterior se conserva y puede estar desactualizada." : " No hay indicadores cargados.";
            mostrarAviso((destino === "demo" ? "No pudimos cargar la demostración." : "No pudimos leer tus movimientos.") + anterior + " Intentá nuevamente.", true);
            if (destino === "demo" && modo === "real") botonDemo.textContent = "Reintentar demostración";
        } finally {
            // Restablece los controles y el estado al finalizar la operación.
            if (revision !== revisionDatos) return;
            bloquear(false);
            if (activa && devolverFoco && document.activeElement === document.body) foco.focus({ preventScroll: true });
        }
    }

    // Los eventos se registran una sola vez, sin atributos on*.
    function cambiarFiltro() {
        // Guarda la selección y recalcula el resumen cuando hay datos disponibles.
        if (!cargando && datosDisponibles) {
            // Conserva la nueva selección antes de volver a representar el resumen.
            guardarFiltros();
            mostrarResumen();
        }
    }
    mes.addEventListener("change", cambiarFiltro);
    categoria.addEventListener("change", cambiarFiltro);
    botonActualizar.addEventListener("click", () => actualizarDatos());
    botonDemo.addEventListener("click", () => actualizarDatos(modo === "real" ? "demo" : "real"));
    prepararFiltros();
    mostrarResumen();
    bloquear(false);
    return {
        actualizarTrasCambio() {
            // Invalida el resumen anterior y consulta nuevamente los datos reales.
            revisionDatos++;
            bloquear(false);
            return actualizarDatos('real');
        },
        limpiar(usuario = null) {
            // Impide que una lectura pendiente restaure movimientos de una sesión cerrada.
            revisionDatos++;
            ultimaLimpieza = revisionDatos;
            movimientos = [];
            modo = "real";
            sinSesion = !usuario;
            datosDisponibles = false;
            filtros.real = filtros.demo = null;
            prepararFiltros();
            mostrarResumen();
            bloquear(false);
            mostrarAviso(usuario ? "Actualizá el resumen para consultar los movimientos de tu cuenta." : "Iniciá sesión para ver tus movimientos. Mientras tanto podés ver la demostración.");
        },
        entrar() {
            // Activa la vista y prepara sus datos antes de habilitar controles.
            activa = true;
            revisionDatos++;
            bloquear(false);
            actualizarDatos();
        },
        salir() {
            // Desactiva la vista para que las respuestas pendientes no la actualicen.
            activa = false;
            revisionDatos++;
            bloquear(false);
        }
    };
})();
