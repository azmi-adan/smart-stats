import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Splash.css';

const Splash = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 500),      // Logo fade in
      setTimeout(() => setStage(2), 1500),     // Slogan reveal
      setTimeout(() => setStage(3), 2800),     // Particles activate
      setTimeout(() => setStage(4), 3500),     // Glow intensifies
      setTimeout(() => {
        setIsExiting(true);                    // Start exit
        setTimeout(() => navigate('/login'), 1000); // Navigate after exit
      }, 4500)
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [navigate]);

  return (
    <div className={`splash-container ${isExiting ? 'splash-exit' : ''}`}>
      {/* Animated Background */}
      <div className="splash-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="grid-overlay"></div>
      </div>

      {/* Particle System */}
      <div className={`particles ${stage >= 3 ? 'active' : ''}`}>
        {[...Array(50)].map((_, i) => (
          <div 
            key={i} 
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      {/* Main Content */}
      <div className="splash-content">
        {/* Logo/Icon */}
        <div className={`splash-logo ${stage >= 1 ? 'visible' : ''}`}>
          <div className="logo-ring ring-1"></div>
          <div className="logo-ring ring-2"></div>
          <div className="logo-ring ring-3"></div>
          <div className="logo-center">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6C63FF" />
                  <stop offset="50%" stopColor="#4a69bd" />
                  <stop offset="100%" stopColor="#6C63FF" />
                </linearGradient>
              </defs>
              <rect x="20" y="60" width="12" height="25" fill="url(#logoGradient)" rx="2" />
              <rect x="37" y="45" width="12" height="40" fill="url(#logoGradient)" rx="2" />
              <rect x="54" y="30" width="12" height="55" fill="url(#logoGradient)" rx="2" />
              <rect x="71" y="50" width="12" height="35" fill="url(#logoGradient)" rx="2" />
              <circle cx="50" cy="20" r="3" fill="#fff" className="sparkle sparkle-1">
                <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="85" cy="35" r="2" fill="#fff" className="sparkle sparkle-2">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
              </circle>
              <circle cx="15" cy="40" r="2" fill="#fff" className="sparkle sparkle-3">
                <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="0.3s" />
              </circle>
            </svg>
          </div>
          <div className={`glow-pulse ${stage >= 4 ? 'intense' : ''}`}></div>
        </div>

        {/* Brand */}
        <div className={`splash-brand ${stage >= 1 ? 'visible' : ''}`}>
          <h1 className="brand-text">SmartStats</h1>
          <div className="brand-underline"></div>
        </div>

        {/* Slogan */}
        <div className={`splash-slogan ${stage >= 2 ? 'visible' : ''}`}>
          <div className="slogan-line">
            <span className="char" style={{animationDelay: '0s'}}>T</span>
            <span className="char" style={{animationDelay: '0.05s'}}>u</span>
            <span className="char" style={{animationDelay: '0.1s'}}>r</span>
            <span className="char" style={{animationDelay: '0.15s'}}>n</span>
            <span className="char" style={{animationDelay: '0.2s'}}> </span>
            <span className="char" style={{animationDelay: '0.25s'}}>D</span>
            <span className="char" style={{animationDelay: '0.3s'}}>a</span>
            <span className="char" style={{animationDelay: '0.35s'}}>t</span>
            <span className="char" style={{animationDelay: '0.4s'}}>a</span>
            <span className="char" style={{animationDelay: '0.45s'}}> </span>
            <span className="char" style={{animationDelay: '0.5s'}}>i</span>
            <span className="char" style={{animationDelay: '0.55s'}}>n</span>
            <span className="char" style={{animationDelay: '0.6s'}}>t</span>
            <span className="char" style={{animationDelay: '0.65s'}}>o</span>
            <span className="char" style={{animationDelay: '0.7s'}}> </span>
            <span className="char" style={{animationDelay: '0.75s'}}>I</span>
            <span className="char" style={{animationDelay: '0.8s'}}>n</span>
            <span className="char" style={{animationDelay: '0.85s'}}>s</span>
            <span className="char" style={{animationDelay: '0.9s'}}>i</span>
            <span className="char" style={{animationDelay: '0.95s'}}>g</span>
            <span className="char" style={{animationDelay: '1s'}}>h</span>
            <span className="char" style={{animationDelay: '1.05s'}}>t</span>
            <span className="char" style={{animationDelay: '1.1s'}}>s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
