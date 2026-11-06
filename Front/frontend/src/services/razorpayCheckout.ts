
import {
  createPaymentOrder,
  verifyPayment,
} from "./paymentService";

import type { User } from "../api";
import type {
  RazorpayOptions,
  RazorpaySuccessResponse,
} from "../types/razorpay";

export const startRazorpayPayment = async (
  bookingId: string,
  user: User
): Promise<string> => {
  // 1. Create order on backend
  const orderResponse = await createPaymentOrder(bookingId);
  const order = orderResponse.data;

  // 2. Check Razorpay SDK
  if (!window.Razorpay) {
    throw new Error(
      "Razorpay Checkout SDK not loaded. Please refresh the page."
    );
  }

  // 3. Configure checkout
  return new Promise((resolve, reject) => {
    let paymentCompleted = false;

    const options: RazorpayOptions = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "CREDENCE",
      description: "Service Booking Payment",
      order_id: order.razorpayOrderId,

      prefill: {
        name: user.name,
        email: user.email,
        contact: user.phone || "",
      },

      theme: {
        color: "#047857",
      },

      handler: async (
        response: RazorpaySuccessResponse
      ) => {
        try {
          // 4. Verify payment on backend
          const result = await verifyPayment(response);

          paymentCompleted = true;
          resolve(result.message || "Payment successful!");
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error("Payment verification failed")
          );
        }
      },
    };

    // 5. Open Razorpay Checkout
    const checkout = new window.Razorpay(options);

    // Handle payment failure
    checkout.on("payment.failed", (response: unknown) => {
      if (paymentCompleted) return;

      const failure = response as {
        error?: {
          description?: string;
          reason?: string;
        };
      };

      reject(
        new Error(
          failure.error?.description ||
            failure.error?.reason ||
            "Payment failed. Please try again."
        )
      );
    });

    checkout.open();
  });
};
