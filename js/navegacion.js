// Navegación progresiva: solo las vistas registradas pertenecen a la SPA.
// Los enlaces a registro de movimientos y categorías siguen siendo HTML.
const NipinNavegacion = (() => {
    const contenido = document.querySelector("#contenido");
    if (!contenido) {
        if (document.querySelector("[data-acceso-antiguo]")) location.replace("index.html#/acceso");
        return null;
    }

    // Para migrar otra vista se agrega su contenedor y sus callbacks aquí.
    // Sus módulos inicializan eventos una sola vez; entrar solo refresca datos.
    const rutas = new Map([
        ["inicio", { titulo: "Inicio", modulo: NipinResumen }],
        ["acceso", { titulo: "Mi cuenta", modulo: NipinAcceso }]
    ]);
    const estado = document.querySelector("#estado-navegacion");
    let actual = null;
    let revision = 0;

    function enfocarContenido() {
        const titulo = contenido.querySelector('[data-vista="' + actual + '"] h1');
        titulo.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }

    async function mostrarRuta(enfocar = true, recargar = false) {
        const intento = ++revision;
        let nombre = location.hash.startsWith("#/") ? location.hash.slice(2) : "";
        const desconocida = Boolean(location.hash) && !rutas.has(nombre);
        if (!rutas.has(nombre)) {
            nombre = "inicio";
            // No crea una entrada extra al abrir index.html o una ruta inexistente.
            history.replaceState(null, "", "#/inicio");
        }
        let aviso = "";
        contenido.setAttribute("aria-busy", "false");
        if (nombre === "acceso") {
            const hash = location.hash;
            contenido.setAttribute("aria-busy", "true");
            estado.textContent = "Comprobando sesión…";
            try {
                const sesion = await NipinSesion.consultar(true);
                if (intento !== revision || location.hash !== hash) return;
                if (sesion?.usuario) {
                    nombre = "inicio";
                    history.replaceState(null, "", "#/inicio");
                    aviso = "Ya iniciaste sesión. Mostramos Inicio.";
                    recargar = true;
                }
            } catch (error) {
                if (intento !== revision || location.hash !== hash) return;
                aviso = "No pudimos comprobar la sesión. Podés intentar ingresar nuevamente.";
            } finally {
                if (intento === revision) contenido.setAttribute("aria-busy", "false");
            }
        }
        if (nombre === actual && !recargar) {
            if (desconocida) estado.textContent = "Vista no encontrada. Mostramos Inicio.";
            else if (aviso) estado.textContent = aviso;
            if (enfocar) enfocarContenido();
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
        const ingresar = document.querySelector("#sesion-ingresar");
        if (nombre === "acceso") ingresar.setAttribute("aria-current", "page");
        else ingresar.removeAttribute("aria-current");

        actual = nombre;
        document.title = rutas.get(nombre).titulo + " - NipinFinan";
        estado.textContent = aviso || (desconocida ? "Vista no encontrada. Mostramos Inicio." : "Vista " + rutas.get(nombre).titulo + ".");
        if (enfocar) enfocarContenido();
        rutas.get(nombre).modulo?.entrar();
    }

    function ir(nombre, { reemplazar = false, recargar = false } = {}) {
        if (!rutas.has(nombre)) return;
        const hash = "#/" + nombre;
        if (reemplazar) history.replaceState(null, "", hash);
        else if (location.hash !== hash) {
            location.hash = "/" + nombre;
            return;
        }
        mostrarRuta(true, recargar);
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
            ir(enlace.dataset.ruta);
        }
    });

    window.addEventListener("hashchange", () => mostrarRuta());
    // BFCache restaura el mismo documento y los mismos eventos, sin reiniciarlos.
    window.addEventListener("pageshow", evento => {
        if (evento.persisted) mostrarRuta(false, true);
    });
    mostrarRuta(false);
    return { ir };
})();
