import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { getHomeRouteForUser } from '../utils/navigation';
import StudentDashboard from './StudentDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  if (user?.role === 'security' || user?.role === 'admin') {
    return <Navigate to={getHomeRouteForUser(user)} replace />;
  }

  return <StudentDashboard />;
};

export default Dashboard;
