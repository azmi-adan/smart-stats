import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import ChartsDisplay from './components/ChartsDisplay';
import DataInput from './components/DataInput';
import Splash from './components/Splash';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        <Navbar
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
          user={user}
        />

        <div className="main-content">
          <Routes>

            {/* Splash Page */}
            <Route
              path="/"
              element={
                isAuthenticated
                  ? <Navigate to="/dashboard" />
                  : <Splash />
              }
            />

            {/* Login */}
            <Route
              path="/login"
              element={
                isAuthenticated
                  ? <Navigate to="/dashboard" />
                  : <Login onLogin={handleLogin} />
              }
            />

            {/* Signup */}
            <Route
              path="/signup"
              element={
                isAuthenticated
                  ? <Navigate to="/dashboard" />
                  : <Signup />
              }
            />

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                isAuthenticated
                  ? <Dashboard user={user} />
                  : <Navigate to="/login" />
              }
            />

            {/* Charts */}
            <Route
              path="/charts/:dashboardId"
              element={
                isAuthenticated
                  ? <ChartsDisplay user={user} />
                  : <Navigate to="/login" />
              }
            />

            {/* Data Input */}
            <Route
              path="/data-input"
              element={
                isAuthenticated
                  ? <DataInput user={user} />
                  : <Navigate to="/login" />
              }
            />

            {/* Catch-all */}
            <Route
              path="*"
              element={<Navigate to="/" />}
            />

          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
