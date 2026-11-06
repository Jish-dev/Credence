
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

export function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET missing");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  const options: SignOptions = {
    expiresIn: expiresIn as `${number}${"s" | "m" | "h" | "d" | "w" | "y"}`,
  };

  return jwt.sign({ sub: userId }, secret, options);
}
