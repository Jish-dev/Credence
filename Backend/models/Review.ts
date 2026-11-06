import mongoose, { Model, Schema } from "mongoose";

export type ReviewStatus = "published" | "hidden";

export interface IReview {
  customer: mongoose.Types.ObjectId;
  provider: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;

  rating: number;
  comment: string;
  status: ReviewStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

const reviewSchema = new Schema<IReview>(
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

    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ["published", "hidden"],
      default: "published",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ provider: 1, createdAt: -1 });
reviewSchema.index({ customer: 1, createdAt: -1 });

const Review: Model<IReview> =
  (mongoose.models.Review as Model<IReview>) ||
  mongoose.model<IReview>("Review", reviewSchema);

export default Review;