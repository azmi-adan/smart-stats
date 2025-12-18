import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AutoLogout = ({ onLogout, timeout = 15 * 60 * 1000 }) => {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const warningShownRef = useRef(false);

  const logout = useCallback(() => {
    // Clear all timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');

    // Call parent logout callback
    if (onLogout) {
      onLogout();
    }

    // Navigate to login
    navigate('/login', { replace: true });

    // Show logout message
    alert('You have been logged out due to inactivity.');
  }, [navigate, onLogout]);

  const resetTimer = useCallback(() => {
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    
    // Reset warning flag
    warningShownRef.current = false;

    // Update last activity timestamp
    localStorage.setItem('lastActivity', Date.now().toString());

    // Set warning timeout (2 minutes before logout)
    const warningTime = timeout - 2 * 60 * 1000;
    if (warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          const shouldStay = window.confirm(
            '⚠️ Your session will expire in 2 minutes due to inactivity.\n\nClick OK to stay logged in, or Cancel to logout now.'
          );

          if (shouldStay) {
            resetTimer(); // Reset if user wants to stay
          } else {
            logout(); // Logout immediately if user cancels
          }
        }
      }, warningTime);
    }

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeout);
  }, [timeout, logout]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    // Check if session has expired while user was away
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
      if (timeSinceLastActivity >= timeout) {
        logout();
        return;
      }
    }

    // Activity events to monitor
    const events = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'mousemove',
      'keypress'
    ];

    // Initialize timer
    resetTimer();

    // Add event listeners with throttling to avoid excessive resets
    let throttleTimeout = null;
    const throttledReset = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetTimer();
          throttleTimeout = null;
        }, 1000); // Throttle to once per second
      }
    };

    events.forEach(event => {
      window.addEventListener(event, throttledReset, { passive: true });
    });

    // Check for activity in other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'lastActivity') {
        resetTimer();
      } else if (e.key === 'token' && !e.newValue) {
        // Token was removed in another tab
        logout();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Cleanup function
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);

      events.forEach(event => {
        window.removeEventListener(event, throttledReset);
      });
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [timeout, logout, resetTimer]);

  // This component doesn't render anything
  return null;
};

export default AutoLogout;