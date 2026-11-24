// Muestra la vista de index.html indicada por el hash y coordina su módulo y foco.
const NipinNavegacion = (() => { // Inicializa NipinNavegacion.
    // Registra rutas y coordina la navegación sin recargar.
    const contenido = document.querySelector("#contenido"); // Localiza "#contenido" en el HTML para controlar ese elemento.
    if (!contenido) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        // Redirige los accesos HTML antiguos hacia las vistas de la SPA.
        if (document.querySelector("[data-acceso-antiguo]")) location.replace("index.html#/acceso"); // Localiza "[data-acceso-antiguo]" en el HTML para controlar ese elemento.
        if (document.querySelector("[data-registro-antiguo]")) location.replace("index.html#/registrar"); // Localiza "[data-registro-antiguo]" en el HTML para controlar ese elemento.
        if (document.querySelector("[data-listado-antiguo]")) location.replace("index.html#/movimientos"); // Localiza "[data-listado-antiguo]" en el HTML para controlar ese elemento.
        if (document.querySelector("[data-categorias-antiguo]")) location.replace("index.html#/categorias"); // Localiza "[data-categorias-antiguo]" en el HTML para controlar ese elemento.
        if (document.querySelector("[data-categoria-antigua]")) { // Localiza "[data-categoria-antigua]" en el HTML para controlar ese elemento.
            // Conserva sólo un identificador de categoría válido en la redirección.
            const id = new URLSearchParams(location.search).get("id"); // Inicializa la variable id: identificador del recurso.
            location.replace("index.html#/categorias" + (/^[a-z][a-z0-9-]{0,63}$/.test(id || "") ? "/" + id : "")); // Llama a location.replace con los datos indicados.
        } // Finaliza este bloque.
        return null; // Devuelve ausencia de resultado al código que llamó.
    } // Finaliza este bloque.

    // Registra cada vista y sus callbacks sin volver a crear sus eventos.
    const rutas = new Map([ // Inicializa rutas.
        ["inicio", { titulo: "Inicio", modulo: NipinResumen }], // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["acceso", { titulo: "Mi cuenta", modulo: NipinAcceso }], // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["registrar", { titulo: "Registrar movimiento", modulo: NipinRegistro }], // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["movimientos", { titulo: "Movimientos", modulo: NipinListado }], // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["categorias", { titulo: "Categorías", modulo: NipinCategorias.catalogo }], // Asocia la ruta con su título y el módulo que maneja esa vista.
        ["categoria", { titulo: "Detalle de categoría", modulo: NipinCategorias.detalle }] // Asocia la ruta con su título y el módulo que maneja esa vista.
    ]); // Completa la estructura o llamada iniciada arriba.
    const estado = document.querySelector("#estado-navegacion"); // Localiza "#estado-navegacion" en el HTML para controlar ese elemento.
    let actual = null; // Inicializa actual.
    let categoriaActual = null; // Inicializa categoriaActual.
    let revision = 0; // Inicializa la variable revision: versión usada para descartar respuestas anteriores.

    function resolver(ruta) { // Obtiene la ruta y el identificador desde el fragmento de la URL.
        // Traduce el hash a una vista registrada y, si existe, su categoría.
        if (rutas.has(ruta) && ruta !== "categoria") return { nombre: ruta, id: null }; // Traduce el hash a una vista registrada y, si existe, su categoría.
        const detalle = /^categorias\/([a-z][a-z0-9-]{0,63})$/.exec(ruta); // Inicializa detalle.
        return detalle ? { nombre: "categoria", id: detalle[1] } : null; // Devuelve detalle ? { nombre: "categoria", id: detalle[1] } : null al código que llamó.
    } // Finaliza este bloque.

    function enfocarContenido() { // Lleva el foco al contenido de la vista para continuar con teclado.
        // Lleva el foco al título de la vista sin desplazarlo automáticamente.
        const titulo = contenido.querySelector('[data-vista="' + actual + '"] h1'); // Localiza '[data-vista="' + actual + '"] h1' en el HTML para controlar ese elemento.
        titulo.focus({ preventScroll: true }); // Lleva el foco al control para continuar con teclado.
        window.scrollTo(0, 0); // Llama a window.scrollTo con los datos indicados.
    } // Finaliza este bloque.

    async function mostrarRuta(enfocar = true, recargar = false) { // Activa la vista solicitada y coordina su módulo y foco.
        // Resuelve la ruta y coordina vista, sesión, navegación y foco.
        const intento = ++revision; // Inicializa intento.
        const ruta = location.hash.startsWith("#/") ? resolver(location.hash.slice(2)) : null; // Inicializa ruta.
        const desconocida = Boolean(location.hash) && !ruta; // Inicializa desconocida.
        let { nombre, id } = ruta || { nombre: "inicio", id: null }; // Inicializa { nombre, id }.
        if (!ruta) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // No crea una entrada extra al abrir index.html o una ruta inexistente.
            history.replaceState(null, "", "#/inicio"); // Llama a history.replaceState con los datos indicados.
        } // Finaliza este bloque.
        let aviso = ""; // Inicializa aviso.
        contenido.setAttribute("aria-busy", "false"); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        if (nombre === "acceso") { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Comprueba si corresponde mostrar acceso o redirigir a una cuenta ya autenticada.
            const hash = location.hash; // Inicializa hash.
            contenido.setAttribute("aria-busy", "true"); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
            estado.textContent = "Comprobando sesión…"; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            try { // Intenta la operación; catch manejará sus posibles errores.
                // Ejecuta la operación y permite tratar sus errores.
                const sesion = await NipinSesion.consultar(true); // Inicializa la variable sesion: datos de sesión recibidos de PHP.
                if (intento !== revision || location.hash !== hash) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                if (sesion?.usuario) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                    // Ajusta los datos según la identidad de la sesión comprobada.
                    nombre = "inicio"; // Actualiza nombre.
                    history.replaceState(null, "", "#/inicio"); // Llama a history.replaceState con los datos indicados.
                    aviso = "Ya iniciaste sesión. Mostramos Inicio."; // Actualiza aviso.
                    recargar = true; // Actualiza recargar.
                } // Finaliza este bloque.
            } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
                // Informa el fallo sin sustituir el resultado por un éxito.
                if (intento !== revision || location.hash !== hash) return; // Informa el fallo sin sustituir el resultado por un éxito.
                aviso = "No pudimos comprobar la sesión. Podés intentar ingresar nuevamente."; // Actualiza aviso.
            } finally { // Ejecuta la limpieza final aunque la operación haya fallado.
                // Restablece los controles y el estado al finalizar la operación.
                if (intento === revision) contenido.setAttribute("aria-busy", "false"); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
            } // Finaliza este bloque.
        } // Finaliza este bloque.
        if (nombre === actual && id === categoriaActual && !recargar) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Actualiza los elementos de la interfaz con los datos de este bloque.
            if (desconocida) estado.textContent = "Vista no encontrada. Mostramos Inicio."; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            else if (aviso) estado.textContent = aviso; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            if (enfocar) enfocarContenido(); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            return; // Sale de esta función sin continuar con las instrucciones siguientes.
        } // Finaliza este bloque.

        rutas.get(actual)?.modulo?.salir(); // Llama a rutas.get con los datos indicados.
        contenido.querySelectorAll("[data-vista]").forEach(vista => { // Localiza "[data-vista]" en el HTML para controlar ese elemento.
            // Muestra únicamente el contenedor de la ruta seleccionada.
            vista.hidden = vista.dataset.vista !== nombre; // Muestra u oculta el elemento según el estado actual.
        }); // Cierra la función de respuesta y su registro o llamada.
        document.querySelectorAll("nav [data-ruta]").forEach(enlace => { // Localiza "nav [data-ruta]" en el HTML para controlar ese elemento.
            // Marca el enlace de navegación correspondiente a la vista actual.
            if (enlace.dataset.ruta === (nombre === "categoria" ? "categorias" : nombre)) enlace.setAttribute("aria-current", "page"); // Actualiza aria-current: propiedad del elemento en el DOM.
            else enlace.removeAttribute("aria-current"); // Ejecuta la alternativa cuando no se cumple la condición anterior.
        }); // Cierra la función de respuesta y su registro o llamada.
        const ingresar = document.querySelector("#sesion-ingresar"); // Localiza "#sesion-ingresar" en el HTML para controlar ese elemento.
        if (nombre === "acceso") ingresar.setAttribute("aria-current", "page"); // Actualiza aria-current: propiedad del elemento en el DOM.
        else ingresar.removeAttribute("aria-current"); // Ejecuta la alternativa cuando no se cumple la condición anterior.

        actual = nombre; // Actualiza actual.
        categoriaActual = id; // Actualiza categoriaActual.
        document.title = rutas.get(nombre).titulo + " - NipinFinan"; // Actualiza document.title.
        estado.textContent = aviso || (desconocida ? "Vista no encontrada. Mostramos Inicio." : "Vista " + rutas.get(nombre).titulo + "."); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        if (enfocar) enfocarContenido(); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        rutas.get(nombre).modulo?.entrar(id); // Llama a rutas.get con los datos indicados.
    } // Finaliza este bloque.

    function ir(nombre, { reemplazar = false, recargar = false } = {}) { // Define ir con sus entradas y el resultado que devuelve.
        // Cambia el hash o reemplaza la ruta sin recargar el documento.
        if (!resolver(nombre)) return; // Cambia el hash o reemplaza la ruta sin recargar el documento.
        const hash = "#/" + nombre; // Inicializa hash.
        if (reemplazar) history.replaceState(null, "", hash); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        else if (location.hash !== hash) { // Ejecuta la alternativa cuando no se cumple la condición anterior.
            // Cambia la ruta y deja que hashchange actualice la vista.
            location.hash = "/" + nombre; // Actualiza location.hash.
            return; // Sale de esta función sin continuar con las instrucciones siguientes.
        } // Finaliza este bloque.
        mostrarRuta(true, recargar); // Llama a mostrarRuta con los datos indicados.
    } // Finaliza este bloque.

    // Conserva la navegación nativa de enlaces ajenos y clics con modificadores.
    document.addEventListener("click", evento => { // Registra la acción que se ejecuta al recibir click.
        // Procesa la acción del control y actualiza su estado.
        if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return; // Procesa la acción del control y actualiza su estado.
        const enlace = evento.target.closest("a"); // Inicializa enlace.
        if (!enlace || enlace.hasAttribute("download") || (enlace.target && enlace.target !== "_self")) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (enlace.id === "saltar-contenido") { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Evita la acción nativa para ejecutar el comportamiento controlado.
            evento.preventDefault(); // Evita el envío tradicional del formulario y la recarga completa.
            enfocarContenido(); // Llama a enfocarContenido con los datos indicados.
        } else if (resolver(enlace.dataset.ruta || "")) { // Ejecuta la alternativa cuando no se cumple la condición anterior.
            // Evita la acción nativa para ejecutar el comportamiento controlado.
            evento.preventDefault(); // Evita el envío tradicional del formulario y la recarga completa.
            ir(enlace.dataset.ruta); // Llama a ir con los datos indicados.
        } // Finaliza este bloque.
    }); // Cierra la función de respuesta y su registro o llamada.

    window.addEventListener("hashchange", () => mostrarRuta()); // Registra la acción que se ejecuta al recibir hashchange.
    // BFCache restaura el mismo documento y los mismos eventos, sin reiniciarlos.
    window.addEventListener("pageshow", evento => { // Registra la acción que se ejecuta al recibir pageshow.
        // Atiende el evento pageshow del control.
        if (evento.persisted) mostrarRuta(false, true); // Atiende el evento pageshow del control.
    }); // Cierra la función de respuesta y su registro o llamada.
    mostrarRuta(false); // Llama a mostrarRuta con los datos indicados.
    return { ir }; // Devuelve las funciones o datos públicos al código que llamó.
})(); // Ejecuta el módulo y conserva sus funciones públicas.
