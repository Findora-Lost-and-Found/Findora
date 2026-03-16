import { useEffect, useState } from 'react';
import { itemsAPI } from '../services/api';
import ItemCard from '../components/ItemCard';
import Pagination from '../components/Pagination';

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
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  });

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
        keyword: filters.search || undefined
      });

      setItems(response.data?.content || []);
      setPagination({
        totalPages: response.data?.totalPages ?? 0,
        totalElements: response.data?.totalElements ?? 0,
        pageNumber: response.data?.pageNumber ?? currentPage,
        pageSize: response.data?.pageSize ?? PAGE_SIZE
      });
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

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(0);
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

        <input
          type="text"
          name="search"
          placeholder="Search items..."
          value={filters.search}
          onChange={handleFilterChange}
        />
      </div>

      <div className="items-grid">
        {items.length === 0 ? (
          <p>You have not posted any lost items yet.</p>
        ) : (
          items.map(item => <ItemCard key={item.id} item={item} />)
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
