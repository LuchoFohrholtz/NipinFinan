// Muestra la vista de index.html indicada por el hash y coordina su módulo y foco.
const NipinNavegacion = (() => {
    // Localiza "#contenido" en el HTML para controlar ese elemento.
    const contenido = document.querySelector("#contenido");
    // Comprueba esta condición.
    if (!contenido) {
        // Localiza "[data-acceso-antiguo]" en el HTML para controlar ese elemento.
        if (document.querySelector("[data-acceso-antiguo]")) location.replace("index.html#/acceso");
        // Localiza "[data-registro-antiguo]" en el HTML para controlar ese elemento.
        if (document.querySelector("[data-registro-antiguo]")) location.replace("index.html#/registrar");
        // Localiza "[data-listado-antiguo]" en el HTML para controlar ese elemento.
        if (document.querySelector("[data-listado-antiguo]")) location.replace("index.html#/movimientos");
        // Localiza "[data-categorias-antiguo]" en el HTML para controlar ese elemento.
        if (document.querySelector("[data-categorias-antiguo]")) location.replace("index.html#/categorias");
        // Localiza "[data-categoria-antigua]" en el HTML para controlar ese elemento.
        if (document.querySelector("[data-categoria-antigua]")) {
            // Inicia id: identificador del recurso.
            const id = new URLSearchParams(location.search).get("id");
            // Llama a location.replace con los datos indicados.
            location.replace("index.html#/categorias" + (/^[a-z][a-z0-9-]{0,63}$/.test(id || "") ? "/" + id : ""));
        }
        // Devuelve ausencia de resultado al código que llamó.
        return null;
    }

    // Registra cada vista y sus callbacks sin volver a crear sus eventos.
    const rutas = new Map([
        // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["inicio", { titulo: "Inicio", modulo: NipinResumen }],
        // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["acceso", { titulo: "Mi cuenta", modulo: NipinAcceso }],
        // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["registrar", { titulo: "Registrar movimiento", modulo: NipinRegistro }],
        // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["movimientos", { titulo: "Movimientos", modulo: NipinListado }],
        // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["categorias", { titulo: "Categorías", modulo: NipinCategorias.catalogo }],
        // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["categoria", { titulo: "Detalle de categoría", modulo: NipinCategorias.detalle }]
    ]);
    // Localiza "#estado-navegacion" en el HTML para controlar ese elemento.
    const estado = document.querySelector("#estado-navegacion");
    // Inicializa actual.
    let actual = null;
    // Inicializa categoriaActual.
    let categoriaActual = null;
    // Inicia revision: versión usada para descartar respuestas anteriores.
    let revision = 0;

    // Obtiene la ruta y el identificador desde el fragmento de la URL.
    function resolver(ruta) {
        // Traduce el hash a una vista registrada y, si existe, su categoría.
        if (rutas.has(ruta) && ruta !== "categoria") return { nombre: ruta, id: null };
        // Inicializa detalle.
        const detalle = /^categorias\/([a-z][a-z0-9-]{0,63})$/.exec(ruta);
        // Devuelve detalle ? { nombre: "categoria", id: detalle[1] } : null al código que llamó.
        return detalle ? { nombre: "categoria", id: detalle[1] } : null;
    }

    // Lleva el foco al contenido de la vista para continuar con teclado.
    function enfocarContenido() {
        // Localiza '[data-vista="' + actual + '"] h1' en el HTML para controlar ese elemento.
        const titulo = contenido.querySelector('[data-vista="' + actual + '"] h1');
        // Lleva el foco al control.
        titulo.focus({ preventScroll: true });
        // Llama a window.scrollTo con los datos indicados.
        window.scrollTo(0, 0);
    }

    // Activa la vista solicitada y coordina su módulo y foco.
    async function mostrarRuta(enfocar = true, recargar = false) {
        // Resuelve la ruta y coordina vista, sesión, navegación y foco.
        const intento = ++revision;
        // Inicializa ruta.
        const ruta = location.hash.startsWith("#/") ? resolver(location.hash.slice(2)) : null;
        // Inicializa desconocida.
        const desconocida = Boolean(location.hash) && !ruta;
        // Inicializa { nombre, id }.
        let { nombre, id } = ruta || { nombre: "inicio", id: null };
        // Comprueba esta condición.
        if (!ruta) {
            // Llama a history.replaceState con los datos indicados.
            history.replaceState(null, "", "#/inicio");
        }
        // Inicializa aviso.
        let aviso = "";
        // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        contenido.setAttribute("aria-busy", "false");
        // Comprueba esta condición.
        if (nombre === "acceso") {
            // Comprueba si corresponde mostrar acceso o redirigir a una cuenta ya autenticada.
            const hash = location.hash;
            // Actualiza aria-busy: estado de carga para tecnología de asistencia.
            contenido.setAttribute("aria-busy", "true");
            // Muestra texto sin interpretarlo como HTML.
            estado.textContent = "Comprobando sesión…";
            // Intenta la operación y permite capturar sus errores.
            try {
                // Inicia sesion: datos de sesión recibidos de PHP.
                const sesion = await NipinSesion.consultar(true);
                // Comprueba esta condición.
                if (intento !== revision || location.hash !== hash) return;
                // Comprueba esta condición.
                if (sesion?.usuario) {
                    // Actualiza nombre.
                    nombre = "inicio";
                    // Llama a history.replaceState con los datos indicados.
                    history.replaceState(null, "", "#/inicio");
                    // Actualiza aviso.
                    aviso = "Ya iniciaste sesión. Mostramos Inicio.";
                    // Actualiza recargar.
                    recargar = true;
                }
            // Captura el error para responder de forma controlada.
            } catch (error) {
                // Informa el fallo sin sustituir el resultado por un éxito.
                if (intento !== revision || location.hash !== hash) return;
                // Actualiza aviso.
                aviso = "No pudimos comprobar la sesión. Podés intentar ingresar nuevamente.";
            // Limpia el estado, incluso si la operación falló.
            } finally {
                // Actualiza aria-busy: estado de carga para tecnología de asistencia.
                if (intento === revision) contenido.setAttribute("aria-busy", "false");
            }
        }
        // Comprueba esta condición.
        if (nombre === actual && id === categoriaActual && !recargar) {
            // Muestra texto sin interpretarlo como HTML.
            if (desconocida) estado.textContent = "Vista no encontrada. Mostramos Inicio.";
            // Muestra texto sin interpretarlo como HTML.
            else if (aviso) estado.textContent = aviso;
            // Comprueba esta condición.
            if (enfocar) enfocarContenido();
            // Sale de esta función sin continuar con las instrucciones siguientes.
            return;
        }

        // Llama a rutas.get con los datos indicados.
        rutas.get(actual)?.modulo?.salir();
        // Localiza "[data-vista]" en el HTML para controlar ese elemento.
        contenido.querySelectorAll("[data-vista]").forEach(vista => {
            // Muestra u oculta el elemento según el estado actual.
            vista.hidden = vista.dataset.vista !== nombre;
        });
        // Localiza "nav [data-ruta]" en el HTML para controlar ese elemento.
        document.querySelectorAll("nav [data-ruta]").forEach(enlace => {
            // Actualiza aria-current: propiedad del elemento en el DOM.
            if (enlace.dataset.ruta === (nombre === "categoria" ? "categorias" : nombre)) enlace.setAttribute("aria-current", "page");
            // Ejecuta la alternativa cuando no se cumple la condición anterior.
            else enlace.removeAttribute("aria-current");
        });
        // Localiza "#sesion-ingresar" en el HTML para controlar ese elemento.
        const ingresar = document.querySelector("#sesion-ingresar");
        // Actualiza aria-current: propiedad del elemento en el DOM.
        if (nombre === "acceso") ingresar.setAttribute("aria-current", "page");
        // Ejecuta la alternativa cuando no se cumple la condición anterior.
        else ingresar.removeAttribute("aria-current");

        // Actualiza actual.
        actual = nombre;
        // Actualiza categoriaActual.
        categoriaActual = id;
        // Actualiza document.title.
        document.title = rutas.get(nombre).titulo + " - NipinFinan";
        // Muestra texto sin interpretarlo como HTML.
        estado.textContent = aviso || (desconocida ? "Vista no encontrada. Mostramos Inicio." : "Vista " + rutas.get(nombre).titulo + ".");
        // Comprueba esta condición.
        if (enfocar) enfocarContenido();
        // Llama a rutas.get con los datos indicados.
        rutas.get(nombre).modulo?.entrar(id);
    }

    // Define ir con sus entradas y el resultado que devuelve.
    function ir(nombre, { reemplazar = false, recargar = false } = {}) {
        // Cambia el hash o reemplaza la ruta sin recargar el documento.
        if (!resolver(nombre)) return;
        // Inicializa hash.
        const hash = "#/" + nombre;
        // Comprueba esta condición.
        if (reemplazar) history.replaceState(null, "", hash);
        // Ejecuta la alternativa cuando no se cumple la condición anterior.
        else if (location.hash !== hash) {
            // Actualiza location.hash.
            location.hash = "/" + nombre;
            // Sale de esta función sin continuar con las instrucciones siguientes.
            return;
        }
        // Llama a mostrarRuta con los datos indicados.
        mostrarRuta(true, recargar);
    }

    // Registra la acción que se ejecuta al recibir click.
    document.addEventListener("click", evento => {
        // Procesa la acción del control y actualiza su estado.
        if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
        // Inicializa enlace.
        const enlace = evento.target.closest("a");
        // Comprueba esta condición.
        if (!enlace || enlace.hasAttribute("download") || (enlace.target && enlace.target !== "_self")) return;
        // Comprueba esta condición.
        if (enlace.id === "saltar-contenido") {
            // Evita el envío tradicional del formulario y la recarga completa.
            evento.preventDefault();
            // Llama a enfocarContenido con los datos indicados.
            enfocarContenido();
        // Ejecuta la alternativa cuando no se cumple la condición anterior.
        } else if (resolver(enlace.dataset.ruta || "")) {
            // Evita el envío tradicional del formulario y la recarga completa.
            evento.preventDefault();
            // Llama a ir con los datos indicados.
            ir(enlace.dataset.ruta);
        }
    });

    // Registra la acción que se ejecuta al recibir hashchange.
    window.addEventListener("hashchange", () => mostrarRuta());
    // Registra la acción que se ejecuta al recibir pageshow.
    window.addEventListener("pageshow", evento => {
        // Atiende el evento pageshow del control.
        if (evento.persisted) mostrarRuta(false, true);
    });
    // Llama a mostrarRuta con los datos indicados.
    mostrarRuta(false);
    // Devuelve las funciones o datos públicos al código que llamó.
    return { ir };
})();
