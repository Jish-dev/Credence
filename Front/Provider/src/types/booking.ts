export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "rejected";

export interface Booking {
  _id: string;
  serviceName: string;
  description?: string;
  bookingDate: string;
  bookingTime: string;
  location: string;
  contactPhone: string;
  amount: number;
  status: BookingStatus;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";

  customer: {
    name: string;
    email: string;
    phone?: string;
  };
}