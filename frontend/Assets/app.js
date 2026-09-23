// Buscamos el contenedor donde mostraremos los productos.
const listaProductos = document.querySelector("#lista-productos");

// Convertimos un precio numérico a pesos colombianos.
function mostrarPrecio(precio) {
  return precio.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
}

// Creamos visualmente una tarjeta para cada producto.
function crearTarjetaProducto(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "producto";

  tarjeta.innerHTML = `
    <h3>${producto.nombre}</h3>
    <p>${producto.descripcion}</p>
    <h4>${mostrarPrecio(producto.precio)}</h4>
  `;

  return tarjeta;
}

// Pedimos los productos a la ruta de Express y los mostramos en la página.
async function cargarProductos() {
  try {
    const respuesta = await fetch("/api/productos");

    if (!respuesta.ok) {
      throw new Error("No se pudieron cargar los productos.");
    }

    const productos = await respuesta.json();
    listaProductos.innerHTML = "";

    productos.forEach((producto) => {
      listaProductos.appendChild(crearTarjetaProducto(producto));
    });
  } catch (error) {
    // Informamos al usuario si el backend no está iniciado o falló la solicitud.
    listaProductos.innerHTML =
      "<p>No se pudieron cargar los productos. Verifica que el servidor esté encendido.</p>";
    console.error(error);
  }
}

// Ejecutamos la carga cuando el archivo JavaScript termina de cargarse.
cargarProductos();
