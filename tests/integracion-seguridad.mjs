// Comprueba la API real con dos cuentas nuevas en una base de prueba; requiere Node 18 o superior.

const BASE = (process.argv[2] || "http://localhost/NipinFinan/").replace(/\/?$/, "/"); // Inicializa BASE.
const resultados = []; // Inicializa la variable resultados: resultados de las comprobaciones.
function caso(id, descripcion, ok, detalle = "") { // Define caso con sus entradas y el resultado que devuelve.
    // Registra el resultado y el detalle de una comprobación.
    resultados.push({ id, descripcion, ok: Boolean(ok), detalle }); // Llama a resultados.push con los datos indicados.
} // Finaliza este bloque.

class Cliente { // Define la clase Cliente.
    constructor() { // Inicializa el objeto con las dependencias o datos recibidos.
        // Inicializa el estado de esta instancia.
        this.cookies = new Map(); this.token = null; // Actualiza this.cookies.
    } // Finaliza este bloque.
    async pedir(ruta, { metodo = "GET", cuerpo, token = this.token, crudo } = {}) { // Actualiza los datos de la estructura indicada.
        // Envía la petición de prueba conservando cookies, token y respuesta.
        const headers = {}; // Inicializa la variable headers: cabeceras del pedido HTTP.
        if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (cuerpo !== undefined || crudo !== undefined) headers["Content-Type"] = "application/json"; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (token) headers["X-CSRF-Token"] = token; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const r = await fetch(BASE + ruta, { method: metodo, headers, body: crudo ?? (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)), redirect: "manual" }); // Envía la petición HTTP y espera la respuesta del servidor.
        for (const c of r.headers.getSetCookie?.() || []) { // Recorre los elementos para procesar cada uno dentro del bloque.
            // Recorre los elementos para acumular o comprobar sus resultados.
            const [par] = c.split(";"); const i = par.indexOf("="); // Separa los valores recibidos en las variables [par].
            this.cookies.set(par.slice(0, i).trim(), par.slice(i + 1).trim()); // Llama a this.cookies.set con los datos indicados.
        } // Finaliza este bloque.
        const texto = await r.text(); // Inicializa texto.
        let json = null; try { // Inicializa json.
            // Ejecuta la operación y permite tratar sus errores.
            json = JSON.parse(texto); // Interpreta el texto JSON para trabajar con sus datos.
        } catch { /* no JSON */ }
        return { status: r.status, json, texto, tipo: r.headers.get("content-type") || "", setCookie: r.headers.getSetCookie?.() || [] }; // Devuelve las funciones o datos públicos al código que llamó.
    } // Finaliza este bloque.
    async sesion() { // Completa los argumentos de la operación iniciada arriba.
        // Solicita una sesión de prueba y conserva su token CSRF.
        const r = await this.pedir("api/sesion.php", { token: null }); this.token = r.json?.csrfToken; return r; // Inicializa r.
    } // Finaliza este bloque.
    get sid() { // Completa los argumentos de la operación iniciada arriba.
        // Obtiene el identificador de sesión conservado por el cliente de prueba.
        return this.cookies.get("PHPSESSID") || [...this.cookies.values()][0]; // Devuelve this.cookies.get("PHPSESSID") || [...this.cookies.values()][0] al código que llamó.
    } // Finaliza este bloque.
} // Finaliza este bloque.

const sello = Date.now(); // Inicializa la variable sello: marca temporal para aislar las pruebas.
const movimiento = (extra = {}) => ({ tipo: "gasto", descripcion: "Supermercado", monto: 10000, fecha: "2026-11-14", categoria: "Alimentación", medioPago: "Efectivo", cuotas: 1, comentario: "", ...extra }); // Inicializa la variable movimiento: datos del movimiento.

async function crearCuenta(nombre) { // Define crearCuenta con sus entradas y el resultado que devuelve.
    // Registra e inicia una cuenta nueva para aislar las pruebas.
    const c = new Cliente(); // Inicializa c.
    await c.sesion(); // Espera que termine la operación asíncrona antes de continuar.
    const email = `${nombre}.${sello}@example.com`; // Inicializa la variable email: correo de la cuenta.
    const reg = await c.pedir("api/registro.php", { metodo: "POST", cuerpo: { nombre, email, password: "Clave-segura-123" } }); // Inicializa reg.
    const sidAntes = c.sid; // Inicializa sidAntes.
    const log = await c.pedir("api/login.php", { metodo: "POST", cuerpo: { email, password: "Clave-segura-123" } }); // Inicializa log.
    const tokenAnterior = c.token; // Inicializa tokenAnterior.
    c.token = log.json?.csrfToken; // Actualiza c.token.
    return { c, email, reg, log, sidAntes, tokenAnterior }; // Devuelve las funciones o datos públicos al código que llamó.
} // Finaliza este bloque.

