import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

export const setToken = (token?: string | null) => {
  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
  }
};
