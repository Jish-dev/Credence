
import mongoose, {
  Model,
  Schema,
} from "mongoose";

export type ProviderStatus = "draft" | "published";

export type VerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export type ProviderType =
  | "individual"
  | "business"
  | "company";

export interface IProvider {
  // Connected login account
  user?: mongoose.Types.ObjectId;

  name: string;
  title: string;

  category: string;
  categories: string[];
  providerType: ProviderType;

  location: string;
  city: string;
  area: string;
  address: string;

  experienceYears: number;

  bio: string;
  description: string;

  contact: string;
  contactPhone: string;
  email: string;

  startingPrice: number;
  profileImage: string;

  status: ProviderStatus;
  verificationStatus: VerificationStatus;

  averageRating: number;
  reviewCount: number;

  isAvailable: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

const providerSchema = new Schema<IProvider>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    categories: {
      type: [String],
      default: [],
    },

    providerType: {
      type: String,
      enum: ["individual", "business", "company"],
      default: "individual",
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    area: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    experienceYears: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    contact: {
      type: String,
      required: true,
      trim: true,
      maxlength: 25,
    },

    contactPhone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 25,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    startingPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    profileImage: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },

    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// One provider account can have only one provider profile.
// Sparse index preserves existing admin-created profiles
// that do not have a linked user account.
providerSchema.index(
  { user: 1 },
  { unique: true, sparse: true }
);

providerSchema.index({
  name: "text",
  title: "text",
  category: "text",
  location: "text",
  city: "text",
  area: "text",
  address: "text",
  bio: "text",
});

const Provider: Model<IProvider> =
  (mongoose.models.Provider as Model<IProvider>) ||
  mongoose.model<IProvider>("Provider", providerSchema);

export default Provider;
