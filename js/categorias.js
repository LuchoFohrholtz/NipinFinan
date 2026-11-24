// Pide catálogo e historial a api/categorias.php y los presenta como texto.
const NipinCategorias = (() => { // Inicializa NipinCategorias.
    // Coordina las vistas privadas de catálogo y detalle.
    if (!document.querySelector('#vista-categorias')) return null; // Localiza '#vista-categorias' en el HTML para controlar ese elemento.
    let revisionSesion = 0; // Inicializa la variable revisionSesion: versión del estado de sesión en JavaScript.
    const vistas = []; // Inicializa vistas.
    const idValido = id => typeof id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(id); // Inicializa idValido.
    const pesos = valor => valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: Number.isInteger(valor) ? 0 : 2 }); // Inicializa pesos.
    const centavos = valor => typeof valor === 'number' && Number.isFinite(valor) && Number.isSafeInteger(Math.round(valor * 100)) && Number(valor.toFixed(2)) === valor; // Inicializa centavos.

    function validarCategoria(categoria) { // Define validarCategoria con sus entradas y el resultado que devuelve.
        // Comprueba la estructura y coherencia de los totales de la categoría.
        if (!categoria || !idValido(categoria.id) || typeof categoria.nombre !== 'string' || !categoria.nombre.trim() || !['ingreso', 'gasto'].includes(categoria.tipo)) throw new Error('La categoría recibida es inválida.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        if (!['ingresos', 'gastos', 'saldo'].every(campo => centavos(categoria[campo])) || categoria.ingresos < 0 || categoria.gastos < 0 || Math.round(categoria.saldo * 100) !== Math.round(categoria.ingresos * 100) - Math.round(categoria.gastos * 100) || !Number.isSafeInteger(categoria.cantidad) || categoria.cantidad < 0) throw new Error('Los totales de la categoría son inválidos.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        if (categoria.cantidad === 0 && (categoria.ingresos !== 0 || categoria.gastos !== 0)) throw new Error('Los totales no corresponden a la categoría.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        return categoria; // Devuelve categoría seleccionada al código que llamó.
    } // Finaliza este bloque.

    function texto(tag, valor, clase = '') { // Define texto con sus entradas y el resultado que devuelve.
        // Crea un elemento e inserta su contenido como texto.
        const elemento = document.createElement(tag); // Crea un elemento HTML que se completará antes de insertarlo.
        elemento.textContent = valor; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento.className = clase; // Actualiza elemento.className.
        return elemento; // Devuelve elemento al código que llamó.
    } // Finaliza este bloque.

    function mostrarCatalogo(datos) { // Define mostrarCatalogo con sus entradas y el resultado que devuelve.
        // Construye las tarjetas del catálogo con totales propios de la cuenta.
        if (!Array.isArray(datos.categorias)) throw new Error('El catálogo recibido es inválido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        const categorias = datos.categorias.map(validarCategoria); // Inicializa la variable categorias: categorías admitidas.
        if (new Set(categorias.map(c => c.id)).size !== categorias.length) throw new Error('El catálogo contiene IDs repetidos.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        const lista = document.querySelector('#categorias-lista'); // Localiza '#categorias-lista' en el HTML para controlar ese elemento.
        lista.replaceChildren(...categorias.map(categoria => { // Reemplaza los elementos hijos sin interpretar texto como HTML.
            // Construye una tarjeta de categoría.
            const item = document.createElement('li'); // Crea un elemento li que se completará antes de insertarlo.
            const enlace = document.createElement('a'); // Crea un elemento a que se completará antes de insertarlo.
            enlace.className = 'categoria'; // Actualiza enlace.className.
            enlace.dataset.ruta = 'categorias/' + categoria.id; // Actualiza enlace.dataset.ruta.
            enlace.href = 'index.html#/' + enlace.dataset.ruta; // Actualiza enlace.href.
            const icono = texto('div', Array.from(categoria.nombre)[0], 'icono'); // Inicializa icono.
            icono.setAttribute('aria-hidden', 'true'); // Actualiza aria-hidden: propiedad del elemento en el DOM.
            const totales = document.createElement('dl'); // Crea un elemento dl que se completará antes de insertarlo.
            [['Ingresos', pesos(categoria.ingresos)], ['Gastos', pesos(categoria.gastos)], ['Saldo', pesos(categoria.saldo)], ['Movimientos', categoria.cantidad]].forEach(([etiqueta, valor]) => { // Ejecuta la función indicada para cada elemento de la lista.
                // Actualiza los elementos de la interfaz con los datos de este bloque.
                totales.append(texto('dt', etiqueta), texto('dd', valor)); // Inserta los elementos construidos en la estructura del documento.
            }); // Cierra la función de respuesta y su registro o llamada.
            enlace.append(icono, texto('h2', categoria.nombre), texto('p', categoria.tipo === 'gasto' ? 'Categoría de gastos' : 'Categoría de ingresos'), totales); // Inserta los elementos construidos en la estructura del documento.
            item.append(enlace); // Inserta los elementos construidos en la estructura del documento.
            return item; // Devuelve item al código que llamó.
        })); // Completa la estructura o llamada iniciada arriba.
        lista.hidden = !categorias.length; // Muestra u oculta el elemento según el estado actual.
        document.querySelector('#categorias-vacio').hidden = categorias.length > 0; // Localiza '#categorias-vacio' en el HTML para controlar ese elemento.
        return categorias.length + (categorias.length === 1 ? ' categoría disponible.' : ' categorías disponibles.') + ' Los importes corresponden a tu cuenta.'; // Devuelve categorias.length + (categorias.length === 1 ? ' categoría disponible… al código que llamó.
    } // Finaliza este bloque.

    function validarHistorial(datos, categoria) { // Define validarHistorial con sus entradas y el resultado que devuelve.
        // Valida el historial y verifica que coincida con los totales recibidos.
        if (!Array.isArray(datos) || datos.length !== categoria.cantidad) throw new Error('El historial recibido es inválido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        const ids = new Set(); // Inicializa ids.
        let ingresos = 0, gastos = 0; // Inicializa ingresos.
        datos.forEach(movimiento => { // Ejecuta la función indicada para cada elemento de la lista.
            // Comprueba cada movimiento del historial antes de sumar sus importes.
            const fecha = typeof movimiento?.fecha === 'string' ? movimiento.fecha : ''; // Inicializa la variable fecha: fecha del movimiento.
            const fechaReal = new Date(fecha + 'T00:00:00Z'); // Inicializa fechaReal.
            if (!movimiento || !Number.isSafeInteger(movimiento.id) || movimiento.id <= 0 || ids.has(movimiento.id) || !['ingreso', 'gasto'].includes(movimiento.tipo) || movimiento.categoria !== categoria.nombre || typeof movimiento.descripcion !== 'string' || !movimiento.descripcion.trim() || !centavos(movimiento.total) || movimiento.total <= 0 || typeof movimiento.medioPago !== 'string' || !movimiento.medioPago || ![1, 3, 6, 12].includes(movimiento.cuotas) || (movimiento.comentario != null && typeof movimiento.comentario !== 'string') || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < '1900-01-01' || fecha > '2100-12-31' || Number.isNaN(fechaReal.getTime()) || fechaReal.toISOString().slice(0, 10) !== fecha) throw new Error('El historial contiene movimientos inválidos.'); // Interrumpe el recorrido y comunica el error al código que llamó.
            ids.add(movimiento.id); // Llama a ids.add con los datos indicados.
            if (movimiento.tipo === 'ingreso') ingresos += Math.round(movimiento.total * 100); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            else gastos += Math.round(movimiento.total * 100); // Ejecuta la alternativa cuando no se cumple la condición anterior.
        }); // Cierra la función de respuesta y su registro o llamada.
        if (!Number.isSafeInteger(ingresos) || !Number.isSafeInteger(gastos) || ingresos !== Math.round(categoria.ingresos * 100) || gastos !== Math.round(categoria.gastos * 100)) throw new Error('El historial no coincide con los totales recibidos.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        return [...datos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id); // Devuelve [...datos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.… al código que llamó.
    } // Finaliza este bloque.

    function mostrarDetalle(datos, id) { // Define mostrarDetalle con sus entradas y el resultado que devuelve.
        // Presenta la categoría elegida y sus movimientos como texto seguro.
        const categoria = validarCategoria(datos.categoria); // Inicializa la variable categoria: categoría seleccionada.
        if (categoria.id !== id) throw new Error('El servidor devolvió otra categoría.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        const movimientos = validarHistorial(datos.movimientos, categoria); // Inicializa la variable movimientos: lista de ingresos y gastos.
        const panel = document.querySelector('#vista-categoria'); // Localiza '#vista-categoria' en el HTML para controlar ese elemento.
        panel.querySelector('#categoria-titulo').textContent = categoria.nombre; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        document.title = categoria.nombre + ' - NipinFinan'; // Actualiza document.title.
        panel.querySelector('#categoria-icono').textContent = Array.from(categoria.nombre)[0]; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector('#categoria-tipo').textContent = categoria.tipo === 'gasto' ? 'Categoría de gastos' : 'Categoría de ingresos'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        ['ingresos', 'gastos', 'saldo'].forEach(campo => { // Ejecuta la función indicada para cada elemento de la lista.
            // Actualiza los elementos de la interfaz con los datos de este bloque.
            panel.querySelector('#categoria-' + campo).textContent = pesos(categoria[campo]); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        }); // Cierra la función de respuesta y su registro o llamada.
        panel.querySelector('#categoria-saldo').className = categoria.saldo < 0 ? 'gasto' : categoria.saldo > 0 ? 'ingreso' : ''; // Localiza '#categoria-saldo' en el HTML para controlar ese elemento.
        panel.querySelector('#categoria-cantidad').textContent = categoria.cantidad; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        panel.querySelector('#categoria-historial').replaceChildren(...movimientos.map(movimiento => { // Localiza '#categoria-historial' en el HTML para controlar ese elemento.
            // Construye un registro visible del historial.
            const item = document.createElement('li'); // Crea un elemento li que se completará antes de insertarlo.
            item.className = 'movimiento'; // Actualiza item.className.
            const info = document.createElement('div'); // Crea un elemento div que se completará antes de insertarlo.
            const [anio, mes, dia] = movimiento.fecha.split('-'); // Separa los valores recibidos en las variables [anio, mes, dia].
            const cuotas = movimiento.cuotas > 1 ? ' · ' + movimiento.cuotas + ' cuotas' : ''; // Inicializa la variable cuotas: cantidad de cuotas.
            info.append(texto('strong', movimiento.descripcion), texto('p', [dia, mes, anio].join('/') + ' · ' + movimiento.medioPago + cuotas)); // Inserta los elementos construidos en la estructura del documento.
            if (movimiento.comentario) info.append(texto('p', movimiento.comentario)); // Inserta los elementos construidos en la estructura del documento.
            item.append(info, texto('strong', (movimiento.tipo === 'gasto' ? '−' : '+') + pesos(movimiento.total), movimiento.tipo)); // Inserta los elementos construidos en la estructura del documento.
            return item; // Devuelve item al código que llamó.
        })); // Completa la estructura o llamada iniciada arriba.
        panel.querySelector('#categoria-sin-movimientos').hidden = movimientos.length > 0; // Localiza '#categoria-sin-movimientos' en el HTML para controlar ese elemento.
        panel.querySelector('#categoria-datos').hidden = false; // Localiza '#categoria-datos' en el HTML para controlar ese elemento.
        return categoria.nombre + ': ' + movimientos.length + (movimientos.length === 1 ? ' movimiento.' : ' movimientos.') + ' Saldo: ' + pesos(categoria.saldo) + '.'; // Devuelve categoria.nombre + ': ' + movimientos.length + (movimientos.length ==… al código que llamó.
    } // Finaliza este bloque.

    function crearVista(nombre, mostrar, vaciar) { // Define crearVista con sus entradas y el resultado que devuelve.
        // Reutiliza la carga, los mensajes y el estado de catálogo y detalle.
        const panel = document.querySelector('#vista-' + nombre); // Localiza '#vista-' + nombre en el HTML para controlar ese elemento.
        const estado = panel.querySelector('#' + nombre + '-estado'); // Localiza '#' + nombre + '-estado' en el HTML para controlar ese elemento.
        const aviso = panel.querySelector('#' + nombre + '-sin-sesion'); // Localiza '#' + nombre + '-sin-sesion' en el HTML para controlar ese elemento.
        const actualizar = panel.querySelector('#' + nombre + '-actualizar'); // Localiza '#' + nombre + '-actualizar' en el HTML para controlar ese elemento.
        let activa = false, cargando = false, entrada = 0, id = null; // Inicializa la variable activa: estado de la vista actual.
        const vigente = intento => activa && intento === entrada; // Inicializa vigente.

        function mensaje(valor, error = false) { // Define mensaje con sus entradas y el resultado que devuelve.
            // Actualiza el texto de estado y sus atributos accesibles.
            estado.textContent = valor; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            estado.setAttribute('role', error ? 'alert' : 'status'); // Actualiza role: función accesible del elemento.
            estado.setAttribute('aria-live', error ? 'assertive' : 'polite'); // Actualiza aria-live: prioridad del anuncio para lectores de pantalla.
        } // Finaliza este bloque.

        function bloquear(ocupado) { // Define bloquear con sus entradas y el resultado que devuelve.
            // Habilita o bloquea los controles durante la operación.
            cargando = ocupado; // Actualiza estado de carga.
            actualizar.disabled = ocupado; // Habilita o bloquea el control según el estado de la operación.
            panel.setAttribute('aria-busy', String(ocupado)); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        } // Finaliza este bloque.

        function limpiar(usuario = null) { // Define limpiar con sus entradas y el resultado que devuelve.
            // Limpia los datos de la vista e invalida las respuestas anteriores.
            vaciar(); // Llama a vaciar con los datos indicados.
            bloquear(false); // Llama a bloquear con los datos indicados.
            aviso.hidden = Boolean(usuario); // Muestra u oculta el elemento según el estado actual.
            mensaje(usuario ? 'La cuenta cambió. Actualizá para consultar tus datos.' : 'Iniciá sesión para consultar tus categorías.'); // Llama a mensaje con los datos indicados.
        } // Finaliza este bloque.

        async function cargar() { // Define cargar con sus entradas y el resultado que devuelve.
            // Consulta los datos privados y descarta respuestas de vistas o cuentas anteriores.
            if (!activa || cargando) return; // Consulta los datos privados y descarta respuestas de vistas o cuentas anteriores.
            const intento = ++entrada; // Inicializa intento.
            let version = revisionSesion; // Inicializa version.
            const devolverFoco = document.activeElement === actualizar; // Inicializa devolverFoco.
            vaciar(); // Llama a vaciar con los datos indicados.
            aviso.hidden = true; // Muestra u oculta el elemento según el estado actual.
            bloquear(true); // Llama a bloquear con los datos indicados.
            mensaje('Verificando sesión y cargando categorías…'); // Llama a mensaje con los datos indicados.
            try { // Intenta la operación; catch manejará sus posibles errores.
                // Ejecuta la operación y permite tratar sus errores.
                const sesion = await NipinSesion.consultar(true); // Inicializa la variable sesion: datos de sesión recibidos de PHP.
                if (!vigente(intento)) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                if (!sesion) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                    // Ajusta los datos según la identidad de la sesión comprobada.
                    if (version === revisionSesion) limpiar(); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                    return; // Sale de esta función sin continuar con las instrucciones siguientes.
                } // Finaliza este bloque.
                const cuenta = sesion.usuario?.email; // Inicializa cuenta.
                if (typeof cuenta !== 'string' || !cuenta || !NipinSesion.esUsuario(cuenta)) throw new Error('No se pudo verificar la cuenta.'); // Interrumpe el recorrido y comunica el error al código que llamó.
                version = revisionSesion; // Actualiza version.
                bloquear(true); // Llama a bloquear con los datos indicados.
                const datos = await NipinAPI.solicitarJSON('api/categorias.php' + (id ? '?id=' + encodeURIComponent(id) : ''), { privada: true }); // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
                if (!vigente(intento) || version !== revisionSesion || !NipinSesion.esUsuario(cuenta)) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                // Revalida la identidad para no atribuir categorías a otra cuenta.
                const confirmacion = await NipinSesion.consultar(true); // Inicializa confirmacion.
                if (!vigente(intento)) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                if (version !== revisionSesion || !confirmacion || confirmacion.usuario?.email !== cuenta || !NipinSesion.esUsuario(cuenta)) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                    // Ajusta los datos según la identidad de la sesión comprobada.
                    if (confirmacion?.usuario && !cargando && NipinSesion.esUsuario(confirmacion.usuario.email)) cargar(); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                    return; // Sale de esta función sin continuar con las instrucciones siguientes.
                } // Finaliza este bloque.
                mensaje(mostrar(datos, id)); // Llama a mensaje con los datos indicados.
            } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
                // Informa el fallo sin sustituir el resultado por un éxito.
                if (!vigente(intento) || version !== revisionSesion) return; // Informa el fallo sin sustituir el resultado por un éxito.
                if (error.status === 401) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                    // Descarta datos privados cuando el servidor informa sesión vencida.
                    NipinSesion.establecer(null, { conservarBorrador: true }); // Continúa en js/app.js: actualiza la identidad visible y limpia las vistas.
                    mensaje('La sesión venció. Iniciá sesión para consultar tus categorías.', true); // Llama a mensaje con los datos indicados.
                    aviso.querySelector('a').focus(); // Lleva el foco al control para continuar con teclado.
                } else { // Ejecuta la alternativa cuando no se cumple la condición anterior.
                    // Distingue una categoría inexistente de otros fallos de consulta.
                    const texto = error.status === 404 && id ? 'Esta categoría no está disponible. Volvé al catálogo para elegir otra.' : 'No se pudieron cargar las categorías. ' + error.message; // Inicializa texto.
                    mensaje(texto, true); // Llama a mensaje con los datos indicados.
                } // Finaliza este bloque.
            } finally { // Ejecuta la limpieza final aunque la operación haya fallado.
                // Restablece los controles y el estado al finalizar la operación.
                if (vigente(intento)) { // Restablece los controles y el estado al finalizar la operación.
                    // Mantiene el resultado sólo para la vista o sesión vigente.
                    bloquear(false); // Llama a bloquear con los datos indicados.
                    if (devolverFoco && document.activeElement === document.body) actualizar.focus({ preventScroll: true }); // Lleva el foco al control para continuar con teclado.
                } // Finaliza este bloque.
            } // Finaliza este bloque.
        } // Finaliza este bloque.

        actualizar.addEventListener('click', cargar); // Registra la acción que se ejecuta al recibir click.
        const vista = { // Inicializa vista.
            limpiar, // Expone estas funciones para utilizarlas desde otros módulos.
            entrar(categoriaId = null) { // Llama a entrar con los datos indicados.
                // Activa la vista y prepara sus datos antes de habilitar controles.
                activa = true; id = categoriaId; cargar(); // Actualiza estado de la vista actual.
            }, // Completa la estructura o llamada iniciada arriba.
            salir() { // Llama a salir con los datos indicados.
                // Desactiva la vista para que las respuestas pendientes no la actualicen.
                activa = false; entrada++; vaciar(); bloquear(false); aviso.hidden = true; mensaje(''); // Muestra u oculta el elemento según el estado actual.
            } // Finaliza este bloque.
        }; // Completa la estructura o llamada iniciada arriba.
        vistas.push(vista); // Llama a vistas.push con los datos indicados.
        return vista; // Devuelve vista al código que llamó.
    } // Finaliza este bloque.

    const catalogo = crearVista('categorias', mostrarCatalogo, () => { // Inicializa la variable catalogo: catálogo de categorías.
        // Actualiza los elementos de la interfaz con los datos de este bloque.
        document.querySelector('#categorias-lista').replaceChildren(); // Localiza '#categorias-lista' en el HTML para controlar ese elemento.
        document.querySelector('#categorias-lista').hidden = true; // Localiza '#categorias-lista' en el HTML para controlar ese elemento.
        document.querySelector('#categorias-vacio').hidden = true; // Localiza '#categorias-vacio' en el HTML para controlar ese elemento.
    }); // Cierra la función de respuesta y su registro o llamada.
    const detalle = crearVista('categoria', mostrarDetalle, () => { // Inicializa detalle.
        // Vacía el detalle para no mostrar datos de una consulta anterior.
        document.querySelector('#categoria-datos').hidden = true; // Localiza '#categoria-datos' en el HTML para controlar ese elemento.
        document.querySelector('#categoria-titulo').textContent = 'Detalle de categoría'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        document.querySelector('#categoria-icono').textContent = ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        document.querySelector('#categoria-tipo').textContent = ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        ['ingresos', 'gastos', 'saldo'].forEach(campo => { // Ejecuta la función indicada para cada elemento de la lista.
            // Actualiza los elementos de la interfaz con los datos de este bloque.
            document.querySelector('#categoria-' + campo).textContent = '$0'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        }); // Cierra la función de respuesta y su registro o llamada.
        document.querySelector('#categoria-cantidad').textContent = '0'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        document.querySelector('#categoria-historial').replaceChildren(); // Localiza '#categoria-historial' en el HTML para controlar ese elemento.
        document.querySelector('#categoria-sin-movimientos').hidden = true; // Localiza '#categoria-sin-movimientos' en el HTML para controlar ese elemento.
    }); // Cierra la función de respuesta y su registro o llamada.
    return { catalogo, detalle, limpiar(usuario = null) { // Devuelve las funciones o datos públicos al código que llamó.
        // Limpia los datos de la vista e invalida las respuestas anteriores.
        revisionSesion++; vistas.forEach(vista => vista.limpiar(usuario)); // Incrementa revisionSesion++; vistas.forEach(vista => vista.limpiar(usuario en uno.
    } }; // Completa la estructura o llamada iniciada arriba.
})(); // Ejecuta el módulo y conserva sus funciones públicas.
