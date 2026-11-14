// Recomendador de MicheMango: un sistema por reglas (no es un modelo generativo).
// A cada producto le damos puntos según el sabor, el tamaño y la ocasión que eligió la persona,
// y recomendamos el que más puntos sume. Si hay empate, gana el más económico.

export function recomendarProducto(productos, preferencias) {
  const puntuados = productos.map((producto) => {
    // Juntamos nombre, categoría y descripción para buscar palabras clave.
    const texto = `${producto.nombre} ${producto.categoria} ${producto.descripcion}`.toLocaleLowerCase("es-CO");
    let puntos = 0;

    // 1) Sabor
    if (preferencias.sabor === "picante" && /picante|taj[ií]n|chamoy/.test(texto)) puntos += 4;
    if (preferencias.sabor === "picante" && String(producto.categoria || "").toLocaleLowerCase("es-CO") === "picante") puntos += 2;
    if (preferencias.sabor === "dulce" && /dulce|gomitas|fruta|premium/.test(texto)) puntos += 3;
    if (preferencias.sabor === "acido" && /lim[oó]n|maracuy[aá]|[aá]cid/.test(texto)) puntos += 3;
    if (preferencias.sabor === "refrescante" && /fresco|refrescante|lim[oó]n/.test(texto)) puntos += 3;

    // 2) Tamaño
    const esPequeno = /mini|pequeñ/.test(texto);
    const esGrande = /premium|explosivo/.test(texto);
    if (preferencias.tamano === "pequeno") puntos += esPequeno ? 4 : -1;
    if (preferencias.tamano === "mediano") puntos += esPequeno ? -2 : esGrande ? 1 : 3;
    if (preferencias.tamano === "grande") puntos += esGrande ? 4 : -1;

    // 3) Ocasión
    if (preferencias.ocasion === "celebracion") puntos += esGrande ? 3 : 0;
    if (preferencias.ocasion === "compartir") puntos += esGrande ? 2 : 0;
    if (preferencias.ocasion === "regalo") puntos += esGrande ? 3 : 0;
    if (preferencias.ocasion === "antojo") puntos += esPequeno || /cl[aá]sico/.test(texto) ? 2 : 0;

    return { producto, puntos };
  });

  // Ordenamos de mayor a menor puntaje y devolvemos el primero.
  puntuados.sort((a, b) => b.puntos - a.puntos || a.producto.precio - b.producto.precio);
  return puntuados[0]?.producto;
}
