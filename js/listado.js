// Consulta, edita y elimina mediante js/api.js; PHP autoriza cada operación.
const NipinListado = (() => {
    // Localiza '#vista-movimientos' en el HTML para controlar ese elemento.
    const panel = document.querySelector('#vista-movimientos');
    // Comprueba esta condición.
    if (!panel) return null;
    // Localiza '#' + id en el HTML para controlar ese elemento.
    const elemento = id => panel.querySelector('#' + id);
    // Inicia estado: región de estado de la interfaz.
    const estado = elemento('movimientos-estado');
    // Inicializa aviso.
    const aviso = elemento('movimientos-sin-sesion');
    // Inicializa actualizar.
    const actualizar = elemento('movimientos-actualizar');
    // Inicializa tabla.
    const tabla = elemento('tabla-contenedor');
    // Inicializa totales.
    const totales = elemento('tabla-resumen');
    // Inicializa vacio.
    const vacio = elemento('sin-movimientos');
    // Inicializa cuerpo.
    const cuerpo = elemento('tbody-movimientos');
    // Inicializa edicion.
    const edicion = elemento('movimientos-edicion');
    // Inicializa dialogo.
    const dialogo = elemento('confirmar-eliminacion');
    // Inicializa confirmar.
    const confirmar = elemento('eliminacion-confirmar');
    // Inicializa cancelar.
    const cancelar = elemento('eliminacion-cancelar');
    // Inicia activa: estado de la vista actual.
    let activa = false, cargando = false, eliminando = false, editando = false;
    // Inicia revision: versión usada para descartar respuestas anteriores.
    let revision = 0, entrada = 0;
    // Inicia movimientos: lista de ingresos y gastos.
    let movimientos = [], propietario = null, seleccionado = null, origen = null;

    // Localiza '#form-movimiento' en el HTML para controlar ese elemento.
    const form = document.querySelector('#form-movimiento').cloneNode(true);
    // Actualiza form.id.
    form.id = 'form-edicion';
    // Localiza '[id]' en el HTML para controlar ese elemento.
    form.querySelectorAll('[id]').forEach(control => {
        // Actualiza control.id.
        control.id = 'editar-' + control.id;
    });
    // Localiza '[for]' en el HTML para controlar ese elemento.
    form.querySelectorAll('[for]').forEach(label => {
        // Actualiza label.htmlFor.
        label.htmlFor = 'editar-' + label.htmlFor;
    });
    // Localiza 'input[type=radio]' en el HTML para controlar ese elemento.
    form.querySelectorAll('input[type=radio]').forEach(radio => {
        // Actualiza radio.name.
        radio.name = 'editar-tipo';
    });
    // Muestra texto sin interpretarlo como HTML.
    form.querySelector('h2').textContent = 'Datos del movimiento a editar';
    // Muestra texto sin interpretarlo como HTML.
    form.querySelector('button[type=submit]').textContent = 'Guardar cambios';
    // Crea un elemento button que se completará antes de insertarlo.
    const volver = document.createElement('button');
    // Actualiza volver.type.
    volver.type = 'button';
    // Actualiza volver.className.
    volver.className = 'boton secundario';
    // Muestra texto sin interpretarlo como HTML.
    volver.textContent = 'Cancelar edición';
    // Localiza '[data-ruta]' en el HTML para controlar ese elemento.
    form.querySelector('[data-ruta]').replaceWith(volver);
    // Inserta los elementos construidos en la estructura del documento.
    edicion.append(form);
    // Inicializa editor.
    const editor = crearFormularioMovimiento({
        // Completa los argumentos de la llamada.
        form, prefijo: 'editar-', avisoSesion: aviso,
        // Incluye el indicador de éxito o error de la respuesta.
        estado: elemento('edicion-estado'), reintentar: elemento('edicion-reintentar'),
        // Incluye el campo alGuardar.
        alGuardar: movimiento => finalizar('Movimiento actualizado correctamente. Total: ' + pesos(movimiento.total) + '.'),
        // Incluye el campo alNoDisponible.
        alNoDisponible: () => finalizar('El movimiento ya no está disponible. Se actualizó el listado.'),
        // Incluye el campo alSesionVencida.
        alSesionVencida: () => mensaje('La sesión venció. La edición se descartó. Iniciá sesión para ver tus movimientos.', true)
    });

    // Define pesos con sus entradas y el resultado que devuelve.
    function pesos(valor) {
        // Devuelve (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { … al código que llamó.
        return (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 });
    }

    // Define mensaje con sus entradas y el resultado que devuelve.
    function mensaje(texto, error = false) {
        // Muestra texto sin interpretarlo como HTML.
        estado.textContent = texto;
        // Actualiza role: función accesible del elemento.
        estado.setAttribute('role', error ? 'alert' : 'status');
        // Actualiza aria-live: prioridad del anuncio para lectores de pantalla.
        estado.setAttribute('aria-live', error ? 'assertive' : 'polite');
    }

    // Define bloquear con sus entradas y el resultado que devuelve.
    function bloquear() {
        // Inicia ocupado: estado de operación en curso.
        const ocupado = cargando || eliminando || editando || dialogo.open;
        // Habilita o bloquea el control según el estado de la operación.
        actualizar.disabled = ocupado;
        // Localiza 'button' en el HTML para controlar ese elemento.
        cuerpo.querySelectorAll('button').forEach(boton => {
            // Habilita o bloquea el control según el estado de la operación.
            boton.disabled = ocupado;
        });
    }

    // Define cerrarConfirmacion con sus entradas y el resultado que devuelve.
    function cerrarConfirmacion() {
        // Cierra el diálogo y restablece los controles de confirmación.
        if (dialogo.open) dialogo.close();
        // Actualiza valor seleccionado.
        seleccionado = null;
        // Muestra texto sin interpretarlo como HTML.
        elemento('eliminacion-detalle').textContent = '';
        // Muestra texto sin interpretarlo como HTML.
        elemento('eliminacion-estado').textContent = '';
        // Actualiza role: función accesible del elemento.
        elemento('eliminacion-estado').setAttribute('role', 'status');
        // Habilita o bloquea el control según el estado de la operación.
        confirmar.disabled = false;
        // Habilita o bloquea el control según el estado de la operación.
        cancelar.disabled = false;
        // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        dialogo.setAttribute('aria-busy', 'false');
    }

    // Define cerrarEdicion con sus entradas y el resultado que devuelve.
    function cerrarEdicion(enfocar = false) {
        // Llama a editor.salir con los datos indicados.
        editor.salir();
        // Muestra u oculta el elemento según el estado actual.
        edicion.hidden = true;
        // Actualiza editando.
        editando = false;
        // Llama a bloquear con los datos indicados.
        bloquear();
        // Lleva el foco al control.
        if (enfocar && activa) (origen?.isConnected ? origen : elemento('movimientos-titulo')).focus();
        // Actualiza origen.
        origen = null;
    }

    // Define limpiar con sus entradas y el resultado que devuelve.
    function limpiar(usuario = null) {
        // Incrementa versión usada para descartar respuestas anteriores en uno.
        revision++;
        // Llama a cerrarEdicion con los datos indicados.
        cerrarEdicion();
        // Llama a cerrarConfirmacion con los datos indicados.
        cerrarConfirmacion();
        // Actualiza origen.
        origen = null;
        // Actualiza lista de ingresos y gastos.
        movimientos = [];
        // Actualiza cuenta asociada al formulario.
        propietario = null;
        // Actualiza estado de carga.
        cargando = false;
        // Actualiza eliminando.
        eliminando = false;
        // Reemplaza los elementos hijos sin interpretar texto como HTML.
        cuerpo.replaceChildren();
        // Ejecuta la función indicada para cada elemento de la lista.
        ['total-ingresos', 'total-gastos', 'total-disponible'].forEach(id => {
            // Muestra texto sin interpretarlo como HTML.
            elemento(id).textContent = '$0';
        });
        // Muestra u oculta el elemento según el estado actual.
        tabla.hidden = totales.hidden = vacio.hidden = true;
        // Muestra u oculta el elemento según el estado actual.
        aviso.hidden = Boolean(usuario);
        // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        panel.setAttribute('aria-busy', 'false');
        // Llama a mensaje con los datos indicados.
        mensaje(usuario ? 'La cuenta cambió. Actualizá el listado para ver tus movimientos.' : 'Iniciá sesión para ver tus movimientos.');
        // Llama a bloquear con los datos indicados.
        bloquear();
    }

    // Define celda con sus entradas y el resultado que devuelve.
    function celda(texto, clase = '') {
        // Crea un elemento td que se completará antes de insertarlo.
        const td = document.createElement('td');
        // Muestra texto sin interpretarlo como HTML.
        td.textContent = texto;
        // Actualiza td.className.
        td.className = clase;
        // Devuelve td al código que llamó.
        return td;
    }

    // Define fila con sus entradas y el resultado que devuelve.
    function fila(movimiento) {
        // Construye una fila con los datos y las acciones del movimiento.
        const gasto = movimiento.tipo === 'gasto';
        // Crea un elemento tr que se completará antes de insertarlo.
        const tr = document.createElement('tr');
        // Separa los valores recibidos en las variables [anio, mes, dia].
        const [anio, mes, dia] = movimiento.fecha.split('-');
        // Inicia descripcion: descripción del movimiento.
        const descripcion = movimiento.descripcion + (movimiento.cuotas > 1 ? ' (' + movimiento.cuotas + ' cuotas)' : '');
        // Inserta los elementos construidos en la estructura del documento.
        tr.append(celda(descripcion), celda(movimiento.categoria), celda(gasto ? 'Gasto' : 'Ingreso'), celda([dia, mes, anio].join('/')), celda((gasto ? '-' : '+') + pesos(movimiento.total), gasto ? 'gasto' : 'ingreso'));
        // Inicializa acciones.
        const acciones = celda('');
        // Crea un elemento div que se completará antes de insertarlo.
        const grupo = document.createElement('div');
        // Actualiza grupo.className.
        grupo.className = 'acciones-movimiento';
        // Ejecuta la función indicada para cada elemento de la lista.
        ['Editar', 'Eliminar'].forEach(texto => {
            // Crea un elemento button que se completará antes de insertarlo.
            const boton = document.createElement('button');
            // Actualiza boton.type.
            boton.type = 'button';
            // Actualiza boton.className.
            boton.className = 'boton secundario';
            // Muestra texto sin interpretarlo como HTML.
            boton.textContent = texto;
            // Actualiza boton.dataset.accion.
            boton.dataset.accion = texto.toLowerCase();
            // Actualiza boton.dataset.id.
            boton.dataset.id = movimiento.id;
            // Actualiza aria-label: propiedad del elemento en el DOM.
            boton.setAttribute('aria-label', texto + ' ' + movimiento.descripcion);
            // Inserta los elementos construidos en la estructura del documento.
            grupo.append(boton);
        });
        // Inserta los elementos construidos en la estructura del documento.
        acciones.append(grupo);
        // Inserta los elementos construidos en la estructura del documento.
        tr.append(acciones);
        // Devuelve tr al código que llamó.
        return tr;
    }

    // Define mostrar con sus entradas y el resultado que devuelve.
    function mostrar(datos) {
        // Interrumpe la función y comunica el error.
        if (!Array.isArray(datos) || datos.some(m => !m || !Number.isSafeInteger(m.id) || m.id <= 0 || !['gasto', 'ingreso'].includes(m.tipo) || typeof m.descripcion !== 'string' || typeof m.categoria !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha) || !Number.isFinite(m.total) || m.total < 0 || !Number.isSafeInteger(Math.round(m.total * 100)))) throw new Error('El servidor devolvió movimientos inválidos.');
        // Actualiza lista de ingresos y gastos.
        movimientos = [...datos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
        // Inicializa suma.
        const suma = tipo => movimientos.filter(m => m.tipo === tipo).reduce((centavos, m) => centavos + Math.round(m.total * 100), 0);
        // Inicializa ingresos.
        const ingresos = suma('ingreso'), gastos = suma('gasto');
        // Muestra texto sin interpretarlo como HTML.
        elemento('total-ingresos').textContent = '+' + pesos(ingresos / 100);
        // Muestra texto sin interpretarlo como HTML.
        elemento('total-gastos').textContent = '-' + pesos(gastos / 100);
        // Muestra texto sin interpretarlo como HTML.
        elemento('total-disponible').textContent = pesos((ingresos - gastos) / 100);
        // Llama a elemento con los datos indicados.
        elemento('total-disponible').className = ingresos < gastos ? 'gasto' : '';
        // Reemplaza los elementos hijos sin interpretar texto como HTML.
        cuerpo.replaceChildren(...movimientos.map(fila));
        // Muestra u oculta el elemento según el estado actual.
        aviso.hidden = true;
        // Muestra u oculta el elemento según el estado actual.
        totales.hidden = false;
        // Muestra u oculta el elemento según el estado actual.
        tabla.hidden = !movimientos.length;
        // Muestra u oculta el elemento según el estado actual.
        vacio.hidden = movimientos.length > 0;
    }

    // Define cargar con sus entradas y el resultado que devuelve.
    async function cargar(texto = '') {
        // Consulta los datos privados y descarta respuestas de vistas o cuentas anteriores.
        if (!activa || cargando) return false;
        // Inicializa intento.
        const intento = ++entrada;
        // Inicializa version.
        const version = revision;
        // Actualiza estado de carga.
        cargando = true;
        // Muestra u oculta el elemento según el estado actual.
        tabla.hidden = totales.hidden = vacio.hidden = aviso.hidden = true;
        // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        panel.setAttribute('aria-busy', 'true');
        // Llama a mensaje con los datos indicados.
        mensaje(texto || 'Cargando movimientos…');
        // Llama a bloquear con los datos indicados.
        bloquear();
        // Intenta la operación y permite capturar sus errores.
        try {
            // Inicia sesion: datos de sesión recibidos de PHP.
            const sesion = await NipinSesion.consultar(true);
            // Comprueba esta condición.
            if (!activa || intento !== entrada) return false;
            // Descarta lecturas anteriores a login, logout o cambio de cuenta.
            if (!sesion) {
                // Ajusta los datos según la identidad de la sesión comprobada.
                if (version === revision) limpiar();
                // Devuelve que la comprobación no se cumplió.
                return false;
            }
            // Comprueba esta condición.
            if (!NipinSesion.esUsuario(sesion.usuario.email)) return false;
            // Actualiza cuenta asociada al formulario.
            propietario = sesion.usuario.email;
            // Llama a mostrar con los datos indicados.
            mostrar(sesion.movimientos);
            // Llama a mensaje con los datos indicados.
            mensaje(texto || (movimientos.length ? 'Listado actualizado.' : 'Todavía no registraste movimientos.'));
            // Devuelve que la comprobación se cumplió.
            return true;
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (activa && intento === entrada && version === revision) mensaje((texto ? texto + ' ' : '') + 'No se pudo cargar el listado. ' + error.message, true);
            // Devuelve que la comprobación no se cumplió.
            return false;
        // Limpia el estado, incluso si la operación falló.
        } finally {
            // Restablece los controles y el estado al finalizar la operación.
            if (activa && intento === entrada) {
                // Actualiza estado de carga.
                cargando = false;
                // Actualiza aria-busy: estado de carga para tecnología de asistencia.
                panel.setAttribute('aria-busy', 'false');
                // Llama a bloquear con los datos indicados.
                bloquear();
            }
        }
    }

    // Define finalizar con sus entradas y el resultado que devuelve.
    async function finalizar(texto) {
        // Llama a cerrarEdicion con los datos indicados.
        cerrarEdicion();
        // Llama a cerrarConfirmacion con los datos indicados.
        cerrarConfirmacion();
        // Actualiza eliminando.
        eliminando = false;
        // Inicializa intento.
        const intento = entrada + 1;
        // Espera que termine la operación asíncrona antes de continuar.
        await Promise.all([cargar(texto), NipinResumen.actualizarTrasCambio()]);
        // Lleva el foco al control.
        if (activa && intento === entrada) estado.focus();
    }

    // Registra la acción que se ejecuta al recibir click.
    cuerpo.addEventListener('click', evento => {
        // Inicializa boton.
        const boton = evento.target.closest('button[data-accion]');
        // Comprueba esta condición.
        if (!boton || !activa || cargando || eliminando || editando || dialogo.open) return;
        // Inicia movimiento: datos del movimiento.
        const movimiento = movimientos.find(m => m.id === Number(boton.dataset.id));
        // Comprueba esta condición.
        if (!movimiento || !NipinSesion.esUsuario(propietario)) return;
        // Actualiza origen.
        origen = boton;
        // Comprueba esta condición.
        if (boton.dataset.accion === 'editar') {
            // Actualiza editando.
            editando = true;
            // Muestra u oculta el elemento según el estado actual.
            edicion.hidden = false;
            // Llama a bloquear con los datos indicados.
            bloquear();
            // Llama a editor.entrar con los datos indicados.
            editor.entrar(movimiento, propietario);
        // Ejecuta la alternativa cuando no se cumple la condición anterior.
        } else {
            // Actualiza valor seleccionado.
            seleccionado = movimiento.id;
            // Muestra texto sin interpretarlo como HTML.
            elemento('eliminacion-detalle').textContent = '¿Querés eliminar «' + movimiento.descripcion + '», del ' + movimiento.fecha + ', por ' + pesos(movimiento.total) + '?';
            // Llama a dialogo.showModal con los datos indicados.
            dialogo.showModal();
            // Llama a bloquear con los datos indicados.
            bloquear();
        }
    });

    // Registra la acción que se ejecuta al recibir click.
    confirmar.addEventListener('click', async () => {
        // Procesa la acción del control y actualiza su estado.
        if (!activa || eliminando || !seleccionado || !NipinSesion.esUsuario(propietario)) return;
        // Inicializa version.
        const version = revision;
        // Inicia id: identificador del recurso.
        const id = seleccionado;
        // Actualiza eliminando.
        eliminando = true;
        // Habilita o bloquea el control según el estado de la operación.
        confirmar.disabled = cancelar.disabled = true;
        // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        dialogo.setAttribute('aria-busy', 'true');
        // Muestra texto sin interpretarlo como HTML.
        elemento('eliminacion-estado').textContent = 'Eliminando movimiento…';
        // Llama a bloquear con los datos indicados.
        bloquear();
        // Intenta la operación y permite capturar sus errores.
        try {
            // Continúa en js/api.js: obtiene el token antes de habilitar envíos.
            await NipinAPI.prepararEnvios();
            // Comprueba esta condición.
            if (version !== revision) return;
            // Continúa en js/api.js, eliminarMovimiento, para comunicarse con PHP.
            const respuesta = await NipinAPI.eliminarMovimiento(id);
            // Comprueba esta condición.
            if (version !== revision) return;
            // Interrumpe la función y comunica el error.
            if (respuesta.id !== id) throw new Error('El servidor no confirmó la eliminación. Actualizá el listado antes de reintentar.');
            // Espera que termine la operación asíncrona antes de continuar.
            await finalizar('Movimiento eliminado correctamente.');
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (version !== revision) return;
            // Comprueba esta condición.
            if (error.status === 401) {
                // Continúa en js/app.js: actualiza la identidad visible y limpia las vistas.
                NipinSesion.establecer(null, { conservarBorrador: true });
                // Llama a mensaje con los datos indicados.
                mensaje('La sesión venció. Iniciá sesión para ver tus movimientos.', true);
                // Lleva el foco al control.
                if (activa) aviso.querySelector('a').focus();
            // Ejecuta la alternativa cuando no se cumple la condición anterior.
            } else if (error.status === 404) {
                // Espera que termine la operación asíncrona antes de continuar.
                await finalizar('El movimiento ya no está disponible. Se actualizó el listado.');
            // Ejecuta la alternativa cuando no se cumple la condición anterior.
            } else {
                // Presenta el error de baja dentro del diálogo como alerta.
                const detalle = elemento('eliminacion-estado');
                // Muestra texto sin interpretarlo como HTML.
                detalle.textContent = error.message;
                // Actualiza role: función accesible del elemento.
                detalle.setAttribute('role', 'alert');
            }
        // Limpia el estado, incluso si la operación falló.
        } finally {
            // Restablece los controles y el estado al finalizar la operación.
            if (version === revision) {
                // Actualiza eliminando.
                eliminando = false;
                // Habilita o bloquea el control según el estado de la operación.
                confirmar.disabled = cancelar.disabled = false;
                // Actualiza aria-busy: estado de carga para tecnología de asistencia.
                dialogo.setAttribute('aria-busy', 'false');
                // Llama a bloquear con los datos indicados.
                bloquear();
            }
        }
    });

    // Registra la acción que se ejecuta al recibir click.
    cancelar.addEventListener('click', cerrarConfirmacion);
    // Registra la acción que se ejecuta al recibir cancel.
    dialogo.addEventListener('cancel', evento => {
        // Evita el envío tradicional del formulario y la recarga completa.
        if (eliminando) evento.preventDefault();
    });
    // Registra la acción que se ejecuta al recibir close.
    dialogo.addEventListener('close', () => {
        // Llama a cerrarConfirmacion con los datos indicados.
        cerrarConfirmacion();
        // Llama a bloquear con los datos indicados.
        bloquear();
        // Lleva el foco al control.
        if (activa && origen?.isConnected && !origen.disabled) origen.focus();
        // Actualiza origen.
        origen = null;
    });
    // Registra la acción que se ejecuta al recibir click.
    volver.addEventListener('click', () => cerrarEdicion(true));
    // Registra la acción que se ejecuta al recibir click.
    actualizar.addEventListener('click', () => cargar());
    // Devuelve las funciones o datos públicos al código que llamó.
    return {
        // Expone estas funciones para utilizarlas desde otros módulos.
        limpiar,
        // Llama a entrar con los datos indicados.
        entrar() {
            // Actualiza estado de la vista actual.
            activa = true; cargar();
        },
        // Llama a salir con los datos indicados.
        salir() {
            // Actualiza estado de la vista actual.
            activa = false; entrada++; limpiar();
        }
    };
})();
