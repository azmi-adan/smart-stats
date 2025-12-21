import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Datainput.css';

const API_URL = 'https://smart-stats-p91n.onrender.com';

const DataInput = ({ user }) => {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState('');
  const [prompt, setPrompt] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Calculate comprehensive statistics from CSV data
  const calculateStatistics = (data) => {
    if (!data || data.length === 0) return null;

    const stats = {
      rows: data.length,
      columns: Object.keys(data[0] || {}).length,
      columnNames: Object.keys(data[0] || {}),
      numericColumns: [],
      categoricalColumns: [],
      columnStats: {}
    };

    // Identify numeric and categorical columns
    stats.columnNames.forEach(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      
      if (numericValues.length > values.length * 0.8) {
        stats.numericColumns.push(col);
        
        // Calculate comprehensive statistics for numeric columns
        const sorted = [...numericValues].sort((a, b) => a - b);
        const n = sorted.length;
        const sum = sorted.reduce((acc, val) => acc + val, 0);
        const mean = sum / n;
        
        // Calculate variance and standard deviation
        const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        
        // Calculate median
        const median = n % 2 === 0 
          ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
          : sorted[Math.floor(n / 2)];
        
        // Calculate quartiles
        const q1Index = Math.floor(n * 0.25);
        const q3Index = Math.floor(n * 0.75);
        const q1 = sorted[q1Index];
        const q3 = sorted[q3Index];
        const iqr = q3 - q1;
        
        // Calculate mode
        const frequency = {};
        sorted.forEach(val => {
          frequency[val] = (frequency[val] || 0) + 1;
        });
        const maxFreq = Math.max(...Object.values(frequency));
        const modes = Object.keys(frequency).filter(key => frequency[key] === maxFreq).map(Number);
        
        // Calculate skewness
        const skewness = sorted.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) / n;
        
        // Calculate kurtosis
        const kurtosis = sorted.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0) / n - 3;
        
        stats.columnStats[col] = {
          type: 'numeric',
          count: n,
          mean: mean,
          median: median,
          mode: modes.length === n ? 'No mode' : modes[0],
          stdDev: stdDev,
          variance: variance,
          min: sorted[0],
          max: sorted[n - 1],
          range: sorted[n - 1] - sorted[0],
          q1: q1,
          q3: q3,
          iqr: iqr,
          skewness: skewness,
          kurtosis: kurtosis,
          sum: sum,
          nullCount: data.length - n
        };
      } else {
        stats.categoricalColumns.push(col);
        
        // Calculate frequency distribution for categorical columns
        const frequency = {};
        values.forEach(val => {
          const key = String(val);
          frequency[key] = (frequency[key] || 0) + 1;
        });
        
        const sortedFreq = Object.entries(frequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10); // Top 10 most frequent values
        
        const uniqueCount = Object.keys(frequency).length;
        
        stats.columnStats[col] = {
          type: 'categorical',
          count: values.length,
          uniqueCount: uniqueCount,
          mode: sortedFreq[0]?.[0] || 'N/A',
          modeFrequency: sortedFreq[0]?.[1] || 0,
          frequency: sortedFreq,
          nullCount: data.length - values.length
        };
      }
    });

    return stats;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      setCsvData(event.target.result);
      setError('');
    };
    
    reader.onerror = () => {
      setError('Error reading file');
    };
    
    reader.readAsText(file);
  };

  const handleGenerateChart = async () => {
    if (!csvData.trim() && !prompt.trim()) {
      setError('Please provide either CSV data or a prompt');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);
    setSuggestion(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/generate-chart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          csv_data: csvData || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (csvData) {
          // Parse CSV and calculate local statistics
          const lines = csvData.trim().split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const parsedData = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return headers.reduce((obj, header, index) => {
              obj[header] = values[index];
              return obj;
            }, {});
          });
          
          const localStats = calculateStatistics(parsedData);
          setAnalysis(localStats || data.stats);
          setSuggestion(data.suggestion);
        } else {
          setSuggestion(data);
        }
      } else {
        setError(data.error || 'Failed to generate chart');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCsvData('');
    setPrompt('');
    setAnalysis(null);
    setSuggestion(null);
    setError('');
    setUploadedFile(null);
  };

  const createChartFromSuggestion = async () => {
    if (!suggestion) return;

    const chartData = {
      analysis: analysis,
      suggestion: suggestion,
      csvData: csvData,
      prompt: prompt,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('pendingChartData', JSON.stringify(chartData));
    navigate('/charts');
  };

  return (
    <div className="data-input-container">
      <div className="data-input-header">
        <h1>Data Input & AI Analysis</h1>
        <p className="subtitle">
          Upload CSV data or describe what you want to visualize. Our AI will suggest the best charts.
        </p>
      </div>

      <div className="data-input-grid">
        <div className="input-section">
          <div className="section-header">
            <h2>Data Input</h2>
            <div className="section-badge">Step 1</div>
          </div>

          <div className="upload-area">
            <div className="upload-box">
              <div className="upload-icon">📤</div>
              <h3>Upload CSV File</h3>
              <p>Drag & drop or click to upload</p>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="file-input"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="upload-btn">
                Choose File
              </label>
              {uploadedFile && (
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{uploadedFile.name}</span>
                  <span className="file-size">
                    ({(uploadedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            <div className="textarea-container">
              <label htmlFor="csvData">
                <span className="label-icon">📝</span>
                Or paste CSV data directly:
              </label>
              <textarea
                id="csvData"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="Paste your CSV data here...
name,value
Jan,1000
Feb,1500
Mar,1200
..."
                rows="8"
                className="data-textarea"
              />
            </div>
          </div>

          <div className="prompt-section">
            <div className="section-header">
              <h2>AI Prompt</h2>
              <div className="section-badge">Step 2</div>
            </div>
            <div className="prompt-input">
              <label htmlFor="prompt">
                <span className="label-icon">🤖</span>
                Describe what you want to visualize:
              </label>
              <input
                type="text"
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Show me sales trends for the last quarter"
                className="prompt-field"
              />
            </div>
          </div>
        </div>

        <div className="output-section">
          <div className="section-header">
            <h2>AI Analysis</h2>
            <div className="section-badge">Step 3</div>
          </div>

          <div className="actions-bar">
            <button 
              className="generate-btn"
              onClick={handleGenerateChart}
              disabled={loading || (!csvData && !prompt)}
            >
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span className="btn-icon">✨</span>
                  Generate Chart Suggestions
                </>
              )}
            </button>
            <button 
              className="clear-btn"
              onClick={handleClear}
            >
              <span className="btn-icon">🗑️</span>
              Clear All
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {analysis && (
            <div className="analysis-card">
              <h3>📊 Comprehensive Data Analysis</h3>
              
              {/* Overview Statistics */}
              <div className="analysis-overview">
                <div className="stat-card">
                  <div className="stat-value">{analysis.rows}</div>
                  <div className="stat-label">Total Rows</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{analysis.columns}</div>
                  <div className="stat-label">Total Columns</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{analysis.numericColumns?.length || 0}</div>
                  <div className="stat-label">Numeric Columns</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{analysis.categoricalColumns?.length || 0}</div>
                  <div className="stat-label">Categorical Columns</div>
                </div>
              </div>

              {/* Detailed Column Statistics */}
              {analysis.columnStats && Object.keys(analysis.columnStats).length > 0 && (
                <div className="detailed-stats-section">
                  <h4>📈 Detailed Column Statistics</h4>
                  
                  {Object.entries(analysis.columnStats).map(([col, stats]) => (
                    <div key={col} className="column-stats-card">
                      <div className="column-header">
                        <span className="column-name">{col}</span>
                        <span className={`column-type-badge ${stats.type}`}>
                          {stats.type === 'numeric' ? '🔢' : '📝'} {stats.type}
                        </span>
                      </div>
                      
                      {stats.type === 'numeric' ? (
                        <div className="stats-grid">
                          {/* Central Tendency */}
                          <div className="stat-group">
                            <h5>Central Tendency</h5>
                            <div className="stat-item">
                              <span className="stat-title">Mean:</span>
                              <span className="stat-value">{stats.mean?.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Median:</span>
                              <span className="stat-value">{stats.median?.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Mode:</span>
                              <span className="stat-value">
                                {typeof stats.mode === 'number' ? stats.mode.toFixed(2) : stats.mode}
                              </span>
                            </div>
                          </div>

                          {/* Dispersion */}
                          <div className="stat-group">
                            <h5>Dispersion</h5>
                            <div className="stat-item">
                              <span className="stat-title">Std Dev:</span>
                              <span className="stat-value">{stats.stdDev?.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Variance:</span>
                              <span className="stat-value">{stats.variance?.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Range:</span>
                              <span className="stat-value">{stats.range?.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">IQR:</span>
                              <span className="stat-value">{stats.iqr?.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Min/Max */}
                          <div className="stat-group">
                            <h5>Range</h5>
                            <div className="stat-item">
                              <span className="stat-title">Minimum:</span>
                              <span className="stat-value">{stats.min?.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Q1:</span>
                              <span className="stat-value">{stats.q1?.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Q3:</span>
                              <span className="stat-value">{stats.q3?.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Maximum:</span>
                              <span className="stat-value">{stats.max?.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Shape & Distribution */}
                          <div className="stat-group">
                            <h5>Distribution Shape</h5>
                            <div className="stat-item">
                              <span className="stat-title">Skewness:</span>
                              <span className="stat-value">{stats.skewness?.toFixed(3)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Kurtosis:</span>
                              <span className="stat-value">{stats.kurtosis?.toFixed(3)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Sum:</span>
                              <span className="stat-value">{stats.sum?.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-title">Count:</span>
                              <span className="stat-value">{stats.count}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="categorical-stats">
                          <div className="stat-item">
                            <span className="stat-title">Unique Values:</span>
                            <span className="stat-value">{stats.uniqueCount}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-title">Most Frequent:</span>
                            <span className="stat-value">{stats.mode}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-title">Mode Frequency:</span>
                            <span className="stat-value">{stats.modeFrequency}</span>
                          </div>
                          
                          {stats.frequency && stats.frequency.length > 0 && (
                            <div className="frequency-table">
                              <h5>📊 Frequency Distribution (Top 10)</h5>
                              <div className="frequency-list">
                                {stats.frequency.map(([value, count], idx) => (
                                  <div key={idx} className="frequency-item">
                                    <span className="freq-value">{value}</span>
                                    <div className="freq-bar-container">
                                      <div 
                                        className="freq-bar" 
                                        style={{width: `${(count / stats.frequency[0][1]) * 100}%`}}
                                      ></div>
                                      <span className="freq-count">{count}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {stats.nullCount > 0 && (
                        <div className="null-warning">
                          ⚠️ Missing values: {stats.nullCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {suggestion && (
            <div className="suggestion-card">
              <h3>🎯 AI Suggestion</h3>
              <div className="suggestion-content">
                <div className="suggestion-header">
                  <div className="chart-type-badge">
                    {suggestion.chart_type?.toUpperCase() || 'CHART'}
                  </div>
                  <h4>{suggestion.title}</h4>
                </div>
                
                <div className="suggestion-details">
                  <div className="detail-item">
                    <span className="detail-label">Recommended Chart Type:</span>
                    <span className="detail-value">{suggestion.chart_type}</span>
                  </div>
                  
                  {suggestion.columns && (
                    <div className="detail-item">
                      <span className="detail-label">Columns Detected:</span>
                      <span className="detail-value">{suggestion.columns.join(', ')}</span>
                    </div>
                  )}
                  
                  {suggestion.data && (
                    <div className="preview-table">
                      <h5>Data Preview</h5>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              {suggestion.data[0] && Object.keys(suggestion.data[0]).map(key => (
                                <th key={key}>{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {suggestion.data.slice(0, 5).map((row, index) => (
                              <tr key={index}>
                                {Object.values(row).map((value, idx) => (
                                  <td key={idx}>{value}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  className="create-chart-btn"
                  onClick={createChartFromSuggestion}
                >
                  <span className="btn-icon">📈</span>
                  Create This Chart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataInput;