import { useMemo, useState } from "react";

type Role = "ADMINISTRATIVO" | "ENTRENADOR";

type LoginResponse = {
  _id: string;
  username: string;
  dni: number;
  role: Role;
};

export default function Login() {
  const API_BASE = useMemo(() => "http://localhost:3000", []);

  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!dni.trim() || !password.trim()) {
      setError("Completá DNI y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: Number(dni), password })
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        setError(data?.message || "No se pudo iniciar sesión.");
        return;
      }

      const user = data as LoginResponse;

      // Guardamos sesión simple
      localStorage.setItem("user", JSON.stringify(user));

      // Más adelante: navegar a pantalla usuarios
      // por ahora lo dejamos con un alert, o podés hacer navigate("/users")
      alert(`Bienvenido ${user.username} (${user.role})`);
    } catch {
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Fondo con imagen a la derecha (detrás de la card) */}
      <div style={styles.rightBg} />

      <div style={styles.layout}>
        {/* Lado izquierdo */}
        <div style={styles.left}>
          <div style={styles.brand}></div>
          <h1 style={styles.title}>Sistema de gestión y control</h1>
          <p style={styles.subtitle}>
            Una plataforma integral para la gestión de tu gimnasio.
          </p>
        </div>

        {/* Card login */}
        <div style={styles.cardWrap}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Iniciar sesión</h2>
            <p style={styles.cardHint}>Ingresá tu DNI y contraseña.</p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>DNI</label>
              <input
                style={styles.input}
                placeholder="Ej: 34567890"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />

              <label style={styles.label}>Contraseña</label>
              <input
                style={styles.input}
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && <div style={styles.error}>{error}</div>}

              <button style={styles.button} disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    background: "#f6f9ff",
    overflow: "hidden"
  },
  rightBg: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "50%",
    height: "100%",
    backgroundImage: `linear-gradient(rgba(246, 249, 255, 0.02), rgba(246, 249, 255, 0.4)), url("/gym-bg.jpg")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "saturate(1.05)",
    zIndex: 0
  },
  layout: {
    position: "relative",
    zIndex: 1,
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    alignItems: "center",
    gap: 24,
    padding: "48px 64px"
  },
  left: {
    maxWidth: 560
  },
  brand: {
    color: "#023e8a",
    fontWeight: 800,
    letterSpacing: 0.3,
    fontSize: 18,
    marginBottom: 18
  },
  title: {
    margin: 0,
    fontSize: 48,
    lineHeight: 1.1,
    color: "#03045e",
    letterSpacing: -0.5
  },
  subtitle: {
    marginTop: 14,
    marginBottom: 0,
    fontSize: 16,
    lineHeight: 1.5,
    color: "#334155",
    maxWidth: 420
  },
  cardWrap: {
    display: "flex",
    justifyContent: "flex-end"
  },
  card: {
    width: "100%",
    maxWidth: 460,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(2,62,138,0.15)",
    borderRadius: 16,
    padding: 28,
    boxShadow: "0 20px 60px rgba(3,4,94,0.15)",
    backdropFilter: "blur(6px)"
  },
  cardTitle: {
    margin: 0,
    color: "#03045e",
    fontSize: 22,
    fontWeight: 800
  },
  cardHint: {
    marginTop: 6,
    marginBottom: 18,
    color: "#475569",
    fontSize: 13
  },
  form: {
    display: "grid",
    gap: 10
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#023e8a",
    marginTop: 6
  },
  input: {
    height: 42,
    borderRadius: 10,
    border: "1px solid rgba(0,119,182,0.25)",
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    background: "white"
  },
  button: {
    marginTop: 14,
    height: 44,
    borderRadius: 12,
    border: "none",
    background: "#0077b6",
    color: "white",
    fontWeight: 800,
    cursor: "pointer"
  },
  error: {
    marginTop: 6,
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.2)",
    color: "#991b1b",
    fontSize: 13
  }
};
