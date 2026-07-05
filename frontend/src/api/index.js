import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
  return Promise.reject(err);
});

export const auth = {
  login: (d) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
};

export const profiles = {
  list: () => api.get('/profiles'),
  get: (id) => api.get(`/profiles/${id}`),
  create: (d) => api.post('/profiles', d),
  update: (id, d) => api.put(`/profiles/${id}`, d),
  delete: (id) => api.delete(`/profiles/${id}`),
  toggleBot: (id) => api.post(`/profiles/${id}/toggle-bot`),
  getKnowledge: (id) => api.get(`/profiles/${id}/knowledge-source`),
  updateKnowledge: (id, d) => api.put(`/profiles/${id}/knowledge-source`, d),
  clearCache: (id) => api.delete(`/profiles/${id}/knowledge-source/cache`),
  getSettings: (id) => api.get(`/profiles/${id}/settings`),
  updateSettings: (id, d) => api.put(`/profiles/${id}/settings`, d),
};

export const conversations = {
  list: (id, params) => api.get(`/profiles/${id}/conversations`, { params }),
  get: (id, phone) => api.get(`/profiles/${id}/conversations/${phone}`),
  takeover: (id, phone, active) => api.post(`/profiles/${id}/conversations/${phone}/takeover`, { active }),
  archiveAll: (id) => api.post(`/profiles/${id}/conversations/archive-all`),
};

export const records = {
  list: (id, status) => api.get(`/profiles/${id}/records`, { params: { status } }),
  updateStatus: (id, recordId, status) => api.put(`/profiles/${id}/records/${recordId}`, { status }),
  export: (id) => `${api.defaults.baseURL}/profiles/${id}/records/export`,
};

export const pendingActions = {
  list: (id) => api.get(`/profiles/${id}/pending-actions`),
  resolve: (id, actionId) => api.put(`/profiles/${id}/pending-actions/${actionId}`),
};

export const autoForward = {
  list: (id) => api.get(`/profiles/${id}/auto-forward`),
  add: (id, d) => api.post(`/profiles/${id}/auto-forward`, d),
  remove: (id, ruleId) => api.delete(`/profiles/${id}/auto-forward/${ruleId}`),
};

export const blacklist = {
  list: (id) => api.get(`/profiles/${id}/blacklist`),
  add: (id, d) => api.post(`/profiles/${id}/blacklist`, d),
  remove: (id, entryId) => api.delete(`/profiles/${id}/blacklist/${entryId}`),
};

export const knowledge = {
  list: (id) => api.get(`/profiles/${id}/knowledge`),
  add: (id, d) => api.post(`/profiles/${id}/knowledge`, d),
  remove: (id, entryId) => api.delete(`/profiles/${id}/knowledge/${entryId}`),
};

export const billing = {
  audit: (id, params) => api.get(`/profiles/${id}/billing/audit`, { params }),
  exportUrl: (id) => `${api.defaults.baseURL}/profiles/${id}/billing/audit/export`,
};

export default api;
