
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import crypto from "crypto";

import razorpay from "../config/razorpay.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";

// ========================================
// VALIDATION HELPERS
// ========================================

const createPaymentValidation = (bookingId: string) =>
  mongoose.Types.ObjectId.isValid(bookingId);

const verifySignature = (
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
) => {
  const generated = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();

  const received = Buffer.from(signature, "hex");

  return (
    received.length === generated.length &&
    crypto.timingSafeEqual(received, generated)
  );
};

const verifyWebhookSignature = (
  body: Buffer,
  signature: string,
  secret: string
) => {
  const generated = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest();

  const received = Buffer.from(signature, "hex");

  return (
    received.length === generated.length &&
    crypto.timingSafeEqual(received, generated)
  );
};

// ========================================
// RAZORPAY ORDER VERIFICATION
// ========================================

const fetchAndVerifyRazorpayOrder = async (
  orderId: string,
  expectedAmount: number,
  expectedCurrency: string
) => {
  const order = await razorpay.orders.fetch(orderId);

  console.log("CREDENCE RAZORPAY ORDER CHECK:", {
    orderId: order.id,
    status: order.status,
    amount: order.amount,
    amountDue: order.amount_due,
    currency: order.currency,
    expectedAmount,
    expectedCurrency,
    keyPrefix: process.env.RAZORPAY_KEY_ID?.slice(0, 12),
  });

  if (order.id !== orderId) {
    throw new Error("Razorpay returned an unexpected order ID");
  }

  if (
    order.amount !== expectedAmount ||
    order.currency !== expectedCurrency
  ) {
    throw new Error(
      "Razorpay order amount or currency does not match the payment record"
    );
  }

  return order;
};

// ========================================
// CREATE RAZORPAY ORDER
// ========================================

