# MicheMango

Catálogo web para el emprendimiento MicheMango de Barranquilla. El sitio estático vive en `public/`; Express y su API se ejecutan desde `src/`. El catálogo, las solicitudes, el panel de administración y un asistente para elegir miches están conectados al backend.

## Estructura

```text
public/
  index.html
  admin/{login.html,panel.html}
  css/styles.css
  js/{config.js,menu.js,animaciones.js,catalogo.js,contacto.js,chatbot.js}
  js/admin/{login.js,panel.js}
src/
  server.js
  productos.js
  routes/{admin.js,adminAuth.js,adminApi.js,contacto.js,recomendador.js}
  middleware/{requiereAdmin.js,rateLimiters.js,requestLogger.js}
  data/{storage.js,productos.json,solicitudes.js}
.github/workflows/pages.yml
index.html
package.json
.env.example
```

`public/js/chatbot.js` controla el widget flotante. El proveedor de IA, si se configura, se llama solo desde `src/routes/recomendador.js`; sin clave se usa un recomendador determinista por sabor, tamaño y ocasión. El frontend no recibe ni contiene la clave.

## Requisitos y ejecución local

Requiere Node.js 18 o superior y npm. Desde PowerShell en la raíz:

```powershell
Copy-Item .env.example .env
npm install
node -e "require('bcryptjs').hash('ELIGE_UNA_CONTRASENA_SEGURA', 12).then(console.log)"
```

Copia el hash generado a `ADMIN_PASSWORD_HASH` dentro de `.env`, elige un usuario administrativo y sustituye `SESSION_SECRET` por una cadena aleatoria de al menos 32 caracteres. No guardes la contraseña en el repositorio ni compartas `.env`. `ADMIN_USER` y `ADMIN_USERNAME` son alias; configura solo uno.

```powershell
npm run dev
# o modo normal:
npm start
```

El sitio de desarrollo estará en `http://localhost:3000/`; comprueba `http://localhost:3000/api/health`. `npm run check` comprueba sintaxis del backend y las rutas. El servidor usa PostgreSQL si se configura `DATABASE_URL`; sin ella, desarrollo usa JSON local con reemplazo atómico. El archivo local de solicitudes está excluido de Git.

## Variables privadas del backend

Configúralas en `.env` local o en la configuración de variables secretas del proveedor backend. Nunca las añadas a GitHub Pages ni al JavaScript público.

| Variable | Uso |
|---|---|
| `PORT` | Puerto asignado por el alojamiento; local: `3000`. |
| `NODE_ENV` | `development` local, `production` en el alojamiento. |
| `ADMIN_USER` o `ADMIN_USERNAME` | Usuario administrativo elegido. |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt, nunca la contraseña sin hash. |
| `SESSION_SECRET` | Secreto aleatorio privado, mínimo 32 caracteres. |
| `DATABASE_URL` | Cadena privada de PostgreSQL; obligatoria en producción. |
| `DATABASE_SSL` | `true` solo cuando lo requiera el proveedor. TLS valida certificados. |
| `FRONTEND_ORIGIN` | Origen exacto del frontend. Puede contener una lista separada por comas. |
| `CORS_ORIGINS` | Alias de compatibilidad; se usa si no se definió `FRONTEND_ORIGIN`. |
| `SESSION_SAME_SITE` | `lax`, `strict` o `none`; producción usa `none` de forma predeterminada. |
| `SESSION_SECURE` | `true` en HTTPS; `SameSite=None` exige cookie segura en producción. |
| `SESSION_COOKIE_DOMAIN` | Opcional, para el dominio compartido propio. |
| `OPENAI_API_KEY` | Opcional; clave privada del proveedor para el asistente de IA. |
| `OPENAI_MODEL` | Opcional; por defecto `gpt-4o-mini`. |

Para generar el hash local sin instalar herramientas adicionales:

```powershell
node -e "require('bcryptjs').hash('ELIGE_UNA_CONTRASENA_SEGURA', 12).then(console.log)"
```

El archivo `.env.example` solo contiene valores de muestra. `.gitignore` excluye `.env`, archivos temporales y las solicitudes locales.

## PostgreSQL y persistencia

