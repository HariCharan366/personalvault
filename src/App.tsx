import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { VaultProvider } from '@/contexts/VaultContext';
import { ToastProvider } from '@/contexts/ToastContext';

// Layouts
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { SettingsLayout } from '@/pages/settings/SettingsLayout';

// Auth Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';

// Main Pages
import { Dashboard } from '@/pages/Dashboard';
import { Documents } from '@/pages/Documents';
import { DocumentDetails } from '@/pages/DocumentDetails';
import { Folders } from '@/pages/Folders';
import { Activity } from '@/pages/Activity';
import { Security } from '@/pages/security/Security';
import { Trash } from '@/pages/Trash';
import { Notifications } from '@/pages/Notifications';

// Settings Pages
import { ProfileSettings } from '@/pages/settings/ProfileSettings';
import { SecuritySettings } from '@/pages/settings/SecuritySettings';
import { StorageSettings } from '@/pages/settings/StorageSettings';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <VaultProvider>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Vault Routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/:id" element={<DocumentDetails />} />
                <Route path="/folders" element={<Folders />} />
                <Route path="/vault" element={<Navigate to="/documents" replace />} />
                <Route path="/activity" element={<Activity />} />

                {/* Security Routes */}
                <Route path="/security" element={<Security />} />
                <Route path="/security/login-history" element={<Security />} />
                <Route path="/security/active-sessions" element={<Security />} />

                {/* Trash & Notifications */}
                <Route path="/trash" element={<Trash />} />
                <Route path="/notifications" element={<Notifications />} />

                {/* Settings Sub-routes */}
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route index element={<Navigate to="/settings/profile" replace />} />
                  <Route path="profile" element={<ProfileSettings />} />
                  <Route path="security" element={<SecuritySettings />} />
                  <Route path="storage" element={<StorageSettings />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </VaultProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
