"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

function PlannerHome() {
  const router = useRouter();

  const handleGoToRouting = () => {
    router.push('/routingplan');
  };

  return (
    <div>Planner Home
      <button onClick={handleGoToRouting}>Go to Routing</button>
    </div>
  );
}

export default PlannerHome;