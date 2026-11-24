// Comprueba la API real con dos cuentas nuevas en una base de prueba; requiere Node 18 o superior.
const BASE = (process.argv[2] || "http://localhost/NipinFinan/").replace(/\/?$/, "/");
// Inicia resultados: resultados de las comprobaciones.
const resultados = [];
// Define caso con sus entradas y el resultado que devuelve.
function caso(id, descripcion, ok, detalle = "") {
    // Llama a resultados.push con los datos indicados.
    resultados.push({ id, descripcion, ok: Boolean(ok), detalle });
}

// Define la clase Cliente.
class Cliente {
    // Inicializa el objeto con las dependencias o datos recibidos.
    constructor() {
        // Actualiza this.cookies.
        this.cookies = new Map(); this.token = null;
    }
    // Actualiza los datos de la estructura indicada.
    async pedir(ruta, { metodo = "GET", cuerpo, token = this.token, crudo } = {}) {
        // Inicia headers: cabeceras del pedido HTTP.
        const headers = {};
        // Comprueba esta condición.
        if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
        // Comprueba esta condición.
        if (cuerpo !== undefined || crudo !== undefined) headers["Content-Type"] = "application/json";
        // Comprueba esta condición.
        if (token) headers["X-CSRF-Token"] = token;
        // Envía la petición HTTP y espera la respuesta del servidor.
        const r = await fetch(BASE + ruta, { method: metodo, headers, body: crudo ?? (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)), redirect: "manual" });
        // Recorre los elementos para procesar cada uno dentro del bloque.
        for (const c of r.headers.getSetCookie?.() || []) {
            // Separa los valores recibidos en las variables [par].
            const [par] = c.split(";"); const i = par.indexOf("=");
            // Llama a this.cookies.set con los datos indicados.
            this.cookies.set(par.slice(0, i).trim(), par.slice(i + 1).trim());
        }
        // Inicializa texto.
        const texto = await r.text();
        // Inicializa json.
        let json = null; try {
            // Interpreta el texto JSON para trabajar con sus datos.
            json = JSON.parse(texto);
        // no JSON
        } catch {  }
        // Devuelve las funciones o datos públicos al código que llamó.
        return { status: r.status, json, texto, tipo: r.headers.get("content-type") || "", setCookie: r.headers.getSetCookie?.() || [] };
    }
    // Completa los argumentos de la llamada.
    async sesion() {
        // Solicita una sesión de prueba y conserva su token CSRF.
        const r = await this.pedir("api/sesion.php", { token: null }); this.token = r.json?.csrfToken; return r;
    }
    // Completa los argumentos de la llamada.
    get sid() {
        // Devuelve this.cookies.get("PHPSESSID") || [...this.cookies.values()][0] al código que llamó.
        return this.cookies.get("PHPSESSID") || [...this.cookies.values()][0];
    }
}

// Inicia sello: marca temporal para aislar las pruebas.
const sello = Date.now();
// Inicia movimiento: datos del movimiento.
const movimiento = (extra = {}) => ({ tipo: "gasto", descripcion: "Supermercado", monto: 10000, fecha: "2026-11-14", categoria: "Alimentación", medioPago: "Efectivo", cuotas: 1, comentario: "", ...extra });

// Define crearCuenta con sus entradas y el resultado que devuelve.
async function crearCuenta(nombre) {
    // Registra e inicia una cuenta nueva para aislar las pruebas.
    const c = new Cliente();
    // Espera que termine la operación asíncrona antes de continuar.
    await c.sesion();
    // Inicia email: correo de la cuenta.
    const email = `${nombre}.${sello}@example.com`;
    // Inicializa reg.
    const reg = await c.pedir("api/registro.php", { metodo: "POST", cuerpo: { nombre, email, password: "Clave-segura-123" } });
    // Inicializa sidAntes.
    const sidAntes = c.sid;
    // Inicializa log.
    const log = await c.pedir("api/login.php", { metodo: "POST", cuerpo: { email, password: "Clave-segura-123" } });
    // Inicializa tokenAnterior.
    const tokenAnterior = c.token;
    // Actualiza c.token.
    c.token = log.json?.csrfToken;
    // Devuelve las funciones o datos públicos al código que llamó.
    return { c, email, reg, log, sidAntes, tokenAnterior };
}

