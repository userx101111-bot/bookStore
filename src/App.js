// ============================================================
// ✅ App.js — Final Version with Wishlist + Variant-Aware Product Routes
// ============================================================

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

// === Pages ===
import Login from "./pages/Login";
import CreateAccount from "./pages/createaccount";
import ForgotPassword from "./pages/forgotpassword";
import Homepage from "./pages/homepage";
import Profile from "./pages/profile";
import ProductPage from "./pages/ProductPage";
import Address from "./pages/address";
import Checkout from "./pages/checkOut";
import Cart from "./pages/Cart";
import AboutFAQs from "./pages/AboutFAQs";
import MyPurchases from "./pages/MyPurchases";
import Wallet from "./pages/Wallet";
import WishlistPage from "./pages/WishlistPage"; // ✅ Added this import
import StaticPage from "./pages/StaticPage";
import MangaCategoryPage from "./pages/MangaCategoryPage";
import FeaturedPage from "./pages/FeaturedPage";
import ProductCatalogPrint from "./pages/ProductCatalogPrint";

// === Components ===
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./components/AdminDashboard";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// === Context Providers ===
import { UserProvider } from "./contexts/UserContext";
import { CartProvider } from "./contexts/CartContext";
import { WishlistProvider } from "./contexts/WishlistContext";

// === Styles ===
import "./styles/Responsive.css";
import "./App.css";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// ============================================================
// ✅ AppLayout — Handles all page routing
// ============================================================
const AppLayout = () => {
  const location = useLocation();
  const path = location.pathname;

  const hideNavbarFooter =
    path.includes("/admin") ||
    path === "/login" ||
    path === "/create-account" ||
    path === "/forgot-password";

  return (
    <>
      {!hideNavbarFooter && <Navbar />}
      
      <Routes>
        {/* === Public Routes === */}
        <Route path="/" element={<Homepage />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about-faqs" element={<AboutFAQs />} />

        {/* ✅ Product routes with variant support */}
        <Route
          path="/product/:slug"
          element={<ProductPage key={window.location.pathname} />}
        />
        <Route
          path="/product/:slug/:variant"
          element={<ProductPage key={window.location.pathname} />}
        />

        {/* ✅ Category routes */}
        <Route
          path="/kids-manga"
          element={
            <MangaCategoryPage baseCategory="kids-manga" heading="KIDS MANGA" />
          }
        />
        <Route
          path="/kids-manga/:subcategory"
          element={
            <MangaCategoryPage baseCategory="kids-manga" heading="KIDS MANGA" />
          }
        />

        <Route
          path="/young-boys-manga"
          element={
            <MangaCategoryPage
              baseCategory="young-boys-manga"
              heading="YOUNG BOYS MANGA"
            />
          }
        />
        <Route
          path="/young-boys-manga/:subcategory"
          element={
            <MangaCategoryPage
              baseCategory="young-boys-manga"
              heading="YOUNG BOYS MANGA"
            />
          }
        />

        <Route
          path="/young-girls-manga"
          element={
            <MangaCategoryPage
              baseCategory="young-girls-manga"
              heading="YOUNG GIRLS MANGA"
            />
          }
        />
        <Route
          path="/young-girls-manga/:subcategory"
          element={
            <MangaCategoryPage
              baseCategory="young-girls-manga"
              heading="YOUNG GIRLS MANGA"
            />
          }
        />

        {/* ✅ Featured product routes */}
        <Route
          path="/promotions"
          element={<FeaturedPage featureType="promotions" />}
        />
        <Route
          path="/new-arrivals"
          element={<FeaturedPage featureType="new-arrivals" />}
        />
        <Route
          path="/popular-products"
          element={<FeaturedPage featureType="popular-products" />}
        />

        {/* ✅ Static Pages */}
        <Route path="/:slug" element={<StaticPage />} />
  {/* ✅ Admin Catalog Print Route */}
  <Route
    path="/admin/catalog-print"
    element={
      <ProtectedRoute adminOnly={true}>
        <ProductCatalogPrint />
      </ProtectedRoute>
    }
  />
        {/* === Admin Routes === */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* === User-only routes === */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/address"
          element={
            <ProtectedRoute>
              <Address />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-purchases"
          element={
            <ProtectedRoute>
              <MyPurchases />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />

        {/* ✅ Wishlist Route (Protected for logged-in users) */}
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
      </Routes>

      {!hideNavbarFooter && <Footer />}
    </>
  );
};

// ============================================================
// ✅ App — Wraps AppLayout with Providers and Router
// ============================================================
function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <UserProvider>
          <CartProvider>
            <WishlistProvider>
              <AppLayout />
            </WishlistProvider>
          </CartProvider>
        </UserProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
