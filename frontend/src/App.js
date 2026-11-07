import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [dbStatus, setDbStatus] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecommendations, setSelectedRecommendations] = useState([]);

  useEffect(() => {
    fetchDbStatus();
    fetchPerformance();
  }, []);

  const fetchDbStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/database/status`);
      setDbStatus(response.data);
    } catch (error) {
      console.error('Error fetching database status:', error);
    }
  };

  const fetchPerformance = async () => {
    try {
      const response = await axios.get(`${API_URL}/database/performance`);
      setPerformance(response.data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/autotune/analyze`);
      setAnalysis(response.data);
      setSelectedRecommendations([]);
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendations = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/autotune/apply`, {
        recommendations: selectedRecommendations
      });
      alert('Recommendations applied successfully!');
      setAnalysis(null);
      fetchDbStatus();
      fetchPerformance();
    } catch (error) {
      console.error('Error applying recommendations:', error);
      alert('Error applying recommendations');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecommendation = (rec) => {
    setSelectedRecommendations(prev => {
      const exists = prev.find(r => 
        r.type === rec.type && 
        (r.table === rec.table || r.parameter === rec.parameter)
      );
      if (exists) {
        return prev.filter(r => r !== exists);
      }
      return [...prev, rec];
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Autonomous Database Administrator</h1>
        <p>PostgreSQL Auto-Tuning Dashboard</p>
      </header>

      <main className="App-main">
        <section className="status-section">
          <h2>Database Status</h2>
          {dbStatus ? (
            <div className="status-card">
              <p><strong>Database:</strong> {dbStatus.current_database}</p>
              <p><strong>User:</strong> {dbStatus.current_user}</p>
              <p><strong>Active Connections:</strong> {dbStatus.active_connections}</p>
              <p><strong>Version:</strong> {dbStatus.version?.substring(0, 50)}...</p>
            </div>
          ) : (
            <p>Loading database status...</p>
          )}
        </section>

        <section className="performance-section">
          <h2>Performance Metrics</h2>
          {performance.length > 0 ? (
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Schema</th>
                  <th>Seq Scans</th>
                  <th>Index Scans</th>
                  <th>Inserts</th>
                  <th>Updates</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.tablename}</td>
                    <td>{row.schemaname}</td>
                    <td>{row.seq_scan}</td>
                    <td>{row.idx_scan}</td>
                    <td>{row.n_tup_ins}</td>
                    <td>{row.n_tup_upd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No performance data available</p>
          )}
        </section>

        <section className="autotune-section">
          <h2>AI Auto-Tuning</h2>
          <div className="autotune-controls">
            <button 
              onClick={runAnalysis} 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
            {analysis && selectedRecommendations.length > 0 && (
              <button 
                onClick={applyRecommendations}
                disabled={loading}
                className="btn btn-success"
              >
                {loading ? 'Applying...' : `Apply Selected (${selectedRecommendations.length})`}
              </button>
            )}
          </div>

          {analysis && (
            <div className="analysis-results">
              <div className="summary">
                <h3>Analysis Summary</h3>
                <p>Total Recommendations: {analysis.summary.total}</p>
                <p>High Priority: {analysis.summary.high}</p>
                <p>Medium Priority: {analysis.summary.medium}</p>
                <p>Low Priority: {analysis.summary.low}</p>
              </div>

              <div className="recommendations">
                <h3>Recommendations</h3>
                {analysis.recommendations.map((rec, idx) => (
                  <div 
                    key={idx} 
                    className={`recommendation-card ${rec.severity}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecommendations.includes(rec)}
                      onChange={() => toggleRecommendation(rec)}
                    />
                    <div className="recommendation-content">
                      <p className="severity-badge">{rec.severity.toUpperCase()}</p>
                      <p className="message">{rec.message}</p>
                      {rec.sql && (
                        <code className="sql-code">{rec.sql}</code>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
