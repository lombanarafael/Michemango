// En Netlify el sitio vive en "/", pero en GitHub Pages vive en "/Michemango/".
// Vite guarda esa base en import.meta.env.BASE_URL; con esta función los enlaces funcionan en ambos.
export function ruta(camino) {
  return import.meta.env.BASE_URL + camino.replace(/^\//, "");
}
