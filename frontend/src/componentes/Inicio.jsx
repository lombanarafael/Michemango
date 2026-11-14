import fotoPortada from "../assets/productos/micheman.jpg";

// Portada (landing): marca, mensaje principal, botones y una foto que llame la atención.
export default function Inicio() {
  return (
    <section id="inicio">
      <div className="inicio-texto">
        <span className="hero-badge">Sabor tropical en cada preparación</span>
        <h2>¡Bienvenidos a <span className="resaltado">MicheMango</span>!</h2>
        <p>
          Disfruta el auténtico sabor del mango en una deliciosa miche preparada
          con ingredientes frescos, combinaciones irresistibles y ese toque
          colombiano que convierte cada momento en una celebración.
        </p>
        <div className="inicio-botones">
          <a className="button-link" href="#productos">Ver productos</a>
          <a className="button-link button-link--claro" href="#pedido">Armar mi pedido</a>
        </div>
        <div className="beneficios" aria-label="Lo que nos diferencia">
          <span>🥭 Mango fresco</span>
          <span>✨ Preparación artesanal</span>
          <span>💛 Hecho con amor</span>
        </div>
      </div>

      <div className="inicio-foto">
        <img src={fotoPortada} alt="Miche de mango escarchada con chamoy y tajín" width="800" height="600" />
        <span className="sticker">¡Hecho en Barranquilla!</span>
      </div>
    </section>
  );
}
