
import mongoose, {
  Schema,
  type Model,
} from "mongoose";

export type UserRole = "customer" | "admin" | "provider";

export type ProviderApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface IUser {
  name: string;
  email: string;
  phone: string;
  password: string;
  googleId?: string;
  role: UserRole;
  providerApprovalStatus?: ProviderApprovalStatus;

  profileImage: string;
  isActive: boolean;

  resetOtp?: string | undefined;
  resetOtpExpires?: Date | undefined;
  resetOtpLastSentAt?: Date | undefined;
  resetOtpAttempts?: number | undefined;
  resetOtpVerified?: boolean | undefined;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["customer", "admin", "provider"],
      default: "customer",
    },


    providerApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      required: function (this: mongoose.Document & { role: string }): boolean {
        return this.role === "provider";
      },
    },


    profileImage: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    resetOtp: {
      type: String,
      select: false,
    },

    resetOtpExpires: {
      type: Date,
      select: false,
    },

    resetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    resetOtpVerified: {
      type: Boolean,
      default: false,
      select: false,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    resetOtpLastSentAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export default User;
