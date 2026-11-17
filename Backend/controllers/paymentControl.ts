
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import crypto from "crypto";

import razorpay from "../config/razorpay.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";

// ========================================
// TYPES
// ========================================

type PaymentPurpose = "advance" | "balance";

type RazorpayPaymentData = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status?: string;
  method?: string;
  error_description?: string;
  error_reason?: string;
};

// ========================================
// VALIDATION HELPERS
// ========================================

const isValidBookingId = (bookingId: string) =>
  mongoose.Types.ObjectId.isValid(bookingId);

const isValidPaymentPurpose = (
  value: unknown
): value is PaymentPurpose =>
  value === "advance" || value === "balance";

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
// PAYMENT PURPOSE HELPERS
// ========================================

// Old Payment records without purpose are treated as advance payments.
const getPaymentPurpose = (payment: {
  purpose?: PaymentPurpose;
}): PaymentPurpose => payment.purpose ?? "advance";

// ========================================
// FIND VERIFIED ADVANCE PAYMENT
// ========================================

const findVerifiedAdvancePayment = async (
  booking: {
    _id: mongoose.Types.ObjectId;
    customer: mongoose.Types.ObjectId;
  },
  session?: mongoose.ClientSession
) => {
  let query = Payment.findOne({
    booking: booking._id,
    customer: booking.customer,
    status: "paid",
    signatureVerified: true,
    currency: "INR",
    $or: [
      { purpose: "advance" },
      { purpose: { $exists: false } },
      { purpose: null },
    ],
  }).sort({ createdAt: -1 });

  if (session) {
    query = query.session(session);
  }

  return query;
};

// ========================================
// GET PAYMENT AMOUNT
// ========================================

const getPaymentAmountInRupees = (
  booking: any,
  purpose: PaymentPurpose
): number => {
  if (purpose === "advance") {
    return Number(booking.amount);
  }

  return Number(booking.finalBill?.balanceAmount);
};

const getValidatedPaymentAmount = (
  booking: any,
  purpose: PaymentPurpose
) => {
  const amountInRupees = getPaymentAmountInRupees(
    booking,
    purpose
  );

  const amountInPaise = Math.round(amountInRupees * 100);

  if (
    !Number.isFinite(amountInRupees) ||
    !Number.isSafeInteger(amountInPaise) ||
    amountInPaise <= 0
  ) {
    throw new Error("Invalid payment amount");
  }

  return {
    amountInRupees,
    amountInPaise,
  };
};

// ========================================
// GET OVERALL BOOKING PAYMENT STATUS
// ========================================

const getBookingPaymentStatus = (
  booking: any
): "pending" | "paid" | "failed" => {
  const upfrontPaid =
    booking.upfrontPaymentStatus === "paid" ||
    Number(booking.amount) === 0;

  // IMPORTANT:
  // A booking cannot become fully paid before its final bill exists.
  const hasFinalBill = Boolean(booking.finalBill);

  const balanceAmount = Number(
    booking.finalBill?.balanceAmount ?? 0
  );

  const balancePaid =
    hasFinalBill &&
    (
      balanceAmount <= 0 ||
      booking.balancePaymentStatus === "paid"
    );

  if (upfrontPaid && balancePaid) {
    return "paid";
  }

  return "pending";
};

// ========================================
// CHECK PAYMENT ELIGIBILITY
// ========================================