// --- Autenticación (OWASP A02 / A07) ---
const A = await crearCuenta("cuentaA"); // Inicializa A.
caso("AUT-01", "Registro de cuenta nueva responde 201 JSON", A.reg.status === 201 && A.reg.tipo.includes("application/json"), A.reg.status); // Comprueba el resultado esperado y registra si la prueba pasa.
caso("AUT-02", "Login correcto responde 200 con usuario y token nuevo", A.log.status === 200 && A.log.json?.usuario?.email === A.email && A.log.json?.csrfToken && A.log.json.csrfToken !== A.tokenAnterior); // Comprueba el resultado esperado y registra si la prueba pasa.
caso("AUT-03", "Login regenera el identificador de sesión (fijación de sesión)", A.sidAntes && A.c.sid && A.sidAntes !== A.c.sid); // Comprueba el resultado esperado y registra si la prueba pasa.
const dup = await A.c.pedir("api/registro.php", { metodo: "POST", cuerpo: { nombre: "Otro", email: A.email, password: "Clave-segura-123" } }); // Inicializa dup.
caso("AUT-04", "Correo duplicado responde 409", dup.status === 409, dup.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const anon = new Cliente(); await anon.sesion(); // Inicializa anon.
const mal = await anon.pedir("api/login.php", { metodo: "POST", cuerpo: { email: A.email, password: "incorrecta-123" } }); // Inicializa mal.
caso("AUT-05", "Contraseña incorrecta responde 401 sin indicar cuál dato falló", mal.status === 401 && !/contraseña incorrecta|no existe/i.test(mal.json?.mensaje || ""), mal.json?.mensaje); // Comprueba el resultado esperado y registra si la prueba pasa.
const corta = await anon.pedir("api/registro.php", { metodo: "POST", cuerpo: { nombre: "X", email: `corta.${sello}@example.com`, password: "1234567" } }); // Inicializa corta.
caso("AUT-06", "Contraseña de 7 caracteres rechazada con 400", corta.status === 400, corta.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const sqliLogin = await anon.pedir("api/login.php", { metodo: "POST", cuerpo: { email: "' OR '1'='1' -- ", password: "' OR '1'='1" } }); // Inicializa sqliLogin.
caso("SEG-01", "Inyección SQL en login no autentica (400/401)", [400, 401].includes(sqliLogin.status) && !sqliLogin.json?.usuario, sqliLogin.status); // Comprueba el resultado esperado y registra si la prueba pasa.

// --- Control de acceso (OWASP A01) y CSRF ---
const anonGet = await anon.pedir("api/mis_movimientos.php"); // Inicializa anonGet.
caso("ACC-01", "GET movimientos sin sesión responde 401", anonGet.status === 401, anonGet.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const anonCat = await anon.pedir("api/categorias.php"); // Inicializa anonCat.
caso("ACC-02", "GET categorías sin sesión responde 401", anonCat.status === 401, anonCat.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const anonPost = await anon.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento() }); // Inicializa anonPost.
caso("ACC-03", "POST sin sesión responde 401 (identidad antes que CSRF)", anonPost.status === 401, anonPost.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const sinToken = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento(), token: null }); // Inicializa sinToken.
caso("CSRF-01", "POST con sesión pero sin token responde 403", sinToken.status === 403, sinToken.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const tokenFalso = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento(), token: "0".repeat(64) }); // Inicializa tokenFalso.
caso("CSRF-02", "POST con token incorrecto responde 403", tokenFalso.status === 403, tokenFalso.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const viejo = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento(), token: A.tokenAnterior }); // Inicializa viejo.
caso("CSRF-03", "Token anterior al login ya no sirve (rotación)", viejo.status === 403, viejo.status); // Comprueba el resultado esperado y registra si la prueba pasa.

