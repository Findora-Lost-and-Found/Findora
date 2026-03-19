import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHomeRouteForRole } from '../utils/navigation';

const MobileWarning = ({ userRole }) => {
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="mobile-warning">
      <div className="icon">⚠️</div>
      <h2>Desktop Access Required</h2>
      <p>
        Admin features require a desktop computer for optimal functionality and security.
      </p>
      <p>
        Please access Findora from a desktop or laptop computer to use admin features.
      </p>
      <button 
        className="btn btn-secondary"
        onClick={() => navigate(getHomeRouteForRole(userRole))}
        style={{ marginTop: '1rem' }}
      >
        Go to Dashboard
      </button>
    </div>
  );
};

export default MobileWarning;
