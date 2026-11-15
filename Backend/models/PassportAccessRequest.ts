
import mongoose, { Model, Schema } from "mongoose";

export type PassportAccessStatus =
  | "pending"
  | "approved"
  | "expired"
  | "revoked";

export interface IPassportAccessRequest {
  home: mongoose.Types.ObjectId;
  provider: mongoose.Types.ObjectId;

  otpHash: string;
  expiresAt: Date;
  attempts: number;

  status: PassportAccessStatus;

  approvedAt: Date | null;
  approvedUntil: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

const passportAccessRequestSchema =
  new Schema<IPassportAccessRequest>(
    {
      home: {
        type: Schema.Types.ObjectId,
        ref: "Home",
        required: true,
        index: true,
      },

      provider: {
        type: Schema.Types.ObjectId,
        ref: "Provider",
        required: true,
        index: true,
      },

      otpHash: {
        type: String,
        required: true,
        select: false,
      },

      expiresAt: {
        type: Date,
        required: true,
        index: true,
      },

      attempts: {
        type: Number,
        default: 0,
        min: 0,
      },

      status: {
        type: String,
        enum: ["pending", "approved", "expired", "revoked"],
        default: "pending",
        index: true,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      approvedUntil: {
        type: Date,
        default: null,
      },
    },
    { timestamps: true }
  );

passportAccessRequestSchema.index({
  home: 1,
  provider: 1,
  status: 1,
});

const PassportAccessRequest: Model<IPassportAccessRequest> =
  (mongoose.models.PassportAccessRequest as Model<IPassportAccessRequest>) ||
  mongoose.model<IPassportAccessRequest>(
    "PassportAccessRequest",
    passportAccessRequestSchema
  );

export default PassportAccessRequest;
