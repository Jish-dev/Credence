export interface ProviderUser {
  id: string;
  name: string;
  email: string;
  role: "provider";
  providerApprovalStatus: "pending" | "approved" | "rejected";
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: ProviderUser;
}