
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";

export interface CreateBookingInput {
  customerId: string;
  providerId: string;
  serviceName: string;
  description?: string;
  bookingDate: string;
  bookingTime: string;
  location: string;
  contactPhone: string;
}

export async function createBooking(input: CreateBookingInput) {
  const provider = await Provider.findOne({
    _id: input.providerId,
    status: "published",
    isAvailable: true,
  });

  if (!provider) {
    throw Object.assign(
      new Error("Provider not found or unavailable"),
      { statusCode: 404 }
    );
  }

  const booking = await Booking.create({
    customer: input.customerId,
    provider: provider._id,
    serviceName: input.serviceName,
    description: input.description ?? "",
    bookingDate: new Date(input.bookingDate),
    bookingTime: input.bookingTime,
    location: input.location,
    contactPhone: input.contactPhone,
    amount: provider.startingPrice,
    status: "pending",
    paymentStatus: "pending",
  });

  return booking;
}
