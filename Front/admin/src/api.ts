
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach authentication token to requests.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("credence_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Clear authentication.
export function clearAuth() {
  localStorage.removeItem("credence_token");
}