const validatePaymentEligibility = async (
  booking: any,
  customerId: string,
  purpose: PaymentPurpose,
  session?: mongoose.ClientSession
) => {
  if (purpose === "advance") {
    if (!["pending", "confirmed"].includes(booking.status)) {
      throw new Error(
        "Advance payment is available only for pending or confirmed bookings"
      );
    }

    if (booking.upfrontPaymentStatus === "paid") {
      throw new Error("Advance payment has already been completed");
    }

    const existingAdvance = await findVerifiedAdvancePayment(
      booking,
      session
    );

    if (existingAdvance) {
      throw new Error("Advance payment has already been completed");
    }

    return;
  }

  // ====================================
  // BALANCE PAYMENT
  // ====================================

  if (booking.status !== "completed") {
    throw new Error("Service has not been completed yet");
  }

  if (!booking.finalBill) {
    throw new Error("Final bill has not been submitted");
  }

  if (booking.finalBill.approvalStatus !== "approved") {
    throw new Error(
      "Customer must approve the final bill before balance payment"
    );
  }

  if (booking.balancePaymentStatus === "paid") {
    throw new Error("Balance payment has already been completed");
  }

  if (booking.upfrontPaymentStatus !== "paid") {
    throw new Error(
      "The booking advance payment has not been verified"
    );
  }

  // Verify the actual successful advance payment record.
  const advancePayment = await findVerifiedAdvancePayment(
    booking,
    session
  );

  if (!advancePayment) {
    throw new Error(
      "Verified advance payment record not found"
    );
  }

  const expectedAdvancePaise = Math.round(
    Number(booking.amount) * 100
  );

  if (
    !Number.isSafeInteger(expectedAdvancePaise) ||
    advancePayment.amount !== expectedAdvancePaise
  ) {
    throw new Error(
      "Verified advance payment does not match the booking amount"
    );
  }

  const balanceAmount = Number(
    booking.finalBill.balanceAmount
  );

  if (
    !Number.isFinite(balanceAmount) ||
    balanceAmount <= 0
  ) {
    throw new Error("No remaining balance is due");
  }

  const successfulBalance = await Payment.findOne({
    booking: booking._id,
    customer: customerId,
    purpose: "balance",
    status: "paid",
    signatureVerified: true,
  }).session(session ?? null);

  if (successfulBalance) {
    throw new Error("Balance payment has already been completed");
  }
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
// UPDATE BOOKING AFTER SUCCESSFUL PAYMENT
// ========================================

const applySuccessfulPayment = async (
  payment: any,
  booking: any,
  paymentId: string,
  signature: string | undefined,
  method: string,
  session: mongoose.ClientSession
) => {
  const purpose = getPaymentPurpose(payment);

  // Never apply the same Razorpay payment twice.
  const duplicatePayment = await Payment.findOne({
    razorpayPaymentId: paymentId,
    _id: { $ne: payment._id },
  }).session(session);

  if (duplicatePayment) {
    throw new Error(
      "Razorpay payment ID is already linked to another payment"
    );
  }

  payment.razorpayPaymentId = paymentId;

  if (signature) {
    payment.razorpaySignature = signature;
  }

  payment.status = "paid";
  payment.signatureVerified = true;
  payment.method = method || "";
  payment.failureReason = "";

  await payment.save({ session });

  if (purpose === "advance") {
    booking.upfrontPaymentStatus = "paid";
    booking.upfrontPaymentId = payment._id;
  } else {
    booking.balancePaymentStatus = "paid";
    booking.balancePaymentId = payment._id;
  }

  // Keep legacy payment reference.
  booking.paymentId = payment._id;

  const overallStatus = getBookingPaymentStatus(booking);

  booking.paymentStatus = overallStatus;

  if (overallStatus === "paid") {
    booking.paidAt = new Date();
  } else {
    booking.paidAt = null;
  }

  await booking.save({ session });
};

// ========================================
// CREATE RAZORPAY ORDER
// POST /api/v1/payments/create-order
// ========================================

export const createPaymentOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.user?.id;
    const { bookingId } = req.body;

    // Backward compatibility:
    // Requests without purpose are treated as advance payments.
    const purpose: PaymentPurpose =
      req.body.purpose === undefined
        ? "advance"
        : req.body.purpose;

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
      !isValidBookingId(bookingId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid booking ID is required",
      });
    }

    if (!isValidPaymentPurpose(purpose)) {
      return res.status(400).json({
        success: false,
        message: "Payment purpose must be advance or balance",
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

    await validatePaymentEligibility(
      booking,
      customerId,
      purpose
    );

    // ====================================
    // VALIDATE PAYMENT AMOUNT
    // ====================================

    let amountInPaise: number;

    try {
      const amount = getValidatedPaymentAmount(
        booking,
        purpose
      );

      amountInPaise = amount.amountInPaise;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Invalid payment amount",
      });
    }

    // ====================================
    // FIND EXISTING PAYMENT ORDER
    // ====================================

    let existingPayment;

    if (purpose === "advance") {
      existingPayment = await Payment.findOne({
        booking: booking._id,
        customer: customerId,
        status: "created",
        $or: [
          { purpose: "advance" },
          { purpose: { $exists: false } },
          { purpose: null },
        ],
      }).sort({ createdAt: -1 });
    } else {
      existingPayment = await Payment.findOne({
        booking: booking._id,
        customer: customerId,
        status: "created",
        purpose: "balance",
      }).sort({ createdAt: -1 });
    }

    if (existingPayment) {
      try {
        const verifiedOrder = await fetchAndVerifyRazorpayOrder(
          existingPayment.razorpayOrderId,
          existingPayment.amount,
          existingPayment.currency
        );

        if (verifiedOrder.status === "paid") {
          return res.status(409).json({
            success: false,
            message:
              "This Razorpay order is already paid. Please refresh and check the payment status.",
          });
        }

        if (verifiedOrder.status === "created") {
          if (
            verifiedOrder.amount !== amountInPaise ||
            verifiedOrder.currency !== "INR"
          ) {
            throw new Error(
              "Existing order does not match the current payment amount"
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
              purpose,
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

        existingPayment.status = "failed";
        existingPayment.failureReason =
          error instanceof Error
            ? error.message
            : "Existing Razorpay order could not be verified";

        await existingPayment.save();
      }
    }

    // ====================================
    // CREATE NEW RAZORPAY ORDER
    // ====================================

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `b${booking._id.toString().slice(-12)}_${purpose}_${Date.now()}`,
      notes: {
        bookingId: booking._id.toString(),
        customerId,
        purpose,
      },
    });

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
      purpose,
      razorpayOrderId: verifiedOrder.id,
      amount: Number(verifiedOrder.amount),
      currency: verifiedOrder.currency,
      status: "created",
      signatureVerified: false,
    });

    if (purpose === "advance") {
      booking.upfrontPaymentStatus = "pending";
    } else {
      booking.balancePaymentStatus = "pending";
    }

    await booking.save();

    return res.status(201).json({
      success: true,
      message: "Payment order created and verified successfully",
      data: {
        paymentId: payment._id,
        razorpayOrderId: verifiedOrder.id,
        amount: verifiedOrder.amount,
        currency: verifiedOrder.currency,
        keyId,
        purpose,
      },
    });
  } catch (error) {
    console.error("CREDENCE CREATE PAYMENT ORDER ERROR:", error);
    next(error);
  }
};

