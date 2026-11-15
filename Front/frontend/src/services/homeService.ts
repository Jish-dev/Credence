
import { api } from "../api";

export interface Home {
    _id: string;
    name: string;
    address: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface HomesResponse {
    success: boolean;
    count: number;
    homes: Home[];
}

interface HomeResponse {
    success: boolean;
    message: string;
    home: Home;
}

interface QRResponse {
    success: boolean;
    message: string;
    passportUrl: string;
}

interface ActionResponse {
    success: boolean;
    message: string;
}

// Get customer's homes
export const getMyHomes = async (): Promise<Home[]> => {
    const response = await api.get<HomesResponse>("/homes/my-homes");
    return response.data.homes;
};

// Create a new home
export const createHome = async (
    name: string,
    address: string
): Promise<void> => {
    await api.post("/homes", { name, address });
};
// Get home's QR passport URL
export const getHomeQR = async (
    homeId: string
): Promise<string> => {
    const response = await api.get<QRResponse>(
        `/homes/${homeId}/qr`
    );

    return response.data.passportUrl;
};

// Deactivate home passport
export const deactivateHome = async (
    homeId: string
): Promise<string> => {
    const response = await api.patch<ActionResponse>(
        `/homes/${homeId}/deactivate`
    );

    return response.data.message;
};

export const deleteHome = async (homeId: string): Promise<string> => {
  const response = await api.delete<ActionResponse>(`/homes/${homeId}`);
  return response.data.message;
};