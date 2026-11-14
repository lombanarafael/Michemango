import AdminLogin from "./paginas/AdminLogin.jsx";
import AdminPanel from "./paginas/AdminPanel.jsx";
import Tienda from "./paginas/Tienda.jsx";

// "Enrutador" sencillo: según la dirección de la página mostramos una pantalla u otra.
// /admin/login -> formulario de ingreso, /admin -> panel, cualquier otra -> tienda.
export default function App() {
  const ruta = window.location.pathname.replace(/\/+$/, "") || "/";

  if (ruta.endsWith("/admin/login")) {
    document.title = "Ingresar | MicheMango";
    return <AdminLogin />;
  }

  if (ruta.endsWith("/admin")) {
    document.title = "Panel | MicheMango";
    return <AdminPanel />;
  }

  document.title = "MicheMango";
  return <Tienda />;
}
