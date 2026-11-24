// Comprueba el helper con HTTP simulado mediante node --test, sin ejecutar PHP ni MySQL.
const { test } = require('node:test'); // Inicializa { test }.
const assert = require('node:assert/strict'); // Inicializa assert.
const fs = require('node:fs'); // Inicializa fs.
const path = require('node:path'); // Inicializa path.
const vm = require('node:vm'); // Inicializa vm.

const codigo = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8'); // Inicializa codigo.
const usuario = { nombre: 'Cuenta de prueba', email: 'prueba@example.com' }; // Inicializa la variable usuario: identidad del usuario.
const respuesta = (datos, status = 200) => ({ // Inicializa la variable respuesta: respuesta HTTP del servidor.
    ok: status >= 200 && status < 300, status, json: async () => datos // Incluye el campo ok en esta estructura.
}); // Cierra la función de respuesta y su registro o llamada.
const sesion = token => respuesta({ estado: 'exito', usuario: null, csrfToken: token }); // Inicializa la variable sesion: datos de sesión recibidos de PHP.
const login = token => respuesta({ estado: 'exito', usuario, csrfToken: token }); // Inicializa login.
function diferido() { // Define diferido con sus entradas y el resultado que devuelve.
    // Crea una promesa controlable para simular respuestas tardías.
    let resolve; // Declara resolve.
    const promise = new Promise(r => { // Inicializa promise.
        // Conserva la función que permitirá resolver la promesa simulada.
        resolve = r; // Actualiza resolve.
    }); // Cierra la función de respuesta y su registro o llamada.
    return { promise, resolve }; // Devuelve las funciones o datos públicos al código que llamó.
} // Finaliza este bloque.
function crearAPI(atender) { // Define crearAPI con sus entradas y el resultado que devuelve.
    // Ejecuta el helper con un fetch simulado y registra sus peticiones.
    const llamadas = []; // Inicializa llamadas.
    const api = vm.runInNewContext(codigo + '\nNipinAPI;', { // Inicializa api.
        fetch(url, opciones) { // Envía la petición HTTP y espera la respuesta del servidor.
            // Registra la petición simulada antes de devolver su respuesta.
            llamadas.push({ url, ...opciones }); // Llama a llamadas.push con los datos indicados.
            return atender(url, opciones); // Devuelve atender(url, opciones) al código que llamó.
        } // Finaliza este bloque.
    }); // Cierra la función de respuesta y su registro o llamada.
    return { api, llamadas }; // Devuelve las funciones o datos públicos al código que llamó.
} // Finaliza este bloque.

test('toda escritura espera el token y usa cookies del mismo origen', async () => { // Comprueba el resultado esperado y registra si la prueba pasa.
    // Comprueba que toda escritura espera el token y usa cookies del mismo origen.
    const { api, llamadas } = crearAPI(async url => url.endsWith('sesion.php') // Inicializa { api, llamadas }.
        ? sesion('token-servidor-simulado') : respuesta({ estado: 'exito' })); // Selecciona este valor si se cumple la condición anterior.
    for (const method of ['POST', 'PUT', 'DELETE']) { // Recorre los elementos para procesar cada uno dentro del bloque.
        // Recorre los elementos para acumular o comprobar sus resultados.
        await api.solicitarJSON('api/recurso.php', { method, datos: {} }); // Espera que termine la operación asíncrona antes de continuar.
    } // Finaliza este bloque.
    assert.equal(llamadas.filter(p => p.url.endsWith('sesion.php')).length, 1); // Comprueba el resultado esperado y registra si la prueba pasa.
    for (const pedido of llamadas.slice(1)) { // Recorre los elementos para procesar cada uno dentro del bloque.
        // Recorre los elementos para acumular o comprobar sus resultados.
        assert.equal(pedido.headers['X-CSRF-Token'], 'token-servidor-simulado'); // Comprueba el resultado esperado y registra si la prueba pasa.
        assert.equal(pedido.credentials, 'same-origin'); // Comprueba el resultado esperado y registra si la prueba pasa.
        assert.equal(pedido.cache, 'no-store'); // Comprueba el resultado esperado y registra si la prueba pasa.
    } // Finaliza este bloque.
}); // Cierra la función de respuesta y su registro o llamada.

