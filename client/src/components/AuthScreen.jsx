import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function AuthScreen() {
  const { loginOrRegister } = useAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await loginOrRegister(name.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card minimal-auth-card">
        <p className="brand-mark">ChattApp</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Tên của bạn</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nhập tên để vào chat"
              required
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="submit-button" type="submit" disabled={submitting}>
            {submitting ? "Đang vào phòng chat..." : "Vào chat"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthScreen;