const API_URL = 'http://localhost:5000/api'; // <-- added /api prefix

export async function login({ username, password }) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw res;
  return res.json();
}

export async function signup({ username, email, password }) {
  const res = await fetch(`${API_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) throw res;
  return res.json();
}

export async function getDashboards() {
  const res = await fetch(`${API_URL}/dashboards`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } // JWT auth
  });
  if (!res.ok) throw res;
  return res.json();
}

export async function getCharts(dashboardId) {
  const res = await fetch(`${API_URL}/dashboards/${dashboardId}/charts`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  if (!res.ok) throw res;
  return res.json();
}

export async function createChart(dashboardId, chartData) {
  const res = await fetch(`${API_URL}/dashboards/${dashboardId}/charts`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(chartData),
  });
  if (!res.ok) throw res;
  return res.json();
}

export async function generateChart({ prompt, csv_data }) {
  const res = await fetch(`${API_URL}/generate-chart`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ prompt, csv_data }),
  });
  if (!res.ok) throw res;
  return res.json();
}