// --- Autenticación (OWASP A02 / A07) ---
const A = await crearCuenta("cuentaA");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("AUT-01", "Registro de cuenta nueva responde 201 JSON", A.reg.status === 201 && A.reg.tipo.includes("application/json"), A.reg.status);
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("AUT-02", "Login correcto responde 200 con usuario y token nuevo", A.log.status === 200 && A.log.json?.usuario?.email === A.email && A.log.json?.csrfToken && A.log.json.csrfToken !== A.tokenAnterior);
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("AUT-03", "Login regenera el identificador de sesión (fijación de sesión)", A.sidAntes && A.c.sid && A.sidAntes !== A.c.sid);
// Inicializa dup.
const dup = await A.c.pedir("api/registro.php", { metodo: "POST", cuerpo: { nombre: "Otro", email: A.email, password: "Clave-segura-123" } });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("AUT-04", "Correo duplicado responde 409", dup.status === 409, dup.status);
// Inicializa anon.
const anon = new Cliente(); await anon.sesion();
// Inicializa mal.
const mal = await anon.pedir("api/login.php", { metodo: "POST", cuerpo: { email: A.email, password: "incorrecta-123" } });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("AUT-05", "Contraseña incorrecta responde 401 sin indicar cuál dato falló", mal.status === 401 && !/contraseña incorrecta|no existe/i.test(mal.json?.mensaje || ""), mal.json?.mensaje);
// Inicializa corta.
const corta = await anon.pedir("api/registro.php", { metodo: "POST", cuerpo: { nombre: "X", email: `corta.${sello}@example.com`, password: "1234567" } });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("AUT-06", "Contraseña de 7 caracteres rechazada con 400", corta.status === 400, corta.status);
// Inicializa sqliLogin.
const sqliLogin = await anon.pedir("api/login.php", { metodo: "POST", cuerpo: { email: "' OR '1'='1' -- ", password: "' OR '1'='1" } });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("SEG-01", "Inyección SQL en login no autentica (400/401)", [400, 401].includes(sqliLogin.status) && !sqliLogin.json?.usuario, sqliLogin.status);

// --- Control de acceso (OWASP A01) y CSRF ---
const anonGet = await anon.pedir("api/mis_movimientos.php");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("ACC-01", "GET movimientos sin sesión responde 401", anonGet.status === 401, anonGet.status);
// Inicializa anonCat.
const anonCat = await anon.pedir("api/categorias.php");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("ACC-02", "GET categorías sin sesión responde 401", anonCat.status === 401, anonCat.status);
// Inicializa anonPost.
const anonPost = await anon.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento() });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("ACC-03", "POST sin sesión responde 401 (identidad antes que CSRF)", anonPost.status === 401, anonPost.status);
// Inicializa sinToken.
const sinToken = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento(), token: null });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CSRF-01", "POST con sesión pero sin token responde 403", sinToken.status === 403, sinToken.status);
// Inicializa tokenFalso.
const tokenFalso = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento(), token: "0".repeat(64) });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CSRF-02", "POST con token incorrecto responde 403", tokenFalso.status === 403, tokenFalso.status);
// Inicializa viejo.
const viejo = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento(), token: A.tokenAnterior });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CSRF-03", "Token anterior al login ya no sirve (rotación)", viejo.status === 403, viejo.status);

// --- CRUD y reglas de negocio ---
const alta = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento({ total: 1, ajuste: 0, valorCuota: 1 }) });
// Inicializa idA.
const idA = alta.json?.movimiento?.id;
// Convierte el objeto JavaScript a texto JSON.
caso("CRUD-01", "Alta responde 201 y recalcula: 10000 en efectivo → total 9000 (ignora total falso)", alta.status === 201 && alta.json.movimiento.total === 9000 && alta.json.movimiento.ajuste === -1000, JSON.stringify(alta.json?.movimiento));
// Inicializa credito.
const credito = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento({ monto: 1000, medioPago: "Tarjeta de crédito", cuotas: 6, categoria: "Indumentaria" }) });
// Convierte el objeto JavaScript a texto JSON.
caso("CRUD-02", "Crédito en 6 cuotas: 1000 → total 1180, cuota 196.67", credito.json?.movimiento?.total === 1180 && credito.json?.movimiento?.valorCuota === 196.67, JSON.stringify(credito.json?.movimiento));
// Inicializa ing.
const ing = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento({ tipo: "ingreso", descripcion: "Sueldo", monto: 150000, categoria: "Sueldo", medioPago: "Transferencia" }) });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CRUD-03", "Ingreso sin descuento: 150000 → total 150000", ing.status === 201 && ing.json.movimiento.total === 150000, ing.json?.movimiento?.total);
// Inicializa lista.
const lista = await A.c.pedir("api/mis_movimientos.php");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CRUD-04", "Listado propio responde 200 con los 3 movimientos", lista.status === 200 && lista.json?.movimientos?.length === 3, lista.json?.movimientos?.length);
// Inicializa edit.
const edit = await A.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "PUT", cuerpo: movimiento({ monto: 20000, medioPago: "Transferencia" }) });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CRUD-05", "PUT propio responde 200 y recalcula (20000 por transferencia → 19000)", edit.status === 200 && edit.json?.movimiento?.total === 19000, edit.json?.movimiento?.total);
// Inicializa cat.
const cat = await A.c.pedir("api/categorias.php?id=alimentacion");
// Convierte el objeto JavaScript a texto JSON.
caso("CAT-01", "Detalle de Alimentación refleja la edición (gastos 19000, 1 movimiento)", cat.status === 200 && cat.json?.categoria?.gastos === 19000 && cat.json?.categoria?.cantidad === 1 && cat.json?.movimientos?.length === 1, JSON.stringify(cat.json?.categoria));
// Inicializa catVacia.
const catVacia = await A.c.pedir("api/categorias.php?id=salud");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CAT-02", "Categoría sin movimientos: totales 0 e historial vacío", catVacia.status === 200 && catVacia.json?.categoria?.cantidad === 0 && catVacia.json?.movimientos?.length === 0);
// Inicializa catNo.
const catNo = await A.c.pedir("api/categorias.php?id=no-existe");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CAT-03", "Categoría inexistente responde 404", catNo.status === 404, catNo.status);
// Inicializa catSqli.
const catSqli = await A.c.pedir("api/categorias.php?id=" + encodeURIComponent("alimentacion' OR '1'='1"));
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("SEG-02", "Inyección en ID de categoría no devuelve datos (400/404)", [400, 404].includes(catSqli.status), catSqli.status);

// --- Validaciones de entrada (400 / 405) ---
const invalidos = [
    // Agrega los valores indicados a la colección.
    ["VAL-01", "Monto negativo", movimiento({ monto: -5 })],
    // Agrega los valores indicados a la colección.
    ["VAL-02", "Monto con tres decimales", movimiento({ monto: 10.123 })],
    // Agrega los valores indicados a la colección.
    ["VAL-03", "Monto como texto", movimiento({ monto: "100" })],
    // Agrega los valores indicados a la colección.
    ["VAL-04", "Fecha inexistente 2026-02-30", movimiento({ fecha: "2026-02-30" })],
    // Agrega los valores indicados a la colección.
    ["VAL-05", "Categoría de ingreso en un gasto", movimiento({ categoria: "Sueldo" })],
    // Agrega los valores indicados a la colección.
    ["VAL-06", "Cuotas en efectivo", movimiento({ cuotas: 3 })],
    // Agrega los valores indicados a la colección.
    ["VAL-07", "Medio de pago desconocido", movimiento({ medioPago: "Bitcoin" })],
    // Agrega los valores indicados a la colección.
    ["VAL-08", "Descripción vacía", movimiento({ descripcion: "" })],
];
// Recorre los elementos para procesar cada uno dentro del bloque.
for (const [id, d, cuerpo] of invalidos) {
    // Recorre los elementos para acumular o comprobar sus resultados.
    const r = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo });
    // Comprueba el resultado esperado y registra si la prueba pasa.
    caso(id, `${d} responde 400 con estado error`, r.status === 400 && r.json?.estado === "error", r.status + " " + (r.json?.mensaje || ""));
}
// Inicializa roto.
const roto = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", crudo: "{no es json" });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("VAL-09", "JSON mal formado responde 400", roto.status === 400, roto.status);
// Inicia metodo: método HTTP del pedido.
const metodo = await A.c.pedir("api/mis_movimientos.php", { metodo: "PATCH", cuerpo: movimiento() });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("VAL-10", "Método no admitido (PATCH) responde 405", metodo.status === 405, metodo.status);
// Inicializa idMal.
const idMal = await A.c.pedir("api/mis_movimientos.php?id=abc", { metodo: "DELETE" });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("VAL-11", "DELETE con id no numérico responde 400", idMal.status === 400, idMal.status);

// --- Aislamiento entre cuentas ---
const B = await crearCuenta("cuentaB");
// Inicializa listaB.
const listaB = await B.c.pedir("api/mis_movimientos.php");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("ACC-04", "La cuenta B no ve movimientos de A", listaB.status === 200 && listaB.json?.movimientos?.length === 0);
// Inicializa editB.
const editB = await B.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "PUT", cuerpo: movimiento({ monto: 1 }) });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("ACC-05", "B no puede editar un movimiento de A (404, igual que inexistente)", editB.status === 404, editB.status);
// Inicializa delB.
const delB = await B.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "DELETE" });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("ACC-06", "B no puede eliminar un movimiento de A (404)", delB.status === 404, delB.status);
// Inicializa catB.
const catB = await B.c.pedir("api/categorias.php?id=alimentacion");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("ACC-07", "El detalle de categoría de B no incluye datos de A", catB.json?.categoria?.cantidad === 0);

// --- XSS almacenado (el backend guarda texto; la interfaz lo muestra con textContent) ---
const xss = await A.c.pedir("api/mis_movimientos.php", { metodo: "POST", cuerpo: movimiento({ descripcion: "<script>alert(1)</script>" }) });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("SEG-03", "Descripción con marcado se guarda y devuelve como texto JSON (sin ejecutar)", xss.status === 201 && xss.json?.movimiento?.descripcion === "<script>alert(1)</script>" && xss.tipo.includes("application/json"));

// --- Baja y cierre de sesión ---
const del = await A.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "DELETE" });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CRUD-06", "DELETE propio responde 200 con el id eliminado", del.status === 200 && del.json?.id === idA, del.status);
// Inicializa delOtraVez.
const delOtraVez = await A.c.pedir(`api/mis_movimientos.php?id=${idA}`, { metodo: "DELETE" });
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("CRUD-07", "Eliminar de nuevo el mismo id responde 404", delOtraVez.status === 404, delOtraVez.status);
// Inicializa out.
const out = await A.c.pedir("api/logout.php", { metodo: "POST", cuerpo: {} });
// Inicializa tras.
const tras = await A.c.pedir("api/mis_movimientos.php");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("AUT-07", "Logout responde 200 y la sesión deja de servir (401)", out.status === 200 && tras.status === 401, `${out.status}/${tras.status}`);

// Comprueba el resultado esperado y registra si la prueba pasa.
caso("HTTP-01", "Todas las respuestas usan Content-Type JSON UTF-8", [A.reg, A.log, anonGet, alta, lista, edit, del].every(r => /application\/json;\s*charset=utf-8/i.test(r.tipo)));
// Inicializa cookie.
const cookie = A.reg.setCookie.join(" ") + " " + A.log.setCookie.join(" ");
// Comprueba el resultado esperado y registra si la prueba pasa.
caso("HTTP-02", "Cookie de sesión HttpOnly y SameSite=Lax", /httponly/i.test(cookie) && /samesite=lax/i.test(cookie));

// --- Informe ---
const ok = resultados.filter(r => r.ok).length;
// Recorre los elementos para procesar cada uno dentro del bloque.
for (const r of resultados) console.log(`${r.ok ? "OK  " : "FALLA"} ${r.id}  ${r.descripcion}${r.ok ? "" : "  → " + r.detalle}`);
// Llama a console.log con los datos indicados.
console.log(`\n${ok}/${resultados.length} casos correctos`);
// Actualiza process.exitCode.
process.exitCode = ok === resultados.length ? 0 : 1;
