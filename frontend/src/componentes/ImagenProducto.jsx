import micheman from "../assets/productos/micheman.jpg";
import premium from "../assets/productos/premium.jpg";
import explosivo from "../assets/productos/explosivo.jpg";
import mini from "../assets/productos/mini.jpg";

// Fotos disponibles (tomadas de nuestro afiche promocional). En la base de datos el producto
// guarda solo la clave (por ejemplo "premium") y aquí la convertimos en la foto.
export const IMAGENES = {
  micheman: { src: micheman, nombre: "Foto: miche escarchada con mango" },
  premium: { src: premium, nombre: "Foto: frutas picadas con tajín" },
  explosivo: { src: explosivo, nombre: "Foto: mango rayado con chamoy" },
  mini: { src: mini, nombre: "Foto: mango fresco picado" },
};

// Muestra la foto del producto. Si la clave no existe (por ejemplo un emoji
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
