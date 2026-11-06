
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import CredenceFooter from "./components/Layout/Footer";

import Home from "./pages/Home";
import ProviderDetails from "./pages/ProviderDetails";
import Booking from "./pages/Booking";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import MyBookings from "./pages/MyBookings";
import Notifications from "./pages/Notifications";

// ========================================
// LOADING SCREEN
// ========================================

function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />

        <p className="mt-4 text-sm text-gray-500">
          Loading CREDENCE...
        </p>
      </div>
    </div>
  );
}

// ========================================
// MAIN APPLICATION LAYOUT
// ========================================

function AppLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <AppLoader />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <Navbar user={user} onLogout={logout} />

      {/* Main page content */}
      <main className="flex-1 pt-16">
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Provider details */}
          <Route
            path="/professional/:id"
            element={<ProviderDetails />}
          />

          {/* Authentication */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" replace /> : <Login />
            }
          />

          <Route
            path="/register"
            element={
              user ? <Navigate to="/" replace /> : <Register />
            }
          />

          {/* Booking */}
          <Route
            path="/booking"
            element={<Booking />}
          />

          {/* Customer profile */}
          <Route
            path="/profile"
            element={
              user ? <Profile /> : <Navigate to="/login" replace />
            }
          />

          {/* Customer bookings */}
          <Route
            path="/my-bookings"
            element={
              user?.role === "customer" ? (
                <MyBookings />
              ) : (
                <Navigate to={user ? "/" : "/login"} replace />
              )
            }
          />

          {/* Customer notifications */}
          <Route
            path="/notifications"
            element={
              user?.role === "customer" ? (
                <Notifications />
              ) : (
                <Navigate to={user ? "/" : "/login"} replace />
              )
            }
          />

          {/* Forgot password */}
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          {/* Verify OTP */}
          <Route
            path="/verify-otp"
            element={<VerifyOTP />}
          />

          {/* Reset password */}
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* 404 / Unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>

      {/* Footer */}
      <CredenceFooter />
    </div>
  );
}

// ========================================
// ROOT APPLICATION
// ========================================

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
