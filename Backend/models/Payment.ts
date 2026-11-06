import mongoose, { Model, Schema } from "mongoose";

export type PaymentStatus = "created" | "paid" | "failed" | "refunded";

export interface IPayment {
  customer: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  razorpayPaymentId?: string;
  razorpayOrderId: string;
  razorpaySignature?: string;

  amount: number;
  currency: string;
  status: PaymentStatus;
  method?: string;
  failureReason?: string;

  signatureVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },
    method: {
      type: String,
    },
    failureReason: {
      type: String,
    },
    signatureVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ booking: 1, createdAt: -1 });

const Payment: Model<IPayment> =
  (mongoose.models.Payment as Model<IPayment>) ||
  mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;