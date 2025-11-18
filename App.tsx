
import React, { useState, useEffect } from 'react';
import PatientDashboard from './pages/PatientDashboard.tsx';
import DoctorView from './pages/DoctorView.tsx';
import LoginPage from './pages/LoginPage.tsx';
import { useAuth } from './hooks/useAuth.ts';
import { Spinner } from './components/icons.tsx';

const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [route, setRoute] = useState<string>(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-10 w-10 text-green-600" />
      </div>
    );
  }

  const renderContent = () => {
    if (route.startsWith('#/doctor-view/')) {
      const token = route.split('/')[2];
      return <DoctorView token={token} />;
    }
    
    if (user) {
        return <PatientDashboard user={user} />;
    }

    return <LoginPage />;
  };

  return <div className="min-h-screen">{renderContent()}</div>;
};

export default App;
