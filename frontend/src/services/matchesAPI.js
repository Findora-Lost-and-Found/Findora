import api, { claimsAPI } from './api';

const matchesAPI = {
  getMyMatches: () => api.get('/matches/my'),
  getMatch: (matchId) => api.get(`/matches/${matchId}`),
  resendOtp: (matchId) => api.post(`/matches/${matchId}/resend-otp`),
  claimMatch: (matchId, otp) => api.post(`/matches/${matchId}/claim`, { otp }),
  claimUsingExistingFlow: (match) => {
    const itemId = match?.foundItem?.id || match?.foundItemId;
    const matchId = match?.matchId;
    return claimsAPI.create(itemId, matchId ? { matchId } : undefined);
  }
};

export default matchesAPI;
