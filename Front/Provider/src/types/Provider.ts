export interface Provider {
  _id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  category: string;
  bio?: string;
  description?: string;
  profileImage?: string;
  experienceYears?: number;
  startingPrice?: number;
  verificationStatus: "pending" | "verified" | "rejected";
  status: "draft" | "published" | "unpublished";
}