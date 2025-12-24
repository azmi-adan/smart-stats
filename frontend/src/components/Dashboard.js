import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/dashboard.css';

// Backend API URL
const API_URL = 'https://smart-stats-p91n.onrender.com';

const Dashboard = ({ user }) => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDashboardSelector, setShowDashboardSelector] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDashboard, setNewDashboard] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchDashboards();
    
    // Check if user came from data input with pending chart
    const pendingChartData = localStorage.getItem('pendingChartData');
    if (pendingChartData) {
      setShowDashboardSelector(true);
    }
  }, []);

  const fetchDashboards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboards(data);
      } else {
        setError('Failed to load dashboards');
      }
    } catch (err) {
      console.error('Error fetching dashboards:', err);
      setError('Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDashboard = async (e) => {
    e.preventDefault();
    if (!newDashboard.name.trim()) {
      setError('Dashboard name is required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newDashboard)
      });

      const data = await response.json();

      if (response.ok) {
        setDashboards([...dashboards, data]);
        setNewDashboard({ name: '', description: '' });
        setShowModal(false);
        
        // If user is selecting dashboard for chart, redirect to it
        if (showDashboardSelector) {
          handleSelectDashboard(data.id);
        }
      } else {
        setError(data.error || 'Failed to create dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDashboard = async (dashboardId) => {
    if (!window.confirm('Are you sure you want to delete this dashboard?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboards/${dashboardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setDashboards(dashboards.filter(d => d.id !== dashboardId));
      } else {
        setError('Failed to delete dashboard');
      }
    } catch (err) {
      console.error('Error deleting dashboard:', err);
      setError('Failed to delete dashboard');
    }
  };

  const handleViewCharts = (dashboardId) => {
    navigate(`/charts/${dashboardId}`);
  };

  const handleSelectDashboard = (dashboardId) => {
    navigate(`/charts/${dashboardId}`);
  };

  const handleCancelSelection = () => {
    setShowDashboardSelector(false);
    localStorage.removeItem('pendingChartData');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboards...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dashboard Selector Modal */}
      {showDashboardSelector && (
        <div className="dashboard-selector-overlay">
          <div className="dashboard-selector-modal">
            <div className="selector-header">
              <div>
                <h2>📊 Choose a Dashboard</h2>
                <p>Select where you want to add your chart</p>
              </div>
              <button 
                className="close-selector"
                onClick={handleCancelSelection}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="selector-content">
              {dashboards.length === 0 ? (
                <div className="no-dashboards-message">
                  <div className="message-icon">📋</div>
                  <h3>No Dashboards Yet</h3>
                  <p>Create your first dashboard to add your chart</p>
                  <button 
                    className="create-dashboard-btn-inline"
                    onClick={() => {
                      setShowDashboardSelector(false);
                      setShowModal(true);
                    }}
                  >
                    <span className="btn-icon">+</span>
                    Create Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <div className="dashboard-selector-grid">
                    {dashboards.map((dashboard) => (
                      <div 
                        key={dashboard.id} 
                        className="selector-card"
                        onClick={() => handleSelectDashboard(dashboard.id)}
                      >
                        <div className="selector-card-icon">📈</div>
                        <div className="selector-card-content">
                          <h3>{dashboard.name}</h3>
                          <p>{dashboard.description || 'No description'}</p>
                          <span className="chart-count-badge">
                            {dashboard.chart_count || 0} chart{(dashboard.chart_count || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="selector-arrow">→</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="selector-footer">
                    <button 
                      className="create-new-dashboard-btn"
                      onClick={() => {
                        setShowDashboardSelector(false);
                        setShowModal(true);
                      }}
                    >
                      <span className="btn-icon">+</span>
                      Create New Dashboard
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div className="header-content">
          <h1>My Dashboards</h1>
          <p className="welcome-text">
            Welcome back, <span className="highlight">{user?.username}</span>! 
            Manage your analytics dashboards here.
          </p>
        </div>
        <button className="create-dashboard-btn" onClick={() => setShowModal(true)}>
          <span className="btn-icon">+</span>
          Create Dashboard
        </button>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      {/* Create Dashboard Modal */}
      {showModal && (
        <div className="create-modal-overlay">
          <div className="create-modal">
            <div className="modal-header">
              <h3>Create New Dashboard</h3>
              <button 
                className="close-modal"
                onClick={() => {
                  setShowModal(false);
                  setNewDashboard({ name: '', description: '' });
                  setError('');
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateDashboard}>
              <div className="modal-form">
                <div className="form-group">
                  <label htmlFor="dashboardName">Dashboard Name *</label>
                  <input
                    type="text"
                    id="dashboardName"
                    value={newDashboard.name}
                    onChange={(e) => setNewDashboard({...newDashboard, name: e.target.value})}
                    placeholder="Enter dashboard name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dashboardDescription">Description</label>
                  <textarea
                    id="dashboardDescription"
                    value={newDashboard.description}
                    onChange={(e) => setNewDashboard({...newDashboard, description: e.target.value})}
                    placeholder="Describe your dashboard"
                    rows="3"
                  />
                </div>
                {error && <div className="form-error">{error}</div>}
                <div className="modal-actions">
                  <button 
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowModal(false);
                      setNewDashboard({ name: '', description: '' });
                      setError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Dashboard'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dashboard Grid or Empty State */}
      {dashboards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Dashboards Yet</h3>
          <p>Create your first dashboard to start visualizing data</p>
          <button className="create-first-btn" onClick={() => setShowModal(true)}>
            Create Dashboard
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
          {dashboards.map((dashboard) => (
            <div key={dashboard.id} className="dashboard-card">
              <div className="card-header">
                <div className="card-icon">📈</div>
                <div className="card-title">
                  <h3>{dashboard.name}</h3>
                  <p className="chart-count">
                    {dashboard.chart_count || 0} chart{(dashboard.chart_count || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <p className="card-description">
                {dashboard.description || 'No description provided'}
              </p>
              <div className="card-actions">
                <button className="view-btn" onClick={() => handleViewCharts(dashboard.id)}>
                  <span className="action-icon">👁️</span>
                  View Charts
                </button>
                <button className="delete-btn" onClick={() => handleDeleteDashboard(dashboard.id)}>
                  <span className="action-icon">🗑️</span>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/data-input" className="quick-action-btn">
          <span className="action-icon">📥</span>
          <div className="action-content">
            <h4>Upload Data</h4>
            <p>Import CSV or Excel files</p>
          </div>
        </Link>
        <Link to="/data-input" className="quick-action-btn">
          <span className="action-icon">🤖</span>
          <div className="action-content">
            <h4>AI Analysis</h4>
            <p>Get chart recommendations</p>
          </div>
        </Link>
        <button 
          className="quick-action-btn"
          onClick={() => setShowModal(true)}
        >
          <span className="action-icon">⚡</span>
          <div className="action-content">
            <h4>New Dashboard</h4>
            <p>Create from scratch</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;