export const createPaymentOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.user?.id;
    const { bookingId } = req.body;

    const keyId = process.env.RAZORPAY_KEY_ID;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!keyId) {
      throw new Error("RAZORPAY_KEY_ID is not configured");
    }

    if (
      typeof bookingId !== "string" ||
      !createPaymentValidation(bookingId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid booking ID is required",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      customer: customerId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Payment is allowed only after customer confirms completion.
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment is available only after service completion",
      });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "This booking has already been paid",
      });
    }

    const successfulPayment = await Payment.findOne({
      booking: booking._id,
      status: "paid",
    });

    if (successfulPayment) {
      return res.status(400).json({
        success: false,
        message: "This booking has already been paid",
      });
    }

    // ====================================
    // VALIDATE BOOKING AMOUNT
    // ====================================

    const bookingAmount = Number(booking.amount);
    const amountInPaise = Math.round(bookingAmount * 100);

    if (
      !Number.isFinite(bookingAmount) ||
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking payment amount",
      });
    }

    // ====================================
    // CHECK EXISTING PAYMENT ORDER
    // ====================================

    const existingPayment = await Payment.findOne({
      booking: booking._id,
      customer: customerId,
      status: "created",
    }).sort({ createdAt: -1 });

    if (existingPayment) {
      console.log(
        "CREDENCE: Existing payment order found:",
        existingPayment.razorpayOrderId
      );

      try {
        const verifiedOrder = await fetchAndVerifyRazorpayOrder(
          existingPayment.razorpayOrderId,
          existingPayment.amount,
          existingPayment.currency
        );

        // Never create another order if Razorpay says this order
        // has already been paid.
        if (verifiedOrder.status === "paid") {
          return res.status(409).json({
            success: false,
            message:
              "This Razorpay order is already paid. Please refresh your bookings and check payment status.",
          });
        }

        // Reuse only an active, unpaid order.
        if (verifiedOrder.status === "created") {
          // Also ensure this order matches the current booking amount.
          if (
            verifiedOrder.amount !== amountInPaise ||
            verifiedOrder.currency !== "INR"
          ) {
            throw new Error(
              "Existing order does not match the current booking amount"
            );
          }

          return res.status(200).json({
            success: true,
            message: "Existing payment order verified",
            data: {
              paymentId: existingPayment._id,
              razorpayOrderId: verifiedOrder.id,
              amount: verifiedOrder.amount,
              currency: verifiedOrder.currency,
              keyId,
            },
          });
        }

        throw new Error(
          `Existing Razorpay order is not usable. Status: ${verifiedOrder.status}`
        );
      } catch (error) {
        console.error(
          "CREDENCE EXISTING ORDER VERIFICATION FAILED:",
          error
        );

        // Mark the unusable attempt as failed so it is not reused.
        // A new order will be created below.
        existingPayment.status = "failed";
        existingPayment.failureReason =
          error instanceof Error
            ? error.message
            : "Existing Razorpay order could not be verified";

        await existingPayment.save();

        console.log(
          "CREDENCE: Old payment attempt marked as failed. Creating a new order."
        );
      }
    }

    // ====================================
    // CREATE NEW PAYMENT ORDER
    // ====================================

    console.log("CREDENCE: Creating new Razorpay order:", {
      bookingId: booking._id.toString(),
      amount: amountInPaise,
      currency: "INR",
      keyPrefix: keyId.slice(0, 12),
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `booking_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        customerId,
      },
    });

    console.log("CREDENCE: Razorpay order created:", {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: razorpayOrder.status,
    });

    // Verify the newly created order using the same credentials.
    const verifiedOrder = await fetchAndVerifyRazorpayOrder(
      razorpayOrder.id,
      amountInPaise,
      "INR"
    );

    if (verifiedOrder.status !== "created") {
      throw new Error(
        `New Razorpay order is not usable. Status: ${verifiedOrder.status}`
      );
    }

    // ====================================
    // SAVE PAYMENT RECORD
    // ====================================

    const payment = await Payment.create({
      customer: customerId,
      booking: booking._id,
      razorpayOrderId: verifiedOrder.id,
      amount: Number(verifiedOrder.amount),
      currency: verifiedOrder.currency,
      status: "created",
      signatureVerified: false,
    });

    // ====================================
    // UPDATE BOOKING PAYMENT DETAILS
    // ====================================

    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        customer: customerId,
        status: "completed",
        paymentStatus: { $in: ["pending", "failed"] },
      },
      {
        $set: {
          paymentStatus: "pending",
          paymentId: payment._id,
          paidAt: null,
        },
      },
      { new: true }
    );

    if (!updatedBooking) {
      await Payment.deleteOne({ _id: payment._id });

      return res.status(400).json({
        success: false,
        message: "Booking is no longer eligible for payment",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Payment order created and verified successfully",
      data: {
        paymentId: payment._id,
        razorpayOrderId: verifiedOrder.id,
        amount: verifiedOrder.amount,
        currency: verifiedOrder.currency,
        keyId,
      },
    });
  } catch (error) {
    console.error("CREDENCE CREATE PAYMENT ORDER ERROR:", error);
    next(error);
  }
};

// ========================================
// VERIFY RAZORPAY PAYMENT
// ========================================

export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let session: mongoose.ClientSession | undefined;

  try {
    const customerId = req.user?.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !/^[a-f0-9]{64}$/i.test(razorpay_signature)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid payment verification details are required",
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured");
    }

    const paymentRecord = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      customer: customerId,
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Verify Checkout signature.
    if (
      !verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        secret
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Verify actual payment details with Razorpay.
    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      razorpayPayment.status !== "captured" ||
      razorpayPayment.amount !== paymentRecord.amount ||
      razorpayPayment.currency !== paymentRecord.currency
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details could not be verified",
      });
    }

    session = await mongoose.startSession();

    let alreadyProcessed = false;

    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: paymentRecord._id,
        customer: customerId,
      }).session(session!);

      if (!payment) {
        throw new Error("Payment record not found");
      }

      const booking = await Booking.findOne({
        _id: payment.booking,
        customer: customerId,
      }).session(session!);

      if (!booking) {
        throw new Error("Related booking not found");
      }

      // Idempotency: same successful payment should not be processed twice.
      if (
        payment.status === "paid" &&
        payment.razorpayPaymentId === razorpay_payment_id &&
        booking.paymentStatus === "paid" &&
        booking.paymentId?.toString() === payment._id.toString()
      ) {
        alreadyProcessed = true;
        return;
      }

      if (
        payment.status !== "created" &&
        payment.status !== "failed"
      ) {
        throw new Error(
          `Payment cannot be processed. Current status: ${payment.status}`
        );
      }

      if (booking.status !== "completed") {
        throw new Error("Booking is not completed");
      }

      if (booking.paymentStatus === "paid") {
        throw new Error("Booking has already been paid");
      }

      const duplicatePayment = await Payment.findOne({
        razorpayPaymentId: razorpay_payment_id,
        _id: { $ne: payment._id },
      }).session(session!);

      if (duplicatePayment) {
        throw new Error("Razorpay payment ID is already linked");
      }

      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = "paid";
      payment.signatureVerified = true;
      payment.method = razorpayPayment.method || "";
      payment.failureReason = "";

      await payment.save({ session: session! });

      // Update payment fields only.
      // Do not change booking.status here.
      booking.paymentStatus = "paid";
      booking.paymentId = payment._id;
      booking.paidAt = new Date();

      await booking.save({ session: session! });
    });

    return res.status(200).json({
      success: true,
      message: alreadyProcessed
        ? "Payment already verified"
        : "Payment verified successfully",
      data: {
        paymentId: paymentRecord._id,
        razorpayPaymentId: razorpay_payment_id,
        paymentStatus: "paid",
        bookingPaymentStatus: "paid",
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
      },
    });
  } catch (error) {
    next(error);
  } finally {
    if (session) {
      await session.endSession().catch(console.error);
    }
  }
};

// ========================================
// RAZORPAY WEBHOOK
// ========================================

export const handleRazorpayWebhook = async (
  req: Request,
  res: Response
) => {
  let session: mongoose.ClientSession | undefined;

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        message: "Webhook configuration error",
      });
    }

    // Webhook route must use express.raw().
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook body",
      });
    }

    const signature = req.headers["x-razorpay-signature"];

    if (typeof signature !== "string") {
      return res.status(400).json({
        success: false,
        message: "Webhook signature is missing",
      });
    }

    if (!verifyWebhookSignature(req.body, signature, webhookSecret)) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    // Parse only after verifying the original raw body.
    const event = JSON.parse(req.body.toString("utf8"));
    const eventType = event.event as string;

    if (
      eventType !== "payment.captured" &&
      eventType !== "payment.failed"
    ) {
      return res.status(200).json({
        success: true,
        message: "Webhook event ignored",
      });
    }

    const razorpayPayment = event.payload?.payment?.entity;

    if (
      !razorpayPayment ||
      typeof razorpayPayment.id !== "string" ||
      typeof razorpayPayment.order_id !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment event payload",
      });
    }

    const paymentRecord = await Payment.findOne({
      razorpayOrderId: razorpayPayment.order_id,
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (
      razorpayPayment.amount !== paymentRecord.amount ||
      razorpayPayment.currency !== paymentRecord.currency
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment amount or currency mismatch",
      });
    }

    session = await mongoose.startSession();

    let alreadyProcessed = false;

    await session.withTransaction(async () => {
      const payment = await Payment.findById(
        paymentRecord._id
      ).session(session!);

      if (!payment) {
        throw new Error("Payment record not found");
      }

      const booking = await Booking.findById(
        payment.booking
      ).session(session!);

      if (!booking) {
        throw new Error("Related booking not found");
      }

      // ------------------------------------
      // PAYMENT CAPTURED
      // ------------------------------------

      if (eventType === "payment.captured") {
        if (
          payment.status === "paid" &&
          payment.razorpayPaymentId === razorpayPayment.id &&
          booking.paymentStatus === "paid" &&
          booking.paymentId?.toString() === payment._id.toString()
        ) {
          alreadyProcessed = true;
          return;
        }

        if (
          payment.status !== "created" &&
          payment.status !== "failed"
        ) {
          throw new Error("Payment is not eligible for capture");
        }

        if (booking.status !== "completed") {
          throw new Error("Booking is not completed");
        }

        if (booking.paymentStatus === "paid") {
          throw new Error("Booking is already paid through another payment");
        }

        const duplicatePayment = await Payment.findOne({
          razorpayPaymentId: razorpayPayment.id,
          _id: { $ne: payment._id },
        }).session(session!);

        if (duplicatePayment) {
          throw new Error("Razorpay payment ID is already linked");
        }

        payment.razorpayPaymentId = razorpayPayment.id;
        payment.status = "paid";
        payment.signatureVerified = true;
        payment.method = razorpayPayment.method || "";
        payment.failureReason = "";

        await payment.save({ session: session! });

        // Keep booking service status as completed.
        booking.paymentStatus = "paid";
        booking.paymentId = payment._id;
        booking.paidAt = new Date();

        await booking.save({ session: session! });
      }

      // ------------------------------------
      // PAYMENT FAILED
      // ------------------------------------

      if (eventType === "payment.failed") {
        // Never downgrade a successful payment.
        if (payment.status === "paid") {
          alreadyProcessed = true;
          return;
        }

        if (
          payment.status === "failed" &&
          payment.razorpayPaymentId === razorpayPayment.id
        ) {
          alreadyProcessed = true;
          return;
        }

        if (payment.status !== "created") {
          throw new Error("Payment cannot be marked as failed");
        }

        const duplicatePayment = await Payment.findOne({
          razorpayPaymentId: razorpayPayment.id,
          _id: { $ne: payment._id },
        }).session(session!);

        if (duplicatePayment) {
          throw new Error("Razorpay payment ID is already linked");
        }

        payment.razorpayPaymentId = razorpayPayment.id;
        payment.status = "failed";
        payment.method = razorpayPayment.method || "";
        payment.failureReason =
          razorpayPayment.error_description ||
          razorpayPayment.error_reason ||
          "Payment failed";

        await payment.save({ session: session! });

        // Only update the booking if this is still its current attempt.
        if (
          booking.paymentStatus !== "paid" &&
          booking.paymentId?.toString() === payment._id.toString()
        ) {
          booking.paymentStatus = "failed";
          await booking.save({ session: session! });
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: alreadyProcessed
        ? "Webhook event already processed"
        : "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  } finally {
    if (session) {
      await session.endSession().catch(console.error);
    }
  }
};
