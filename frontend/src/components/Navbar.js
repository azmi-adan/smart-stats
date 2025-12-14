import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/navbar.css';

const Navbar = ({ isAuthenticated, onLogout, user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            <span className="logo-icon">📊</span>
            <span className="logo-text">SmartStats AI</span>
          </Link>
        </div>
        
        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">
                <i className="nav-icon">📈</i>
                <span>Dashboards</span>
              </Link>
              <Link to="/data-input" className="nav-link">
                <i className="nav-icon">📥</i>
                <span>Upload Data</span>
              </Link>
              <div className="user-info">
                <span className="username">{user?.username}</span>
                <button onClick={handleLogout} className="logout-btn">
                  <i className="logout-icon">🚪</i>
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                <i className="nav-icon">🔐</i>
                <span>Login</span>
              </Link>
              <Link to="/signup" className="nav-link signup-link">
                <i className="nav-icon">📝</i>
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;