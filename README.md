# NipinFinan

Aplicación de finanzas personales para registrar ingresos y gastos, consultar movimientos y analizar categorías. Proyecto de Paradigmas y Lenguajes de Programación III, Universidad de la Cuenca del Plata.

## Equipo

- Santiago Gonzalez
- Luciano Fohrholtz
- Juan Carlos Abente

## Estado de esta rama

`ae4/santi-backend` contiene autenticación, sesiones con CSRF, CRUD de movimientos propios, catálogo y detalle real de categorías y conexión PDO Singleton. La SPA se desarrolla en `ae4/lucho-spa`; esta rama de backend conserva pantallas anteriores y necesita integrar el helper con CSRF activo para operar desde la interfaz. No corresponde ejecutar PHP con Live Server o un servidor estático.

Presupuestos, alertas y objetivos de ahorro son parte de la propuesta más amplia y no deben presentarse como funciones ya implementadas. WhatsApp es una mejora futura. Las tarifas de medios de pago y cuotas se conservan como reglas del módulo de movimientos.

## Requisitos

- XAMPP con Apache, PHP 8.2 o superior y MySQL/MariaDB.
- Extensiones PHP `pdo_mysql` y `mbstring` habilitadas.
- Navegador moderno con JavaScript y cookies habilitados.

## Instalación local

1. Copiar el repositorio a `C:/xampp/htdocs/NipinFinan`.
2. Iniciar Apache y MySQL desde el panel de XAMPP. Si se utiliza un puerto HTTP distinto de 80, incluirlo en las URLs siguientes.
3. Abrir `http://localhost/phpmyadmin/` e importar `sql/nipinfinan.sql`. El script crea `nipinfinan`, `usuarios` y `movimientos` si no existen. Para una instalación limpia usar un entorno de prueba; no borrar una base habitual.
4. Si la configuración difiere de `127.0.0.1:3306`, usuario `root` y contraseña vacía, crear `config/conexion.local.php` con el contenido siguiente y ajustar sus valores. Este archivo está ignorado por Git y no debe publicarse.

```php
<?php
return [
    'host' => '127.0.0.1',
    'port' => 3306,
    'database' => 'nipinfinan',
    'user' => 'root',
    'password' => '',
];
```

5. Abrir `http://localhost/NipinFinan/api/sesion.php`: debe responder JSON con `usuario: null` y un token real. Esta comprobación no necesita acceso a la base.
6. Integrar la SPA y activar `CSRF_REQUERIDO` en su `js/api.js` según [la guía de integración](docs/integracion-frontend.md), antes de probar formularios. Entrar por `http://localhost/NipinFinan/`. No abrir los HTML con doble clic.
7. Registrar una cuenta, iniciar sesión y crear un movimiento. Verificar listado, edición, baja y categorías cuando sus vistas estén integradas. Para comprobar directamente la API usar cookies y `X-CSRF-Token` como explica el contrato.

El puerto habitual de MySQL es 3306. Si XAMPP está configurado en 3307, cambiar únicamente el archivo local. La API y la SPA deben usar el mismo protocolo, host y puerto HTTP.

## Arquitectura de carpetas

```text
NipinFinan/
├── api/                 Controladores HTTP y respuestas JSON
│   ├── sesion.php       Identidad y token CSRF
│   ├── registro.php     Alta de cuentas
│   ├── login.php        Autenticación
│   ├── logout.php       Cierre de sesión
│   ├── mis_movimientos.php  GET, POST, PUT y DELETE propios
│   └── categorias.php   Catálogo, totales y detalle privado
├── config/              Conexión Singleton, sesión y validación CSRF
├── models/              SQL mediante PDO y marcadores nombrados
├── services/            Validación, cálculo y formato de movimientos
├── data/                Catálogo, tarifas y datos de demostración
├── css/                 Estilos de la interfaz
├── js/                  Comportamiento del cliente
├── sql/nipinfinan.sql    Estructura de base de datos
├── docs/                Contrato, integración y evidencias
├── index.html           Entrada de la aplicación
└── README.md
```

La clase Singleton reutiliza una conexión dentro de cada petición PHP; no comparte una conexión global entre todas las personas. Los modelos reciben PDO y ejecutan SQL; el servicio valida y calcula; los controladores reciben HTTP y devuelven JSON. El navegador no recibe credenciales de MySQL.

## Contrato y seguridad

El [contrato de API](docs/contrato-api.md) define rutas, cuerpos JSON, códigos HTTP y límites. Los datos privados se filtran por el usuario de sesión. Las operaciones que cambian estado requieren el token CSRF asociado a esa sesión; login rota el identificador y el token. Las contraseñas se guardan mediante BCRYPT, nunca en texto plano.

El catálogo público no contiene movimientos. Los totales y el historial de categorías se consultan en el endpoint privado, sin datos de otras cuentas ni presupuestos ficticios.

## Verificación

Las evidencias de API y de integración se guardan en [docs/verificaciones](docs/verificaciones/). La prueba conjunta usa una copia temporal con la SPA de Luciano y el helper configurado para enviar CSRF. No implica que esa rama se haya integrado automáticamente en `main` ni acredita Lighthouse final.

La entrega final también requiere comprobar instalación limpia e interfaz integrada, completar accesibilidad y matriz de calidad, actualizar el informe PDF y generar el ZIP de código y SQL.
