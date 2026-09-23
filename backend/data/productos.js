// Este arreglo contiene los productos que ofrece el emprendimiento.
// Al estar en un archivo separado, server.js queda más ordenado.
const productos = [
  {
    id: 1,
    nombre: "Micheman",
    precio: 15000,
    descripcion: "Mango fresco, limón y chamoy."
  },
  {
    id: 2,
    nombre: "Miche Premium",
    precio: 18000,
    descripcion: "Mango, gomitas, tajín y frutas."
  },
  {
    id: 3,
    nombre: "Miche Tropical",
    precio: 20000,
    descripcion: "Mango, piña, maracuyá y un toque de chamoy."
  }
];

// Exportamos el arreglo para poder usarlo desde server.js.
module.exports = productos;