// --- CRUD y reglas de negocio ---
const alta = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento({ total: 1, ajuste: 0, valorCuota: 1 }) }); // Inicializa alta.
const idA = alta.json?.movimiento?.id; // Inicializa idA.
caso("CRUD-01", "Alta responde 201 y recalcula: 10000 en efectivo → total 9000 (ignora total falso)", alta.status === 201 && alta.json.movimiento.total === 9000 && alta.json.movimiento.ajuste === -1000, JSON.stringify(alta.json?.movimiento)); // Convierte el objeto JavaScript a texto JSON.
const credito = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento({ monto: 1000, medioPago: "Tarjeta de crédito", cuotas: 6, categoria: "Indumentaria" }) }); // Inicializa credito.
caso("CRUD-02", "Crédito en 6 cuotas: 1000 → total 1180, cuota 196.67", credito.json?.movimiento?.total === 1180 && credito.json?.movimiento?.valorCuota === 196.67, JSON.stringify(credito.json?.movimiento)); // Convierte el objeto JavaScript a texto JSON.
const ing = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento({ tipo: "ingreso", descripcion: "Sueldo", monto: 150000, categoria: "Sueldo", medioPago: "Transferencia" }) }); // Inicializa ing.
caso("CRUD-03", "Ingreso sin descuento: 150000 → total 150000", ing.status === 201 && ing.json.movimiento.total === 150000, ing.json?.movimiento?.total); // Comprueba el resultado esperado y registra si la prueba pasa.
const lista = await A.c.pedir("api/mis_movimientos.php"); // Inicializa lista.
caso("CRUD-04", "Listado propio responde 200 con los 3 movimientos", lista.status === 200 && lista.json?.movimientos?.length === 3, lista.json?.movimientos?.length); // Comprueba el resultado esperado y registra si la prueba pasa.
const edit = await A.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "PUT", cuerpo: movimiento({ monto: 20000, medioPago: "Transferencia" }) }); // Inicializa edit.
caso("CRUD-05", "PUT propio responde 200 y recalcula (20000 por transferencia → 19000)", edit.status === 200 && edit.json?.movimiento?.total === 19000, edit.json?.movimiento?.total); // Comprueba el resultado esperado y registra si la prueba pasa.
const cat = await A.c.pedir("api/categorias.php?id=alimentacion"); // Inicializa cat.
caso("CAT-01", "Detalle de Alimentación refleja la edición (gastos 19000, 1 movimiento)", cat.status === 200 && cat.json?.categoria?.gastos === 19000 && cat.json?.categoria?.cantidad === 1 && cat.json?.movimientos?.length === 1, JSON.stringify(cat.json?.categoria)); // Convierte el objeto JavaScript a texto JSON.
const catVacia = await A.c.pedir("api/categorias.php?id=salud"); // Inicializa catVacia.
caso("CAT-02", "Categoría sin movimientos: totales 0 e historial vacío", catVacia.status === 200 && catVacia.json?.categoria?.cantidad === 0 && catVacia.json?.movimientos?.length === 0); // Comprueba el resultado esperado y registra si la prueba pasa.
const catNo = await A.c.pedir("api/categorias.php?id=no-existe"); // Inicializa catNo.
caso("CAT-03", "Categoría inexistente responde 404", catNo.status === 404, catNo.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const catSqli = await A.c.pedir("api/categorias.php?id=" + encodeURIComponent("alimentacion' OR '1'='1")); // Inicializa catSqli.
caso("SEG-02", "Inyección en ID de categoría no devuelve datos (400/404)", [400, 404].includes(catSqli.status), catSqli.status); // Comprueba el resultado esperado y registra si la prueba pasa.

// --- Validaciones de entrada (400 / 405) ---
const invalidos = [ // Inicializa invalidos.
    ["VAL-01", "Monto negativo", movimiento({ monto: -5 })], // Agrega los valores indicados a la colección.
    ["VAL-02", "Monto con tres decimales", movimiento({ monto: 10.123 })], // Agrega los valores indicados a la colección.
    ["VAL-03", "Monto como texto", movimiento({ monto: "100" })], // Agrega los valores indicados a la colección.
    ["VAL-04", "Fecha inexistente 2026-02-30", movimiento({ fecha: "2026-02-30" })], // Agrega los valores indicados a la colección.
    ["VAL-05", "Categoría de ingreso en un gasto", movimiento({ categoria: "Sueldo" })], // Agrega los valores indicados a la colección.
    ["VAL-06", "Cuotas en efectivo", movimiento({ cuotas: 3 })], // Agrega los valores indicados a la colección.
    ["VAL-07", "Medio de pago desconocido", movimiento({ medioPago: "Bitcoin" })], // Agrega los valores indicados a la colección.
    ["VAL-08", "Descripción vacía", movimiento({ descripcion: "" })], // Agrega los valores indicados a la colección.
]; // Completa la estructura o llamada iniciada arriba.
for (const [id, d, cuerpo] of invalidos) { // Recorre los elementos para procesar cada uno dentro del bloque.
    // Recorre los elementos para acumular o comprobar sus resultados.
    const r = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo }); // Inicializa r.
    caso(id, `${d} responde 400 con estado error`, r.status === 400 && r.json?.estado === "error", r.status + " " + (r.json?.mensaje || "")); // Comprueba el resultado esperado y registra si la prueba pasa.
} // Finaliza este bloque.
const roto = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", crudo: "{no es json" }); // Inicializa roto.
caso("VAL-09", "JSON mal formado responde 400", roto.status === 400, roto.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const metodo = await A.c.pedir("api/mis_movimientos.php", { metodo: "PATCH", cuerpo: movimiento() }); // Inicializa la variable metodo: método HTTP del pedido.
caso("VAL-10", "Método no admitido (PATCH) responde 405", metodo.status === 405, metodo.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const idMal = await A.c.pedir("api/mis_movimientos.php?id=abc", { metodo: "DELETE" }); // Inicializa idMal.
caso("VAL-11", "DELETE con id no numérico responde 400", idMal.status === 400, idMal.status); // Comprueba el resultado esperado y registra si la prueba pasa.

// --- Aislamiento entre cuentas ---
const B = await crearCuenta("cuentaB"); // Inicializa B.
const listaB = await B.c.pedir("api/mis_movimientos.php"); // Inicializa listaB.
caso("ACC-04", "La cuenta B no ve movimientos de A", listaB.status === 200 && listaB.json?.movimientos?.length === 0); // Comprueba el resultado esperado y registra si la prueba pasa.
const editB = await B.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "PUT", cuerpo: movimiento({ monto: 1 }) }); // Inicializa editB.
caso("ACC-05", "B no puede editar un movimiento de A (404, igual que inexistente)", editB.status === 404, editB.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const delB = await B.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "DELETE" }); // Inicializa delB.
caso("ACC-06", "B no puede eliminar un movimiento de A (404)", delB.status === 404, delB.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const catB = await B.c.pedir("api/categorias.php?id=alimentacion"); // Inicializa catB.
caso("ACC-07", "El detalle de categoría de B no incluye datos de A", catB.json?.categoria?.cantidad === 0); // Comprueba el resultado esperado y registra si la prueba pasa.

// --- XSS almacenado (el backend guarda texto; la interfaz lo muestra con textContent) ---
const xss = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento({ descripcion: "<script>alert(1)</script>" }) }); // Inicializa xss.
caso("SEG-03", "Descripción con marcado se guarda y devuelve como texto JSON (sin ejecutar)", xss.status === 201 && xss.json?.movimiento?.descripcion === "<script>alert(1)</script>" && xss.tipo.includes("application/json")); // Comprueba el resultado esperado y registra si la prueba pasa.

