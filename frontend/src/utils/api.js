import axios from 'axios';

// Set REACT_APP_API_URL in frontend/.env to point at a deployed backend.
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('synapse_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// If the token expired or is invalid, log out and go to the login page
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/auth/') || url.includes('/profile/password') ||
      (url.endsWith('/profile') && error.config?.method === 'delete');

    if (status === 401 && !isAuthCall) {
      localStorage.removeItem('synapse_token');
      localStorage.removeItem('synapse_user');

      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1');
      }
    }

    return Promise.reject(error);
  }
);

// Pull a readable message out of any API error
export const getErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.msg ||
  (error?.request && !error?.response
    ? 'Cannot reach the server. Is the backend running?'
    : null) ||
  fallback;

// Fetch a protected document file and open or download it
export const openDocumentFile = async (doc, { download = false } = {}) => {
  // Open the tab first (synchronously) so pop-up blockers allow it
  const newTab = download ? null : window.open('', '_blank');

  try {
    const response = await api.get(`/documents/${doc._id}/file`, {
      responseType: 'blob'
    });

    const url = URL.createObjectURL(response.data);

    if (download) {
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || doc.title;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else if (newTab) {
      newTab.location.href = url;
    } else {
      window.open(url, '_blank');
    }

    // Give the browser time to load it before releasing memory
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  } catch (error) {
    if (newTab) newTab.close();
    throw error;
  }
};

// Local YYYY-MM-DD (for <input type="date"> values)
export const toDateInput = (date = new Date()) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default api;
