// Catálogo y detalle privados. El catálogo y todos sus importes vienen de PHP.
const NipinCategorias = (() => {
    if (!document.querySelector('#vista-categorias')) return null;
    let revisionSesion = 0;
    const vistas = [];
    const idValido = id => typeof id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(id);
    const pesos = valor => valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: Number.isInteger(valor) ? 0 : 2 });
    const centavos = valor => typeof valor === 'number' && Number.isFinite(valor) && Number.isSafeInteger(Math.round(valor * 100)) && Number(valor.toFixed(2)) === valor;

    function validarCategoria(categoria) {
        if (!categoria || !idValido(categoria.id) || typeof categoria.nombre !== 'string' || !categoria.nombre.trim() || !['ingreso', 'gasto'].includes(categoria.tipo)) throw new Error('La categoría recibida es inválida.');
        if (!['ingresos', 'gastos', 'saldo'].every(campo => centavos(categoria[campo])) || categoria.ingresos < 0 || categoria.gastos < 0 || Math.round(categoria.saldo * 100) !== Math.round(categoria.ingresos * 100) - Math.round(categoria.gastos * 100) || !Number.isSafeInteger(categoria.cantidad) || categoria.cantidad < 0) throw new Error('Los totales de la categoría son inválidos.');
        if (categoria.cantidad === 0 && (categoria.ingresos !== 0 || categoria.gastos !== 0)) throw new Error('Los totales no corresponden a la categoría.');
        return categoria;
    }

    function texto(tag, valor, clase = '') {
        const elemento = document.createElement(tag);
        elemento.textContent = valor;
        elemento.className = clase;
        return elemento;
    }

    function mostrarCatalogo(datos) {
        if (!Array.isArray(datos.categorias)) throw new Error('El catálogo recibido es inválido.');
        const categorias = datos.categorias.map(validarCategoria);
        if (new Set(categorias.map(c => c.id)).size !== categorias.length) throw new Error('El catálogo contiene IDs repetidos.');
        const lista = document.querySelector('#categorias-lista');
        lista.replaceChildren(...categorias.map(categoria => {
            const item = document.createElement('li');
            const enlace = document.createElement('a');
            enlace.className = 'categoria';
            enlace.dataset.ruta = 'categorias/' + categoria.id;
            enlace.href = 'index.html#/' + enlace.dataset.ruta;
            const icono = texto('div', Array.from(categoria.nombre)[0], 'icono');
            icono.setAttribute('aria-hidden', 'true');
            const totales = document.createElement('dl');
            [['Ingresos', pesos(categoria.ingresos)], ['Gastos', pesos(categoria.gastos)], ['Saldo', pesos(categoria.saldo)], ['Movimientos', categoria.cantidad]].forEach(([etiqueta, valor]) => {
                totales.append(texto('dt', etiqueta), texto('dd', valor));
            });
            enlace.append(icono, texto('h2', categoria.nombre), texto('p', categoria.tipo === 'gasto' ? 'Categoría de gastos' : 'Categoría de ingresos'), totales);
            item.append(enlace);
            return item;
        }));
        lista.hidden = !categorias.length;
        document.querySelector('#categorias-vacio').hidden = categorias.length > 0;
        return categorias.length + (categorias.length === 1 ? ' categoría disponible.' : ' categorías disponibles.') + ' Los importes corresponden a tu cuenta.';
    }

    function validarHistorial(datos, categoria) {
        if (!Array.isArray(datos) || datos.length !== categoria.cantidad) throw new Error('El historial recibido es inválido.');
        const ids = new Set();
        let ingresos = 0, gastos = 0;
        datos.forEach(movimiento => {
            const fecha = typeof movimiento?.fecha === 'string' ? movimiento.fecha : '';
            const fechaReal = new Date(fecha + 'T00:00:00Z');
            if (!movimiento || !Number.isSafeInteger(movimiento.id) || movimiento.id <= 0 || ids.has(movimiento.id) || !['ingreso', 'gasto'].includes(movimiento.tipo) || movimiento.categoria !== categoria.nombre || typeof movimiento.descripcion !== 'string' || !movimiento.descripcion.trim() || !centavos(movimiento.total) || movimiento.total <= 0 || typeof movimiento.medioPago !== 'string' || !movimiento.medioPago || ![1, 3, 6, 12].includes(movimiento.cuotas) || (movimiento.comentario != null && typeof movimiento.comentario !== 'string') || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < '1900-01-01' || fecha > '2100-12-31' || Number.isNaN(fechaReal.getTime()) || fechaReal.toISOString().slice(0, 10) !== fecha) throw new Error('El historial contiene movimientos inválidos.');
            ids.add(movimiento.id);
            if (movimiento.tipo === 'ingreso') ingresos += Math.round(movimiento.total * 100);
            else gastos += Math.round(movimiento.total * 100);
        });
        if (!Number.isSafeInteger(ingresos) || !Number.isSafeInteger(gastos) || ingresos !== Math.round(categoria.ingresos * 100) || gastos !== Math.round(categoria.gastos * 100)) throw new Error('El historial no coincide con los totales recibidos.');
        return [...datos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    }

    function mostrarDetalle(datos, id) {
        const categoria = validarCategoria(datos.categoria);
        if (categoria.id !== id) throw new Error('El servidor devolvió otra categoría.');
        const movimientos = validarHistorial(datos.movimientos, categoria);
        const panel = document.querySelector('#vista-categoria');
        panel.querySelector('#categoria-titulo').textContent = categoria.nombre;
        document.title = categoria.nombre + ' - NipinFinan';
        panel.querySelector('#categoria-icono').textContent = Array.from(categoria.nombre)[0];
        panel.querySelector('#categoria-tipo').textContent = categoria.tipo === 'gasto' ? 'Categoría de gastos' : 'Categoría de ingresos';
        ['ingresos', 'gastos', 'saldo'].forEach(campo => { panel.querySelector('#categoria-' + campo).textContent = pesos(categoria[campo]); });
        panel.querySelector('#categoria-saldo').className = categoria.saldo < 0 ? 'gasto' : categoria.saldo > 0 ? 'ingreso' : '';
        panel.querySelector('#categoria-cantidad').textContent = categoria.cantidad;
        panel.querySelector('#categoria-historial').replaceChildren(...movimientos.map(movimiento => {
            const item = document.createElement('li');
            item.className = 'movimiento';
            const info = document.createElement('div');
            const [anio, mes, dia] = movimiento.fecha.split('-');
            const cuotas = movimiento.cuotas > 1 ? ' · ' + movimiento.cuotas + ' cuotas' : '';
            info.append(texto('strong', movimiento.descripcion), texto('p', [dia, mes, anio].join('/') + ' · ' + movimiento.medioPago + cuotas));
            if (movimiento.comentario) info.append(texto('p', movimiento.comentario));
            item.append(info, texto('strong', (movimiento.tipo === 'gasto' ? '−' : '+') + pesos(movimiento.total), movimiento.tipo));
            return item;
        }));
        panel.querySelector('#categoria-sin-movimientos').hidden = movimientos.length > 0;
        panel.querySelector('#categoria-datos').hidden = false;
        return categoria.nombre + ': ' + movimientos.length + (movimientos.length === 1 ? ' movimiento.' : ' movimientos.') + ' Saldo: ' + pesos(categoria.saldo) + '.';
    }

    function crearVista(nombre, mostrar, vaciar) {
        const panel = document.querySelector('#vista-' + nombre);
        const estado = panel.querySelector('#' + nombre + '-estado');
        const aviso = panel.querySelector('#' + nombre + '-sin-sesion');
        const actualizar = panel.querySelector('#' + nombre + '-actualizar');
        let activa = false, cargando = false, entrada = 0, id = null;
        const vigente = intento => activa && intento === entrada;

        function mensaje(valor, error = false) {
            estado.textContent = valor;
            estado.setAttribute('role', error ? 'alert' : 'status');
            estado.setAttribute('aria-live', error ? 'assertive' : 'polite');
        }

        function bloquear(ocupado) {
            cargando = ocupado;
            actualizar.disabled = ocupado;
            panel.setAttribute('aria-busy', String(ocupado));
        }

        function limpiar(usuario = null) {
            vaciar();
            bloquear(false);
            aviso.hidden = Boolean(usuario);
            mensaje(usuario ? 'La cuenta cambió. Actualizá para consultar tus datos.' : 'Iniciá sesión para consultar tus categorías.');
        }

        async function cargar() {
            if (!activa || cargando) return;
            const intento = ++entrada;
            let version = revisionSesion;
            const devolverFoco = document.activeElement === actualizar;
            vaciar();
            aviso.hidden = true;
            bloquear(true);
            mensaje('Verificando sesión y cargando categorías…');
            try {
                const sesion = await NipinSesion.consultar(true);
                if (!vigente(intento)) return;
                if (!sesion) {
                    if (version === revisionSesion) limpiar();
                    return;
                }
                const cuenta = sesion.usuario?.email;
                if (typeof cuenta !== 'string' || !cuenta || !NipinSesion.esUsuario(cuenta)) throw new Error('No se pudo verificar la cuenta.');
                version = revisionSesion;
                bloquear(true);
                const datos = await NipinAPI.solicitarJSON('api/categorias.php' + (id ? '?id=' + encodeURIComponent(id) : ''), { privada: true });
                if (!vigente(intento) || version !== revisionSesion || !NipinSesion.esUsuario(cuenta)) return;
                // Categorías no devuelve usuario. Verificar otra vez la identidad
                // evita atribuir la respuesta a una cuenta que cambió en otra pestaña.
                const confirmacion = await NipinSesion.consultar(true);
                if (!vigente(intento)) return;
                if (version !== revisionSesion || !confirmacion || confirmacion.usuario?.email !== cuenta || !NipinSesion.esUsuario(cuenta)) {
                    if (confirmacion?.usuario && !cargando && NipinSesion.esUsuario(confirmacion.usuario.email)) cargar();
                    return;
                }
                mensaje(mostrar(datos, id));
            } catch (error) {
                if (!vigente(intento) || version !== revisionSesion) return;
                if (error.status === 401) {
                    NipinSesion.establecer(null, { conservarBorrador: true });
                    mensaje('La sesión venció. Iniciá sesión para consultar tus categorías.', true);
                    aviso.querySelector('a').focus();
                } else {
                    const texto = error.status === 404 && id ? 'Esta categoría no está disponible. Volvé al catálogo para elegir otra.' : 'No se pudieron cargar las categorías. ' + error.message;
                    mensaje(texto, true);
                }
            } finally {
                if (vigente(intento)) {
                    bloquear(false);
                    if (devolverFoco && document.activeElement === document.body) actualizar.focus({ preventScroll: true });
                }
            }
        }

        actualizar.addEventListener('click', cargar);
        const vista = {
            limpiar,
            entrar(categoriaId = null) { activa = true; id = categoriaId; cargar(); },
            salir() { activa = false; entrada++; vaciar(); bloquear(false); aviso.hidden = true; mensaje(''); }
        };
        vistas.push(vista);
        return vista;
    }

    const catalogo = crearVista('categorias', mostrarCatalogo, () => {
        document.querySelector('#categorias-lista').replaceChildren();
        document.querySelector('#categorias-lista').hidden = true;
        document.querySelector('#categorias-vacio').hidden = true;
    });
    const detalle = crearVista('categoria', mostrarDetalle, () => {
        document.querySelector('#categoria-datos').hidden = true;
        document.querySelector('#categoria-titulo').textContent = 'Detalle de categoría';
        document.querySelector('#categoria-icono').textContent = '';
        document.querySelector('#categoria-tipo').textContent = '';
        ['ingresos', 'gastos', 'saldo'].forEach(campo => { document.querySelector('#categoria-' + campo).textContent = '$0'; });
        document.querySelector('#categoria-cantidad').textContent = '0';
        document.querySelector('#categoria-historial').replaceChildren();
        document.querySelector('#categoria-sin-movimientos').hidden = true;
    });
    return { catalogo, detalle, limpiar(usuario = null) { revisionSesion++; vistas.forEach(vista => vista.limpiar(usuario)); } };
})();
