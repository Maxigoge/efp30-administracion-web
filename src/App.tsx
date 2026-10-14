import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { PreviewShell } from "./components/PreviewShell";
import { LoginPage } from "./components/LoginPanel";

function Application() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <main className="loading-page"><span className="loading-mark">30</span><p>Restaurando sesión segura…</p></main>;
  if (user) return <><PreviewShell user={user} onLogout={signOut} /></>;
  return <LoginPage />;
}

export default function App() {
  return <AuthProvider><Application /></AuthProvider>;
}
