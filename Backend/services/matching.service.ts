
import Provider from "../models/Provider.js";

interface MatchProvidersInput {
  category: string;
  city: string;
  urgency?: string;
}

export async function matchProviders(input: MatchProvidersInput) {
  const category = input.category.trim();
  const city = input.city.trim();

  const providers = await Provider.find({
    categories: {
      $regex: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    },
    city: {
      $regex: city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    },
    isAvailable: true,
    status: "published",
    verificationStatus: "verified",
  });

  // Rank providers by their average rating.
  return providers.sort(
    (a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0)
  );
}
