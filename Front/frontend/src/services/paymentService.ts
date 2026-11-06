
import { api } from "../api";
import type { RazorpaySuccessResponse } from "../types/razorpay";
export interface CreateOrderResponse {
  success: boolean;
  message: string;
  data: {
    paymentId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
}

export const createPaymentOrder = async (
  bookingId: string
): Promise<CreateOrderResponse> => {
  const response = await api.post<CreateOrderResponse>(
    "/v1/payments/create-order",
    { bookingId }
  );

  return response.data;
};

export const verifyPayment = async (
  paymentResponse: RazorpaySuccessResponse
): Promise<VerifyPaymentResponse> => {
  const response = await api.post<VerifyPaymentResponse>(
    "/v1/payments/verify",
    paymentResponse
  );

  return response.data;
};
