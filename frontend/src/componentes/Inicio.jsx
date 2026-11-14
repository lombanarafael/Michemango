// Portada (landing): marca, mensaje principal y botón hacia el catálogo.
export default function Inicio() {
  return (
    <section id="inicio">
      <span className="hero-badge">Sabor tropical en cada preparación</span>
      <h2>¡Bienvenidos a MicheMango!</h2>
      <p>
        Disfruta el auténtico sabor del mango en una deliciosa miche preparada
        con ingredientes frescos, combinaciones irresistibles y ese toque
        colombiano que convierte cada momento en una celebración.
      </p>
      <a className="button-link" href="#productos">Ver productos</a>
      <div className="beneficios" aria-label="Lo que nos diferencia">
        <span>🥭 Mango fresco</span>
        <span>✨ Preparación artesanal</span>
        <span>💛 Hecho con amor</span>
      </div>
    </section>
  );
}
