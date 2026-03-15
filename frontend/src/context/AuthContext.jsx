import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const getApiErrorMessage = (error, fallbackMessage) => {
    const apiError = error.response?.data;
    const validationMessage = apiError?.errors?.[0]?.msg;
    return validationMessage || apiError?.message || fallbackMessage;
  };

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
    } catch (error) {
      console.error('Load user error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      const message = getApiErrorMessage(error, 'Registration failed');
      toast.error(message);
      return { success: false, message };
    }
  };

  const login = async (identifier, password) => {
    try {
      const response = await authAPI.login({ identifier, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      toast.success('Login successful');
      return { success: true };
    } catch (error) {
      const message = getApiErrorMessage(error, 'Login failed');
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.info('Logged out successfully');
  };

  const verifyEmail = async (otp) => {
    try {
      const response = await authAPI.verifyEmail(otp);
      toast.success(response.data.message);
      await loadUser();
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const resendOTP = async () => {
    try {
      const response = await authAPI.resendOTP();
      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend OTP';
      toast.error(message);
      return { success: false, message };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    verifyEmail,
    resendOTP,
    loadUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
