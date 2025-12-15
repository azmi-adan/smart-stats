import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/charts.css';

const ChartsDisplay = ({ user }) => {
  const { dashboardId } = useParams();
  const [charts, setCharts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newChart, setNewChart] = useState({
    title: '',
    chart_type: 'bar',
    data: JSON.stringify([{ name: 'Sample', value: 100 }], null, 2),
    config: '{}'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCharts();
  }, [dashboardId]);

  const fetchCharts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/dashboards/${dashboardId}/charts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCharts(data);
      }
    } catch (err) {
      console.error('Error fetching charts:', err);
      setError('Failed to load charts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChart = async (e) => {
    e.preventDefault();
    
    try {
      JSON.parse(newChart.data);
      JSON.parse(newChart.config);
    } catch (err) {
      setError('Invalid JSON in data or config');
      return;
    }

    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/dashboards/${dashboardId}/charts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newChart,
          data: JSON.parse(newChart.data),
          config: JSON.parse(newChart.config)
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchCharts();
        setCreating(false);
        setNewChart({
          title: '',
          chart_type: 'bar',
          data: JSON.stringify([{ name: 'Sample', value: 100 }], null, 2),
          config: '{}'
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create chart');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleDeleteChart = async (chartId) => {
    if (!window.confirm('Are you sure you want to delete this chart?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/charts/${chartId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCharts(charts.filter(c => c.id !== chartId));
      }
    } catch (err) {
      console.error('Error deleting chart:', err);
      setError('Failed to delete chart');
    }
  };

  const renderChart = (chart) => {
    const chartData = Array.isArray(chart.data) ? chart.data : [];
    
    switch (chart.chart_type) {
      case 'bar':
        return (
          <div className="chart-visualization">
            <div className="chart-bars">
              {chartData.map((item, index) => {
                const maxValue = Math.max(...chartData.map(d => d.value));
                const height = (item.value / maxValue) * 150;
                return (
                  <div key={index} className="bar-container">
                    <div 
                      className="bar" 
                      style={{ height: `${height}px` }}
                    >
                      <span className="bar-value">{item.value}</span>
                    </div>
                    <span className="bar-label">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'line':
        return (
          <div className="chart-visualization">
            <div className="line-chart-container">
              <svg viewBox="0 0 400 200" className="line-chart">
                <polyline
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="3"
                  points={chartData.map((d, i) => 
                    `${(i / (chartData.length - 1)) * 380 + 10},${190 - (d.value / 100) * 150}`
                  ).join(' ')}
                />
                {chartData.map((d, i) => (
                  <circle
                    key={i}
                    cx={(i / (chartData.length - 1)) * 380 + 10}
                    cy={190 - (d.value / 100) * 150}
                    r="4"
                    fill="#4a69bd"
                  />
                ))}
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4a69bd" />
                    <stop offset="100%" stopColor="#6a89cc" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        );

      case 'pie':
        return (
          <div className="chart-visualization">
            <div className="pie-chart-container">
              <div className="pie-chart">
                {chartData.map((item, index) => {
                  const percentage = (item.value / chartData.reduce((sum, d) => sum + d.value, 0)) * 100;
                  return (
                    <div 
                      key={index}
                      className="pie-segment"
                      style={{
                        backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
                        transform: `rotate(${index * (360 / chartData.length)}deg)`
                      }}
                    >
                      <div className="pie-label">{item.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="chart-visualization">
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="charts-loading">
        <div className="loading-spinner"></div>
        <p>Loading charts...</p>
      </div>
    );
  }

  return (
    <div className="charts-container">
      <div className="charts-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboards
        </button>
        <h1></h1>
        <button 
          className="create-chart-btn"
          onClick={() => setCreating(true)}
        >
          <span className="btn-icon">+</span>
          Add Chart
        </button>
      </div>

      {error && <div className="charts-error">{error}</div>}

      {creating && (
        <div className="create-chart-modal-overlay">
          <div className="create-chart-modal">
            <div className="modal-header">
              <h3>Create New Chart</h3>
              <button 
                className="close-modal"
                onClick={() => {
                  setCreating(false);
                  setError('');
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateChart}>
              <div className="modal-form">
                <div className="form-group">
                  <label htmlFor="chartTitle">Chart Title *</label>
                  <input
                    type="text"
                    id="chartTitle"
                    value={newChart.title}
                    onChange={(e) => setNewChart({...newChart, title: e.target.value})}
                    placeholder="Enter chart title"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="chartType">Chart Type</label>
                  <select
                    id="chartType"
                    value={newChart.chart_type}
                    onChange={(e) => setNewChart({...newChart, chart_type: e.target.value})}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="scatter">Scatter Plot</option>
                    <option value="table">Table</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="chartData">Data (JSON) *</label>
                  <textarea
                    id="chartData"
                    value={newChart.data}
                    onChange={(e) => setNewChart({...newChart, data: e.target.value})}
                    placeholder='[{"name": "Item 1", "value": 100}, ...]'
                    rows="6"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="chartConfig">Config (JSON)</label>
                  <textarea
                    id="chartConfig"
                    value={newChart.config}
                    onChange={(e) => setNewChart({...newChart, config: e.target.value})}
                    placeholder='{"color": "#4a69bd", "showLabels": true}'
                    rows="3"
                  />
                </div>
                {error && <div className="form-error">{error}</div>}
                <div className="modal-actions">
                  <button 
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setCreating(false);
                      setError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    Create Chart
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {charts.length === 0 ? (
        <div className="empty-charts">
          <div className="empty-icon">📊</div>
          <h3>No Charts Yet</h3>
          <p>Create your first chart to visualize data</p>
          <button 
            className="create-chart-btn"
            onClick={() => setCreating(true)}
          >
            Create Chart
          </button>
        </div>
      ) : (
        <div className="charts-grid">
          {charts.map((chart) => (
            <div key={chart.id} className="chart-card">
              <div className="chart-header">
                <div className="chart-type-badge">
                  {chart.chart_type.toUpperCase()}
                </div>
                <h3>{chart.title}</h3>
                <button 
                  className="delete-chart-btn"
                  onClick={() => handleDeleteChart(chart.id)}
                  title="Delete chart"
                >
                  ×
                </button>
              </div>
              <div className="chart-body">
                {renderChart(chart)}
              </div>
              <div className="chart-footer">
                <div className="chart-info">
                  <span className="info-item">
                    <span className="info-icon">📈</span>
                    {Array.isArray(chart.data) ? chart.data.length : 0} data points
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChartsDisplay;