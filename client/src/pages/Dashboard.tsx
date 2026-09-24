import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const response = await api.get("/auth/me");

      setUser(response.data.user);
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      navigate("/");
    }
  }

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h2>Prorich Delegation Management</h2>
        </div>

        <div className="user-area">
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>

          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-content">

        <button
  className="primary-button"
  onClick={() => navigate("/tasks")}
>
  Open Task Management
</button>
        <h1>Welcome, {user?.name}</h1>

        <p>Your role: <strong>{user?.role}</strong></p>

        <div className="dashboard-card">
          <h3>Delegation Management V2</h3>
          <p>
            Login and database connectivity are working successfully.
          </p>
        </div>
      </main>
    </div>
  );
}