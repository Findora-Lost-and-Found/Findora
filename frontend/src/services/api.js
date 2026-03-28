import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_URL = configuredApiUrl?.includes('localhost:5000')
  ? configuredApiUrl.replace('localhost:5000', 'localhost:8080')
  : configuredApiUrl || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (payload) => api.post('/auth/verify-email', payload),
  resendOTP: (payload) => api.post('/auth/resend-otp', payload),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  updatePhone: (phone) => api.put('/auth/update-phone', { phone }),
  verifyPhoneOtp: (otp) => api.post('/auth/verify-phone-otp', { otp }),
  getMe: () => api.get('/auth/me')
};

// Items API
export const itemsAPI = {
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getAll: (params) => api.get('/items', { params }),
  getById: (id) => api.get(`/items/${id}`),
  getMy: (params) => api.get('/items/my/items', { params }),
  updateStatus: (id, status) => api.put(`/items/${id}/status`, { status }),
  delete: (id) => api.delete(`/items/${id}`),
  getStats: () => api.get('/items/stats')
};

// Claims API
export const claimsAPI = {
  create: (item_id, meta = undefined) => api.post('/claims', { item_id, ...(meta || {}) }),
  getMy: () => api.get('/claims/my'),
  getById: (id) => api.get(`/claims/${id}`),
  getPending: () => api.get('/claims/pending')
};

// Security API
export const securityAPI = {
  verifyClaim: (claimId, itemId, otp) => api.post('/security/verify-claim', { claimId, itemId, otp }),
  handoverRequest: (itemId) => api.post('/security/handover-request', { itemId }),
  getReceiveItems: () => api.get('/security/receive-items'),
  getHeldItems: () => api.get('/items', { params: { type: 'found', status: 'held_by_security', page: 0, size: 50, sort: 'createdAt,desc' } }),
  confirmReceive: (itemId) => api.post('/security/receive-item', { itemId }),
  receiveItem: (data) => api.post('/security/receive-item', data),
  getTransactions: (params) => api.get('/security/transactions', { params }),
  getFoundItems: (params) => api.get('/security/found-items', { params }),
  getStats: () => api.get('/security/stats'),
  getPendingClaims: () => api.get('/security/pending-claims')
};

// Admin API
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getPendingApprovals: (params) => api.get('/admin/pending-approvals', { params }),
  approveUser: (id) => api.put(`/admin/approve-user/${id}`),
  declineUser: (id) => api.put(`/admin/decline-user/${id}`),
  banUser: (id, banned) => api.put(`/admin/ban-user/${id}`, { banned }),
  suspendUser: (id, suspended) => api.put(`/admin/suspend-user/${id}`, { suspended }),
  getReports: (params) => api.get('/admin/reports', { params }),
  handleReport: (id, data) => api.put(`/admin/reports/${id}`, data),
  hideReportedItem: (id) => api.post(`/admin/reports/${id}/hide-item`),
  getStats: () => api.get('/admin/stats'),
  getItems: (params) => api.get('/admin/items', { params }),
  getTransactions: (params) => api.get('/admin/transactions', { params })
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

// Reports API
export const reportsAPI = {
  create: (data) => api.post('/reports', data),
  getMy: () => api.get('/reports/my')
};

export default api;