// --- Baja y cierre de sesión ---
const del = await A.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "DELETE" }); // Inicializa del.
caso("CRUD-06", "DELETE propio responde 200 con el id eliminado", del.status === 200 && del.json?.id === idA, del.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const delOtraVez = await A.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "DELETE" }); // Inicializa delOtraVez.
caso("CRUD-07", "Eliminar de nuevo el mismo id responde 404", delOtraVez.status === 404, delOtraVez.status); // Comprueba el resultado esperado y registra si la prueba pasa.
const out = await A.c.pedir("api/logout.php", { metodo: "POST", cuerpo: {} }); // Inicializa out.
const tras = await A.c.pedir("api/mis_movimientos.php"); // Inicializa tras.
caso("AUT-07", "Logout responde 200 y la sesión deja de servir (401)", out.status === 200 && tras.status === 401, `${out.status}/${tras.status}`); // Comprueba el resultado esperado y registra si la prueba pasa.

// --- Cabeceras ---
caso("HTTP-01", "Todas las respuestas usan Content-Type JSON UTF-8", [A.reg, A.log, anonGet, alta, lista, edit, del].every(r => /application\/json;\s*charset=utf-8/i.test(r.tipo))); // Comprueba el resultado esperado y registra si la prueba pasa.
const cookie = A.reg.setCookie.join(" ") + " " + A.log.setCookie.join(" "); // Inicializa cookie.
caso("HTTP-02", "Cookie de sesión HttpOnly y SameSite=Lax", /httponly/i.test(cookie) && /samesite=lax/i.test(cookie)); // Comprueba el resultado esperado y registra si la prueba pasa.

// --- Informe ---
const ok = resultados.filter(r => r.ok).length; // Inicializa ok.
for (const r of resultados) console.log(`${r.ok ? "OK  " : "FALLA"} ${r.id}  ${r.descripcion}${r.ok ? "" : "  → " + r.detalle}`); // Recorre los elementos para procesar cada uno dentro del bloque.
console.log(`\n${ok}/${resultados.length} casos correctos`); // Llama a console.log con los datos indicados.
process.exitCode = ok === resultados.length ? 0 : 1; // Actualiza process.exitCode.
