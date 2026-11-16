import React, { useEffect, useState } from 'react';
import { fetchBotStatus } from './services/api';
import CafeHeader from './components/CafeHeader';
import StatusOverview from './components/StatusOverview';
import BaristaSender from './components/BaristaSender';

export default function App() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const loadStatus = () => {
      fetchBotStatus()
        .then(data => setStatus(data))
        .catch(err => console.error(err));
    };

    loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="cafe-container">
      <CafeHeader status={status} />
      <StatusOverview status={status} />
      <BaristaSender />
    </main>
  );
}