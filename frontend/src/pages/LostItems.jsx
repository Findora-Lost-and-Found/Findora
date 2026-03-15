import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { itemsAPI } from '../services/api';
import ItemCard from '../components/ItemCard';
import { FOUND_ITEM_SORT, sortFoundItems } from '../utils/itemDisplayUtils';

const LostItems = () => {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  });

  useEffect(() => {
    loadItems();
  }, [filters, location.state?.refreshAt]);

  const loadItems = async () => {
    try {
      // My Lost Items shows only the logged-in user's lost posts.
      const response = await itemsAPI.getMy({ type: 'lost' });
      const rawItems = Array.isArray(response.data?.items) ? response.data.items : [];
      const myLostItems = rawItems
        .filter((item) => item && item.type === 'lost')
        .map((item) => ({
          ...item,
          item_name: item.item_name || item.name || 'Unnamed Item',
          description: item.description || '',
          location: item.location || 'Unknown location',
          category: item.category || 'Other',
          date: item.date || item.created_at || null,
          time: item.time || '--:--'
        }));
      const searchTerm = filters.search.trim().toLowerCase();

      const filteredItems = myLostItems.filter((item) => {
        const matchesCategory = !filters.category || item.category === filters.category;
        const matchesSearch = !searchTerm
          || (item.item_name || '').toLowerCase().includes(searchTerm)
          || (item.description || '').toLowerCase().includes(searchTerm)
          || (item.location || '').toLowerCase().includes(searchTerm)
          || (item.category || '').toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
      });

      setItems(sortFoundItems(filteredItems, FOUND_ITEM_SORT.LATEST));
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
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
    </div>
  );
};

export default LostItems;
