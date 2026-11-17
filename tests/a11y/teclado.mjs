// Recorre la SPA con teclado y una cuenta de prueba, registrando foco y navegación.
import puppeteer from "puppeteer-core";
const CHROME = process.env.CHROME_PATH || (process.platform === "win32"
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome");
const BASE = process.argv[2];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 900 });
const log = [];
let navs = 0; p.on("framenavigated", f => {
    // Cuenta las navegaciones completas del documento principal.
    if (f === p.mainFrame()) navs++;
});
await p.goto(BASE, { waitUntil: "networkidle0" }); await p.evaluate(() => {
    // Inspecciona o prepara el estado dentro del navegador de prueba.
    window.__marca = 1;
});
const foco = () => p.evaluate(() => {
    // Inspecciona o prepara el estado dentro del navegador de prueba.
    const e = document.activeElement; const o = getComputedStyle(e).outlineStyle + " " + getComputedStyle(e).outlineWidth; return `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""} "${(e.textContent || e.value || e.getAttribute("aria-label") || "").trim().slice(0, 30)}" [outline ${o}]`;
});
const tabHasta = async (pred, max = 60) => {
    // Avanza con Tab hasta alcanzar el control buscado o agotar el límite.
    for (let i = 0; i < max; i++) {
    // Recorre los elementos para acumular o comprobar sus resultados.
    await p.keyboard.press("Tab"); if (await p.evaluate(pred)) return true;
    } return false;
};
const espera = (ms = 600) => new Promise(r => setTimeout(r, ms));
await p.keyboard.press("Tab"); log.push("1er Tab: " + await foco());
// Ir a Mi cuenta (Ingresar)
await tabHasta(() => document.activeElement.id === "sesion-ingresar"); log.push("Tab → " + await foco());
await p.keyboard.press("Enter"); await espera(); log.push("Enter → hash " + await p.evaluate(() => location.hash) + ", foco " + await foco());
const email = process.argv[3], pass = process.argv[4];
await tabHasta(() => document.activeElement.type === "email" && !!document.activeElement.closest("#vista-acceso")); await p.keyboard.type(email);
await p.keyboard.press("Tab"); await p.keyboard.type(pass); await p.keyboard.press("Enter"); await espera(1200);
log.push("Login Enter → " + await p.evaluate(() => location.hash + " | " + document.querySelector("#sesion-nombre")?.textContent + " | live: " + document.querySelector("#mensaje-acceso")?.textContent));
// Ir a Registrar por la nav
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab");
await tabHasta(() => document.activeElement.dataset?.ruta === "registrar" && !!document.activeElement.closest("nav"));
await p.keyboard.press("Enter"); await espera(); log.push("Nav Registrar → " + await p.evaluate(() => location.hash) + ", foco " + await foco());
const campos = await p.$$eval("#vista-registrar form :is(input,select,textarea)", es => es.map(e => e.id + ":" + e.type));
log.push("Campos registrar: " + campos.join(", "));
await tabHasta(() => document.activeElement.id === "descripcion"); await p.keyboard.type("Colectivo (teclado)");
await tabHasta(() => document.activeElement.id === "monto"); await p.keyboard.type("1500");
await tabHasta(() => document.activeElement.id === "categoria"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown");
await tabHasta(() => document.activeElement.id === "pago"); await p.keyboard.press("ArrowDown");
log.push("Categoría/medio con flechas: " + await p.evaluate(() => document.querySelector("#pago").value) + " / " + await p.evaluate(() => document.querySelector("#categoria").value));
await tabHasta(() => document.activeElement.type === "submit" && !!document.activeElement.closest("#vista-registrar"));
log.push("Submit enfocado: " + await foco());
await p.keyboard.press("Enter"); await espera(1500);
log.push("Alta → live #mensaje: " + await p.evaluate(() => document.querySelector("#mensaje")?.textContent.trim().slice(0, 120)));
// Movimientos
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab");
await tabHasta(() => document.activeElement.dataset?.ruta === "movimientos" && !!document.activeElement.closest("nav"));
await p.keyboard.press("Enter"); await espera(1000); log.push("Nav Movimientos → foco " + await foco());
const filas = await p.$$eval("#vista-movimientos tbody tr", t => t.map(r => r.textContent.replace(/\s+/g, " ").trim().slice(0, 60)));
log.push("Filas: " + filas.length + " → " + filas[0]);
await tabHasta(() => /Eliminar/.test(document.activeElement.textContent) && document.activeElement.tagName === "BUTTON");
await p.keyboard.press("Enter"); await espera(); log.push("Eliminar → dialog abierto: " + await p.evaluate(() => document.querySelector("#confirmar-eliminacion").open) + ", foco " + await foco());
await p.keyboard.press("Escape"); await espera(); log.push("Escape → dialog abierto: " + await p.evaluate(() => document.querySelector("#confirmar-eliminacion").open) + ", foco " + await foco());
// Categorías y detalle
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab");
await tabHasta(() => document.activeElement.dataset?.ruta === "categorias" && !!document.activeElement.closest("nav"));
await p.keyboard.press("Enter"); await espera(1000); log.push("Nav Categorías → foco " + await foco());
await tabHasta(() => !!document.activeElement.closest("#vista-categorias") && document.activeElement.tagName === "A" && /alimentacion/.test(document.activeElement.getAttribute("href") || ""));
log.push("Tarjeta: " + await foco());
await p.keyboard.press("Enter"); await espera(1000); log.push("Detalle → " + await p.evaluate(() => location.hash + " | " + document.querySelector("#vista-categoria")?.innerText.replace(/\s+/g, " ").trim().slice(0, 140)));
// Logout
await p.evaluate(() => document.body.focus()); await p.keyboard.press("Tab");
await tabHasta(() => document.activeElement.id === "sesion-salir"); await p.keyboard.press("Enter"); await espera(1000);
log.push("Cerrar sesión → ingresar visible: " + await p.evaluate(() => !document.querySelector("#sesion-ingresar").hidden));
log.push("Documento sin recargar (marca JS conservada): " + await p.evaluate(() => window.__marca === 1));
console.log(log.join("\n"));
await b.close();
