import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/charts.css';

const ChartsDisplay = ({ user }) => {
  const { dashboardId } = useParams();
  const [charts, setCharts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDashboardSelector, setShowDashboardSelector] = useState(false);
  const [pendingChartData, setPendingChartData] = useState(null);
  const [selectedDashboardForChart, setSelectedDashboardForChart] = useState(null);
  const [newChart, setNewChart] = useState({
    title: '',
    chart_type: 'bar',
    data: JSON.stringify([{ name: 'Sample', value: 100 }], null, 2),
    config: '{}'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const chartRefs = useRef({});

  useEffect(() => {
    // Check for pending chart data from DataInput
    const storedPendingData = localStorage.getItem('pendingChartData');
    if (storedPendingData) {
      try {
        const parsedData = JSON.parse(storedPendingData);
        setPendingChartData(parsedData);
        
        // If we're not on a specific dashboard, show dashboard selector
        if (!dashboardId) {
          fetchDashboards();
          setShowDashboardSelector(true);
        } else {
          // If we're on a specific dashboard, pre-fill the form
          prefillChartForm(parsedData);
          setCreating(true);
          // Clear the pending data
          localStorage.removeItem('pendingChartData');
        }
      } catch (err) {
        console.error('Error parsing pending chart data:', err);
        localStorage.removeItem('pendingChartData');
      }
    }
    
    if (dashboardId) {
      fetchCharts();
    } else {
      setLoading(false);
    }
  }, [dashboardId]);

  const fetchDashboards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/dashboards', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboards(data);
      }
    } catch (err) {
      console.error('Error fetching dashboards:', err);
    }
  };

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

  const prefillChartForm = (data) => {
    if (!data || !data.suggestion) return;

    const suggestion = data.suggestion;
    
    // Pre-fill the form with AI suggestion data
    setNewChart({
      title: suggestion.title || 'AI Generated Chart',
      chart_type: suggestion.chart_type || 'bar',
      data: JSON.stringify(suggestion.data || [], null, 2),
      config: JSON.stringify(suggestion.config || {}, null, 2)
    });
  };

  const handleDashboardSelection = (selectedDashboardId) => {
    setSelectedDashboardForChart(selectedDashboardId);
    setShowDashboardSelector(false);
    
    // Pre-fill the chart form with pending data
    if (pendingChartData) {
      prefillChartForm(pendingChartData);
    }
    
    // Navigate to the selected dashboard
    navigate(`/charts/${selectedDashboardId}`);
    
    // Open the create chart modal
    setCreating(true);
    
    // Clear pending data
    localStorage.removeItem('pendingChartData');
    setPendingChartData(null);
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
    
    // Use the selected dashboard ID or the current dashboardId
    const targetDashboardId = selectedDashboardForChart || dashboardId;
    
    if (!targetDashboardId) {
      setError('Please select a dashboard first');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/dashboards/${targetDashboardId}/charts`, {
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
        setSelectedDashboardForChart(null);
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

  // Download chart as PNG using native Canvas API
  const downloadChartAsPNG = async (chart) => {
    try {
      const chartData = Array.isArray(chart.data) ? chart.data : [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = 800;
      canvas.height = 600;
      
      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add title
      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(chart.title, canvas.width / 2, 40);
      
      // Add chart type badge
      ctx.fillStyle = '#4a69bd';
      ctx.font = '12px Arial';
      ctx.fillText(chart.chart_type.toUpperCase(), canvas.width / 2, 70);
      
      const chartArea = {
        x: 80,
        y: 100,
        width: canvas.width - 160,
        height: canvas.height - 180
      };

      switch (chart.chart_type) {
        case 'bar':
          drawBarChart(ctx, chartData, chartArea);
          break;
        case 'line':
          drawLineChart(ctx, chartData, chartArea);
          break;
        case 'pie':
          drawPieChart(ctx, chartData, canvas.width / 2, canvas.height / 2, 200);
          break;
        default:
          drawTable(ctx, chartData, chartArea);
      }

      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chart.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png');

    } catch (err) {
      console.error('Error downloading chart:', err);
      alert('Failed to download chart: ' + err.message);
    }
  };

  // Draw bar chart on canvas
  const drawBarChart = (ctx, data, area) => {
    if (data.length === 0) return;

    const maxValue = Math.max(...data.map(d => d.value));
    const barWidth = area.width / data.length - 20;
    const padding = 10;

    // Draw axes
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(area.x, area.y);
    ctx.lineTo(area.x, area.y + area.height);
    ctx.lineTo(area.x + area.width, area.y + area.height);
    ctx.stroke();

    // Draw bars
    data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * (area.height - 40);
      const x = area.x + (index * (barWidth + 20)) + padding;
      const y = area.y + area.height - barHeight - 20;

      // Bar gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Value on top
      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(item.value, x + barWidth / 2, y - 5);

      // Label at bottom
      ctx.fillStyle = '#7f8c8d';
      ctx.font = '12px Arial';
      ctx.save();
      ctx.translate(x + barWidth / 2, area.y + area.height - 5);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(item.name, 0, 0);
      ctx.restore();
    });
  };

  // Draw line chart on canvas
  const drawLineChart = (ctx, data, area) => {
    if (data.length === 0) return;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;

    // Draw axes
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(area.x, area.y);
    ctx.lineTo(area.x, area.y + area.height);
    ctx.lineTo(area.x + area.width, area.y + area.height);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = area.y + (area.height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.width, y);
      ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = '#4a69bd';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((item, index) => {
      const x = area.x + (index / (data.length - 1 || 1)) * area.width;
      const y = area.y + area.height - ((item.value - minValue) / range) * area.height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    data.forEach((item, index) => {
      const x = area.x + (index / (data.length - 1 || 1)) * area.width;
      const y = area.y + area.height - ((item.value - minValue) / range) * area.height;

      ctx.fillStyle = '#4a69bd';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Value label
      ctx.fillStyle = '#2c3e50';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(item.value, x, y - 10);

      // Name label
      ctx.fillStyle = '#7f8c8d';
      ctx.fillText(item.name, x, area.y + area.height + 20);
    });
  };

  // Draw pie chart on canvas
  const drawPieChart = (ctx, data, centerX, centerY, radius) => {
    if (data.length === 0) return;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2;

    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0'
    ];

    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      // Draw slice
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      // Draw border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.name, labelX, labelY);
      
      const percentage = ((item.value / total) * 100).toFixed(1) + '%';
      ctx.font = '12px Arial';
      ctx.fillText(percentage, labelX, labelY + 20);

      currentAngle += sliceAngle;
    });
  };

  // Draw table on canvas
  const drawTable = (ctx, data, area) => {
    if (data.length === 0) return;

    const rowHeight = 30;
    const colWidth = area.width / 2;

    // Header
    ctx.fillStyle = '#4a69bd';
    ctx.fillRect(area.x, area.y, area.width, rowHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Name', area.x + 10, area.y + 20);
    ctx.fillText('Value', area.x + colWidth + 10, area.y + 20);

    // Rows
    data.forEach((item, index) => {
      const y = area.y + rowHeight * (index + 1);
      
      // Alternate row colors
      ctx.fillStyle = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      ctx.fillRect(area.x, y, area.width, rowHeight);

      // Border
      ctx.strokeStyle = '#e0e0e0';
      ctx.strokeRect(area.x, y, area.width, rowHeight);

      // Text
      ctx.fillStyle = '#2c3e50';
      ctx.font = '14px Arial';
      ctx.fillText(item.name, area.x + 10, y + 20);
      ctx.fillText(String(item.value), area.x + colWidth + 10, y + 20);
    });
  };

  // Download chart data as JSON
  const downloadChartAsJSON = (chart) => {
    const dataStr = JSON.stringify({
      title: chart.title,
      type: chart.chart_type,
      data: chart.data,
      config: chart.config,
      created_at: chart.created_at
    }, null, 2);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download chart data as CSV
  const downloadChartAsCSV = (chart) => {
    const chartData = Array.isArray(chart.data) ? chart.data : [];
    
    if (chartData.length === 0) {
      alert('No data to export');
      return;
    }

    // Get all unique keys from the data
    const keys = Array.from(new Set(chartData.flatMap(Object.keys)));
    
    // Create CSV header
    let csv = keys.join(',') + '\n';
    
    // Create CSV rows
    chartData.forEach(row => {
      const values = keys.map(key => {
        const value = row[key];
        // Handle values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
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
      {/* Dashboard Selector Modal */}
      {showDashboardSelector && (
        <div className="create-chart-modal-overlay">
          <div className="create-chart-modal">
            <div className="modal-header">
              <h3>Select Dashboard for Your Chart</h3>
              <button 
                className="close-modal"
                onClick={() => {
                  setShowDashboardSelector(false);
                  localStorage.removeItem('pendingChartData');
                  setPendingChartData(null);
                  navigate('/dashboard');
                }}
              >
                ×
              </button>
            </div>
            <div className="dashboard-selector-content">
              <p className="selector-description">
                Choose which dashboard you want to add your AI-generated chart to:
              </p>
              {pendingChartData && pendingChartData.analysis && (
                <div className="pending-chart-preview">
                  <h4>📊 Chart Preview</h4>
                  <div className="preview-details">
                    <p><strong>Type:</strong> {pendingChartData.suggestion?.chart_type || 'N/A'}</p>
                    <p><strong>Title:</strong> {pendingChartData.suggestion?.title || 'N/A'}</p>
                    <p><strong>Data Points:</strong> {pendingChartData.suggestion?.data?.length || 0}</p>
                  </div>
                </div>
              )}
              <div className="dashboard-list">
                {dashboards.length === 0 ? (
                  <div className="no-dashboards">
                    <p>No dashboards found. Please create a dashboard first.</p>
                    <button 
                      className="create-dashboard-btn"
                      onClick={() => navigate('/dashboard')}
                    >
                      Go to Dashboards
                    </button>
                  </div>
                ) : (
                  dashboards.map((dash) => (
                    <div 
                      key={dash.id} 
                      className="dashboard-option"
                      onClick={() => handleDashboardSelection(dash.id)}
                    >
                      <div className="dashboard-option-icon">📊</div>
                      <div className="dashboard-option-details">
                        <h4>{dash.name}</h4>
                        <p>{dash.description || 'No description'}</p>
                      </div>
                      <div className="dashboard-option-arrow">→</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div className="chart-actions">
                  <div className="download-dropdown">
                    <button 
                      className="download-btn"
                      title="Download chart"
                    >
                      ⬇
                    </button>
                    <div className="download-menu">
                      <button 
                        onClick={() => downloadChartAsPNG(chart)}
                        className="download-option"
                      >
                        📸 Download as PNG
                      </button>
                      <button 
                        onClick={() => downloadChartAsJSON(chart)}
                        className="download-option"
                      >
                        📄 Download as JSON
                      </button>
                      <button 
                        onClick={() => downloadChartAsCSV(chart)}
                        className="download-option"
                      >
                        📊 Download as CSV
                      </button>
                    </div>
                  </div>
                  <button 
                    className="delete-chart-btn"
                    onClick={() => handleDeleteChart(chart.id)}
                    title="Delete chart"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div 
                className="chart-body"
                ref={(el) => chartRefs.current[chart.id] = el}
              >
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