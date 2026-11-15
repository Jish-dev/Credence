
import mongoose, { Model, Schema } from "mongoose";
import { randomBytes } from "crypto";

export interface IHome {
  owner: mongoose.Types.ObjectId;

  name: string;
  address: string;

  passportToken: string;
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

const homeSchema = new Schema<IHome>(
  {
    // Customer who owns this home's Service Passport
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Example: My Home, Parents' Home
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Unique, unpredictable QR passport token
    passportToken: {
      type: String,
      required: true,
      unique: true,
      default: () => randomBytes(32).toString("hex"),
    },

    // Can be disabled if the QR is lost or compromised
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Efficiently retrieve a customer's homes
homeSchema.index({ owner: 1, createdAt: -1 });

const Home: Model<IHome> =
  (mongoose.models.Home as Model<IHome>) ||
  mongoose.model<IHome>("Home", homeSchema);

export default Home;
