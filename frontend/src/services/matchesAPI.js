import api from './api';

const matchesAPI = {
  getMyMatches: () => api.get('/matches/my'),
  getMatch: (matchId) => api.get(`/matches/${matchId}`),
  resendOtp: (matchId) => api.post(`/matches/${matchId}/resend-otp`),
  // Suggested matches must stay on the OTP-protected match flow.
  claimMatch: (matchId, otp) => api.post(`/matches/${matchId}/claim`, { otp })
};

export default matchesAPI;
