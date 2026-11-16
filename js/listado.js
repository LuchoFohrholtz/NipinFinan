// Listado privado de la SPA. Los importes y las filas proceden siempre de la API.
const NipinListado = (() => {
    const panel = document.querySelector('#vista-movimientos');
    if (!panel) return null;
    const elemento = id => panel.querySelector('#' + id);
    const estado = elemento('movimientos-estado');
    const aviso = elemento('movimientos-sin-sesion');
    const actualizar = elemento('movimientos-actualizar');
    const tabla = elemento('tabla-contenedor');
    const totales = elemento('tabla-resumen');
    const vacio = elemento('sin-movimientos');
    const cuerpo = elemento('tbody-movimientos');
    const edicion = elemento('movimientos-edicion');
    const dialogo = elemento('confirmar-eliminacion');
    const confirmar = elemento('eliminacion-confirmar');
    const cancelar = elemento('eliminacion-cancelar');
    let activa = false, cargando = false, eliminando = false, editando = false;
    let revision = 0, entrada = 0;
    let movimientos = [], propietario = null, seleccionado = null, origen = null;

    // Copia de la estructura, no de sus eventos ni de su borrador. IDs y labels
    // independientes permiten usar la misma calculadora y validación de L4.
    const form = document.querySelector('#form-movimiento').cloneNode(true);
    form.id = 'form-edicion';
    form.querySelectorAll('[id]').forEach(control => { control.id = 'editar-' + control.id; });
    form.querySelectorAll('[for]').forEach(label => { label.htmlFor = 'editar-' + label.htmlFor; });
    form.querySelectorAll('input[type=radio]').forEach(radio => { radio.name = 'editar-tipo'; });
    form.querySelector('h2').textContent = 'Datos del movimiento a editar';
    form.querySelector('button[type=submit]').textContent = 'Guardar cambios';
    const volver = document.createElement('button');
    volver.type = 'button';
    volver.className = 'boton secundario';
    volver.textContent = 'Cancelar edición';
    form.querySelector('[data-ruta]').replaceWith(volver);
    edicion.append(form);
    const editor = crearFormularioMovimiento({
        form, prefijo: 'editar-', avisoSesion: aviso,
        estado: elemento('edicion-estado'), reintentar: elemento('edicion-reintentar'),
        alGuardar: movimiento => finalizar('Movimiento actualizado correctamente. Total: ' + pesos(movimiento.total) + '.'),
        alNoDisponible: () => finalizar('El movimiento ya no está disponible. Se actualizó el listado.'),
        alSesionVencida: () => mensaje('La sesión venció. La edición se descartó. Iniciá sesión para ver tus movimientos.', true)
    });

    function pesos(valor) {
        return (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 });
    }

    function mensaje(texto, error = false) {
        estado.textContent = texto;
        estado.setAttribute('role', error ? 'alert' : 'status');
        estado.setAttribute('aria-live', error ? 'assertive' : 'polite');
    }

    function bloquear() {
        const ocupado = cargando || eliminando || editando || dialogo.open;
        actualizar.disabled = ocupado;
        cuerpo.querySelectorAll('button').forEach(boton => { boton.disabled = ocupado; });
    }

    function cerrarConfirmacion() {
        if (dialogo.open) dialogo.close();
        seleccionado = null;
        elemento('eliminacion-detalle').textContent = '';
        elemento('eliminacion-estado').textContent = '';
        elemento('eliminacion-estado').setAttribute('role', 'status');
        confirmar.disabled = false;
        cancelar.disabled = false;
        dialogo.setAttribute('aria-busy', 'false');
    }

    function cerrarEdicion(enfocar = false) {
        editor.salir();
        edicion.hidden = true;
        editando = false;
        bloquear();
        if (enfocar && activa) (origen?.isConnected ? origen : elemento('movimientos-titulo')).focus();
        origen = null;
    }

    function limpiar(usuario = null) {
        revision++;
        cerrarEdicion();
        cerrarConfirmacion();
        origen = null;
        movimientos = [];
        propietario = null;
        cargando = false;
        eliminando = false;
        cuerpo.replaceChildren();
        ['total-ingresos', 'total-gastos', 'total-disponible'].forEach(id => { elemento(id).textContent = '$0'; });
        tabla.hidden = totales.hidden = vacio.hidden = true;
        aviso.hidden = Boolean(usuario);
        panel.setAttribute('aria-busy', 'false');
        mensaje(usuario ? 'La cuenta cambió. Actualizá el listado para ver tus movimientos.' : 'Iniciá sesión para ver tus movimientos.');
        bloquear();
    }

    function celda(texto, clase = '') {
        const td = document.createElement('td');
        td.textContent = texto;
        td.className = clase;
        return td;
    }

    function fila(movimiento) {
        const gasto = movimiento.tipo === 'gasto';
        const tr = document.createElement('tr');
        const [anio, mes, dia] = movimiento.fecha.split('-');
        const descripcion = movimiento.descripcion + (movimiento.cuotas > 1 ? ' (' + movimiento.cuotas + ' cuotas)' : '');
        tr.append(celda(descripcion), celda(movimiento.categoria), celda(gasto ? 'Gasto' : 'Ingreso'), celda([dia, mes, anio].join('/')), celda((gasto ? '-' : '+') + pesos(movimiento.total), gasto ? 'gasto' : 'ingreso'));
        const acciones = celda('');
        const grupo = document.createElement('div');
        grupo.className = 'acciones-movimiento';
        ['Editar', 'Eliminar'].forEach(texto => {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'boton secundario';
            boton.textContent = texto;
            boton.dataset.accion = texto.toLowerCase();
            boton.dataset.id = movimiento.id;
            boton.setAttribute('aria-label', texto + ' ' + movimiento.descripcion);
            grupo.append(boton);
        });
        acciones.append(grupo);
        tr.append(acciones);
        return tr;
    }

    function mostrar(datos) {
        if (!Array.isArray(datos) || datos.some(m => !m || !Number.isSafeInteger(m.id) || m.id <= 0 || !['gasto', 'ingreso'].includes(m.tipo) || typeof m.descripcion !== 'string' || typeof m.categoria !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha) || !Number.isFinite(m.total) || m.total < 0 || !Number.isSafeInteger(Math.round(m.total * 100)))) throw new Error('El servidor devolvió movimientos inválidos.');
        movimientos = [...datos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
        const suma = tipo => movimientos.filter(m => m.tipo === tipo).reduce((centavos, m) => centavos + Math.round(m.total * 100), 0);
        const ingresos = suma('ingreso'), gastos = suma('gasto');
        elemento('total-ingresos').textContent = '+' + pesos(ingresos / 100);
        elemento('total-gastos').textContent = '-' + pesos(gastos / 100);
        elemento('total-disponible').textContent = pesos((ingresos - gastos) / 100);
        elemento('total-disponible').className = ingresos < gastos ? 'gasto' : '';
        cuerpo.replaceChildren(...movimientos.map(fila));
        aviso.hidden = true;
        totales.hidden = false;
        tabla.hidden = !movimientos.length;
        vacio.hidden = movimientos.length > 0;
    }

    async function cargar(texto = '') {
        if (!activa || cargando) return false;
        const intento = ++entrada;
        const version = revision;
        cargando = true;
        tabla.hidden = totales.hidden = vacio.hidden = aviso.hidden = true;
        panel.setAttribute('aria-busy', 'true');
        mensaje(texto || 'Cargando movimientos…');
        bloquear();
        try {
            const sesion = await NipinSesion.consultar(true);
            if (!activa || intento !== entrada) return false;
            // consultar() descarta las lecturas anteriores a un login/logout.
            // Una consulta que detecta el cambio de cuenta ya limpió lo anterior.
            if (!sesion) {
                if (version === revision) limpiar();
                return false;
            }
            if (!NipinSesion.esUsuario(sesion.usuario.email)) return false;
            propietario = sesion.usuario.email;
            mostrar(sesion.movimientos);
            mensaje(texto || (movimientos.length ? 'Listado actualizado.' : 'Todavía no registraste movimientos.'));
            return true;
        } catch (error) {
            if (activa && intento === entrada && version === revision) mensaje((texto ? texto + ' ' : '') + 'No se pudo cargar el listado. ' + error.message, true);
            return false;
        } finally {
            if (activa && intento === entrada) {
                cargando = false;
                panel.setAttribute('aria-busy', 'false');
                bloquear();
            }
        }
    }

    async function finalizar(texto) {
        cerrarEdicion();
        cerrarConfirmacion();
        eliminando = false;
        const intento = entrada + 1;
        await Promise.all([cargar(texto), NipinResumen.actualizarTrasCambio()]);
        if (activa && intento === entrada) estado.focus();
    }

    cuerpo.addEventListener('click', evento => {
        const boton = evento.target.closest('button[data-accion]');
        if (!boton || !activa || cargando || eliminando || editando || dialogo.open) return;
        const movimiento = movimientos.find(m => m.id === Number(boton.dataset.id));
        if (!movimiento || !NipinSesion.esUsuario(propietario)) return;
        origen = boton;
        if (boton.dataset.accion === 'editar') {
            editando = true;
            edicion.hidden = false;
            bloquear();
            editor.entrar(movimiento, propietario);
        } else {
            seleccionado = movimiento.id;
            elemento('eliminacion-detalle').textContent = '¿Querés eliminar «' + movimiento.descripcion + '», del ' + movimiento.fecha + ', por ' + pesos(movimiento.total) + '?';
            dialogo.showModal();
            bloquear();
        }
    });

    confirmar.addEventListener('click', async () => {
        if (!activa || eliminando || !seleccionado || !NipinSesion.esUsuario(propietario)) return;
        const version = revision;
        const id = seleccionado;
        eliminando = true;
        confirmar.disabled = cancelar.disabled = true;
        dialogo.setAttribute('aria-busy', 'true');
        elemento('eliminacion-estado').textContent = 'Eliminando movimiento…';
        bloquear();
        try {
            await NipinAPI.prepararEnvios();
            if (version !== revision) return;
            const respuesta = await NipinAPI.eliminarMovimiento(id);
            if (version !== revision) return;
            if (respuesta.id !== id) throw new Error('El servidor no confirmó la eliminación. Actualizá el listado antes de reintentar.');
            await finalizar('Movimiento eliminado correctamente.');
        } catch (error) {
            if (version !== revision) return;
            if (error.status === 401) {
                NipinSesion.establecer(null, { conservarBorrador: true });
                mensaje('La sesión venció. Iniciá sesión para ver tus movimientos.', true);
                if (activa) aviso.querySelector('a').focus();
            } else if (error.status === 404) {
                await finalizar('El movimiento ya no está disponible. Se actualizó el listado.');
            } else {
                const detalle = elemento('eliminacion-estado');
                detalle.textContent = error.message;
                detalle.setAttribute('role', 'alert');
            }
        } finally {
            if (version === revision) {
                eliminando = false;
                confirmar.disabled = cancelar.disabled = false;
                dialogo.setAttribute('aria-busy', 'false');
                bloquear();
            }
        }
    });

    cancelar.addEventListener('click', cerrarConfirmacion);
    dialogo.addEventListener('cancel', evento => { if (eliminando) evento.preventDefault(); });
    dialogo.addEventListener('close', () => {
        cerrarConfirmacion();
        bloquear();
        if (activa && origen?.isConnected && !origen.disabled) origen.focus();
        origen = null;
    });
    volver.addEventListener('click', () => cerrarEdicion(true));
    actualizar.addEventListener('click', () => cargar());
    return {
        limpiar,
        entrar() { activa = true; cargar(); },
        salir() { activa = false; entrada++; limpiar(); }
    };
})();
