import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { itemsAPI } from '../services/api';
import FoundItemCard from '../components/FoundItemCard';
import Pagination from '../components/Pagination';
import { normalizeCategory } from '../utils/categoryUtils';
import { FOUND_ITEM_SORT } from '../utils/itemDisplayUtils';

const PAGE_SIZE = 4;

const FoundItems = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    totalPages: 0,
    totalElements: 0,
    pageNumber: 0,
    pageSize: PAGE_SIZE
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    sortBy: FOUND_ITEM_SORT.LATEST
  });

  const normalizeItem = (item) => ({
    id: item.id,
    name: item.name || item.item_name || 'Unnamed Item',
    description: item.description || '',
    location: item.location || 'Unknown location',
    date_found: item.date_found || item.date || item.created_at,
    image: item.image || (item.image_url ? `http://localhost:5000${item.image_url}` : 'https://via.placeholder.com/300x200?text=Item+Image'),
    category: normalizeCategory(item.category, item.name || item.item_name),
    type: item.type || 'found',
    status: item.status || 'active',
    created_at: item.created_at || null,
    posted_time: item.posted_time || item.created_at || item.date_found || item.date || null,
    posted_by: item.posted_by || {
      id: item.user_id,
      full_name: item.full_name || item.username || 'Unknown User'
    }
  });

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
  }, [location.state?.refreshAt, currentPage, filters.category, filters.search, sortParam]);

  const loadItems = async () => {
    try {
      setLoading(true);

      const response = await itemsAPI.getAll({
        type: 'found',
        page: currentPage,
        size: PAGE_SIZE,
        sort: sortParam,
        category: filters.category || undefined,
        keyword: filters.search || undefined
      });

      const apiItems = response.data?.content || [];
      console.log('FoundItems fetched from API:', apiItems);
      const normalizedItems = apiItems.map(normalizeItem);
      setAllItems(normalizedItems);

      setPagination({
        totalPages: response.data?.totalPages ?? 0,
        totalElements: response.data?.totalElements ?? 0,
        pageNumber: response.data?.pageNumber ?? currentPage,
        pageSize: response.data?.pageSize ?? PAGE_SIZE
      });
    } catch (error) {
      console.error('Error loading found items:', error.response?.data || error.message);
      setAllItems([]);
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

  const displayedItems = allItems;

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(0);
  };

  useEffect(() => {
    const focusItemId = searchParams.get('focusItem');
    if (!focusItemId) return;

    const targetId = `found-item-${focusItemId}`;
    // Delay to ensure the card exists in DOM after list rendering.
    const timer = setTimeout(() => {
      const targetCard = document.getElementById(targetId);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [searchParams, displayedItems]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>Found Items</h1>

      <div className="filters">
        <select name="category" value={filters.category} onChange={handleFilterChange}>
          <option value="">All Categories</option>
          <option value="NIC">NIC</option>
          <option value="Student ID">Student ID</option>
          <option value="Bank Card">Bank Card</option>
          <option value="Wallet">Wallet</option>
          <option value="Other">Other</option>
        </select>

        <input
          type="text"
          name="search"
          placeholder="Search items..."
          value={filters.search}
          onChange={handleFilterChange}
        />

        <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange}>
          <option value={FOUND_ITEM_SORT.LATEST}>Latest</option>
          <option value={FOUND_ITEM_SORT.NAME_ASC}>Alphabetical A {'->'} Z</option>
          <option value={FOUND_ITEM_SORT.NAME_DESC}>Alphabetical Z {'->'} A</option>
        </select>
      </div>

      <div className="items-grid">
        {displayedItems.length === 0 ? (
          <p>No found items available.</p>
        ) : (
          displayedItems.map((item) => (
            <FoundItemCard
              key={item.id}
              item={item}
            />
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

export default FoundItems;
