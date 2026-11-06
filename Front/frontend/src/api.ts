
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to protected requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("credence_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Normalize API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong. Please try again.";

    return Promise.reject(new Error(message));
  },
);

// Clear authentication token
export const clearAuth = () => {
  localStorage.removeItem("credence_token");
};

// ==============================
// USER
// ==============================

export type User = {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "admin";
  favorites?: string[];
};

// ==============================
// PROVIDER
// ==============================

export type Provider = {
  _id: string;
  name: string;
  title: string;
  category: string;
  categories: string[];
  providerType: "individual" | "business" | "company";
  location: string;
  city: string;
  area: string;
  address: string;
  experienceYears: number;
  bio: string;
  description: string;
  contact: string;
  contactPhone: string;
  email: string;
  startingPrice: number;
  profileImage: string;
  status: "draft" | "published";
  verificationStatus: "pending" | "verified" | "rejected";
  averageRating: number;
  reviewCount: number;
  isAvailable: boolean;
};

// ==============================
// BOOKING
// ==============================

export type Booking = {
  _id: string;
  provider: Provider | string;
  serviceName: string;
  description: string;
  bookingDate: string;
  bookingTime: string;
  location: string;
  contactPhone: string;
  amount: number;
  status:
    | "pending"
    | "confirmed"
    | "in-progress"
    | "completed"
    | "cancelled"
    | "rejected";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  createdAt: string;
};

// ==============================
// NOTIFICATION
// ==============================

export type Notification = {
  _id: string;
  user: string;
  title: string;
  body: string;
  type: string;
  data: {
    bookingId?: string;
    bookingStatus?: string;
    [key: string]: unknown;
  };
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

// ==============================
// API RESPONSE TYPES
// ==============================

export type NotificationResponse = {
  success: boolean;
  message: string;
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export type UnreadCountResponse = {
  success: boolean;
  unreadCount: number;
};
