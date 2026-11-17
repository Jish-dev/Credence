
import mongoose, { Model, Schema } from "mongoose";

export type BookingType = "on_demand" | "pre_booking";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "rejected";

export type BookingPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type ProviderTravelStatus =
  | "idle"
  | "on-the-way"
  | "arrived"
  | "stopped";

export type PricingType = "starting_price" | "booking_advance";

export type BillApprovalStatus = "pending" | "approved";

export interface IProviderLocation {
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

export interface IFinalBill {
  laborCharge: number;
  materialCharge: number;
  otherCharges: number;
  totalAmount: number;
  advanceDeducted: number;
  balanceAmount: number;
  description: string;
  approvalStatus: BillApprovalStatus;
  submittedAt: Date;
  approvedAt: Date | null;
}

export interface IBooking {
  customer: mongoose.Types.ObjectId;
  provider: mongoose.Types.ObjectId;
  home?: mongoose.Types.ObjectId | null;

  bookingType: BookingType;

  serviceName: string;
  description: string;

  bookingDate: Date | null;
  bookingTime: string;

  location: string;
  contactPhone: string;

  // Upfront amount agreed at booking time (in rupees).
  amount: number;
  pricingType: PricingType;

  status: BookingStatus;

  providerCompletedAt: Date | null;
  customerConfirmedAt: Date | null;

  // Overall payment status (kept for compatibility).
  paymentStatus: BookingPaymentStatus;
  paymentId: mongoose.Types.ObjectId | null;
  paidAt: Date | null;

  // Upfront payment.
  upfrontPaymentStatus: BookingPaymentStatus;
  upfrontPaymentId: mongoose.Types.ObjectId | null;

  // Final bill and balance payment.
  finalBill: IFinalBill | null;
  balancePaymentStatus: BookingPaymentStatus;
  balancePaymentId: mongoose.Types.ObjectId | null;

  providerNote: string;

  providerTravelStatus: ProviderTravelStatus;
  providerLocation: IProviderLocation | null;

  trackingStartedAt: Date | null;
  trackingEndedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

const finalBillSchema = new Schema<IFinalBill>(
  {
    laborCharge: {
      type: Number,
      required: true,
      min: 0,
    },

    materialCharge: {
      type: Number,
      required: true,
      min: 0,
    },

    otherCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    advanceDeducted: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
      required: true,
    },

    submittedAt: {
      type: Date,
      required: true,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const bookingSchema = new Schema<IBooking>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    provider: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },

    bookingType: {
      type: String,
      enum: ["on_demand", "pre_booking"],
      default: "pre_booking",
      required: true,
    },

    serviceName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    bookingDate: {
      type: Date,
      default: null,
      required: function (this: IBooking) {
        return this.bookingType === "pre_booking";
      },
    },

    bookingTime: {
      type: String,
      trim: true,
      default: "",
      required: function (this: IBooking) {
        return this.bookingType === "pre_booking";
      },
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },

    // This is the upfront amount collected during booking.
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },

    pricingType: {
      type: String,
      enum: ["starting_price", "booking_advance"],
      default: "starting_price",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in-progress",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "pending",
      index: true,
    },

    providerCompletedAt: {
      type: Date,
      default: null,
    },

    customerConfirmedAt: {
      type: Date,
      default: null,
    },

    // Overall payment status.
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    // Upfront payment details.
    upfrontPaymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    upfrontPaymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    // Final bill submitted by the provider.
    finalBill: {
      type: finalBillSchema,
      default: null,
    },

    // Remaining balance payment details.
    balancePaymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    balancePaymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    providerNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    providerTravelStatus: {
      type: String,
      enum: ["idle", "on-the-way", "arrived", "stopped"],
      default: "idle",
      index: true,
    },

    providerLocation: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
      updatedAt: {
        type: Date,
      },
      _id: false,
    },

    trackingStartedAt: {
      type: Date,
      default: null,
    },

    trackingEndedAt: {
      type: Date,
      default: null,
    },

    home: {
      type: Schema.Types.ObjectId,
      ref: "Home",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, bookingDate: 1 });
bookingSchema.index({ status: 1, bookingDate: 1 });
bookingSchema.index({ paymentStatus: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, status: 1, createdAt: -1 });

const Booking: Model<IBooking> =
  (mongoose.models.Booking as Model<IBooking>) ||
  mongoose.model<IBooking>("Booking", bookingSchema);

export default Booking;
