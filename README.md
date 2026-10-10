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
- express-session
- bcryptjs
- dotenv
- @anthropic-ai/sdk
- Git
- GitHub

## Estructura del proyecto
```text
Michemango/
├── data/
│   ├── solicitudes.js
│   └── solicitudes.json (se crea al recibir la primera solicitud)
├── middleware/
│   └── requiereAdmin.js
├── public/
│   ├── index.html
│   ├── Styles.css
│   ├── script.js
│   ├── admin.js
│   ├── admin-login.js
│   ├── chatbot.js
│   └── _redirects
├── routes/
│   ├── contacto.js
│   ├── admin.js
│   ├── adminApi.js
│   └── chat.js
├── prompts/
│   └── chatbotSistema.js
├── views/
│   ├── admin-login.html
│   └── admin.html
├── productos.js
├── server.js
├── package.json
├── .env.example
└── README.md
```

## Servidor de desarrollo y formulario de contacto

Express sirve los archivos de la carpeta `public`, conserva el catálogo en
`/api/productos` y recibe los mensajes del formulario en `POST /api/contacto`.
La ruta valida los datos en el servidor y guarda cada solicitud en
`data/solicitudes.json`; este archivo se crea al enviar el primer formulario y
está excluido de Git porque contiene datos personales.

Para iniciar el servidor desde la carpeta raíz del proyecto:

```bash
npm install
npm start
```

Si usas Windows PowerShell y aparece un error indicando que no se puede ejecutar
`npm.ps1`, usa `npm.cmd` en lugar de `npm` (por ejemplo, `npm.cmd start`).

Después de iniciarlo, visita `http://localhost:3000/` para ver el sitio o
`http://localhost:3000/api/productos` para consultar el catálogo.

### Acceso al panel de administración

Copia `.env.example` como `.env` y configura un usuario, el hash bcrypt de la
contraseña y un secreto de sesión aleatorio de al menos 32 caracteres. Para
crear el hash de una contraseña desde la terminal puedes ejecutar:

```bash
node -e "require('bcryptjs').hash('TU_CONTRASENA', 12).then(console.log)"
```

Pega el resultado en `ADMIN_PASSWORD_HASH` dentro de `.env`. No compartas ese
archivo ni lo subas a Git; `.gitignore` ya lo excluye. El panel está en
`http://localhost:3000/admin/login`. La tabla permite cambiar el estado entre
`nueva` y `atendida`, y eliminar solicitudes.

Una **sesión** es un registro temporal en el servidor que recuerda que ya
iniciaste sesión; el navegador conserva solo una cookie identificadora. La
contraseña se guarda como hash porque el hash permite comprobarla sin almacenar
el texto secreto original.

El almacenamiento de sesiones predeterminado de Express sirve para aprender y
probar localmente, pero se borra al reiniciar el servidor y no está diseñado para
un despliegue real con varias instancias.

### Chatbot recomendador

El botón flotante abre un chat que recomienda entre los cuatro productos según
los gustos y el presupuesto. El navegador envía el historial reciente a
`POST /api/chat`; Express valida que cada mensaje tenga como máximo 500
caracteres y consulta a Anthropic usando las instrucciones de
`prompts/chatbotSistema.js`. La API key y el modelo se configuran en `.env` como
`ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL`. El ejemplo usa `claude-haiku-5-5`; puedes
cambiarlo por otro ID habilitado en tu cuenta.

Agrega tu API key de Anthropic a `.env` para activar recomendaciones reales. Si
la key falta, el servidor sigue funcionando, pero la ruta del chat responde con
un error 503 amigable. Nunca pongas la key en `public/chatbot.js` ni en el HTML:
el navegador y sus solicitudes son visibles para los visitantes.

Una key incorrecta, sin acceso al modelo o sin crédito disponible produce un
mensaje para volver a intentar; revisa la key, el modelo configurado y el estado
de tu cuenta. El modelo configurado se puede comparar con la
[lista oficial de modelos de Claude](https://platform.claude.com/docs/en/models/overview).

### Límite del almacenamiento JSON

El archivo JSON sirve para aprender y para un uso local pequeño, pero no está
diseñado para varias instancias del servidor o muchas escrituras simultáneas.
Además, si el equipo se apaga o el archivo se daña, se pueden perder solicitudes.
Más adelante conviene usar una base de datos y un servicio de backend desplegado.

La configuración actual de Netlify publica los archivos estáticos. Para que el
formulario funcione después de publicar el sitio también habrá que desplegar el
servidor Express en un servicio que ejecute Node.js y conectar ambas direcciones.

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