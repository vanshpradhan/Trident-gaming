/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CursorGlow } from "./components/CursorGlow";
import { Navbar } from "./components/Navbar";
import { Home } from "./components/Home";
import { Consoles } from "./components/Consoles";
import { Booking } from "./components/Booking";
import { Snacks } from "./components/Snacks";
import { Loyalty } from "./components/Loyalty";
import { Map } from "./components/Map";
import { AdminPreview } from "./components/AdminPreview";
import { Footer } from "./components/Footer";

function AppLayout() {
  const location = useLocation();
  const isAdminPage = location.pathname === "/admin";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground flex flex-col">
      <CursorGlow />
      {!isAdminPage && <Navbar />}
      
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/consoles" element={<Consoles />} />
          <Route path="/map" element={<Map />} />

          {/* Customer-only routes — admin gets redirected to /admin */}
          <Route path="/booking" element={
            <ProtectedRoute requiredRole="customer">
              <Booking />
            </ProtectedRoute>
          } />
          <Route path="/snacks" element={
            <ProtectedRoute requiredRole="customer">
              <Snacks />
            </ProtectedRoute>
          } />
          <Route path="/rewards" element={
            <ProtectedRoute requiredRole="customer">
              <Loyalty />
            </ProtectedRoute>
          } />

          {/* Admin-only route */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminPreview />
            </ProtectedRoute>
          } />
        </Routes>
      </main>

      {!isAdminPage && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
