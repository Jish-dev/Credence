
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import cors from "cors";

// ========================================
// ROUTES
// ========================================

import authRoutes from "./routes/authRoute.js";
import providerRoutes from "./routes/providerRoute.js";
import customerRoutes from "./routes/customerRoute.js";
import bookingRoutes from "./routes/bookingRoute.js";
import reviewRoutes from "./routes/reviewRoute.js";
import dashboardRoutes from "./routes/dashboardRoute.js";
import paymentRoutes from "./routes/paymentRoute.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import providerAuthRoutes from "./routes/providerAuthRoutes.js";

// ========================================
// CONTROLLERS
// ========================================

import { handleRazorpayWebhook } from "./controllers/paymentControl.js";
import notificationRoutes from "./routes/notificationRoutes.js";

// ========================================
// EXPRESS APP
// ========================================

const app = express();

// ========================================
// CORS CONFIGURATION
// ========================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header
    // (for example, server-to-server requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("CORS blocked origin:", origin);

    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

// Register CORS BEFORE API routes and body parsers
app.use(cors(corsOptions));

// ========================================
// RAZORPAY WEBHOOK
// IMPORTANT: Must be before express.json()
// ========================================

app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook
);

// ========================================
// BODY PARSERS
// ========================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/v1/health", (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "CREDENCE API is running",
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// AUTHENTICATION
// ========================================

app.use("/api/v1/auth", authRoutes);

// ========================================
// PROVIDERS
// ========================================

app.use("/api/v1/providers", providerRoutes);

// ========================================
// CUSTOMERS
// ========================================

app.use("/api/v1/customers", customerRoutes);

// ========================================
// BOOKINGS
// ========================================

app.use("/api/v1/bookings", bookingRoutes);

// ========================================
// REVIEWS
// ========================================

app.use("/api/v1/reviews", reviewRoutes);

// ========================================
// ADMIN DASHBOARD
// ========================================

app.use("/api/v1/admin/dashboard", dashboardRoutes);

// ========================================
// PAYMENTS
// ========================================

app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin/upload", uploadRoutes);

app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/provider-auth", providerAuthRoutes);
// ========================================
// 404 HANDLER
// ========================================

app.use((req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",

      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
);

export default app;
