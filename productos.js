// Este arreglo contiene los productos que la API va a compartir en formato JSON.
const productos = [
  {
    id: 1,
    nombre: "Micheman",
    precio: 15000,
    descripcion:
      "Mango fresco, limón y chamoy: una combinación intensa y refrescante.",
  },
  {
    id: 2,
    nombre: "Miche Premium",
    precio: 18000,
    descripcion:
      "Mango con gomitas, tajín y frutas para una experiencia más completa.",
  },
  {
    id: 3,
    nombre: "Mango Explosivo",
    precio: 20000,
    descripcion:
      "Mango, maracuyá, chamoy y tajín en una mezcla tropical, ácida y picante.",
  },
];

// Permitimos que server.js importe y use este arreglo.
module.exports = productos;
