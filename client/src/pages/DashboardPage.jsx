import React from 'react';
import CafeHeader from '../components/CafeHeader';
import StatusOverview from '../components/StatusOverview';
import BaristaSender from '../components/BaristaSender';

export default function DashboardPage({ status }) {
  return (
    <div>
      <CafeHeader status={status} />
      <StatusOverview status={status} />
      <BaristaSender />
    </div>
  );
}