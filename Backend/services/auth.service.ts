
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

// ========================================
// REGISTER CUSTOMER
// ========================================

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw Object.assign(
      new Error("Email already registered"),
      { statusCode: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const user = await User.create({
    name: input.name.trim(),
    email,
    password: hashedPassword,
    role: "customer",
  });

  return {
    token: generateToken(user.id),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

// ========================================
// LOGIN CUSTOMER / ADMIN
// ========================================

export async function loginUser(
  email: string,
  password: string
) {
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select("+password");

  if (
    !user ||
    !user.isActive ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw Object.assign(
      new Error("Invalid credentials"),
      { statusCode: 401 }
    );
  }

  return {
    token: generateToken(user.id),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
