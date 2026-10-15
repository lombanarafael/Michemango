const bcrypt = require("bcryptjs");

function leerContrasena(leyenda) {
  const entrada = process.stdin;
  if (!entrada.isTTY || typeof entrada.setRawMode !== "function") {
    return Promise.reject(new Error("Ejecuta este comando en una terminal interactiva."));
  }

  process.stdout.write(leyenda);
  entrada.setRawMode(true);
  entrada.setEncoding("utf8");
  entrada.resume();

  return new Promise((resolve, reject) => {
    let valor = "";

    function finalizar(error) {
      entrada.removeListener("data", recibir);
      entrada.setRawMode(false);
      entrada.pause();
      process.stdout.write("\n");
      if (error) {
        reject(error);
      } else {
        resolve(valor);
      }
    }

    function recibir(fragmento) {
      for (const caracter of fragmento) {
        if (caracter === "\u0003") {
          finalizar(new Error("Operación cancelada."));
          return;
        }
        if (caracter === "\r" || caracter === "\n") {
          finalizar();
          return;
        }
        if (caracter === "\u007f" || caracter === "\b") {
          valor = valor.slice(0, -1);
        } else {
          valor += caracter;
        }
      }
    }

    entrada.on("data", recibir);
  });
}

async function main() {
  let contrasena = "";
  let confirmacion = "";
  try {
    contrasena = await leerContrasena("Nueva contraseña (mínimo 12 caracteres): ");
    confirmacion = await leerContrasena("Repite la contraseña: ");

    if (contrasena.length < 12 || contrasena.length > 200) {
      throw new Error("La contraseña debe tener entre 12 y 200 caracteres.");
    }
    if (contrasena !== confirmacion) {
      throw new Error("Las contraseñas no coinciden.");
    }

    const hash = await bcrypt.hash(contrasena, 12);
    process.stdout.write(`${hash}\n`);
  } finally {
    contrasena = "";
    confirmacion = "";
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
