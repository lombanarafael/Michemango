require("dotenv").config();

const {
  inicializarAlmacenamiento,
  cerrarAlmacenamiento,
  modoAlmacenamiento,
} = require("../data/storage");

inicializarAlmacenamiento()
  .then(() => {
    console.log(`Esquema inicializado correctamente (${modoAlmacenamiento()}).`);
  })
  .catch((error) => {
    console.error("No se pudo inicializar el almacenamiento.", error.code || error.name);
    process.exitCode = 1;
  })
  .finally(() => cerrarAlmacenamiento().catch((error) => {
    console.error("No se pudo cerrar el almacenamiento.", error.code || error.name);
    process.exitCode = 1;
  }));