[Neon](https://neon.tech/) es una opción PostgreSQL compatible con el cliente `pg` del proyecto. Crea una base, abre **Connect**, selecciona Node.js/`node-postgres` y guarda su cadena privada en `DATABASE_URL` del servicio de backend. Selecciona TLS según la documentación actual del proveedor y su valor de `DATABASE_SSL`; no desactives la validación de certificados.

Al iniciar, el backend crea las tablas `michemango_products`, `michemango_requests`, `michemango_migrations` y `michemango_sessions`. Importa el catálogo y las solicitudes JSON locales solo si la tabla respectiva está vacía y registra la migración para no repetirla. No elimina los archivos originales. Las consultas con valores recibidos del navegador usan parámetros `$1`, `$2`, etc. Ante `SIGINT`/`SIGTERM`, el servidor cierra HTTP y el pool de PostgreSQL.

Para verificar persistencia luego de aprovisionar la base, envía una solicitud de prueba, búscala en el panel y consulta en la consola SQL:

```sql
SELECT id, fecha, nombre, correo, telefono, producto_interes, estado
FROM michemango_requests
ORDER BY fecha DESC
LIMIT 5;
```

Reinicia el servicio backend y confirma que la misma solicitud siga en el panel o en SQL. No se ha aprovisionado una base real; hasta realizar estas comprobaciones, persistencia de producción sigue pendiente.

## API del backend

| Método | Ruta | Acceso / función |
|---|---|---|
| `GET` | `/api/health` | Estado de Express y almacenamiento. |
| `GET` | `/api/productos` | Catálogo público. |
| `POST` | `/api/solicitudes` | Registra contacto; valida nombre, al menos un teléfono/correo, producto, tipo y mensaje. `POST /api/contacto` se conserva como alias. |
| `POST` | `/api/recomendaciones` | Recomienda un producto usando IA privada cuando está configurada o reglas de respaldo. |
| `POST` | `/api/admin/login` | Inicia sesión con bcrypt; tiene límite contra intentos repetidos. |
| `GET` | `/api/admin/session` | Verifica sesión; requiere autenticación. |
| `POST` | `/api/admin/logout` | Cierra sesión autenticada. |
| `GET` | `/api/admin/solicitudes?estado=nueva` | Solicitudes protegidas; filtra `nueva`, `confirmada` o `atendida`. |
| `PATCH` | `/api/admin/solicitudes/:id/estado` | Cambia estado protegido. |
| `DELETE` | `/api/admin/solicitudes/:id` | Elimina una solicitud protegida. |
| `GET/POST/PATCH/DELETE` | `/api/admin/productos` | CRUD protegido del catálogo. |

Helmet configura cabeceras de seguridad. Express limita los cuerpos JSON, valida entradas, aplica límites por IP a solicitudes, login y recomendaciones, y usa un manejador central de errores con identificadores de solicitud. El rate limit predeterminado es en memoria por instancia; si el servicio escala a varios procesos, configúralo con un almacén compartido Redis del proveedor.

## Formularios y panel

El formulario envía `POST /api/solicitudes`, valida también en el servidor y responde con un identificador de seguimiento. Exige un producto de interés válido en el catálogo y al menos uno entre teléfono y correo. El administrador puede filtrar, confirmar, marcar como atendida o eliminar las solicitudes. Los endpoints administrativos de lectura y escritura rechazan usuarios sin sesión (`401`).

El login usa bcrypt y protección contra fuerza bruta. Las cookies son `HttpOnly`; en producción son `Secure` y usan `SameSite=None` para permitir el flujo entre dominios, con `credentials: "include"` y CORS con credenciales. Las cookies de terceros pueden ser bloqueadas por el navegador, incluso con esos atributos; el login no se debe considerar probado en producción hasta verificarlo en los navegadores objetivo.

### Cookies entre Pages y API

La opción más simple para conservar cookies es asignar un dominio propio al frontend de Pages (por ejemplo `www.tudominio.com`) y usar un subdominio para la API (`api.tudominio.com`). Ambos quedan bajo el mismo sitio registrable; configura el origen CORS exacto, HTTPS y, si se necesita, `SESSION_COOKIE_DOMAIN=.tudominio.com`.

Alternativamente, pon un proxy inverso delante del backend y sirve la API bajo el mismo origen del frontend, por ejemplo `www.tudominio.com/api/*`. GitHub Pages por sí solo solo entrega archivos estáticos y **no puede ejecutar un proxy**. Para esa opción se requiere una capa de proxy real, como Cloudflare Worker/Reverse Proxy, que reenvíe `/api/*` al servidor Node sin exponer secretos. El Worker no debe suplantar al cliente ni omitir la autenticación. Un dominio personalizado con subdominios suele ser la alternativa más sencilla.

## Asistente de producto

El widget flotante solicita sabor, tamaño y ocasión. Si existe `OPENAI_API_KEY`, el backend pide una sugerencia al modelo configurado, valida que el nombre exista en el catálogo y devuelve solo el producto y su motivo. Si no hay clave, falla el proveedor o su respuesta no coincide con el catálogo, se usa el modo de reglas y la respuesta lo indica. El modelo no inventa precios: el frontend muestra el precio actual del catálogo como demostrativo.

La clave se obtiene directamente del proveedor y se guarda como secreto del backend; no la pegues en `public/`, el navegador, Git, capturas ni mensajes. Antes de habilitar IA pública, revisa el costo, límites, condiciones del proveedor y tratamiento de datos. No se envían nombre, correo ni teléfono al modelo.

## Configuración pública: WhatsApp y precios

La única configuración comercial pendiente está en `public/js/config.js`. Sustituye `whatsappNumber: "TODO_CONFIRMAR"` por el número oficial internacional en dígitos, y reemplaza los cuatro valores `TODO_CONFIRMAR` del objeto `preciosOficiales` cuando se confirmen. Los precios numéricos de `src/data/productos.json` son datos demostrativos preexistentes, no precios oficiales; antes de publicar, actualiza el catálogo desde el panel si la base ya se inicializó. La interfaz advierte que son valores de demostración. El pedido solo abre un borrador de WhatsApp, no registra una venta ni confirma su envío; además, el enlace se bloquea hasta configurar un número válido.

## GitHub Pages

`.github/workflows/pages.yml` publica solo `public/` en la rama `main` o al ejecutarlo manualmente. `public/index.html` es la entrada y usa recursos relativos para funcionar bajo `/<repositorio>/`. La raíz `index.html` sirve solo para Live Server.

1. En GitHub abre **Settings → Pages** y elige **GitHub Actions** como origen.
2. Configura `apiBasePublicada` en `public/js/config.js` con el origen HTTPS real del backend, sin `/` final; no inventes la URL.
3. En el servicio backend configura `FRONTEND_ORIGIN` con el origen HTTPS exacto, sin la ruta del repositorio. Ejemplo de formato: `https://<usuario>.github.io`.
4. Revisa **Actions**: el workflow debe completar la subida del artefacto y el despliegue. Luego abre la URL que GitHub asigna.
5. Comprueba catálogo, solicitud, asistente y login desde ese dominio; los orígenes y cookies de producción no se verifican desde localhost.

El workflow no publica el backend, `.env`, claves ni solicitudes locales. No se ha hecho push ni publicación en esta tarea.

## Despliegue sugerido

Una combinación posible es Render Web Service para Node.js y Neon para PostgreSQL:

1. Crea la base PostgreSQL y copia su cadena privada en el almacén de secretos del Web Service.
2. Conecta el repositorio y configura como raíz el directorio que contiene `package.json`, comando de instalación `npm install` y comando de inicio `npm start`.
3. Configura `NODE_ENV=production`, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `DATABASE_URL`, `DATABASE_SSL`, `FRONTEND_ORIGIN` y, si se habilita IA, `OPENAI_API_KEY` y `OPENAI_MODEL`. `PORT` lo proporciona normalmente el alojamiento.
4. Despliega y verifica `/api/health` y `/api/productos`.
5. Configura `apiBasePublicada`, publica Pages después de autorizarlo, y prueba CORS, formulario, persistencia y login desde el dominio público.

Las cuentas, instancias, secretos, URL pública de API y el despliegue siguen pendientes de provisionar por el propietario.

## Checklist antes de aceptar pedidos

- [ ] Confirmar WhatsApp oficial y sustituir `TODO_CONFIRMAR` en `public/js/config.js`.
- [ ] Confirmar los cuatro precios oficiales y actualizar el catálogo del backend.
- [ ] Decidir si se activa IA; si es así, guardar una clave propia en `OPENAI_API_KEY` y verificar costos/límites.
- [ ] Crear una contraseña administrativa segura, generar su hash bcrypt y configurar las variables privadas.
- [ ] Aprovisionar PostgreSQL, probar registro y persistencia después de reiniciar.
- [ ] Publicar el backend y Pages; verificar catálogo, CORS y formulario en la URL real.
- [ ] Probar el login y el cierre de sesión desde Pages en Chrome, Edge y los móviles objetivo; solucionar cookies de terceros si el navegador las bloquea.
- [ ] Revisar cada estado y el borrador de WhatsApp; el borrador no confirma una compra.

## Pruebas y límites actuales

Los checks de sintaxis y las pruebas locales deben ejecutarse con `npm run check` y las rutas locales. En este entorno no existe una base PostgreSQL provisionada, URL de backend o sitio publicado, así que no se afirma que la conexión, persistencia tras reinicio, CORS público, cookies entre dominios o flujo de GitHub Pages estén probados en producción. Verifica Chrome, Edge y un móvil real al publicar; el navegador integrado permite una revisión local, no sustituye esas pruebas.
