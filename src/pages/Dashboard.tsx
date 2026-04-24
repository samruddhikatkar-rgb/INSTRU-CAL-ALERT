import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, Instrument, Location } from '../firebase';
import { Box, Bell, MapPin, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { calculateInstrumentStatus, getStatusColor } from '../utils';

const Dashboard: React.FC = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'instruments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data() as Omit<Instrument, 'id'>;
        return {
          ...d,
          id: doc.id,
          // Recalculate status just in case it's stale in DB
          status: calculateInstrumentStatus(d.calibration_expiry)
        };
      }) as Instrument[];
      setInstruments(data);
    });

    const qLoc = query(collection(db, 'locations'));
    const unsubscribeLoc = onSnapshot(qLoc, (snapshot) => {
      setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubscribeLoc();
    };
  }, []);

  const totalInstruments = instruments.length;
  const expiringSoonCount = instruments.filter(i => i.status === 'Expiring Soon').length;
  const expiredCount = instruments.filter(i => i.status === 'Expired').length;
  const lowStockThreshold = 10;
  const lowStockItems = instruments.filter(i => i.quantity < lowStockThreshold).length;

  const getLocationName = (id: string) => {
    return locations.find(l => l.id === id)?.location_name || 'Unknown';
  };

  const stats = [
    { name: 'Total Units', value: totalInstruments, icon: Box, color: 'text-slate-900', bg: 'bg-white', border: 'border-slate-200' },
    { name: 'Expired', value: expiredCount, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-white', border: 'border-slate-200 border-l-4 border-l-rose-500' },
    { name: 'Expiring Soon', value: expiringSoonCount, icon: Clock, color: 'text-amber-600', bg: 'bg-white', border: 'border-slate-200 border-l-4 border-l-amber-400' },
    { name: 'Low Stock', value: lowStockItems, icon: Box, color: 'text-slate-900', bg: 'bg-white', border: 'border-slate-200' },
  ];

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">Inventory Overview</h2>
        <p className="text-slate-500 text-sm">Real-time status of vibration and sound instruments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className={`p-5 rounded-xl border shadow-sm ${stat.bg} ${stat.border} transition-all duration-300`}>
            <p className="text-slate-500 text-[11px] mb-1 uppercase tracking-wider font-bold">{stat.name}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value.toString().padStart(2, '0')}</p>
          </div>
        ))}
      </div>

      {/* Recent Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Critical Instruments</h3>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:text-blue-700">View Full Inventory</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3 font-bold">Instrument Name</th>
                <th className="px-6 py-3 font-bold text-center">Location</th>
                <th className="px-6 py-3 font-bold">Calibration Expiry</th>
                <th className="px-6 py-3 font-bold">Status</th>
                <th className="px-6 py-3 font-bold text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {instruments.slice(0, 8).map((instrument) => (
                <tr key={instrument.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{instrument.instrument_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{instrument.manufacturer}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                      {getLocationName(instrument.location_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {instrument.calibration_expiry}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        instrument.status === 'Expired' ? "bg-rose-100 text-rose-700" :
                        instrument.status === 'Expiring Soon' ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                    )}>
                      {instrument.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn("font-bold text-slate-900", instrument.quantity < lowStockThreshold && "text-rose-600")}>
                      {instrument.quantity.toString().padStart(2, '0')}
                    </span>
                  </td>
                </tr>
              ))}
              {instruments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No instruments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Simple utility function to handle conditional classes
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

export default Dashboard;
