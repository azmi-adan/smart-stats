import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import ChartsDisplay from './components/ChartsDisplay';
import DataInput from './components/DataInput';
import Splash from './components/Splash';
import AutoLogout from './components/AutoLogout';

// Protected Route Component
const ProtectedRoute = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children, isAuthenticated }) => {
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setIsAuthenticated(true);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          // Clear invalid data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('lastActivity');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('lastActivity', Date.now().toString());
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {/* Auto-logout component - only active when authenticated */}
        {isAuthenticated && (
          <AutoLogout 
            onLogout={handleLogout} 
            timeout={15 * 60 * 1000} // 15 minutes
          />
        )}

        <Navbar
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
          user={user}
        />

        <div className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                <PublicRoute isAuthenticated={isAuthenticated}>
                  <Splash />
                </PublicRoute>
              }
            />

            <Route
              path="/login"
              element={
                <PublicRoute isAuthenticated={isAuthenticated}>
                  <Login onLogin={handleLogin} />
                </PublicRoute>
              }
            />

            <Route
              path="/signup"
              element={
                <PublicRoute isAuthenticated={isAuthenticated}>
                  <Signup />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Dashboard user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/charts/:dashboardId"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <ChartsDisplay user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/data-input"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <DataInput user={user} />
                </ProtectedRoute>
              }
            />

            {/* Catch-all Route */}
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;