test('una preparación antigua no reemplaza el token rotado por login', async () => { // Comprueba el resultado esperado y registra si la prueba pasa.
    // Comprueba que una preparación antigua no reemplaza el token rotado por login.
    const antigua = diferido(); // Inicializa antigua.
    let consultas = 0; // Inicializa consultas.
    const { api, llamadas } = crearAPI(async url => { // Inicializa { api, llamadas }.
        // Devuelve el resultado correspondiente a esta condición.
        if (url.endsWith('sesion.php')) return ++consultas === 1 ? antigua.promise : sesion('anonimo'); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (url.endsWith('login.php')) return login('rotado'); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        return respuesta({ estado: 'exito' }); // Devuelve respuesta({ estado: 'exito' }) al código que llamó.
    }); // Cierra la función de respuesta y su registro o llamada.
    const pendiente = api.prepararSesion(); // Inicializa la variable pendiente: operación pendiente del formulario.
    const rechazo = assert.rejects(pendiente, /La sesión cambió/); // Inicializa rechazo.
    await api.ingresar({ email: usuario.email, password: 'solo-prueba' }); // Espera que termine la operación asíncrona antes de continuar.
    antigua.resolve(sesion('obsoleto')); // Llama a antigua.resolve con los datos indicados.
    await rechazo; // Espera que termine la operación asíncrona antes de continuar.
    await api.cerrarSesion(); // Espera que termine la operación asíncrona antes de continuar.
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'rotado'); // Comprueba el resultado esperado y registra si la prueba pasa.
}); // Cierra la función de respuesta y su registro o llamada.

test('un 403 antiguo no invalida el token de un login posterior', async () => { // Comprueba el resultado esperado y registra si la prueba pasa.
    // Comprueba que un 403 antiguo no invalida el token de un login posterior.
    const antigua = diferido(); // Inicializa antigua.
    const { api, llamadas } = crearAPI(async url => { // Inicializa { api, llamadas }.
        // Devuelve el resultado correspondiente a esta condición.
        if (url.endsWith('sesion.php')) return sesion('anonimo'); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (url.endsWith('login.php')) return login('rotado'); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (url.endsWith('anterior.php')) return antigua.promise; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        return respuesta({ estado: 'exito' }); // Devuelve respuesta({ estado: 'exito' }) al código que llamó.
    }); // Cierra la función de respuesta y su registro o llamada.
    await api.prepararEnvios(); // Espera que termine la operación asíncrona antes de continuar.
    const pendiente = api.solicitarJSON('api/anterior.php', { method: 'POST' }); // Inicializa la variable pendiente: operación pendiente del formulario.
    const rechazo = assert.rejects(pendiente, e => e.status === 403); // Inicializa rechazo.
    await api.ingresar({}); // Espera que termine la operación asíncrona antes de continuar.
    antigua.resolve(respuesta({ estado: 'error', mensaje: 'CSRF inválido' }, 403)); // Llama a antigua.resolve con los datos indicados.
    await rechazo; // Espera que termine la operación asíncrona antes de continuar.
    await api.cerrarSesion(); // Espera que termine la operación asíncrona antes de continuar.
    assert.equal(llamadas.filter(p => p.url.endsWith('sesion.php')).length, 1); // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'rotado'); // Comprueba el resultado esperado y registra si la prueba pasa.
}); // Cierra la función de respuesta y su registro o llamada.

test('403 con JSON roto renueva token solo en el siguiente envío explícito', async () => { // Comprueba el resultado esperado y registra si la prueba pasa.
    // Comprueba que 403 con JSON roto renueva token solo en el siguiente envío explícito.
    let tokens = 0; // Inicializa tokens.
    const { api, llamadas } = crearAPI(async url => { // Inicializa { api, llamadas }.
        // Devuelve el resultado correspondiente a esta condición.
        if (url.endsWith('sesion.php')) return sesion('token-' + ++tokens); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (url.endsWith('rechazado.php')) return { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            ok: false, status: 403, json: async () => { // Incluye el campo ok en esta estructura.
                // Rechaza los datos que no cumplen esta validación.
                throw new SyntaxError('HTML'); // Interrumpe el recorrido y comunica el error al código que llamó.
            } // Finaliza este bloque.
        }; // Completa la estructura o llamada iniciada arriba.
        return respuesta({ estado: 'exito' }); // Devuelve respuesta({ estado: 'exito' }) al código que llamó.
    }); // Cierra la función de respuesta y su registro o llamada.
    await assert.rejects(api.solicitarJSON('api/rechazado.php', { method: 'POST' }), e => e.status === 403); // Espera que termine la operación asíncrona antes de continuar.
    assert.equal(tokens, 1); // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.filter(p => p.method === 'POST').length, 1); // Comprueba el resultado esperado y registra si la prueba pasa.
    await api.solicitarJSON('api/otro.php', { method: 'PUT' }); // Espera que termine la operación asíncrona antes de continuar.
    assert.equal(tokens, 2); // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'token-2'); // Comprueba el resultado esperado y registra si la prueba pasa.
}); // Cierra la función de respuesta y su registro o llamada.

