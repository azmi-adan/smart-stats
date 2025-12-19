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
          setAnalysis(data.stats);
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

    // Save the analysis data and suggestion to localStorage for the Charts component
    const chartData = {
      analysis: analysis,
      suggestion: suggestion,
      csvData: csvData,
      prompt: prompt,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('pendingChartData', JSON.stringify(chartData));
    
    // Navigate to the charts/dashboard selection page
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
              <h3>📊 Data Analysis</h3>
              <div className="analysis-grid">
                <div className="stat-card">
                  <div className="stat-value">{analysis.rows}</div>
                  <div className="stat-label">Rows</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{analysis.columns}</div>
                  <div className="stat-label">Columns</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{analysis.numeric_columns.length}</div>
                  <div className="stat-label">Numeric Columns</div>
                </div>
              </div>
              
              {analysis.summary && Object.keys(analysis.summary).length > 0 && (
                <div className="summary-section">
                  <h4>Column Statistics</h4>
                  {Object.entries(analysis.summary).map(([col, stats]) => (
                    <div key={col} className="column-stats">
                      <div className="column-name">{col}</div>
                      <div className="stats-grid">
                        <div className="stat">
                          <span className="stat-title">Mean:</span>
                          <span className="stat-value">{stats.mean.toFixed(2)}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-title">Min:</span>
                          <span className="stat-value">{stats.min.toFixed(2)}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-title">Max:</span>
                          <span className="stat-value">{stats.max.toFixed(2)}</span>
                        </div>
                      </div>
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
                    {suggestion.chart_type.toUpperCase()} CHART
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