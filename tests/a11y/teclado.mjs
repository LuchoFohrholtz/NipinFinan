// Recorre la SPA con teclado y una cuenta de prueba, registrando foco y navegación.
import puppeteer from "puppeteer-core"; // Importa puppeteer para las pruebas.
const CHROME = process.env.CHROME_PATH || (process.platform === "win32" // Inicializa CHROME.
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome"); // Selecciona este valor si se cumple la condición anterior.
const BASE = process.argv[2]; // Inicializa BASE.
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] }); // Inicializa b.
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 900 }); // Inicializa p.
const log = []; // Inicializa log.
let navs = 0; p.on("framenavigated", f => { // Inicializa navs.
    // Cuenta las navegaciones completas del documento principal.
    if (f === p.mainFrame()) navs++; // Cuenta las navegaciones completas del documento principal.
}); // Cierra la función de respuesta y su registro o llamada.
await p.goto(BASE, { waitUntil: "networkidle0" }); await p.evaluate(() => { // Espera que termine la operación asíncrona antes de continuar.
    // Inspecciona o prepara el estado dentro del navegador de prueba.
    window.__marca = 1; // Actualiza window.__marca.
}); // Cierra la función de respuesta y su registro o llamada.
const foco = () => p.evaluate(() => { // Inicializa foco.
    // Inspecciona o prepara el estado dentro del navegador de prueba.
    const e = document.activeElement; const o = getComputedStyle(e).outlineStyle + " " + getComputedStyle(e).outlineWidth; return `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""} "${(e.textContent || e.value || e.getAttribute("aria-label") || "").trim().slice(0, 30)}" [outline ${o}]`; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
}); // Cierra la función de respuesta y su registro o llamada.
const tabHasta = async (pred, max = 60) => { // Inicializa tabHasta.
    // Avanza con Tab hasta alcanzar el control buscado o agotar el límite.
    for (let i = 0; i < max; i++) { // Recorre los elementos para procesar cada uno dentro del bloque.
    // Recorre los elementos para acumular o comprobar sus resultados.
    await p.keyboard.press("Tab"); if (await p.evaluate(pred)) return true; // Espera que termine la operación asíncrona antes de continuar.
    } return false; // Completa los argumentos de la operación iniciada arriba.
}; // Completa la estructura o llamada iniciada arriba.
const espera = (ms = 600) => new Promise(r => setTimeout(r, ms)); // Inicializa espera.
await p.keyboard.press("Tab"); log.push("1er Tab: " + await foco()); // Espera que termine la operación asíncrona antes de continuar.
// Ir a Mi cuenta (Ingresar)
await tabHasta(() => document.activeElement.id === "sesion-ingresar"); log.push("Tab → " + await foco()); // Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Enter"); await espera(); log.push("Enter → hash " + await p.evaluate(() => location.hash) + ", foco " + await foco()); // Espera que termine la operación asíncrona antes de continuar.
const email = process.argv[3], pass = process.argv[4]; // Inicializa la variable email: correo de la cuenta.
await tabHasta(() => document.activeElement.type === "email" && !!document.activeElement.closest("#vista-acceso")); await p.keyboard.type(email); // Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Tab"); await p.keyboard.type(pass); await p.keyboard.press("Enter"); await espera(1200); // Espera que termine la operación asíncrona antes de continuar.
log.push("Login Enter → " + await p.evaluate(() => location.hash + " | " + document.querySelector("#sesion-nombre")?.textContent + " | live: " + document.querySelector("#mensaje-acceso")?.textContent)); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
// Ir a Registrar por la nav
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab"); // Lleva el foco al control para continuar con teclado.
await tabHasta(() => document.activeElement.dataset?.ruta === "registrar" && !!document.activeElement.closest("nav")); // Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Enter"); await espera(); log.push("Nav Registrar → " + await p.evaluate(() => location.hash) + ", foco " + await foco()); // Espera que termine la operación asíncrona antes de continuar.
const campos = await p.$$eval("#vista-registrar form :is(input,select,textarea)", es => es.map(e => e.id + ":" + e.type)); // Inicializa la variable campos: campos del movimiento.
log.push("Campos registrar: " + campos.join(", ")); // Llama a log.push con los datos indicados.
await tabHasta(() => document.activeElement.id === "descripcion"); await p.keyboard.type("Colectivo (teclado)"); // Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.id === "monto"); await p.keyboard.type("1500"); // Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.id === "categoria"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); // Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.id === "pago"); await p.keyboard.press("ArrowDown"); // Espera que termine la operación asíncrona antes de continuar.
log.push("Categoría/medio con flechas: " + await p.evaluate(() => document.querySelector("#pago").value) + " / " + await p.evaluate(() => document.querySelector("#categoria").value)); // Localiza "#pago" en el HTML para controlar ese elemento.
await tabHasta(() => document.activeElement.type === "submit" && !!document.activeElement.closest("#vista-registrar")); // Espera que termine la operación asíncrona antes de continuar.
log.push("Submit enfocado: " + await foco()); // Llama a log.push con los datos indicados.
await p.keyboard.press("Enter"); await espera(1500); // Espera que termine la operación asíncrona antes de continuar.
log.push("Alta → live #mensaje: " + await p.evaluate(() => document.querySelector("#mensaje")?.textContent.trim().slice(0, 120))); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
// Movimientos
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab"); // Lleva el foco al control para continuar con teclado.
await tabHasta(() => document.activeElement.dataset?.ruta === "movimientos" && !!document.activeElement.closest("nav")); // Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Enter"); await espera(1000); log.push("Nav Movimientos → foco " + await foco()); // Espera que termine la operación asíncrona antes de continuar.
const filas = await p.$$eval("#vista-movimientos tbody tr", t => t.map(r => r.textContent.replace(/\s+/g, " ").trim().slice(0, 60))); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
log.push("Filas: " + filas.length + " → " + filas[0]); // Llama a log.push con los datos indicados.
await tabHasta(() => /Eliminar/.test(document.activeElement.textContent) && document.activeElement.tagName === "BUTTON"); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
await p.keyboard.press("Enter"); await espera(); log.push("Eliminar → dialog abierto: " + await p.evaluate(() => document.querySelector("#confirmar-eliminacion").open) + ", foco " + await foco()); // Localiza "#confirmar-eliminacion" en el HTML para controlar ese elemento.
await p.keyboard.press("Escape"); await espera(); log.push("Escape → dialog abierto: " + await p.evaluate(() => document.querySelector("#confirmar-eliminacion").open) + ", foco " + await foco()); // Localiza "#confirmar-eliminacion" en el HTML para controlar ese elemento.
// Categorías y detalle
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab"); // Lleva el foco al control para continuar con teclado.
await tabHasta(() => document.activeElement.dataset?.ruta === "categorias" && !!document.activeElement.closest("nav")); // Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Enter"); await espera(1000); log.push("Nav Categorías → foco " + await foco()); // Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => !!document.activeElement.closest("#vista-categorias") && document.activeElement.tagName === "A" && /alimentacion/.test(document.activeElement.getAttribute("href") || "")); // Espera que termine la operación asíncrona antes de continuar.
log.push("Tarjeta: " + await foco()); // Llama a log.push con los datos indicados.
await p.keyboard.press("Enter"); await espera(1000); log.push("Detalle → " + await p.evaluate(() => location.hash + " | " + document.querySelector("#vista-categoria")?.innerText.replace(/\s+/g, " ").trim().slice(0, 140))); // Localiza "#vista-categoria" en el HTML para controlar ese elemento.
// Logout
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab"); // Lleva el foco al control para continuar con teclado.
await tabHasta(() => document.activeElement.id === "sesion-salir"); await p.keyboard.press("Enter"); await espera(1000); // Espera que termine la operación asíncrona antes de continuar.
log.push("Cerrar sesión → ingresar visible: " + await p.evaluate(() => !document.querySelector("#sesion-ingresar").hidden)); // Localiza "#sesion-ingresar" en el HTML para controlar ese elemento.
log.push("Documento sin recargar (marca JS conservada): " + await p.evaluate(() => window.__marca === 1)); // Llama a log.push con los datos indicados.
console.log(log.join("\n")); // Llama a console.log con los datos indicados.
await b.close(); // Espera que termine la operación asíncrona antes de continuar.
