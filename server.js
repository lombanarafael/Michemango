// Importamos Express y el arreglo de productos desde sus archivos separados.
const express = require("express");
const productos = require("./productos");

// Creamos la aplicación que recibirá las solicitudes del navegador.
const app = express();
const PUERTO = 3000;

// Esta ruta responde con un mensaje cuando alguien visita la dirección principal.
app.get("/", (req, res) => {
  res.send("¡Bienvenido a la API de MicheMango!");
});

// Esta ruta entrega el catálogo de productos como datos JSON.
app.get("/api/productos", (req, res) => {
  res.json(productos);
});

// Dejamos el servidor esperando solicitudes en el puerto indicado.
app.listen(PUERTO, () => {
  console.log(`Servidor de MicheMango escuchando en http://localhost:${PUERTO}`);
});
