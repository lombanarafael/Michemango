# 🥭 MicheMango

## Descripción

MicheMango es una página web creada para promocionar y vender miche de mango. Su objetivo es ofrecer a los clientes una forma sencilla de conocer los productos, los precios y la información del emprendimiento.

## Objetivos

- Dar a conocer la marca MicheMango.
- Mostrar el catálogo de productos.
- Facilitar el contacto con los clientes.
- Impulsar las ventas del emprendimiento.

## Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript
- Node.js
- Express
- Git
- GitHub

## Estructura del proyecto
```text
Michemango/
├── frontend/
│   └── Assets/
│       ├── index.html
│       ├── Styles.css
│       └── script.js
├── productos.js
├── server.js
├── package.json
└── README.md
```

## Servidor de desarrollo

El servidor Express ofrece un mensaje de bienvenida en `/` y el catálogo en
`/api/productos`. Los productos están separados en `productos.js` y se importan
desde `server.js` usando CommonJS (`require` y `module.exports`).

Para crear un proyecto nuevo desde cero, primero entra en su carpeta vacía y
ejecuta:

```bash
npm init -y
npm install express
```

`npm init -y` crea `package.json` y `npm install express` instala Express.
En este repositorio ya están hechos esos pasos, así que para iniciar el servidor
solo necesitas ejecutar desde la carpeta raíz:

```bash
npm start
```

Si usas Windows PowerShell y aparece un error indicando que no se puede ejecutar
`npm.ps1`, usa `npm.cmd` en lugar de `npm` (por ejemplo, `npm.cmd start`).
También puedes usar `npm.cmd init -y` y `npm.cmd install express` al configurar
un proyecto nuevo.

Después de iniciarlo, visita `http://localhost:3000/` o
`http://localhost:3000/api/productos` en el navegador. El servidor escucha en
el puerto 3000 mientras la terminal permanezca abierta.

## Funcionalidades

- Página de inicio.
- Catálogo de productos.
- Información del emprendimiento.
- Contacto.
- Diseño adaptable para dispositivos móviles.

## Autor

Rafael Lombana

## Estado del proyecto

🚧 En desarrollo.