import {
  useNavigate,
} from "react-router-dom";

import api from "../services/api";

import "./AppHeader.css";

export default function AppHeader() {
  const navigate =
    useNavigate();

  async function logout() {
    try {
      await api.post(
        "/auth/logout"
      );
    } finally {
      navigate("/");
    }
  }

  return (
    <header className="app-fixed-header">

      <div
        className="app-header-brand"
        onClick={() =>
          navigate(
            "/dashboard"
          )
        }
      >

        <div className="app-header-logo">

          <img
            src="/prorich-mark.png"
            alt="Prorich Agro"
          />

        </div>

        <div className="app-header-brand-text">

          <strong>
            Delegation Management
          </strong>

          <span>
            Prorich Agro Pvt Ltd
          </span>

        </div>

      </div>

      <button
        className="header-logout"
        onClick={logout}
      >
        Logout
      </button>

    </header>
  );
}