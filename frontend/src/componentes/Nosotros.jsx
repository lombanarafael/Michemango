// Sección "¿Quiénes somos?": la historia del emprendimiento.
export default function Nosotros() {
  return (
    <section id="nosotros">
      <h2>¿Quiénes somos?</h2>
      <div className="nosotros-grid">
        <div>
          <p>
            Somos un emprendimiento barranquillero apasionado por transformar
            el mango en momentos de alegría. En MicheMango combinamos fruta
            fresca, ingredientes de calidad y preparaciones hechas al momento
            para que cada vaso tenga un sabor único.
          </p>
          <p>
            Nos encanta crear mezclas dulces, ácidas y picantes que se
            adapten a todos los gustos. Ya sea para compartir con amigos,
            celebrar una ocasión especial o simplemente darte un gusto,
            aquí siempre encontrarás una miche preparada con cariño.
          </p>
        </div>
        <div className="nosotros-destacado">
          <strong>¡Más que una preparación!</strong>
          <span>Una experiencia tropical, fresca y muy nuestra.</span>
        </div>
      </div>
    </section>
  );
}
