// Resuelve rutas registradas y detalles de categoría por su identificador público.
const NipinNavegacion = (() => {
    // Registra rutas y coordina la navegación sin recargar.
    const contenido = document.querySelector("#contenido");
    if (!contenido) {
        // Redirige los accesos HTML antiguos hacia las vistas de la SPA.
        if (document.querySelector("[data-acceso-antiguo]")) location.replace("index.html#/acceso");
        if (document.querySelector("[data-registro-antiguo]")) location.replace("index.html#/registrar");
        if (document.querySelector("[data-listado-antiguo]")) location.replace("index.html#/movimientos");
        if (document.querySelector("[data-categorias-antiguo]")) location.replace("index.html#/categorias");
        if (document.querySelector("[data-categoria-antigua]")) {
            // Conserva sólo un identificador de categoría válido en la redirección.
            const id = new URLSearchParams(location.search).get("id");
            location.replace("index.html#/categorias" + (/^[a-z][a-z0-9-]{0,63}$/.test(id || "") ? "/" + id : ""));
        }
        return null;
    }

    // Registra cada vista y sus callbacks sin volver a crear sus eventos.
    const rutas = new Map([
        ["inicio", { titulo: "Inicio", modulo: NipinResumen }],
        ["acceso", { titulo: "Mi cuenta", modulo: NipinAcceso }],
        ["registrar", { titulo: "Registrar movimiento", modulo: NipinRegistro }],
        ["movimientos", { titulo: "Movimientos", modulo: NipinListado }],
        ["categorias", { titulo: "Categorías", modulo: NipinCategorias.catalogo }],
        ["categoria", { titulo: "Detalle de categoría", modulo: NipinCategorias.detalle }]
    ]);
    const estado = document.querySelector("#estado-navegacion");
    let actual = null;
    let categoriaActual = null;
    let revision = 0;

    function resolver(ruta) {
        // Traduce el hash a una vista registrada y, si existe, su categoría.
        if (rutas.has(ruta) && ruta !== "categoria") return { nombre: ruta, id: null };
        const detalle = /^categorias\/([a-z][a-z0-9-]{0,63})$/.exec(ruta);
        return detalle ? { nombre: "categoria", id: detalle[1] } : null;
    }

    function enfocarContenido() {
        // Lleva el foco al título de la vista sin desplazarlo automáticamente.
        const titulo = contenido.querySelector('[data-vista="' + actual + '"] h1');
        titulo.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }

    async function mostrarRuta(enfocar = true, recargar = false) {
        // Resuelve la ruta y coordina vista, sesión, navegación y foco.
        const intento = ++revision;
        const ruta = location.hash.startsWith("#/") ? resolver(location.hash.slice(2)) : null;
        const desconocida = Boolean(location.hash) && !ruta;
        let { nombre, id } = ruta || { nombre: "inicio", id: null };
        if (!ruta) {
            // No crea una entrada extra al abrir index.html o una ruta inexistente.
            history.replaceState(null, "", "#/inicio");
        }
        let aviso = "";
        contenido.setAttribute("aria-busy", "false");
        if (nombre === "acceso") {
            // Comprueba si corresponde mostrar acceso o redirigir a una cuenta ya autenticada.
            const hash = location.hash;
            contenido.setAttribute("aria-busy", "true");
            estado.textContent = "Comprobando sesión…";
            try {
                // Ejecuta la operación y permite tratar sus errores.
                const sesion = await NipinSesion.consultar(true);
                if (intento !== revision || location.hash !== hash) return;
                if (sesion?.usuario) {
                    // Ajusta los datos según la identidad de la sesión comprobada.
                    nombre = "inicio";
                    history.replaceState(null, "", "#/inicio");
                    aviso = "Ya iniciaste sesión. Mostramos Inicio.";
                    recargar = true;
                }
            } catch (error) {
                // Informa el fallo sin sustituir el resultado por un éxito.
                if (intento !== revision || location.hash !== hash) return;
                aviso = "No pudimos comprobar la sesión. Podés intentar ingresar nuevamente.";
            } finally {
                // Restablece los controles y el estado al finalizar la operación.
                if (intento === revision) contenido.setAttribute("aria-busy", "false");
            }
        }
        if (nombre === actual && id === categoriaActual && !recargar) {
            // Actualiza los elementos de la interfaz con los datos de este bloque.
            if (desconocida) estado.textContent = "Vista no encontrada. Mostramos Inicio.";
            else if (aviso) estado.textContent = aviso;
            if (enfocar) enfocarContenido();
            return;
        }

        rutas.get(actual)?.modulo?.salir();
        contenido.querySelectorAll("[data-vista]").forEach(vista => {
            // Muestra únicamente el contenedor de la ruta seleccionada.
            vista.hidden = vista.dataset.vista !== nombre;
        });
        document.querySelectorAll("nav [data-ruta]").forEach(enlace => {
            // Marca el enlace de navegación correspondiente a la vista actual.
            if (enlace.dataset.ruta === (nombre === "categoria" ? "categorias" : nombre)) enlace.setAttribute("aria-current", "page");
            else enlace.removeAttribute("aria-current");
        });
        const ingresar = document.querySelector("#sesion-ingresar");
        if (nombre === "acceso") ingresar.setAttribute("aria-current", "page");
        else ingresar.removeAttribute("aria-current");

        actual = nombre;
        categoriaActual = id;
        document.title = rutas.get(nombre).titulo + " - NipinFinan";
        estado.textContent = aviso || (desconocida ? "Vista no encontrada. Mostramos Inicio." : "Vista " + rutas.get(nombre).titulo + ".");
        if (enfocar) enfocarContenido();
        rutas.get(nombre).modulo?.entrar(id);
    }

    function ir(nombre, { reemplazar = false, recargar = false } = {}) {
        // Cambia el hash o reemplaza la ruta sin recargar el documento.
        if (!resolver(nombre)) return;
        const hash = "#/" + nombre;
        if (reemplazar) history.replaceState(null, "", hash);
        else if (location.hash !== hash) {
            // Cambia la ruta y deja que hashchange actualice la vista.
            location.hash = "/" + nombre;
            return;
        }
        mostrarRuta(true, recargar);
    }

    // Conserva la navegación nativa de enlaces ajenos y clics con modificadores.
    document.addEventListener("click", evento => {
        // Procesa la acción del control y actualiza su estado.
        if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
        const enlace = evento.target.closest("a");
        if (!enlace || enlace.hasAttribute("download") || (enlace.target && enlace.target !== "_self")) return;
        if (enlace.id === "saltar-contenido") {
            // Evita la acción nativa para ejecutar el comportamiento controlado.
            evento.preventDefault();
            enfocarContenido();
        } else if (resolver(enlace.dataset.ruta || "")) {
            // Evita la acción nativa para ejecutar el comportamiento controlado.
            evento.preventDefault();
            ir(enlace.dataset.ruta);
        }
    });

    window.addEventListener("hashchange", () => mostrarRuta());
    // BFCache restaura el mismo documento y los mismos eventos, sin reiniciarlos.
    window.addEventListener("pageshow", evento => {
        // Atiende el evento pageshow del control.
        if (evento.persisted) mostrarRuta(false, true);
    });
    mostrarRuta(false);
    return { ir };
})();
