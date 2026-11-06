
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import crypto from "crypto";

import razorpay from "../config/razorpay.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";

const createPaymentValidation = (bookingId: string) => {
  return mongoose.Types.ObjectId.isValid(bookingId);
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

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      !bookingId ||
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

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending bookings can be paid",
      });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "This booking has already been paid",
      });
    }

    const existingPayment = await Payment.findOne({
      booking: booking._id,
      status: "paid",
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "This booking has already been paid",
      });
    }

    const amountInPaise = Math.round(booking.amount * 100);

    if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking payment amount",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `booking_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        customerId,
      },
    });

    const payment = await Payment.create({
      customer: customerId,
      booking: booking._id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      status: "created",
      signatureVerified: false,
    });

    return res.status(201).json({
      success: true,
      message: "Payment order created successfully",
      data: {
        paymentId: payment._id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
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
  const session = await mongoose.startSession();

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
      throw new Error("Razorpay secret is not configured");
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

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const receivedBuffer = Buffer.from(razorpay_signature, "hex");
    const generatedBuffer = Buffer.from(generatedSignature, "hex");

    if (
      receivedBuffer.length !== generatedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, generatedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

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

    let alreadyProcessed = false;

    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: paymentRecord._id,
        customer: customerId,
      }).session(session);

      if (!payment) {
        throw new Error("Payment record not found");
      }

      // A webhook may have confirmed this payment first.
      if (
        payment.status === "paid" &&
        payment.razorpayPaymentId === razorpay_payment_id
      ) {
        alreadyProcessed = true;
        return;
      }

      if (payment.status !== "created") {
        throw new Error("This payment cannot be processed");
      }

      const duplicatePayment = await Payment.findOne({
        razorpayPaymentId: razorpay_payment_id,
        _id: { $ne: payment._id },
      }).session(session);

      if (duplicatePayment) {
        throw new Error("This transaction is already linked");
      }

      const booking = await Booking.findOneAndUpdate(
        {
          _id: payment.booking,
          customer: customerId,
          paymentStatus: { $in: ["pending", "failed", null] },
          $or: [
            { paymentId: null },
            { paymentId: payment._id },
          ],
        },
        {
          $set: {
            paymentStatus: "paid",
            paymentId: payment._id,
            paidAt: new Date(),
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!booking) {
        throw new Error(
          "Booking is already paid or is not eligible for payment"
        );
      }

      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = "paid";
      payment.signatureVerified = true;
      payment.method = razorpayPayment.method || "";

      await payment.save({ session });
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
    await session.endSession();
  }
};

// ========================================
// RAZORPAY WEBHOOK
// ========================================

export const handleRazorpayWebhook = async (
  req: Request,
  res: Response
) => {
  const session = await mongoose.startSession();

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Razorpay webhook secret is not configured");

      return res.status(500).json({
        success: false,
        message: "Webhook configuration error",
      });
    }

    // Express raw middleware must provide the original request body.
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

    // 1. Verify webhook signature against the original raw body.
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    const receivedBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    // 2. Parse body only after signature verification.
    const event = JSON.parse(req.body.toString("utf8"));

    const eventType = event.event as string;

    // Ignore events that this application does not process.
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

    // 3. Find the matching CREDENCE payment.
    const paymentRecord = await Payment.findOne({
      razorpayOrderId: razorpayPayment.order_id,
    });

    if (!paymentRecord) {
      console.error(
        "Webhook payment record not found:",
        razorpayPayment.order_id
      );

      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Check amount and currency before processing either event.
    if (
      razorpayPayment.amount !== paymentRecord.amount ||
      razorpayPayment.currency !== paymentRecord.currency
    ) {
      return res.status(400).json({
        success: false,
        message: "Webhook payment amount or currency mismatch",
      });
    }

    // 4. Process Payment and Booking atomically.
    let alreadyProcessed = false;

    await session.withTransaction(async () => {
      const payment = await Payment.findById(paymentRecord._id).session(
        session
      );

      if (!payment) {
        throw new Error("Payment record not found");
      }

      const booking = await Booking.findById(payment.booking).session(
        session
      );

      if (!booking) {
        throw new Error("Related booking not found");
      }

      if (eventType === "payment.captured") {
        // Duplicate captured event or frontend verification arrived first.
        if (
          payment.status === "paid" &&
          payment.razorpayPaymentId === razorpayPayment.id &&
          booking.paymentStatus === "paid"
        ) {
          alreadyProcessed = true;
          return;
        }

        if (
          payment.status === "paid" &&
          payment.razorpayPaymentId !== razorpayPayment.id
        ) {
          throw new Error("Payment is already linked to another transaction");
        }

        if (
          booking.paymentStatus === "paid" &&
          booking.paymentId?.toString() !== payment._id.toString()
        ) {
          throw new Error("Booking is already paid through another payment");
        }

        if (
          payment.status !== "created" &&
          payment.status !== "failed"
        ) {
          throw new Error("Payment is not eligible for capture");
        }

        const duplicatePayment = await Payment.findOne({
          razorpayPaymentId: razorpayPayment.id,
          _id: { $ne: payment._id },
        }).session(session);

        if (duplicatePayment) {
          throw new Error("Razorpay payment ID is already linked");
        }

        // Update booking.
        booking.paymentStatus = "paid";
        booking.paymentId = payment._id;
        booking.paidAt = new Date();

        await booking.save({ session });

        // Update payment.
        payment.razorpayPaymentId = razorpayPayment.id;
        payment.status = "paid";
        payment.signatureVerified = true;
        payment.method = razorpayPayment.method || "";

        await payment.save({ session });
      }

      if (eventType === "payment.failed") {
        // Never downgrade a successfully paid payment.
        if (payment.status === "paid") {
          alreadyProcessed = true;
          return;
        }

        // Repeated failed event is safe.
        if (
          payment.status === "failed" &&
          booking.paymentStatus === "failed"
        ) {
          alreadyProcessed = true;
          return;
        }

        if (payment.status !== "created") {
          throw new Error("Payment cannot be marked as failed");
        }

        payment.status = "failed";
        payment.razorpayPaymentId = razorpayPayment.id;
        payment.method = razorpayPayment.method || "";
        payment.failureReason =
          razorpayPayment.error_description ||
          razorpayPayment.error_reason ||
          "Payment failed";

        await payment.save({ session });

        // Do not downgrade a booking already paid by another payment.
        if (
          booking.paymentStatus !== "paid" &&
          (!booking.paymentId ||
            booking.paymentId.toString() === payment._id.toString())
        ) {
          booking.paymentStatus = "failed";
          booking.paymentId = payment._id;

          await booking.save({ session });
        }
      }
    });

    // 5. Acknowledge successful processing to Razorpay.
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
    await session.endSession();
  }
};
