// Pide catálogo e historial a api/categorias.php y los presenta como texto.
const NipinCategorias = (() => {
    // Localiza '#vista-categorias' en el HTML para controlar ese elemento.
    if (!document.querySelector('#vista-categorias')) return null;
    // Inicia revisionSesion: versión del estado de sesión en JavaScript.
    let revisionSesion = 0;
    // Inicializa vistas.
    const vistas = [];
    // Inicializa idValido.
    const idValido = id => typeof id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(id);
    // Inicializa pesos.
    const pesos = valor => valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: Number.isInteger(valor) ? 0 : 2 });
    // Inicializa centavos.
    const centavos = valor => typeof valor === 'number' && Number.isFinite(valor) && Number.isSafeInteger(Math.round(valor * 100)) && Number(valor.toFixed(2)) === valor;

    // Define validarCategoria con sus entradas y el resultado que devuelve.
    function validarCategoria(categoria) {
        // Interrumpe la función y comunica el error.
        if (!categoria || !idValido(categoria.id) || typeof categoria.nombre !== 'string' || !categoria.nombre.trim() || !['ingreso', 'gasto'].includes(categoria.tipo)) throw new Error('La categoría recibida es inválida.');
        // Interrumpe la función y comunica el error.
        if (!['ingresos', 'gastos', 'saldo'].every(campo => centavos(categoria[campo])) || categoria.ingresos < 0 || categoria.gastos < 0 || Math.round(categoria.saldo * 100) !== Math.round(categoria.ingresos * 100) - Math.round(categoria.gastos * 100) || !Number.isSafeInteger(categoria.cantidad) || categoria.cantidad < 0) throw new Error('Los totales de la categoría son inválidos.');
        // Interrumpe la función y comunica el error.
        if (categoria.cantidad === 0 && (categoria.ingresos !== 0 || categoria.gastos !== 0)) throw new Error('Los totales no corresponden a la categoría.');
        // Devuelve categoría seleccionada al código que llamó.
        return categoria;
    }

    // Define texto con sus entradas y el resultado que devuelve.
    function texto(tag, valor, clase = '') {
        // Crea un elemento HTML que se completará antes de insertarlo.
        const elemento = document.createElement(tag);
        // Muestra texto sin interpretarlo como HTML.
        elemento.textContent = valor;
        // Actualiza elemento.className.
        elemento.className = clase;
        // Devuelve elemento al código que llamó.
        return elemento;
    }

    // Define mostrarCatalogo con sus entradas y el resultado que devuelve.
    function mostrarCatalogo(datos) {
        // Interrumpe la función y comunica el error.
        if (!Array.isArray(datos.categorias)) throw new Error('El catálogo recibido es inválido.');
        // Inicia categorias: categorías admitidas.
        const categorias = datos.categorias.map(validarCategoria);
        // Interrumpe la función y comunica el error.
        if (new Set(categorias.map(c => c.id)).size !== categorias.length) throw new Error('El catálogo contiene IDs repetidos.');
        // Localiza '#categorias-lista' en el HTML para controlar ese elemento.
        const lista = document.querySelector('#categorias-lista');
        // Reemplaza los elementos hijos sin interpretar texto como HTML.
        lista.replaceChildren(...categorias.map(categoria => {
            // Crea un elemento li que se completará antes de insertarlo.
            const item = document.createElement('li');
            // Crea un elemento a que se completará antes de insertarlo.
            const enlace = document.createElement('a');
            // Actualiza enlace.className.
            enlace.className = 'categoria';
            // Actualiza enlace.dataset.ruta.
            enlace.dataset.ruta = 'categorias/' + categoria.id;
            // Actualiza enlace.href.
            enlace.href = 'index.html#/' + enlace.dataset.ruta;
            // Inicializa icono.
            const icono = texto('div', Array.from(categoria.nombre)[0], 'icono');
            // Actualiza aria-hidden: propiedad del elemento en el DOM.
            icono.setAttribute('aria-hidden', 'true');
            // Crea un elemento dl que se completará antes de insertarlo.
            const totales = document.createElement('dl');
            // Ejecuta la función indicada para cada elemento de la lista.
            [['Ingresos', pesos(categoria.ingresos)], ['Gastos', pesos(categoria.gastos)], ['Saldo', pesos(categoria.saldo)], ['Movimientos', categoria.cantidad]].forEach(([etiqueta, valor]) => {
                // Inserta los elementos construidos en la estructura del documento.
                totales.append(texto('dt', etiqueta), texto('dd', valor));
            });
            // Inserta los elementos construidos en la estructura del documento.
            enlace.append(icono, texto('h2', categoria.nombre), texto('p', categoria.tipo === 'gasto' ? 'Categoría de gastos' : 'Categoría de ingresos'), totales);
            // Inserta los elementos construidos en la estructura del documento.
            item.append(enlace);
            // Devuelve item al código que llamó.
            return item;
        }));
        // Muestra u oculta el elemento según el estado actual.
        lista.hidden = !categorias.length;
        // Localiza '#categorias-vacio' en el HTML para controlar ese elemento.
        document.querySelector('#categorias-vacio').hidden = categorias.length > 0;
        // Devuelve categorias.length + (categorias.length === 1 ? ' categoría disponible… al código que llamó.
        return categorias.length + (categorias.length === 1 ? ' categoría disponible.' : ' categorías disponibles.') + ' Los importes corresponden a tu cuenta.';
    }

    // Define validarHistorial con sus entradas y el resultado que devuelve.
    function validarHistorial(datos, categoria) {
        // Interrumpe la función y comunica el error.
        if (!Array.isArray(datos) || datos.length !== categoria.cantidad) throw new Error('El historial recibido es inválido.');
        // Inicializa ids.
        const ids = new Set();
        // Inicializa ingresos.
        let ingresos = 0, gastos = 0;
        // Ejecuta la función indicada para cada elemento de la lista.
        datos.forEach(movimiento => {
            // Inicia fecha: fecha del movimiento.
            const fecha = typeof movimiento?.fecha === 'string' ? movimiento.fecha : '';
            // Inicializa fechaReal.
            const fechaReal = new Date(fecha + 'T00:00:00Z');
            // Interrumpe la función y comunica el error.
            if (!movimiento || !Number.isSafeInteger(movimiento.id) || movimiento.id <= 0 || ids.has(movimiento.id) || !['ingreso', 'gasto'].includes(movimiento.tipo) || movimiento.categoria !== categoria.nombre || typeof movimiento.descripcion !== 'string' || !movimiento.descripcion.trim() || !centavos(movimiento.total) || movimiento.total <= 0 || typeof movimiento.medioPago !== 'string' || !movimiento.medioPago || ![1, 3, 6, 12].includes(movimiento.cuotas) || (movimiento.comentario != null && typeof movimiento.comentario !== 'string') || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < '1900-01-01' || fecha > '2100-12-31' || Number.isNaN(fechaReal.getTime()) || fechaReal.toISOString().slice(0, 10) !== fecha) throw new Error('El historial contiene movimientos inválidos.');
            // Llama a ids.add con los datos indicados.
            ids.add(movimiento.id);
            // Comprueba esta condición.
            if (movimiento.tipo === 'ingreso') ingresos += Math.round(movimiento.total * 100);
            // Ejecuta la alternativa cuando no se cumple la condición anterior.
            else gastos += Math.round(movimiento.total * 100);
        });
        // Interrumpe la función y comunica el error.
        if (!Number.isSafeInteger(ingresos) || !Number.isSafeInteger(gastos) || ingresos !== Math.round(categoria.ingresos * 100) || gastos !== Math.round(categoria.gastos * 100)) throw new Error('El historial no coincide con los totales recibidos.');
        // Devuelve [...datos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.… al código que llamó.
        return [...datos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    }

    // Define mostrarDetalle con sus entradas y el resultado que devuelve.
    function mostrarDetalle(datos, id) {
        // Inicia categoria: categoría seleccionada.
        const categoria = validarCategoria(datos.categoria);
        // Interrumpe la función y comunica el error.
        if (categoria.id !== id) throw new Error('El servidor devolvió otra categoría.');
        // Inicia movimientos: lista de ingresos y gastos.
        const movimientos = validarHistorial(datos.movimientos, categoria);
        // Localiza '#vista-categoria' en el HTML para controlar ese elemento.
        const panel = document.querySelector('#vista-categoria');
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector('#categoria-titulo').textContent = categoria.nombre;
        // Actualiza document.title.
        document.title = categoria.nombre + ' - NipinFinan';
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector('#categoria-icono').textContent = Array.from(categoria.nombre)[0];
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector('#categoria-tipo').textContent = categoria.tipo === 'gasto' ? 'Categoría de gastos' : 'Categoría de ingresos';
        // Ejecuta la función indicada para cada elemento de la lista.
        ['ingresos', 'gastos', 'saldo'].forEach(campo => {
            // Muestra texto sin interpretarlo como HTML.
            panel.querySelector('#categoria-' + campo).textContent = pesos(categoria[campo]);
        });
        // Localiza '#categoria-saldo' en el HTML para controlar ese elemento.
        panel.querySelector('#categoria-saldo').className = categoria.saldo < 0 ? 'gasto' : categoria.saldo > 0 ? 'ingreso' : '';
        // Muestra texto sin interpretarlo como HTML.
        panel.querySelector('#categoria-cantidad').textContent = categoria.cantidad;
        // Localiza '#categoria-historial' en el HTML para controlar ese elemento.
        panel.querySelector('#categoria-historial').replaceChildren(...movimientos.map(movimiento => {
            // Crea un elemento li que se completará antes de insertarlo.
            const item = document.createElement('li');
            // Actualiza item.className.
            item.className = 'movimiento';
            // Crea un elemento div que se completará antes de insertarlo.
            const info = document.createElement('div');
            // Separa los valores recibidos en las variables [anio, mes, dia].
            const [anio, mes, dia] = movimiento.fecha.split('-');
            // Inicia cuotas: cantidad de cuotas.
            const cuotas = movimiento.cuotas > 1 ? ' · ' + movimiento.cuotas + ' cuotas' : '';
            // Inserta los elementos construidos en la estructura del documento.
            info.append(texto('strong', movimiento.descripcion), texto('p', [dia, mes, anio].join('/') + ' · ' + movimiento.medioPago + cuotas));
            // Inserta los elementos construidos en la estructura del documento.
            if (movimiento.comentario) info.append(texto('p', movimiento.comentario));
            // Inserta los elementos construidos en la estructura del documento.
            item.append(info, texto('strong', (movimiento.tipo === 'gasto' ? '−' : '+') + pesos(movimiento.total), movimiento.tipo));
            // Devuelve item al código que llamó.
            return item;
        }));
        // Localiza '#categoria-sin-movimientos' en el HTML para controlar ese elemento.
        panel.querySelector('#categoria-sin-movimientos').hidden = movimientos.length > 0;
        // Localiza '#categoria-datos' en el HTML para controlar ese elemento.
        panel.querySelector('#categoria-datos').hidden = false;
        // Devuelve categoria.nombre + ': ' + movimientos.length + (movimientos.length ==… al código que llamó.
        return categoria.nombre + ': ' + movimientos.length + (movimientos.length === 1 ? ' movimiento.' : ' movimientos.') + ' Saldo: ' + pesos(categoria.saldo) + '.';
    }

    // Define crearVista con sus entradas y el resultado que devuelve.
    function crearVista(nombre, mostrar, vaciar) {
        // Localiza '#vista-' + nombre en el HTML para controlar ese elemento.
        const panel = document.querySelector('#vista-' + nombre);
        // Localiza '#' + nombre + '-estado' en el HTML para controlar ese elemento.
        const estado = panel.querySelector('#' + nombre + '-estado');
        // Localiza '#' + nombre + '-sin-sesion' en el HTML para controlar ese elemento.
        const aviso = panel.querySelector('#' + nombre + '-sin-sesion');
        // Localiza '#' + nombre + '-actualizar' en el HTML para controlar ese elemento.
        const actualizar = panel.querySelector('#' + nombre + '-actualizar');
        // Inicia activa: estado de la vista actual.
        let activa = false, cargando = false, entrada = 0, id = null;
        // Inicializa vigente.
        const vigente = intento => activa && intento === entrada;

        // Define mensaje con sus entradas y el resultado que devuelve.
        function mensaje(valor, error = false) {
            // Muestra texto sin interpretarlo como HTML.
            estado.textContent = valor;
            // Actualiza role: función accesible del elemento.
            estado.setAttribute('role', error ? 'alert' : 'status');
            // Actualiza aria-live: prioridad del anuncio para lectores de pantalla.
            estado.setAttribute('aria-live', error ? 'assertive' : 'polite');
        }

        // Define bloquear con sus entradas y el resultado que devuelve.
        function bloquear(ocupado) {
            // Actualiza estado de carga.
            cargando = ocupado;
            // Habilita o bloquea el control según el estado de la operación.
            actualizar.disabled = ocupado;
            // Actualiza aria-busy: estado de carga para tecnología de asistencia.
            panel.setAttribute('aria-busy', String(ocupado));
        }

        // Define limpiar con sus entradas y el resultado que devuelve.
        function limpiar(usuario = null) {
            // Llama a vaciar con los datos indicados.
            vaciar();
            // Llama a bloquear con los datos indicados.
            bloquear(false);
            // Muestra u oculta el elemento según el estado actual.
            aviso.hidden = Boolean(usuario);
            // Llama a mensaje con los datos indicados.
            mensaje(usuario ? 'La cuenta cambió. Actualizá para consultar tus datos.' : 'Iniciá sesión para consultar tus categorías.');
        }

        // Define cargar con sus entradas y el resultado que devuelve.
        async function cargar() {
            // Consulta los datos privados y descarta respuestas de vistas o cuentas anteriores.
            if (!activa || cargando) return;
            // Inicializa intento.
            const intento = ++entrada;
            // Inicializa version.
            let version = revisionSesion;
            // Inicializa devolverFoco.
            const devolverFoco = document.activeElement === actualizar;
            // Llama a vaciar con los datos indicados.
            vaciar();
            // Muestra u oculta el elemento según el estado actual.
            aviso.hidden = true;
            // Llama a bloquear con los datos indicados.
            bloquear(true);
            // Llama a mensaje con los datos indicados.
            mensaje('Verificando sesión y cargando categorías…');
            // Intenta la operación y permite capturar sus errores.
            try {
                // Inicia sesion: datos de sesión recibidos de PHP.
                const sesion = await NipinSesion.consultar(true);
                // Comprueba esta condición.
                if (!vigente(intento)) return;
                // Comprueba esta condición.
                if (!sesion) {
                    // Ajusta los datos según la identidad de la sesión comprobada.
                    if (version === revisionSesion) limpiar();
                    // Sale de esta función sin continuar con las instrucciones siguientes.
                    return;
                }
                // Inicializa cuenta.
                const cuenta = sesion.usuario?.email;
                // Interrumpe la función y comunica el error.
                if (typeof cuenta !== 'string' || !cuenta || !NipinSesion.esUsuario(cuenta)) throw new Error('No se pudo verificar la cuenta.');
                // Actualiza version.
                version = revisionSesion;
                // Llama a bloquear con los datos indicados.
                bloquear(true);
                // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
                const datos = await NipinAPI.solicitarJSON('api/categorias.php' + (id ? '?id=' + encodeURIComponent(id) : ''), { privada: true });
                // Comprueba esta condición.
                if (!vigente(intento) || version !== revisionSesion || !NipinSesion.esUsuario(cuenta)) return;
                // Revalida la identidad para no atribuir categorías a otra cuenta.
                const confirmacion = await NipinSesion.consultar(true);
                // Comprueba esta condición.
                if (!vigente(intento)) return;
                // Comprueba esta condición.
                if (version !== revisionSesion || !confirmacion || confirmacion.usuario?.email !== cuenta || !NipinSesion.esUsuario(cuenta)) {
                    // Ajusta los datos según la identidad de la sesión comprobada.
                    if (confirmacion?.usuario && !cargando && NipinSesion.esUsuario(confirmacion.usuario.email)) cargar();
                    // Sale de esta función sin continuar con las instrucciones siguientes.
                    return;
                }
                // Llama a mensaje con los datos indicados.
                mensaje(mostrar(datos, id));
            // Captura el error para responder de forma controlada.
            } catch (error) {
                // Informa el fallo sin sustituir el resultado por un éxito.
                if (!vigente(intento) || version !== revisionSesion) return;
                // Comprueba esta condición.
                if (error.status === 401) {
                    // Continúa en js/app.js: actualiza la identidad visible y limpia las vistas.
                    NipinSesion.establecer(null, { conservarBorrador: true });
                    // Llama a mensaje con los datos indicados.
                    mensaje('La sesión venció. Iniciá sesión para consultar tus categorías.', true);
                    // Lleva el foco al control.
                    aviso.querySelector('a').focus();
                // Ejecuta la alternativa cuando no se cumple la condición anterior.
                } else {
                    // Distingue una categoría inexistente de otros fallos de consulta.
                    const texto = error.status === 404 && id ? 'Esta categoría no está disponible. Volvé al catálogo para elegir otra.' : 'No se pudieron cargar las categorías. ' + error.message;
                    // Llama a mensaje con los datos indicados.
                    mensaje(texto, true);
                }
            // Limpia el estado, incluso si la operación falló.
            } finally {
                // Restablece los controles y el estado al finalizar la operación.
                if (vigente(intento)) {
                    // Llama a bloquear con los datos indicados.
                    bloquear(false);
                    // Lleva el foco al control.
                    if (devolverFoco && document.activeElement === document.body) actualizar.focus({ preventScroll: true });
                }
            }
        }

        // Registra la acción que se ejecuta al recibir click.
        actualizar.addEventListener('click', cargar);
        // Inicializa vista.
        const vista = {
            // Expone estas funciones para utilizarlas desde otros módulos.
            limpiar,
            // Llama a entrar con los datos indicados.
            entrar(categoriaId = null) {
                // Actualiza estado de la vista actual.
                activa = true; id = categoriaId; cargar();
            },
            // Llama a salir con los datos indicados.
            salir() {
                // Muestra u oculta el elemento según el estado actual.
                activa = false; entrada++; vaciar(); bloquear(false); aviso.hidden = true; mensaje('');
            }
        };
        // Llama a vistas.push con los datos indicados.
        vistas.push(vista);
        // Devuelve vista al código que llamó.
        return vista;
    }

    // Inicia catalogo: catálogo de categorías.
    const catalogo = crearVista('categorias', mostrarCatalogo, () => {
        // Localiza '#categorias-lista' en el HTML para controlar ese elemento.
        document.querySelector('#categorias-lista').replaceChildren();
        // Localiza '#categorias-lista' en el HTML para controlar ese elemento.
        document.querySelector('#categorias-lista').hidden = true;
        // Localiza '#categorias-vacio' en el HTML para controlar ese elemento.
        document.querySelector('#categorias-vacio').hidden = true;
    });
    // Inicializa detalle.
    const detalle = crearVista('categoria', mostrarDetalle, () => {
        // Localiza '#categoria-datos' en el HTML para controlar ese elemento.
        document.querySelector('#categoria-datos').hidden = true;
        // Muestra texto sin interpretarlo como HTML.
        document.querySelector('#categoria-titulo').textContent = 'Detalle de categoría';
        // Muestra texto sin interpretarlo como HTML.
        document.querySelector('#categoria-icono').textContent = '';
        // Muestra texto sin interpretarlo como HTML.
        document.querySelector('#categoria-tipo').textContent = '';
        // Ejecuta la función indicada para cada elemento de la lista.
        ['ingresos', 'gastos', 'saldo'].forEach(campo => {
            // Muestra texto sin interpretarlo como HTML.
            document.querySelector('#categoria-' + campo).textContent = '$0';
        });
        // Muestra texto sin interpretarlo como HTML.
        document.querySelector('#categoria-cantidad').textContent = '0';
        // Localiza '#categoria-historial' en el HTML para controlar ese elemento.
        document.querySelector('#categoria-historial').replaceChildren();
        // Localiza '#categoria-sin-movimientos' en el HTML para controlar ese elemento.
        document.querySelector('#categoria-sin-movimientos').hidden = true;
    });
    // Devuelve las funciones o datos públicos al código que llamó.
    return { catalogo, detalle, limpiar(usuario = null) {
        // Incrementa revisionSesion++; vistas.forEach(vista => vista.limpiar(usuario en uno.
        revisionSesion++; vistas.forEach(vista => vista.limpiar(usuario));
    } };
})();
