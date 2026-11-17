import { useEffect, useState } from 'react';
import Home from '@/pages/Home';
import CustomerApp from '@/pages/CustomerApp';
import DriverApp from '@/pages/DriverApp';
import OwnerApp from '@/pages/OwnerApp';

type Role = 'customer' | 'driver' | 'owner' | null;

export default function App() {
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('role');
    if (param === 'customer' || param === 'driver' || param === 'owner') {
      setRole(param);
    }
  }, []);

  if (role === null) return <Home onPick={setRole} />;
  if (role === 'customer') return <CustomerApp onLogout={() => setRole(null)} />;
  if (role === 'driver') return <DriverApp onLogout={() => setRole(null)} />;
  return <OwnerApp onLogout={() => setRole(null)} />;
}
