import micheman from "../assets/productos/micheman.svg";
import premium from "../assets/productos/premium.svg";
import explosivo from "../assets/productos/explosivo.svg";
import mini from "../assets/productos/mini.svg";

// Ilustraciones disponibles. En la base de datos el producto guarda solo la clave
// (por ejemplo "premium") y aquí la convertimos en la imagen real.
export const IMAGENES = {
  micheman: { src: micheman, nombre: "Vaso clásico (limón y chamoy)" },
  premium: { src: premium, nombre: "Vaso premium (gomitas y fruta)" },
  explosivo: { src: explosivo, nombre: "Vaso picante (maracuyá y ají)" },
  mini: { src: mini, nombre: "Vaso mini" },
};

// Muestra la ilustración del producto. Si la clave no existe (por ejemplo un emoji
// que puso el administrador), mostramos ese texto como antes.
export default function ImagenProducto({ producto, className = "producto-foto" }) {
  const imagen = IMAGENES[producto.imagen];
  if (!imagen) {
    return <div className="producto-imagen">{producto.imagen || "🥭"}</div>;
  }
  return (
    <img
      className={className}
      src={imagen.src}
      alt={`${producto.nombre}: ${producto.descripcion}`}
      width="400"
      height="300"
      loading="lazy"
    />
  );
}
