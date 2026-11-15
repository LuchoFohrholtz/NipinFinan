// Navegación progresiva: solo las vistas registradas pertenecen a la SPA.
// Los enlaces a login, registro, movimientos y categorías siguen siendo HTML.
(function iniciarNavegacion() {
    const contenido = document.querySelector("#contenido");
    if (!contenido) return;

    // Para migrar otra vista se agrega su contenedor y sus callbacks aquí.
    // Sus módulos inicializan eventos una sola vez; entrar solo refresca datos.
    const rutas = new Map([
        ["inicio", { titulo: "Inicio", modulo: NipinResumen }]
    ]);
    const estado = document.querySelector("#estado-navegacion");
    let actual = null;

    function enfocarContenido() {
        const titulo = contenido.querySelector('[data-vista="' + actual + '"] h1');
        titulo.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }

    function mostrarRuta(enfocar = true) {
        let nombre = location.hash.startsWith("#/") ? location.hash.slice(2) : "";
        const desconocida = Boolean(location.hash) && !rutas.has(nombre);
        if (!rutas.has(nombre)) {
            nombre = "inicio";
            // No crea una entrada extra al abrir index.html o una ruta inexistente.
            history.replaceState(null, "", "#/inicio");
        }
        if (nombre === actual) {
            if (desconocida) estado.textContent = "Vista no encontrada. Mostramos Inicio.";
            return;
        }

        rutas.get(actual)?.modulo?.salir();
        contenido.querySelectorAll("[data-vista]").forEach(vista => {
            vista.hidden = vista.dataset.vista !== nombre;
        });
        document.querySelectorAll("nav [data-ruta]").forEach(enlace => {
            if (enlace.dataset.ruta === nombre) enlace.setAttribute("aria-current", "page");
            else enlace.removeAttribute("aria-current");
        });

        actual = nombre;
        document.title = rutas.get(nombre).titulo + " - NipinFinan";
        estado.textContent = desconocida ? "Vista no encontrada. Mostramos Inicio." : "Vista " + rutas.get(nombre).titulo + ".";
        if (enfocar) enfocarContenido();
        rutas.get(nombre).modulo?.entrar();
    }

    // Los modificadores, abrir en otra pestaña y los enlaces pendientes siguen
    // el comportamiento nativo. Enter sobre un enlace genera el mismo click.
    document.addEventListener("click", evento => {
        if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
        const enlace = evento.target.closest("a");
        if (!enlace || enlace.hasAttribute("download") || (enlace.target && enlace.target !== "_self")) return;
        if (enlace.id === "saltar-contenido") {
            evento.preventDefault();
            enfocarContenido();
        } else if (rutas.has(enlace.dataset.ruta)) {
            evento.preventDefault();
            if (actual === enlace.dataset.ruta) enfocarContenido();
            else location.hash = "/" + enlace.dataset.ruta;
        }
    });

    window.addEventListener("hashchange", () => mostrarRuta());
    // BFCache restaura el mismo documento y los mismos eventos, sin reiniciarlos.
    window.addEventListener("pageshow", evento => {
        if (evento.persisted) rutas.get(actual).modulo?.entrar();
    });
    mostrarRuta(false);
})();
