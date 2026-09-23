// Importamos Express para crear el servidor y sus rutas.
const express = require("express");
const path = require("path");

// Importamos los productos desde un archivo separado.
const productos = require("./data/productos");

// Creamos una aplicación de Express.
const app = express();

// Elegimos el puerto donde funcionará el servidor.
const PORT = 3000;

// Ruta principal: muestra un mensaje de bienvenida.
app.get("/", (req, res) => {
  res.send("¡Bienvenido a MicheMango! Disfruta el sabor del mango.");
});

// Ruta de productos: responde con el arreglo en formato JSON.
app.get("/api/productos", (req, res) => {
  res.json(productos);
});

// Permitimos que el servidor entregue los archivos del frontend.
app.use(express.static(path.join(__dirname, "..", "frontend", "Assets")));

// Ponemos el servidor a escuchar solicitudes en el puerto indicado.
app.listen(PORT, () => {
  console.log(`Servidor de MicheMango escuchando en http://localhost:${PORT}`);
});