test('sin token válido o sin conexión no envía la escritura ni la reintenta', async () => { // Comprueba el resultado esperado y registra si la prueba pasa.
    // Comprueba que sin token válido o sin conexión no envía la escritura ni la reintenta.
    for (const fallo of ['sin-token', 'red']) { // Recorre los elementos para procesar cada uno dentro del bloque.
        // Comprueba los datos y rechaza los valores inválidos.
        const { api, llamadas } = crearAPI(async () => { // Inicializa { api, llamadas }.
            // Comprueba los datos y rechaza los valores inválidos.
            if (fallo === 'red') throw new TypeError('Sin red'); // Interrumpe el recorrido y comunica el error al código que llamó.
            return respuesta({ usuario: null }); // Devuelve respuesta({ usuario: null }) al código que llamó.
        }); // Cierra la función de respuesta y su registro o llamada.
        await assert.rejects(api.solicitarJSON('api/registro.php', { method: 'POST', datos: {} })); // Espera que termine la operación asíncrona antes de continuar.
        assert.equal(llamadas.length, 1); // Comprueba el resultado esperado y registra si la prueba pasa.
        assert.equal(llamadas[0].method, 'GET'); // Comprueba el resultado esperado y registra si la prueba pasa.
    } // Finaliza este bloque.
}); // Cierra la función de respuesta y su registro o llamada.

test('logout descarta el token autenticado y prepara otra sesión anónima', async () => { // Comprueba el resultado esperado y registra si la prueba pasa.
    // Comprueba que logout descarta el token autenticado y prepara otra sesión anónima.
    let tokens = 0; // Inicializa tokens.
    const { api, llamadas } = crearAPI(async url => { // Inicializa { api, llamadas }.
        // Devuelve el resultado correspondiente a esta condición.
        if (url.endsWith('sesion.php')) return sesion('anonimo-' + ++tokens); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (url.endsWith('login.php')) return login('autenticado'); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        return respuesta({ estado: 'exito' }); // Devuelve respuesta({ estado: 'exito' }) al código que llamó.
    }); // Cierra la función de respuesta y su registro o llamada.
    await api.ingresar({}); // Espera que termine la operación asíncrona antes de continuar.
    await api.cerrarSesion(); // Espera que termine la operación asíncrona antes de continuar.
    await api.solicitarJSON('api/registro.php', { method: 'POST', datos: {} }); // Espera que termine la operación asíncrona antes de continuar.
    assert.equal(llamadas.find(p => p.url.endsWith('logout.php')).headers['X-CSRF-Token'], 'autenticado'); // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'anonimo-2'); // Comprueba el resultado esperado y registra si la prueba pasa.
}); // Cierra la función de respuesta y su registro o llamada.

test('un error de escritura conserva status/mensaje y no dispara otro envío', async () => { // Comprueba el resultado esperado y registra si la prueba pasa.
    // Comprueba que un error de escritura conserva status/mensaje y no dispara otro envío.
    for (const status of [400, 401, 403, 404, 500]) { // Recorre los elementos para procesar cada uno dentro del bloque.
        // Recorre los elementos para acumular o comprobar sus resultados.
        const { api, llamadas } = crearAPI(async url => url.endsWith('sesion.php') // Inicializa { api, llamadas }.
            ? sesion('token') : respuesta({ estado: 'error', mensaje: 'Revisá la operación' }, status)); // Selecciona este valor si se cumple la condición anterior.
        await assert.rejects(api.solicitarJSON('api/mis_movimientos.php', { method: 'POST', datos: {}, privada: true }), // Espera que termine la operación asíncrona antes de continuar.
            e => e.status === status && e.message === 'Revisá la operación'); // Actualiza e.
        assert.equal(llamadas.filter(p => p.method === 'POST').length, 1); // Comprueba el resultado esperado y registra si la prueba pasa.
    } // Finaliza este bloque.
}); // Cierra la función de respuesta y su registro o llamada.
