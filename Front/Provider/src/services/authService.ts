import api from "./api";
import type { AuthResponse } from "../types/auth";
import axios from "axios";


export const providerLogin = async (
  data: { email: string; password: string }
): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>(
      "/provider-auth/login",
      data
    );

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 403) {
        throw new Error("PROVIDER_NOT_APPROVED");
      }

      throw new Error(message || "Login failed.");
    }

    throw error;
  }
};

export const providerRegister = async (data: Record<string, unknown>) => {
  const response = await api.post(
    "/provider-auth/register",
    data
  );

  return response.data;
};