import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { itemsAPI } from '../services/api';
import ItemCard from '../components/ItemCard';
import FilterSelect from '../components/FilterSelect';
import Pagination from '../components/Pagination';
import MatchCard from '../components/MatchCard';
import matchesAPI from '../services/matchesAPI';
import { FOUND_ITEM_SORT, isModerationRemovedItem } from '../utils/itemDisplayUtils';

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
    search: '',
    sortBy: FOUND_ITEM_SORT.LATEST
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedItemForMatches, setSelectedItemForMatches] = useState(null);

  const sortParam = useMemo(() => {
    if (filters.sortBy === FOUND_ITEM_SORT.NAME_ASC) {
      return 'name,asc';
    }
    if (filters.sortBy === FOUND_ITEM_SORT.NAME_DESC) {
      return 'name,desc';
    }
    return 'createdAt,desc';
  }, [filters.sortBy]);

  useEffect(() => {
    loadItems();
  }, [currentPage, filters.category, filters.search, sortParam]);

  useEffect(() => {
    if (!selectedItemForMatches) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedItemForMatches]);

  const loadItems = async () => {
    try {
      setLoading(true);

      const response = await itemsAPI.getMy({
        type: 'lost',
        page: currentPage,
        size: PAGE_SIZE,
        sort: sortParam,
        category: filters.category || undefined,
        keyword: filters.search.trim() || undefined
      });

      const visibleItems = (response.data?.content || []).filter((item) => !isModerationRemovedItem(item));
      setItems(visibleItems);
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

  const handleOpenMatchesPopup = (item) => {
    setSelectedItemForMatches(item);
  };

  const handleCloseMatchesPopup = () => {
    setSelectedItemForMatches(null);
  };

  const selectedMatches = selectedItemForMatches
    ? (matchesByLostId[selectedItemForMatches.id] || [])
    : [];

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
        <div className="filters">
          <FilterSelect
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            ariaLabel="Filter by category"
            options={[
              { value: '', label: 'All Categories' },
              { value: 'NIC', label: 'NIC' },
              { value: 'Student ID', label: 'Student ID' },
              { value: 'Bank Card', label: 'Bank Card' },
              { value: 'Wallet', label: 'Wallet' },
              { value: 'Other', label: 'Other' }
            ]}
          />

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

          <FilterSelect
            name="sortBy"
            value={filters.sortBy}
            onChange={handleFilterChange}
            ariaLabel="Sort items"
            options={[
              { value: FOUND_ITEM_SORT.LATEST, label: 'Latest' },
              { value: FOUND_ITEM_SORT.NAME_ASC, label: 'Alphabetical A → Z' },
              { value: FOUND_ITEM_SORT.NAME_DESC, label: 'Alphabetical Z → A' }
            ]}
          />
        </div>

        <div className="items-grid">
          {items.length === 0 ? (
            <p>You have not posted any lost items yet.</p>
          ) : (
            items.map(item => (
              <div key={item.id}>
                <ItemCard
                  item={item}
                  showPostedBy={false}
                  onStatusClick={handleOpenMatchesPopup}
                />
              </div>
            ))
          )}
        </div>

        <Pagination
          currentPage={pagination.pageNumber}
          totalPages={pagination.totalPages}
          onPageChange={setCurrentPage}
        />

        {selectedItemForMatches && createPortal(
          <div className="lost-matches-modal-root" onClick={handleCloseMatchesPopup}>
            <div
              className="lost-matches-modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="lost-matches-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="lost-matches-modal-header">
                <h3 id="lost-matches-modal-title">Possible Matches</h3>
                <button type="button" className="lost-matches-close-btn" onClick={handleCloseMatchesPopup}>
                  Close
                </button>
              </div>

              {selectedMatches.length === 0 ? (
                <p className="lost-matches-empty">No possible matches found for this lost item yet.</p>
              ) : (
                <div className="lost-matches-list">
                  {selectedMatches.map((match) => (
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
          </div>,
          document.body
        )}
    </div>
  );
};

export default LostItems;
