

export function recomendarProducto(productos, preferencias) {
  const puntuados = productos.map((producto) => {
    // Juntamos nombre, categoría y descripción para buscar palabras clave.
    const texto = `${producto.nombre} ${producto.categoria} ${producto.descripcion}`.toLocaleLowerCase("es-CO");
    const esPequeno = /mini|pequeñ/.test(texto);
    const esGrande = /premium|explosivo/.test(texto);
    let puntos = 0;
    const razones = [];

    // Suma (o resta) puntos y, si la regla favorece al producto, guarda la razón.
    function regla(cumple, valor, razon) {
      if (!cumple) return;
      puntos += valor;
      if (valor > 0 && razon) razones.push(razon);
    }

    // 1) Sabor
    const sabor = preferencias.sabor;
    regla(sabor === "picante" && /picante|taj[ií]n|chamoy/.test(texto), 4, "tiene chamoy y tajín para el picante");
    regla(sabor === "picante" && String(producto.categoria || "").toLocaleLowerCase("es-CO") === "picante", 2);
    regla(sabor === "dulce" && /dulce|gomitas|fruta|premium/.test(texto), 3, "es dulce");
    regla(sabor === "acido" && /lim[oó]n|maracuy[aá]|[aá]cid/.test(texto), 3, "tiene un toque ácido");
    regla(sabor === "refrescante" && /fresco|refrescante|lim[oó]n/.test(texto), 3, "es refrescante");

    // 2) Tamaño
    const tamano = preferencias.tamano;
    regla(tamano === "pequeno", esPequeno ? 4 : -1, "es una porción pequeña");
    regla(tamano === "mediano", esPequeno ? -2 : esGrande ? 1 : 3, esGrande ? "" : "es de tamaño mediano");
    regla(tamano === "grande", esGrande ? 4 : -1, "es una porción grande");

    // 3) Ocasión
    const ocasion = preferencias.ocasion;
    regla(ocasion === "celebracion" && esGrande, 3, "es ideal para celebrar");
    regla(ocasion === "compartir" && esGrande, 2, "rinde para compartir");
    regla(ocasion === "regalo" && esGrande, 3, "es un buen regalo");
    regla(ocasion === "antojo" && (esPequeno || /cl[aá]sico/.test(texto)), 2, "es perfecto para un antojo");

    return { producto, puntos, razones };
  });

  // Ordenamos de mayor a menor puntaje (si empatan, primero el más barato) y devolvemos el primero.
  puntuados.sort((a, b) => b.puntos - a.puntos || a.producto.precio - b.producto.precio);
  const mejor = puntuados[0];
  if (!mejor) return null;
  return { producto: mejor.producto, razones: mejor.razones };
}

// Convierte las razones en una frase: "Te lo recomendamos porque es dulce y es un buen regalo."
export function explicarRazones(razones) {
  if (!razones.length) return "Es la opción más económica que se acerca a lo que buscas.";
  const lista = razones.length === 1
    ? razones[0]
    : `${razones.slice(0, -1).join(", ")} y ${razones[razones.length - 1]}`;
  return `Te lo recomendamos porque ${lista}.`;
}