// ========================================
// VERIFY RAZORPAY PAYMENT
// POST /api/v1/payments/verify-payment
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

    // ====================================
    // VERIFY CHECKOUT SIGNATURE
    // ====================================

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

    // ====================================
    // VERIFY PAYMENT WITH RAZORPAY
    // ====================================

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

    // ====================================
    // DATABASE TRANSACTION
    // ====================================

    session = await mongoose.startSession();

    let alreadyProcessed = false;
    let finalBookingPaymentStatus = "pending";

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

      const purpose = getPaymentPurpose(payment);

      // Idempotency.
      if (
        payment.status === "paid" &&
        payment.razorpayPaymentId === razorpay_payment_id
      ) {
        alreadyProcessed = true;
        finalBookingPaymentStatus = booking.paymentStatus;
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

      const duplicatePayment = await Payment.findOne({
        razorpayPaymentId: razorpay_payment_id,
        _id: { $ne: payment._id },
      }).session(session!);

      if (duplicatePayment) {
        throw new Error("Razorpay payment ID is already linked");
      }

      // Recheck eligibility inside the transaction.
      await validatePaymentEligibility(
        booking,
        customerId,
        purpose,
        session
      );

      const expectedAmount = getValidatedPaymentAmount(
        booking,
        purpose
      );

      if (payment.amount !== expectedAmount.amountInPaise) {
        throw new Error(
          "Payment amount does not match the current booking amount"
        );
      }

      await applySuccessfulPayment(
        payment,
        booking,
        razorpay_payment_id,
        razorpay_signature,
        razorpayPayment.method || "",
        session!
      );

      finalBookingPaymentStatus = booking.paymentStatus;
    });

    return res.status(200).json({
      success: true,
      message: alreadyProcessed
        ? "Payment already verified"
        : "Payment verified successfully",
      data: {
        paymentId: paymentRecord._id,
        razorpayPaymentId: razorpay_payment_id,
        purpose: getPaymentPurpose(paymentRecord),
        paymentStatus: "paid",
        bookingPaymentStatus: finalBookingPaymentStatus,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
      },
    });
  } catch (error) {
    console.error("CREDENCE VERIFY PAYMENT ERROR:", error);
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

    const razorpayPayment =
      event.payload?.payment?.entity as RazorpayPaymentData | undefined;

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
      return res.status(200).json({
        success: true,
        message: "Payment record not found; event ignored",
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

      const purpose = getPaymentPurpose(payment);

      // ====================================
      // PAYMENT CAPTURED
      // ====================================

      if (eventType === "payment.captured") {
        if (
          payment.status === "paid" &&
          payment.razorpayPaymentId === razorpayPayment.id
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

        const duplicatePayment = await Payment.findOne({
          razorpayPaymentId: razorpayPayment.id,
          _id: { $ne: payment._id },
        }).session(session!);

        if (duplicatePayment) {
          throw new Error("Razorpay payment ID is already linked");
        }

        const expectedAmount = getValidatedPaymentAmount(
          booking,
          purpose
        );

        if (payment.amount !== expectedAmount.amountInPaise) {
          throw new Error(
            "Captured payment amount does not match the booking"
          );
        }

        // Recheck eligibility, including verified advance payment.
        await validatePaymentEligibility(
          booking,
          booking.customer.toString(),
          purpose,
          session
        );

        await applySuccessfulPayment(
          payment,
          booking,
          razorpayPayment.id,
          undefined,
          razorpayPayment.method || "",
          session!
        );
      }

      // ====================================
      // PAYMENT FAILED
      // ====================================

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

        if (purpose === "advance") {
          if (booking.upfrontPaymentStatus !== "paid") {
            booking.upfrontPaymentStatus = "failed";
          }
        } else {
          if (booking.balancePaymentStatus !== "paid") {
            booking.balancePaymentStatus = "failed";
          }
        }

        booking.paymentStatus = getBookingPaymentStatus(booking);

        if (booking.paymentStatus !== "paid") {
          booking.paidAt = null;
        }

        await booking.save({ session: session! });
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
