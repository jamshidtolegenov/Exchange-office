import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import LoginPage from './pages/LoginPage';
import CityPage from './pages/CityPage';
import AdminPage from './pages/AdminPage';

function PrivateRoute({ children, allowedRole, allowedCity }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/login" replace />;
  if (allowedCity && user.city !== allowedCity) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRole="admin">
            <AdminPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/city/:cityId"
        element={
          <PrivateRoute allowedRole="operator">
            <CityPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          user
            ? user.role === 'admin'
              ? <Navigate to="/admin" replace />
              : <Navigate to={`/city/${user.city}`} replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  );
}
