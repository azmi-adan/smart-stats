import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/charts.css';

// Backend API URL
const API_URL = 'https://smart-stats-p91n.onrender.com';

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

  // CRITICAL: Clean data function - removes ALL null/undefined values
  const cleanChartData = (data) => {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => {
      const cleanItem = {};
      Object.keys(item).forEach(key => {
        const val = item[key];
        // Convert null/undefined/empty to empty string for names, 0 for values
        if (key === 'value' || key === 'y' || !isNaN(Number(val))) {
          cleanItem[key] = (val === null || val === undefined || val === '') ? 0 : val;
        } else {
          cleanItem[key] = (val === null || val === undefined || val === '') ? '' : String(val);
        }
      });
      return cleanItem;
    });
  };

  // Helper to normalize data - finds name and value fields regardless of column names
  const normalizeChartData = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    const firstItem = data[0];
    const keys = Object.keys(firstItem);
    
    // Find which key is the "name" field (text field)
    // Find which key is the "value" field (numeric field)
    let nameKey = null;
    let valueKey = null;
    
    keys.forEach(key => {
      const val = firstItem[key];
      const isNumeric = !isNaN(Number(val)) && val !== '' && val !== null;
      
      if (isNumeric && !valueKey) {
        valueKey = key; // First numeric field
      } else if (!isNumeric && !nameKey) {
        nameKey = key; // First text field
      }
    });
    
    // Fallback if not found
    if (!nameKey) nameKey = keys[0];
    if (!valueKey) valueKey = keys[1] || keys[0];
    
    console.log('Normalizing data - nameKey:', nameKey, 'valueKey:', valueKey);
    
    // Normalize the data to always have 'name' and 'value' keys
    return data.map(item => ({
      name: String(item[nameKey] || ''),
      value: Number(item[valueKey]) || 0
    }));
  };

  // Helper function to safely get numeric value
  const getNumericValue = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // Helper function to safely get string value
  const getStringValue = (val, defaultVal = '') => {
    if (val === null || val === undefined || val === '') return defaultVal;
    return String(val);
  };

  useEffect(() => {
    const storedPendingData = localStorage.getItem('pendingChartData');
    if (storedPendingData) {
      try {
        const parsedData = JSON.parse(storedPendingData);
        
        // Clean the data immediately
        if (parsedData.suggestion && parsedData.suggestion.data) {
          parsedData.suggestion.data = cleanChartData(parsedData.suggestion.data);
        }
        
        setPendingChartData(parsedData);
        
        if (!dashboardId) {
          fetchDashboards();
          setShowDashboardSelector(true);
        } else {
          prefillChartForm(parsedData);
          setCreating(true);
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
      const response = await fetch(`${API_URL}/api/dashboards`, {
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
      const response = await fetch(`${API_URL}/api/dashboards/${dashboardId}/charts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // CRITICAL: Clean ALL chart data from the database
        const cleanedCharts = data.map(chart => ({
          ...chart,
          data: cleanChartData(chart.data)
        }));
        
        console.log('Cleaned charts:', cleanedCharts);
        setCharts(cleanedCharts);
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
    const cleanData = cleanChartData(suggestion.data || []);
    
    setNewChart({
      title: suggestion.title || 'AI Generated Chart',
      chart_type: suggestion.chart_type || 'bar',
      data: JSON.stringify(cleanData, null, 2),
      config: JSON.stringify(suggestion.config || {}, null, 2)
    });
  };

  const handleDashboardSelection = (selectedDashboardId) => {
    setSelectedDashboardForChart(selectedDashboardId);
    setShowDashboardSelector(false);
    
    if (pendingChartData) {
      prefillChartForm(pendingChartData);
    }
    
    navigate(`/charts/${selectedDashboardId}`);
    setCreating(true);
    localStorage.removeItem('pendingChartData');
    setPendingChartData(null);
  };

  const handleCreateChart = async (e) => {
    e.preventDefault();
    
    let parsedData, parsedConfig;
    
    try {
      parsedData = JSON.parse(newChart.data);
      parsedConfig = JSON.parse(newChart.config);
      
      // Clean the data before sending
      parsedData = cleanChartData(parsedData);
      
    } catch (err) {
      setError('Invalid JSON in data or config');
      return;
    }

    setError('');
    const targetDashboardId = selectedDashboardForChart || dashboardId;
    
    if (!targetDashboardId) {
      setError('Please select a dashboard first');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboards/${targetDashboardId}/charts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newChart.title,
          chart_type: newChart.chart_type,
          data: parsedData,
          config: parsedConfig
        })
      });

      if (response.ok) {
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
      const response = await fetch(`${API_URL}/api/charts/${chartId}`, {
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

  const downloadChartAsPNG = async (chart) => {
    try {
      const cleanedData = cleanChartData(chart.data);
      const chartData = normalizeChartData(cleanedData);
      
      if (chartData.length === 0) {
        alert('No data available to download');
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 1200;
      canvas.height = 800;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(chart.title || 'Untitled Chart', canvas.width / 2, 60);
      
      ctx.fillStyle = '#6C63FF';
      ctx.font = '16px "Segoe UI", Arial, sans-serif';
      ctx.fillText((chart.chart_type || 'bar').toUpperCase(), canvas.width / 2, 90);
      
      const chartArea = {
        x: 120,
        y: 140,
        width: canvas.width - 240,
        height: canvas.height - 220
      };

      switch (chart.chart_type) {
        case 'bar':
          drawBarChart(ctx, chartData, chartArea);
          break;
        case 'line':
          drawLineChart(ctx, chartData, chartArea);
          break;
        case 'pie':
          drawPieChart(ctx, chartData, canvas.width / 2, canvas.height / 2 + 40, 280);
          break;
        default:
          drawTable(ctx, chartData, chartArea);
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to generate image');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = (chart.title || 'chart').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${filename}_chart.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png');

    } catch (err) {
      console.error('Error downloading chart:', err);
      alert('Failed to download chart: ' + err.message);
    }
  };

  const drawBarChart = (ctx, data, area) => {
    if (data.length === 0) return;

    const values = data.map(d => getNumericValue(d.value));
    const maxValue = Math.max(...values, 1);
    const barWidth = Math.min((area.width / data.length) * 0.7, 80);
    const spacing = (area.width - (barWidth * data.length)) / (data.length + 1);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(area.x, area.y);
    ctx.lineTo(area.x, area.y + area.height);
    ctx.lineTo(area.x + area.width, area.y + area.height);
    ctx.stroke();

    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = area.y + (area.height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.width, y);
      ctx.stroke();
    }

    data.forEach((item, index) => {
      const value = getNumericValue(item.value);
      const barHeight = (value / maxValue) * (area.height - 60);
      const x = area.x + spacing + (index * (barWidth + spacing));
      const y = area.y + area.height - barHeight - 40;

      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, '#6C63FF');
      gradient.addColorStop(1, '#4a69bd');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(value), x + barWidth / 2, y - 8);

      ctx.fillStyle = '#666666';
      ctx.font = '14px "Segoe UI", Arial, sans-serif';
      const label = getStringValue(item.name, 'Item ' + (index + 1));
      const maxLabelWidth = barWidth + 20;
      
      if (ctx.measureText(label).width > maxLabelWidth) {
        ctx.save();
        ctx.translate(x + barWidth / 2, area.y + area.height - 10);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(label, x + barWidth / 2, area.y + area.height - 10);
      }
    });
  };

  const drawLineChart = (ctx, data, area) => {
    if (data.length === 0) return;

    const values = data.map(d => getNumericValue(d.value));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(area.x, area.y);
    ctx.lineTo(area.x, area.y + area.height);
    ctx.lineTo(area.x + area.width, area.y + area.height);
    ctx.stroke();

    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = area.y + (area.height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.width, y);
      ctx.stroke();
      
      const value = maxValue - (range / 5) * i;
      ctx.fillStyle = '#666666';
      ctx.font = '12px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(1), area.x - 10, y + 5);
    }

    const gradient = ctx.createLinearGradient(area.x, 0, area.x + area.width, 0);
    gradient.addColorStop(0, '#6C63FF');
    gradient.addColorStop(1, '#4a69bd');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((item, index) => {
      const value = getNumericValue(item.value);
      const x = area.x + (index / (data.length - 1 || 1)) * area.width;
      const y = area.y + area.height - ((value - minValue) / range) * area.height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    data.forEach((item, index) => {
      const value = getNumericValue(item.value);
      const x = area.x + (index / (data.length - 1 || 1)) * area.width;
      const y = area.y + area.height - ((value - minValue) / range) * area.height;

      ctx.fillStyle = '#6C63FF';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(value), x, y - 15);

      ctx.fillStyle = '#666666';
      ctx.font = '13px "Segoe UI", Arial, sans-serif';
      const label = getStringValue(item.name, 'Point ' + (index + 1));
      ctx.fillText(label, x, area.y + area.height + 25);
    });
  };

  const drawPieChart = (ctx, data, centerX, centerY, radius) => {
    if (data.length === 0) return;

    const values = data.map(d => getNumericValue(d.value));
    const total = values.reduce((sum, val) => sum + val, 0);
    
    if (total === 0) {
      ctx.fillStyle = '#666666';
      ctx.font = '20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data to display', centerX, centerY);
      return;
    }

    let currentAngle = -Math.PI / 2;

    const colors = [
      '#6C63FF', '#4a69bd', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0'
    ];

    data.forEach((item, index) => {
      const value = getNumericValue(item.value);
      const sliceAngle = (value / total) * 2 * Math.PI;
      
      if (sliceAngle > 0) {
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        if (sliceAngle > 0.15) {
          const labelAngle = currentAngle + sliceAngle / 2;
          const labelX = centerX + Math.cos(labelAngle) * (radius * 0.65);
          const labelY = centerY + Math.sin(labelAngle) * (radius * 0.65);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const percentage = ((value / total) * 100).toFixed(1) + '%';
          ctx.fillText(percentage, labelX, labelY);
          
          const nameX = centerX + Math.cos(labelAngle) * (radius + 60);
          const nameY = centerY + Math.sin(labelAngle) * (radius + 60);
          ctx.fillStyle = '#1a1a2e';
          ctx.font = '14px "Segoe UI", Arial, sans-serif';
          const label = getStringValue(item.name, 'Item ' + (index + 1));
          ctx.fillText(label, nameX, nameY);
        }

        currentAngle += sliceAngle;
      }
    });
  };

  const drawTable = (ctx, data, area) => {
    if (data.length === 0) return;

    const rowHeight = 40;
    const colWidth = area.width / 2;
    const maxRows = Math.floor(area.height / rowHeight) - 1;
    const displayData = data.slice(0, maxRows);

    ctx.fillStyle = '#6C63FF';
    ctx.fillRect(area.x, area.y, area.width, rowHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Name', area.x + 20, area.y + 26);
    ctx.fillText('Value', area.x + colWidth + 20, area.y + 26);

    displayData.forEach((item, index) => {
      const y = area.y + rowHeight * (index + 1);
      
      ctx.fillStyle = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
      ctx.fillRect(area.x, y, area.width, rowHeight);

      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.strokeRect(area.x, y, area.width, rowHeight);

      ctx.fillStyle = '#1a1a2e';
      ctx.font = '16px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      const nameText = getStringValue(item.name, 'Item ' + (index + 1));
      const valueText = String(getNumericValue(item.value));
      ctx.fillText(nameText, area.x + 20, y + 26);
      ctx.fillText(valueText, area.x + colWidth + 20, y + 26);
    });

    if (data.length > maxRows) {
      const y = area.y + rowHeight * (displayData.length + 1);
      ctx.fillStyle = '#666666';
      ctx.font = 'italic 14px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`... and ${data.length - maxRows} more rows`, area.x + area.width / 2, y + 20);
    }
  };

  const downloadChartAsJSON = (chart) => {
    try {
      const cleanData = cleanChartData(chart.data);
      const dataStr = JSON.stringify({
        title: chart.title || 'Untitled Chart',
        type: chart.chart_type || 'bar',
        data: cleanData,
        config: chart.config || {},
        created_at: chart.created_at || new Date().toISOString()
      }, null, 2);

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = (chart.title || 'chart').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${filename}_data.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading JSON:', err);
      alert('Failed to download JSON data');
    }
  };

  const downloadChartAsCSV = (chart) => {
    try {
      const chartData = cleanChartData(chart.data);
      
      if (chartData.length === 0) {
        alert('No data to export');
        return;
      }

      const keys = Array.from(new Set(chartData.flatMap(Object.keys)));
      let csv = keys.join(',') + '\n';
      
      chartData.forEach(row => {
        const values = keys.map(key => {
          const value = row[key];
          if (value === null || value === undefined || value === '') {
            return '';
          }
          const strValue = String(value);
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        });
        csv += values.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = (chart.title || 'chart').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${filename}_data.csv`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      alert('Failed to download CSV data');
    }
  };

  const renderChart = (chart) => {
    const cleanedData = cleanChartData(chart.data);
    const chartData = normalizeChartData(cleanedData);
    
    console.log('Rendering chart with normalized data:', chartData);
    
    if (chartData.length === 0) {
      return (
        <div className="chart-visualization">
          <div className="no-data-message">
            <span className="no-data-icon">📊</span>
            <p>No data available for this chart</p>
          </div>
        </div>
      );
    }
    
    switch (chart.chart_type) {
      case 'bar':
        const maxValue = Math.max(...chartData.map(d => getNumericValue(d.value)), 1);
        return (
          <div className="chart-visualization">
            <div className="chart-bars">
              {chartData.map((item, index) => {
                const value = getNumericValue(item.value);
                const height = (value / maxValue) * 100;
                const displayName = getStringValue(item.name, 'Item ' + (index + 1));
                return (
                  <div key={index} className="bar-container">
                    <div 
                      className="bar" 
                      style={{ height: `${height}%` }}
                    >
                      <span className="bar-value">{value}</span>
                    </div>
                    <span className="bar-label" title={displayName}>{displayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'line':
        const values = chartData.map(d => getNumericValue(d.value));
        const min = Math.min(...values, 0);
        const max = Math.max(...values, 1);
        const range = max - min || 1;
        
        return (
          <div className="chart-visualization">
            <div className="line-chart-container">
              <svg viewBox="0 0 500 300" className="line-chart" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id={`lineGradient-${chart.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6C63FF" />
                    <stop offset="100%" stopColor="#4a69bd" />
                  </linearGradient>
                  <linearGradient id={`areaGradient-${chart.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6C63FF" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                
                {[0, 1, 2, 3, 4].map(i => (
                  <line
                    key={i}
                    x1="40"
                    y1={40 + (i * 52)}
                    x2="480"
                    y2={40 + (i * 52)}
                    stroke="#f0f0f0"
                    strokeWidth="1"
                  />
                ))}
                
                <polygon
                  fill={`url(#areaGradient-${chart.id})`}
                  points={
                    chartData.map((d, i) => {
                      const x = 40 + (i / (chartData.length - 1 || 1)) * 440;
                      const value = getNumericValue(d.value);
                      const y = 40 + 208 - ((value - min) / range) * 208;
                      return `${x},${y}`;
                    }).join(' ') + ` 480,248 40,248`
                  }
                />
                
                <polyline
                  fill="none"
                  stroke={`url(#lineGradient-${chart.id})`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartData.map((d, i) => {
                    const x = 40 + (i / (chartData.length - 1 || 1)) * 440;
                    const value = getNumericValue(d.value);
                    const y = 40 + 208 - ((value - min) / range) * 208;
                    return `${x},${y}`;
                  }).join(' ')}
                />
                
                {chartData.map((d, i) => {
                  const x = 40 + (i / (chartData.length - 1 || 1)) * 440;
                  const value = getNumericValue(d.value);
                  const y = 40 + 208 - ((value - min) / range) * 208;
                  const displayName = getStringValue(d.name, 'Point ' + (i + 1));
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="5" fill="#6C63FF" />
                      <circle cx={x} cy={y} r="3" fill="#ffffff" />
                      <text
                        x={x}
                        y={y - 12}
                        textAnchor="middle"
                        fill="#1a1a2e"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {value}
                      </text>
                      <text
                        x={x}
                        y={270}
                        textAnchor="middle"
                        fill="#666666"
                        fontSize="10"
                      >
                        {displayName.substring(0, 8)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        );

      case 'pie':
        const total = chartData.reduce((sum, d) => sum + getNumericValue(d.value), 0);
        if (total === 0) {
          return (
            <div className="chart-visualization">
              <div className="no-data-message">
                <span className="no-data-icon">📊</span>
                <p>No data available for pie chart</p>
              </div>
            </div>
          );
        }
        
        let currentAngle = -90;
        const pieColors = ['#6C63FF', '#4a69bd', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];
        
        return (
          <div className="chart-visualization">
            <div className="pie-chart-container">
              <svg viewBox="0 0 400 400" className="pie-chart" preserveAspectRatio="xMidYMid meet">
                {chartData.map((item, index) => {
                  const value = getNumericValue(item.value);
                  const percentage = (value / total) * 100;
                  const angle = (percentage / 100) * 360;
                  
                  if (angle === 0 || value === 0) return null;
                  
                  const startAngle = currentAngle;
                  const endAngle = currentAngle + angle;
                  currentAngle = endAngle;
                  
                  const startRad = (startAngle - 90) * Math.PI / 180;
                  const endRad = (endAngle - 90) * Math.PI / 180;
                  
                  const x1 = 200 + 150 * Math.cos(startRad);
                  const y1 = 200 + 150 * Math.sin(startRad);
                  const x2 = 200 + 150 * Math.cos(endRad);
                  const y2 = 200 + 150 * Math.sin(endRad);
                  
                  const largeArc = angle > 180 ? 1 : 0;
                  const pathData = `M 200 200 L ${x1} ${y1} A 150 150 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  
                  const midAngle = (startAngle + endAngle) / 2;
                  const midRad = (midAngle - 90) * Math.PI / 180;
                  const labelX = 200 + 100 * Math.cos(midRad);
                  const labelY = 200 + 100 * Math.sin(midRad);
                  
                  const displayName = getStringValue(item.name, 'Item ' + (index + 1));
                  
                  return (
                    <g key={index}>
                      <path
                        d={pathData}
                        fill={pieColors[index % pieColors.length]}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {percentage > 5 && (
                        <>
                          <text
                            x={labelX}
                            y={labelY - 8}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="14"
                            fontWeight="bold"
                          >
                            {percentage.toFixed(1)}%
                          </text>
                          <text
                            x={labelX}
                            y={labelY + 8}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="11"
                          >
                            {displayName.substring(0, 10)}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        );

      case 'scatter':
        const scatterValues = chartData.map((d, i) => ({
          x: i,
          y: getNumericValue(d.value),
          name: d.name
        }));
        
        const scatterMin = Math.min(...scatterValues.map(d => d.y), 0);
        const scatterMax = Math.max(...scatterValues.map(d => d.y), 1);
        const scatterRange = scatterMax - scatterMin || 1;
        
        return (
          <div className="chart-visualization">
            <div className="line-chart-container">
              <svg viewBox="0 0 500 300" className="line-chart" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <radialGradient id={`scatterGradient-${chart.id}`}>
                    <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#4a69bd" stopOpacity="0.4" />
                  </radialGradient>
                </defs>
                
                {[0, 1, 2, 3, 4].map(i => (
                  <line
                    key={i}
                    x1="40"
                    y1={40 + (i * 52)}
                    x2="480"
                    y2={40 + (i * 52)}
                    stroke="#f0f0f0"
                    strokeWidth="1"
                  />
                ))}
                
                {scatterValues.map((d, i) => {
                  const x = 40 + (i / (scatterValues.length - 1 || 1)) * 440;
                  const y = 40 + 208 - ((d.y - scatterMin) / scatterRange) * 208;
                  const displayName = getStringValue(d.name, 'Point ' + (i + 1));
                  
                  return (
                    <g key={i}>
                      <circle 
                        cx={x} 
                        cy={y} 
                        r="8" 
                        fill={`url(#scatterGradient-${chart.id})`}
                        stroke="#6C63FF"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={y - 15}
                        textAnchor="middle"
                        fill="#1a1a2e"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {d.y}
                      </text>
                      <text
                        x={x}
                        y={270}
                        textAnchor="middle"
                        fill="#666666"
                        fontSize="10"
                      >
                        {displayName.substring(0, 8)}
                      </text>
                    </g>
                  );
                })}
              </svg>
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
                  {chartData.map((item, index) => {
                    const nameValue = getStringValue(item.name, 'Item ' + (index + 1));
                    const valueData = String(getNumericValue(item.value));
                    return (
                      <tr key={index}>
                        <td>{nameValue}</td>
                        <td>{valueData}</td>
                      </tr>
                    );
                  })}
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
        <h1>Charts</h1>
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
                  {(chart.chart_type || 'bar').toUpperCase()}
                </div>
                <h3>{chart.title || 'Untitled Chart'}</h3>
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
                    {cleanChartData(chart.data).length} data points
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