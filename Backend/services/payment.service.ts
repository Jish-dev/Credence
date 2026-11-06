
import crypto from "node:crypto";

import razorpay from "../config/razorpay.js";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

// ========================================
// CREATE RAZORPAY PAYMENT ORDER
// ========================================

export async function createPaymentOrder(
  bookingId: string,
  userId: string
) {
  const booking = await Booking.findById(bookingId);

  if (!booking || String(booking.customer) !== userId) {
    throw Object.assign(
      new Error("Booking not found"),
      { statusCode: 404 }
    );
  }

  if (booking.paymentStatus === "paid") {
    throw Object.assign(
      new Error("Booking is already paid"),
      { statusCode: 400 }
    );
  }

  if (!razorpay) {
    throw Object.assign(
      new Error("Razorpay credentials are not configured"),
      { statusCode: 503 }
    );
  }

  const order = await razorpay.orders.create({
    amount: Math.round(booking.amount * 100),
    currency: "INR",
    receipt: `booking_${booking.id}`,
  });

  const payment = await Payment.create({
    booking: booking.id,
    customer: userId,
    amount: booking.amount,
    currency: "INR",
    razorpayOrderId: order.id,
    status: "created",
  });

  return {
    order,
    payment,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

// ========================================
// VERIFY RAZORPAY PAYMENT
// ========================================

export async function verifyPayment(
  input: {
    orderId: string;
    paymentId: string;
    signature: string;
  },
  userId: string
) {
  const payment = await Payment.findOne({
    razorpayOrderId: input.orderId,
    customer: userId,
  });

  if (!payment) {
    throw Object.assign(
      new Error("Payment record not found"),
      { statusCode: 404 }
    );
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    throw Object.assign(
      new Error("Razorpay secret is not configured"),
      { statusCode: 503 }
    );
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(input.signature, "hex");

  const signatureValid =
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

  if (!signatureValid) {
    throw Object.assign(
      new Error("Payment signature verification failed"),
      { statusCode: 400 }
    );
  }

  if (payment.status === "paid") {
    return payment;
  }

  payment.razorpayPaymentId = input.paymentId;
  payment.razorpaySignature = input.signature;
  payment.signatureVerified = true;
  payment.status = "paid";

  await payment.save();

  await Booking.findByIdAndUpdate(payment.booking, {
    paymentStatus: "paid",
    paidAt: new Date(),
    paymentId: payment._id,
  });

  return payment;
}
