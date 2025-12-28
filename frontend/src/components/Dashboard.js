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
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDashboard, setNewDashboard] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalCharts: 0,
    totalDashboards: 0,
    activeUsers: 1,
    dataPoints: 0
  });
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

  useEffect(() => {
    // Calculate stats when dashboards change
    const totalCharts = dashboards.reduce((sum, d) => sum + (d.chart_count || 0), 0);
    const totalDashboards = dashboards.length;
    setStats(prev => ({
      ...prev,
      totalCharts,
      totalDashboards,
      dataPoints: totalCharts * 50 // Estimate
    }));
  }, [dashboards]);

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

  // Premium Stats Component
  const StatsModal = () => (
    <div className="stats-modal-overlay" onClick={() => setShowStatsModal(false)}>
      <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="stats-modal-header">
          <h2>📊 Analytics Overview</h2>
          <button className="close-stats-modal" onClick={() => setShowStatsModal(false)}>×</button>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>Total Charts</h3>
              <div className="stat-value">{stats.totalCharts}</div>
              <div className="stat-change positive">+12% this week</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>Dashboards</h3>
              <div className="stat-value">{stats.totalDashboards}</div>
              <div className="stat-change neutral">Active</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Users</h3>
              <div className="stat-value">{stats.activeUsers}</div>
              <div className="stat-change positive">Online</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💾</div>
            <div className="stat-content">
              <h3>Data Points</h3>
              <div className="stat-value">{stats.dataPoints.toLocaleString()}</div>
              <div className="stat-change positive">+8% growth</div>
            </div>
          </div>
        </div>

        <div className="circular-progress-section">
          <h3 className="section-title">Performance Metrics</h3>
          <div className="circular-progress-grid">
            <CircularProgress 
              percentage={Math.min(100, (stats.totalCharts / 20) * 100)} 
              label="Chart Usage"
              color="#6C63FF"
            />
            <CircularProgress 
              percentage={Math.min(100, (stats.totalDashboards / 10) * 100)} 
              label="Dashboard Capacity"
              color="#4a69bd"
            />
            <CircularProgress 
              percentage={85} 
              label="Data Quality"
              color="#00d2ff"
            />
            <CircularProgress 
              percentage={92} 
              label="System Health"
              color="#7bed9f"
            />
          </div>
        </div>

        <div className="activity-timeline">
          <h3 className="section-title">Recent Activity</h3>
          <div className="timeline-items">
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <h4>Dashboard Created</h4>
                <p>New analytics dashboard initialized</p>
                <span className="timeline-time">2 hours ago</span>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <h4>Charts Updated</h4>
                <p>3 charts refreshed with new data</p>
                <span className="timeline-time">5 hours ago</span>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <h4>Data Import</h4>
                <p>Successfully imported 1,200 records</p>
                <span className="timeline-time">1 day ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Circular Progress Component
  const CircularProgress = ({ percentage, label, color }) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="circular-progress-container">
        <svg className="circular-progress" width="160" height="160">
          <circle
            className="circular-progress-bg"
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="12"
          />
          <circle
            className="circular-progress-bar"
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div className="circular-progress-text">
          <div className="percentage">{Math.round(percentage)}%</div>
          <div className="label">{label}</div>
        </div>
      </div>
    );
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
      {/* Stats Modal */}
      {showStatsModal && <StatsModal />}

      {/* Premium Stats Bar */}
      <div className="premium-stats-bar">
        <div className="stat-item" onClick={() => setShowStatsModal(true)}>
          <div className="stat-mini-icon">📊</div>
          <div className="stat-mini-content">
            <span className="stat-mini-label">Charts</span>
            <span className="stat-mini-value">{stats.totalCharts}</span>
          </div>
        </div>
        <div className="stat-item" onClick={() => setShowStatsModal(true)}>
          <div className="stat-mini-icon">📋</div>
          <div className="stat-mini-content">
            <span className="stat-mini-label">Dashboards</span>
            <span className="stat-mini-value">{stats.totalDashboards}</span>
          </div>
        </div>
        <div className="stat-item" onClick={() => setShowStatsModal(true)}>
          <div className="stat-mini-icon">💾</div>
          <div className="stat-mini-content">
            <span className="stat-mini-label">Data Points</span>
            <span className="stat-mini-value">{stats.dataPoints.toLocaleString()}</span>
          </div>
        </div>
        <button className="view-analytics-btn" onClick={() => setShowStatsModal(true)}>
          <span>View Analytics</span>
          <span className="arrow">→</span>
        </button>
      </div>

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