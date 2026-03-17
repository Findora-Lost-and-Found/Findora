import StudentDashboard from './StudentDashboard';

const SecurityDashboard = () => {
  return <StudentDashboard postRoles={['student', 'staff', 'security']} />;
};

export default SecurityDashboard;