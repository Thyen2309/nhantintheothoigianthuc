import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "chatapp_auth";

const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { user: null, token: null };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
  }, [authState]);

  const authRequest = async (endpoint, payload) => {
    const response = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.message || "Máy chủ hiện không phản hồi. Hãy kiểm tra backend.");
    }

    if (!data?.token || !data?.user) {
      throw new Error("Phản hồi từ máy chủ không hợp lệ.");
    }

    setAuthState({
      user: data.user,
      token: data.token,
    });
  };

  const login = (payload) => authRequest("login", payload);
  const register = (payload) => authRequest("register", payload);

  const loginOrRegister = async (name) => {
    const payload = {
      name,
      password: "chatapp-demo-password",
    };

    try {
      await login(payload);
    } catch (_error) {
      await register(payload);
    }
  };

  const logout = () => {
    setAuthState({ user: null, token: null });
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        login,
        register,
        loginOrRegister,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}