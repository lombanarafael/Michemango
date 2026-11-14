import AdminLogin from "./AdminLogin.jsx";
import AdminPanel from "./AdminPanel.jsx";
import Storefront from "./Storefront.jsx";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (/^\/admin\/login(?:\.html)?$/.test(path)) {
    document.title = "Ingresar | MicheMango";
    return <AdminLogin />;
  }

  if (/^\/admin(?:\/panel(?:\.html)?)?$/.test(path)) {
    document.title = "Solicitudes | MicheMango";
    return <AdminPanel />;
  }

  document.title = "MicheMango";
  return <Storefront />;
}
