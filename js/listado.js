// Consulta, edita y elimina mediante js/api.js; PHP autoriza cada operación.
const NipinListado = (() => { // Inicializa NipinListado.
    // Prepara el listado privado, el editor y el diálogo de baja.
    const panel = document.querySelector('#vista-movimientos'); // Localiza '#vista-movimientos' en el HTML para controlar ese elemento.
    if (!panel) return null; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
    const elemento = id => panel.querySelector('#' + id); // Localiza '#' + id en el HTML para controlar ese elemento.
    const estado = elemento('movimientos-estado'); // Inicializa la variable estado: región de estado de la interfaz.
    const aviso = elemento('movimientos-sin-sesion'); // Inicializa aviso.
    const actualizar = elemento('movimientos-actualizar'); // Inicializa actualizar.
    const tabla = elemento('tabla-contenedor'); // Inicializa tabla.
    const totales = elemento('tabla-resumen'); // Inicializa totales.
    const vacio = elemento('sin-movimientos'); // Inicializa vacio.
    const cuerpo = elemento('tbody-movimientos'); // Inicializa cuerpo.
    const edicion = elemento('movimientos-edicion'); // Inicializa edicion.
    const dialogo = elemento('confirmar-eliminacion'); // Inicializa dialogo.
    const confirmar = elemento('eliminacion-confirmar'); // Inicializa confirmar.
    const cancelar = elemento('eliminacion-cancelar'); // Inicializa cancelar.
    let activa = false, cargando = false, eliminando = false, editando = false; // Inicializa la variable activa: estado de la vista actual.
    let revision = 0, entrada = 0; // Inicializa la variable revision: versión usada para descartar respuestas anteriores.
    let movimientos = [], propietario = null, seleccionado = null, origen = null; // Inicializa la variable movimientos: lista de ingresos y gastos.

    // Clona la estructura con identificadores y etiquetas propios, sin copiar eventos ni borrador.
    const form = document.querySelector('#form-movimiento').cloneNode(true); // Localiza '#form-movimiento' en el HTML para controlar ese elemento.
    form.id = 'form-edicion'; // Actualiza form.id.
    form.querySelectorAll('[id]').forEach(control => { // Localiza '[id]' en el HTML para controlar ese elemento.
        // Asigna identificadores exclusivos a los controles de edición.
        control.id = 'editar-' + control.id; // Actualiza control.id.
    }); // Cierra la función de respuesta y su registro o llamada.
    form.querySelectorAll('[for]').forEach(label => { // Localiza '[for]' en el HTML para controlar ese elemento.
        // Conserva la asociación entre cada etiqueta y su control clonado.
        label.htmlFor = 'editar-' + label.htmlFor; // Actualiza label.htmlFor.
    }); // Cierra la función de respuesta y su registro o llamada.
    form.querySelectorAll('input[type=radio]').forEach(radio => { // Localiza 'input[type=radio]' en el HTML para controlar ese elemento.
        // Separa el grupo de opciones de edición del formulario de alta.
        radio.name = 'editar-tipo'; // Actualiza radio.name.
    }); // Cierra la función de respuesta y su registro o llamada.
    form.querySelector('h2').textContent = 'Datos del movimiento a editar'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
    form.querySelector('button[type=submit]').textContent = 'Guardar cambios'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
    const volver = document.createElement('button'); // Crea un elemento button que se completará antes de insertarlo.
    volver.type = 'button'; // Actualiza volver.type.
    volver.className = 'boton secundario'; // Actualiza volver.className.
    volver.textContent = 'Cancelar edición'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
    form.querySelector('[data-ruta]').replaceWith(volver); // Localiza '[data-ruta]' en el HTML para controlar ese elemento.
    edicion.append(form); // Inserta los elementos construidos en la estructura del documento.
    const editor = crearFormularioMovimiento({ // Inicializa editor.
        form, prefijo: 'editar-', avisoSesion: aviso, // Completa los argumentos de la operación iniciada arriba.
        estado: elemento('edicion-estado'), reintentar: elemento('edicion-reintentar'), // Incluye el indicador de éxito o error de la respuesta en esta estructura.
        alGuardar: movimiento => finalizar('Movimiento actualizado correctamente. Total: ' + pesos(movimiento.total) + '.'), // Incluye el campo alGuardar en esta estructura.
        alNoDisponible: () => finalizar('El movimiento ya no está disponible. Se actualizó el listado.'), // Incluye el campo alNoDisponible en esta estructura.
        alSesionVencida: () => mensaje('La sesión venció. La edición se descartó. Iniciá sesión para ver tus movimientos.', true) // Incluye el campo alSesionVencida en esta estructura.
    }); // Cierra la función de respuesta y su registro o llamada.

    function pesos(valor) { // Define pesos con sus entradas y el resultado que devuelve.
        // Formatea el importe como moneda argentina.
        return (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 }); // Devuelve (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { … al código que llamó.
    } // Finaliza este bloque.

    function mensaje(texto, error = false) { // Define mensaje con sus entradas y el resultado que devuelve.
        // Actualiza el texto de estado y sus atributos accesibles.
        estado.textContent = texto; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        estado.setAttribute('role', error ? 'alert' : 'status'); // Actualiza role: función accesible del elemento.
        estado.setAttribute('aria-live', error ? 'assertive' : 'polite'); // Actualiza aria-live: prioridad del anuncio para lectores de pantalla.
    } // Finaliza este bloque.

    function bloquear() { // Define bloquear con sus entradas y el resultado que devuelve.
        // Habilita o bloquea los controles durante la operación.
        const ocupado = cargando || eliminando || editando || dialogo.open; // Inicializa la variable ocupado: estado de operación en curso.
        actualizar.disabled = ocupado; // Habilita o bloquea el control según el estado de la operación.
        cuerpo.querySelectorAll('button').forEach(boton => { // Localiza 'button' en el HTML para controlar ese elemento.
            // Actualiza la disponibilidad de los controles afectados.
            boton.disabled = ocupado; // Habilita o bloquea el control según el estado de la operación.
        }); // Cierra la función de respuesta y su registro o llamada.
    } // Finaliza este bloque.

    function cerrarConfirmacion() { // Define cerrarConfirmacion con sus entradas y el resultado que devuelve.
        // Cierra el diálogo y restablece los controles de confirmación.
        if (dialogo.open) dialogo.close(); // Cierra el diálogo y restablece los controles de confirmación.
        seleccionado = null; // Actualiza valor seleccionado.
        elemento('eliminacion-detalle').textContent = ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento('eliminacion-estado').textContent = ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento('eliminacion-estado').setAttribute('role', 'status'); // Actualiza role: función accesible del elemento.
        confirmar.disabled = false; // Habilita o bloquea el control según el estado de la operación.
        cancelar.disabled = false; // Habilita o bloquea el control según el estado de la operación.
        dialogo.setAttribute('aria-busy', 'false'); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
    } // Finaliza este bloque.

    function cerrarEdicion(enfocar = false) { // Define cerrarEdicion con sus entradas y el resultado que devuelve.
        // Oculta el editor y devuelve el foco cuando corresponde.
        editor.salir(); // Llama a editor.salir con los datos indicados.
        edicion.hidden = true; // Muestra u oculta el elemento según el estado actual.
        editando = false; // Actualiza editando.
        bloquear(); // Llama a bloquear con los datos indicados.
        if (enfocar && activa) (origen?.isConnected ? origen : elemento('movimientos-titulo')).focus(); // Lleva el foco al control para continuar con teclado.
        origen = null; // Actualiza origen.
    } // Finaliza este bloque.

    function limpiar(usuario = null) { // Define limpiar con sus entradas y el resultado que devuelve.
        // Limpia los datos de la vista e invalida las respuestas anteriores.
        revision++; // Incrementa versión usada para descartar respuestas anteriores en uno.
        cerrarEdicion(); // Llama a cerrarEdicion con los datos indicados.
        cerrarConfirmacion(); // Llama a cerrarConfirmacion con los datos indicados.
        origen = null; // Actualiza origen.
        movimientos = []; // Actualiza lista de ingresos y gastos.
        propietario = null; // Actualiza cuenta asociada al formulario.
        cargando = false; // Actualiza estado de carga.
        eliminando = false; // Actualiza eliminando.
        cuerpo.replaceChildren(); // Reemplaza los elementos hijos sin interpretar texto como HTML.
        ['total-ingresos', 'total-gastos', 'total-disponible'].forEach(id => { // Ejecuta la función indicada para cada elemento de la lista.
            // Actualiza los elementos de la interfaz con los datos de este bloque.
            elemento(id).textContent = '$0'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        }); // Cierra la función de respuesta y su registro o llamada.
        tabla.hidden = totales.hidden = vacio.hidden = true; // Muestra u oculta el elemento según el estado actual.
        aviso.hidden = Boolean(usuario); // Muestra u oculta el elemento según el estado actual.
        panel.setAttribute('aria-busy', 'false'); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        mensaje(usuario ? 'La cuenta cambió. Actualizá el listado para ver tus movimientos.' : 'Iniciá sesión para ver tus movimientos.'); // Llama a mensaje con los datos indicados.
        bloquear(); // Llama a bloquear con los datos indicados.
    } // Finaliza este bloque.

    function celda(texto, clase = '') { // Define celda con sus entradas y el resultado que devuelve.
        // Crea una celda con texto seguro, sin interpretar HTML del usuario.
        const td = document.createElement('td'); // Crea un elemento td que se completará antes de insertarlo.
        td.textContent = texto; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        td.className = clase; // Actualiza td.className.
        return td; // Devuelve td al código que llamó.
    } // Finaliza este bloque.

    function fila(movimiento) { // Define fila con sus entradas y el resultado que devuelve.
        // Construye una fila con los datos y las acciones del movimiento.
        const gasto = movimiento.tipo === 'gasto'; // Inicializa gasto.
        const tr = document.createElement('tr'); // Crea un elemento tr que se completará antes de insertarlo.
        const [anio, mes, dia] = movimiento.fecha.split('-'); // Separa los valores recibidos en las variables [anio, mes, dia].
        const descripcion = movimiento.descripcion + (movimiento.cuotas > 1 ? ' (' + movimiento.cuotas + ' cuotas)' : ''); // Inicializa la variable descripcion: descripción del movimiento.
        tr.append(celda(descripcion), celda(movimiento.categoria), celda(gasto ? 'Gasto' : 'Ingreso'), celda([dia, mes, anio].join('/')), celda((gasto ? '-' : '+') + pesos(movimiento.total), gasto ? 'gasto' : 'ingreso')); // Inserta los elementos construidos en la estructura del documento.
        const acciones = celda(''); // Inicializa acciones.
        const grupo = document.createElement('div'); // Crea un elemento div que se completará antes de insertarlo.
        grupo.className = 'acciones-movimiento'; // Actualiza grupo.className.
        ['Editar', 'Eliminar'].forEach(texto => { // Ejecuta la función indicada para cada elemento de la lista.
            // Crea cada acción con nombre accesible e identificador de movimiento.
            const boton = document.createElement('button'); // Crea un elemento button que se completará antes de insertarlo.
            boton.type = 'button'; // Actualiza boton.type.
            boton.className = 'boton secundario'; // Actualiza boton.className.
            boton.textContent = texto; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            boton.dataset.accion = texto.toLowerCase(); // Actualiza boton.dataset.accion.
            boton.dataset.id = movimiento.id; // Actualiza boton.dataset.id.
            boton.setAttribute('aria-label', texto + ' ' + movimiento.descripcion); // Actualiza aria-label: propiedad del elemento en el DOM.
            grupo.append(boton); // Inserta los elementos construidos en la estructura del documento.
        }); // Cierra la función de respuesta y su registro o llamada.
        acciones.append(grupo); // Inserta los elementos construidos en la estructura del documento.
        tr.append(acciones); // Inserta los elementos construidos en la estructura del documento.
        return tr; // Devuelve tr al código que llamó.
    } // Finaliza este bloque.

    function mostrar(datos) { // Define mostrar con sus entradas y el resultado que devuelve.
        // Actualiza la presentación con los datos recibidos.
        if (!Array.isArray(datos) || datos.some(m => !m || !Number.isSafeInteger(m.id) || m.id <= 0 || !['gasto', 'ingreso'].includes(m.tipo) || typeof m.descripcion !== 'string' || typeof m.categoria !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha) || !Number.isFinite(m.total) || m.total < 0 || !Number.isSafeInteger(Math.round(m.total * 100)))) throw new Error('El servidor devolvió movimientos inválidos.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        movimientos = [...datos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id); // Actualiza lista de ingresos y gastos.
        const suma = tipo => movimientos.filter(m => m.tipo === tipo).reduce((centavos, m) => centavos + Math.round(m.total * 100), 0); // Inicializa suma.
        const ingresos = suma('ingreso'), gastos = suma('gasto'); // Inicializa ingresos.
        elemento('total-ingresos').textContent = '+' + pesos(ingresos / 100); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento('total-gastos').textContent = '-' + pesos(gastos / 100); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento('total-disponible').textContent = pesos((ingresos - gastos) / 100); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento('total-disponible').className = ingresos < gastos ? 'gasto' : ''; // Llama a elemento con los datos indicados.
        cuerpo.replaceChildren(...movimientos.map(fila)); // Reemplaza los elementos hijos sin interpretar texto como HTML.
        aviso.hidden = true; // Muestra u oculta el elemento según el estado actual.
        totales.hidden = false; // Muestra u oculta el elemento según el estado actual.
        tabla.hidden = !movimientos.length; // Muestra u oculta el elemento según el estado actual.
        vacio.hidden = movimientos.length > 0; // Muestra u oculta el elemento según el estado actual.
    } // Finaliza este bloque.

    async function cargar(texto = '') { // Define cargar con sus entradas y el resultado que devuelve.
        // Consulta los datos privados y descarta respuestas de vistas o cuentas anteriores.
        if (!activa || cargando) return false; // Consulta los datos privados y descarta respuestas de vistas o cuentas anteriores.
        const intento = ++entrada; // Inicializa intento.
        const version = revision; // Inicializa version.
        cargando = true; // Actualiza estado de carga.
        tabla.hidden = totales.hidden = vacio.hidden = aviso.hidden = true; // Muestra u oculta el elemento según el estado actual.
        panel.setAttribute('aria-busy', 'true'); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        mensaje(texto || 'Cargando movimientos…'); // Llama a mensaje con los datos indicados.
        bloquear(); // Llama a bloquear con los datos indicados.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            const sesion = await NipinSesion.consultar(true); // Inicializa la variable sesion: datos de sesión recibidos de PHP.
            if (!activa || intento !== entrada) return false; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Descarta lecturas anteriores a login, logout o cambio de cuenta.
            if (!sesion) { // Descarta lecturas anteriores a login, logout o cambio de cuenta.
                // Ajusta los datos según la identidad de la sesión comprobada.
                if (version === revision) limpiar(); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                return false; // Devuelve que la comprobación no se cumplió.
            } // Finaliza este bloque.
            if (!NipinSesion.esUsuario(sesion.usuario.email)) return false; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            propietario = sesion.usuario.email; // Actualiza cuenta asociada al formulario.
            mostrar(sesion.movimientos); // Llama a mostrar con los datos indicados.
            mensaje(texto || (movimientos.length ? 'Listado actualizado.' : 'Todavía no registraste movimientos.')); // Llama a mensaje con los datos indicados.
            return true; // Devuelve que la comprobación se cumplió.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (activa && intento === entrada && version === revision) mensaje((texto ? texto + ' ' : '') + 'No se pudo cargar el listado. ' + error.message, true); // Informa el fallo sin sustituir el resultado por un éxito.
            return false; // Devuelve que la comprobación no se cumplió.
        } finally { // Ejecuta la limpieza final aunque la operación haya fallado.
            // Restablece los controles y el estado al finalizar la operación.
            if (activa && intento === entrada) { // Restablece los controles y el estado al finalizar la operación.
                // Mantiene el resultado sólo para la vista o sesión vigente.
                cargando = false; // Actualiza estado de carga.
                panel.setAttribute('aria-busy', 'false'); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
                bloquear(); // Llama a bloquear con los datos indicados.
            } // Finaliza este bloque.
        } // Finaliza este bloque.
    } // Finaliza este bloque.

    async function finalizar(texto) { // Define finalizar con sus entradas y el resultado que devuelve.
        // Cierra la operación y actualiza listado, resumen y foco.
        cerrarEdicion(); // Llama a cerrarEdicion con los datos indicados.
        cerrarConfirmacion(); // Llama a cerrarConfirmacion con los datos indicados.
        eliminando = false; // Actualiza eliminando.
        const intento = entrada + 1; // Inicializa intento.
        await Promise.all([cargar(texto), NipinResumen.actualizarTrasCambio()]); // Espera que termine la operación asíncrona antes de continuar.
        if (activa && intento === entrada) estado.focus(); // Lleva el foco al control para continuar con teclado.
    } // Finaliza este bloque.

    cuerpo.addEventListener('click', evento => { // Registra la acción que se ejecuta al recibir click.
        // Procesa la acción del control y actualiza su estado.
        const boton = evento.target.closest('button[data-accion]'); // Inicializa boton.
        if (!boton || !activa || cargando || eliminando || editando || dialogo.open) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const movimiento = movimientos.find(m => m.id === Number(boton.dataset.id)); // Inicializa la variable movimiento: datos del movimiento.
        if (!movimiento || !NipinSesion.esUsuario(propietario)) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        origen = boton; // Actualiza origen.
        if (boton.dataset.accion === 'editar') { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Abre el editor con el movimiento y la cuenta seleccionados.
            editando = true; // Actualiza editando.
            edicion.hidden = false; // Muestra u oculta el elemento según el estado actual.
            bloquear(); // Llama a bloquear con los datos indicados.
            editor.entrar(movimiento, propietario); // Llama a editor.entrar con los datos indicados.
        } else { // Ejecuta la alternativa cuando no se cumple la condición anterior.
            // Prepara y abre el diálogo de confirmación de baja.
            seleccionado = movimiento.id; // Actualiza valor seleccionado.
            elemento('eliminacion-detalle').textContent = '¿Querés eliminar «' + movimiento.descripcion + '», del ' + movimiento.fecha + ', por ' + pesos(movimiento.total) + '?'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            dialogo.showModal(); // Llama a dialogo.showModal con los datos indicados.
            bloquear(); // Llama a bloquear con los datos indicados.
        } // Finaliza este bloque.
    }); // Cierra la función de respuesta y su registro o llamada.

    confirmar.addEventListener('click', async () => { // Registra la acción que se ejecuta al recibir click.
        // Procesa la acción del control y actualiza su estado.
        if (!activa || eliminando || !seleccionado || !NipinSesion.esUsuario(propietario)) return; // Procesa la acción del control y actualiza su estado.
        const version = revision; // Inicializa version.
        const id = seleccionado; // Inicializa la variable id: identificador del recurso.
        eliminando = true; // Actualiza eliminando.
        confirmar.disabled = cancelar.disabled = true; // Habilita o bloquea el control según el estado de la operación.
        dialogo.setAttribute('aria-busy', 'true'); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        elemento('eliminacion-estado').textContent = 'Eliminando movimiento…'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        bloquear(); // Llama a bloquear con los datos indicados.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            await NipinAPI.prepararEnvios(); // Continúa en js/api.js: obtiene el token antes de habilitar envíos.
            if (version !== revision) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            const respuesta = await NipinAPI.eliminarMovimiento(id); // Continúa en js/api.js, eliminarMovimiento, para comunicarse con PHP.
            if (version !== revision) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            if (respuesta.id !== id) throw new Error('El servidor no confirmó la eliminación. Actualizá el listado antes de reintentar.'); // Interrumpe el recorrido y comunica el error al código que llamó.
            await finalizar('Movimiento eliminado correctamente.'); // Espera que termine la operación asíncrona antes de continuar.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (version !== revision) return; // Informa el fallo sin sustituir el resultado por un éxito.
            if (error.status === 401) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                // Descarta datos privados cuando el servidor informa sesión vencida.
                NipinSesion.establecer(null, { conservarBorrador: true }); // Continúa en js/app.js: actualiza la identidad visible y limpia las vistas.
                mensaje('La sesión venció. Iniciá sesión para ver tus movimientos.', true); // Llama a mensaje con los datos indicados.
                if (activa) aviso.querySelector('a').focus(); // Lleva el foco al control para continuar con teclado.
            } else if (error.status === 404) { // Ejecuta la alternativa cuando no se cumple la condición anterior.
                // Actualiza el listado si el movimiento dejó de estar disponible.
                await finalizar('El movimiento ya no está disponible. Se actualizó el listado.'); // Espera que termine la operación asíncrona antes de continuar.
            } else { // Ejecuta la alternativa cuando no se cumple la condición anterior.
                // Presenta el error de baja dentro del diálogo como alerta.
                const detalle = elemento('eliminacion-estado'); // Inicializa detalle.
                detalle.textContent = error.message; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
                detalle.setAttribute('role', 'alert'); // Actualiza role: función accesible del elemento.
            } // Finaliza este bloque.
        } finally { // Ejecuta la limpieza final aunque la operación haya fallado.
            // Restablece los controles y el estado al finalizar la operación.
            if (version === revision) { // Restablece los controles y el estado al finalizar la operación.
                // Mantiene el resultado sólo para la vista o sesión vigente.
                eliminando = false; // Actualiza eliminando.
                confirmar.disabled = cancelar.disabled = false; // Habilita o bloquea el control según el estado de la operación.
                dialogo.setAttribute('aria-busy', 'false'); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
                bloquear(); // Llama a bloquear con los datos indicados.
            } // Finaliza este bloque.
        } // Finaliza este bloque.
    }); // Cierra la función de respuesta y su registro o llamada.

    cancelar.addEventListener('click', cerrarConfirmacion); // Registra la acción que se ejecuta al recibir click.
    dialogo.addEventListener('cancel', evento => { // Registra la acción que se ejecuta al recibir cancel.
        // Atiende el evento cancel del control.
        if (eliminando) evento.preventDefault(); // Evita el envío tradicional del formulario y la recarga completa.
    }); // Cierra la función de respuesta y su registro o llamada.
    dialogo.addEventListener('close', () => { // Registra la acción que se ejecuta al recibir close.
        // Restablece el diálogo y devuelve el foco a su origen.
        cerrarConfirmacion(); // Llama a cerrarConfirmacion con los datos indicados.
        bloquear(); // Llama a bloquear con los datos indicados.
        if (activa && origen?.isConnected && !origen.disabled) origen.focus(); // Lleva el foco al control para continuar con teclado.
        origen = null; // Actualiza origen.
    }); // Cierra la función de respuesta y su registro o llamada.
    volver.addEventListener('click', () => cerrarEdicion(true)); // Registra la acción que se ejecuta al recibir click.
    actualizar.addEventListener('click', () => cargar()); // Registra la acción que se ejecuta al recibir click.
    return { // Devuelve las funciones o datos públicos al código que llamó.
        limpiar, // Expone estas funciones para utilizarlas desde otros módulos.
        entrar() { // Llama a entrar con los datos indicados.
            // Activa la vista y prepara sus datos antes de habilitar controles.
            activa = true; cargar(); // Actualiza estado de la vista actual.
        }, // Completa la estructura o llamada iniciada arriba.
        salir() { // Llama a salir con los datos indicados.
            // Desactiva la vista para que las respuestas pendientes no la actualicen.
            activa = false; entrada++; limpiar(); // Actualiza estado de la vista actual.
        } // Finaliza este bloque.
    }; // Completa la estructura o llamada iniciada arriba.
})(); // Ejecuta el módulo y conserva sus funciones públicas.
