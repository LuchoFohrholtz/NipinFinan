// Importa puppeteer para las pruebas.
import puppeteer from "puppeteer-core";
// Inicializa CHROME.
const CHROME = process.env.CHROME_PATH || (process.platform === "win32"
  // Selecciona este valor si se cumple la condición anterior.
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome");
// Inicializa BASE.
const BASE = process.argv[2];
// Inicializa b.
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
// Inicializa p.
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 900 });
// Inicializa log.
const log = [];
// Inicializa navs.
let navs = 0; p.on("framenavigated", f => {
    // Cuenta las navegaciones completas del documento principal.
    if (f === p.mainFrame()) navs++;
});
// Espera que termine la operación asíncrona antes de continuar.
await p.goto(BASE, { waitUntil: "networkidle0" }); await p.evaluate(() => {
    // Actualiza window.__marca.
    window.__marca = 1;
});
// Inicializa foco.
const foco = () => p.evaluate(() => {
    // Muestra texto sin interpretarlo como HTML.
    const e = document.activeElement; const o = getComputedStyle(e).outlineStyle + " " + getComputedStyle(e).outlineWidth; return `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""} "${(e.textContent || e.value || e.getAttribute("aria-label") || "").trim().slice(0, 30)}" [outline ${o}]`;
});
// Inicializa tabHasta.
const tabHasta = async (pred, max = 60) => {
    // Recorre los elementos para procesar cada uno dentro del bloque.
    for (let i = 0; i < max; i++) {
    // Espera que termine la operación asíncrona antes de continuar.
    await p.keyboard.press("Tab"); if (await p.evaluate(pred)) return true;
    } return false;
};
// Inicializa espera.
const espera = (ms = 600) => new Promise(r => setTimeout(r, ms));
// Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Tab"); log.push("1er Tab: " + await foco());
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.id === "sesion-ingresar"); log.push("Tab → " + await foco());
// Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Enter"); await espera(); log.push("Enter → hash " + await p.evaluate(() => location.hash) + ", foco " + await foco());
// Inicia email: correo de la cuenta.
const email = process.argv[3], pass = process.argv[4];
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.type === "email" && !!document.activeElement.closest("#vista-acceso")); await p.keyboard.type(email);
// Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Tab"); await p.keyboard.type(pass); await p.keyboard.press("Enter"); await espera(1200);
// Muestra texto sin interpretarlo como HTML.
log.push("Login Enter → " + await p.evaluate(() => location.hash + " | " + document.querySelector("#sesion-nombre")?.textContent + " | live: " + document.querySelector("#mensaje-acceso")?.textContent));
// Lleva el foco al control.
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab");
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.dataset?.ruta === "registrar" && !!document.activeElement.closest("nav"));
// Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Enter"); await espera(); log.push("Nav Registrar → " + await p.evaluate(() => location.hash) + ", foco " + await foco());
// Inicia campos: campos del movimiento.
const campos = await p.$$eval("#vista-registrar form :is(input,select,textarea)", es => es.map(e => e.id + ":" + e.type));
// Llama a log.push con los datos indicados.
log.push("Campos registrar: " + campos.join(", "));
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.id === "descripcion"); await p.keyboard.type("Colectivo (teclado)");
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.id === "monto"); await p.keyboard.type("1500");
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.id === "categoria"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown");
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.id === "pago"); await p.keyboard.press("ArrowDown");
// Localiza "#pago" en el HTML para controlar ese elemento.
log.push("Categoría/medio con flechas: " + await p.evaluate(() => document.querySelector("#pago").value) + " / " + await p.evaluate(() => document.querySelector("#categoria").value));
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.type === "submit" && !!document.activeElement.closest("#vista-registrar"));
// Llama a log.push con los datos indicados.
log.push("Submit enfocado: " + await foco());
// Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Enter"); await espera(1500);
// Muestra texto sin interpretarlo como HTML.
log.push("Alta → live #mensaje: " + await p.evaluate(() => document.querySelector("#mensaje")?.textContent.trim().slice(0, 120)));
// Lleva el foco al control.
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab");
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.dataset?.ruta === "movimientos" && !!document.activeElement.closest("nav"));
// Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Enter"); await espera(1000); log.push("Nav Movimientos → foco " + await foco());
// Muestra texto sin interpretarlo como HTML.
const filas = await p.$$eval("#vista-movimientos tbody tr", t => t.map(r => r.textContent.replace(/\s+/g, " ").trim().slice(0, 60)));
// Llama a log.push con los datos indicados.
log.push("Filas: " + filas.length + " → " + filas[0]);
// Muestra texto sin interpretarlo como HTML.
await tabHasta(() => /Eliminar/.test(document.activeElement.textContent) && document.activeElement.tagName === "BUTTON");
// Localiza "#confirmar-eliminacion" en el HTML para controlar ese elemento.
await p.keyboard.press("Enter"); await espera(); log.push("Eliminar → dialog abierto: " + await p.evaluate(() => document.querySelector("#confirmar-eliminacion").open) + ", foco " + await foco());
// Localiza "#confirmar-eliminacion" en el HTML para controlar ese elemento.
await p.keyboard.press("Escape"); await espera(); log.push("Escape → dialog abierto: " + await p.evaluate(() => document.querySelector("#confirmar-eliminacion").open) + ", foco " + await foco());
// Lleva el foco al control.
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab");
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.dataset?.ruta === "categorias" && !!document.activeElement.closest("nav"));
// Espera que termine la operación asíncrona antes de continuar.
await p.keyboard.press("Enter"); await espera(1000); log.push("Nav Categorías → foco " + await foco());
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => !!document.activeElement.closest("#vista-categorias") && document.activeElement.tagName === "A" && /alimentacion/.test(document.activeElement.getAttribute("href") || ""));
// Llama a log.push con los datos indicados.
log.push("Tarjeta: " + await foco());
// Localiza "#vista-categoria" en el HTML para controlar ese elemento.
await p.keyboard.press("Enter"); await espera(1000); log.push("Detalle → " + await p.evaluate(() => location.hash + " | " + document.querySelector("#vista-categoria")?.innerText.replace(/\s+/g, " ").trim().slice(0, 140)));
// Lleva el foco al control.
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab");
// Espera que termine la operación asíncrona antes de continuar.
await tabHasta(() => document.activeElement.id === "sesion-salir"); await p.keyboard.press("Enter"); await espera(1000);
// Localiza "#sesion-ingresar" en el HTML para controlar ese elemento.
log.push("Cerrar sesión → ingresar visible: " + await p.evaluate(() => !document.querySelector("#sesion-ingresar").hidden));
// Llama a log.push con los datos indicados.
log.push("Documento sin recargar (marca JS conservada): " + await p.evaluate(() => window.__marca === 1));
// Llama a console.log con los datos indicados.
console.log(log.join("\n"));
// Espera que termine la operación asíncrona antes de continuar.
await b.close();
