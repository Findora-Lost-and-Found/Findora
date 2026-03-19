import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { itemsAPI } from '../services/api';
import ItemCard from '../components/ItemCard';
import Pagination from '../components/Pagination';
import MatchCard from '../components/MatchCard';
import matchesAPI from '../services/matchesAPI';

const PAGE_SIZE = 4;

const LostItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    totalPages: 0,
    totalElements: 0,
    pageNumber: 0,
    pageSize: PAGE_SIZE
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [matchesByLostId, setMatchesByLostId] = useState({});
  const [otpInputs, setOtpInputs] = useState({});
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadItems();
  }, [currentPage, filters.category, filters.search]);

  const loadItems = async () => {
    try {
      setLoading(true);

      const response = await itemsAPI.getMy({
        type: 'lost',
        page: currentPage,
        size: PAGE_SIZE,
        sort: 'createdAt,desc',
        category: filters.category || undefined,
        keyword: filters.search.trim() || undefined
      });

      setItems(response.data?.content || []);
      setPagination({
        totalPages: response.data?.totalPages ?? 0,
        totalElements: response.data?.totalElements ?? 0,
        pageNumber: response.data?.pageNumber ?? currentPage,
        pageSize: response.data?.pageSize ?? PAGE_SIZE
      });

      await loadMatches();
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
      setPagination({
        totalPages: 0,
        totalElements: 0,
        pageNumber: 0,
        pageSize: PAGE_SIZE
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      const response = await matchesAPI.getMyMatches();
      const matches = response.data?.matches || [];

      const grouped = matches.reduce((acc, match) => {
        const lostItemId = match.lostItemId;
        if (!lostItemId) {
          return acc;
        }

        if (!acc[lostItemId]) {
          acc[lostItemId] = [];
        }
        acc[lostItemId].push(match);
        return acc;
      }, {});

      setMatchesByLostId(grouped);
    } catch (error) {
      console.error('Error loading matches:', error);
      setMatchesByLostId({});
    }
  };

  const handleOtpInput = (matchId, value) => {
    setOtpInputs((prev) => ({ ...prev, [matchId]: value }));
  };

  const handleClaimViaOtp = async (matchId, providedOtp) => {
    try {
      const otp = String(providedOtp ?? otpInputs[matchId] ?? '').trim();
      if (!otp) {
        toast.error('Enter OTP first');
        return;
      }

      const response = await matchesAPI.claimMatch(matchId, otp);
      const claimId = response.data?.claim?.id;
      toast.success(claimId ? `Claim created (#${claimId})` : 'Claim created');
      setOtpInputs((prev) => ({ ...prev, [matchId]: '' }));
      await loadMatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to claim via OTP');
    }
  };

  const handleResendOtp = async (matchId) => {
    try {
      await matchesAPI.resendOtp(matchId);
      toast.success('OTP sent');
      await loadMatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(0);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const nextSearch = searchInput.trim();

    setCurrentPage(0);
    setFilters((prev) => ({
      ...prev,
      search: nextSearch
    }));
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>My Lost Items</h1>

      <div className="filters">
        <select name="category" value={filters.category} onChange={handleFilterChange}>
          <option value="">All Categories</option>
          <option value="NIC">NIC</option>
          <option value="Student ID">Student ID</option>
          <option value="Bank Card">Bank Card</option>
          <option value="Wallet">Wallet</option>
          <option value="Other">Other</option>
        </select>

        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            name="search"
            placeholder="Search items..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="search-icon-btn" aria-label="Search lost items">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d="M10.5 3a7.5 7.5 0 0 1 5.93 12.1l4.24 4.23a1 1 0 1 1-1.41 1.42l-4.24-4.24A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11z" fill="currentColor"/>
            </svg>
          </button>
        </form>
      </div>

      <div className="items-grid">
        {items.length === 0 ? (
          <p>You have not posted any lost items yet.</p>
        ) : (
          items.map(item => (
            <div key={item.id}>
              <ItemCard item={item} />

              {(matchesByLostId[item.id] || []).length > 0 && (
                <div className="suggested-matches-block">
                  <h3>Suggested Matches</h3>
                  {(matchesByLostId[item.id] || []).map((match) => (
                    <MatchCard
                      key={match.matchId}
                      match={match}
                      otpValue={otpInputs[match.matchId]}
                      onOtpChange={handleOtpInput}
                      onClaimViaOtp={handleClaimViaOtp}
                      onResendOtp={handleResendOtp}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Pagination
        currentPage={pagination.pageNumber}
        totalPages={pagination.totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default LostItems;
