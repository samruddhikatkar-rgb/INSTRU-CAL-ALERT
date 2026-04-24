import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, Instrument, Location } from '../firebase';
import { Bell, MapPin, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { calculateInstrumentStatus, getStatusColor } from '../utils';

const Alerts: React.FC = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'instruments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInstruments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Instrument)));
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

  const alertItems = instruments.filter(i => {
    const status = calculateInstrumentStatus(i.calibration_expiry);
    return status === 'Expired' || status === 'Expiring Soon';
  }).sort((a, b) => {
      return new Date(a.calibration_expiry).getTime() - new Date(b.calibration_expiry).getTime();
  });

  const getLocationName = (id: string) => {
    return locations.find(l => l.id === id)?.location_name || 'Unknown';
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">Calibration Alerts</h2>
        <p className="text-slate-500 text-sm">Immediate attention required for instruments past or near expiry</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {alertItems.map((item) => {
          const status = calculateInstrumentStatus(item.calibration_expiry);
          const isExpired = status === 'Expired';

          return (
            <div 
              key={item.id} 
              className={cn(
                "p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all shadow-sm",
                isExpired ? "bg-white border-l-4 border-l-rose-500" : "bg-white border-l-4 border-l-amber-400"
              )}
            >
              <div className="flex gap-4 items-start">
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                    isExpired ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
                )}>
                  {isExpired ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{item.instrument_name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.manufacturer}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs">
                    <span className="flex items-center gap-1 text-slate-500 font-medium lowercase italic opacity-80">
                      <MapPin className="w-3 h-3" /> {getLocationName(item.location_id)}
                    </span>
                    <span className="text-slate-400 opacity-20">|</span>
                    <span className="font-mono text-slate-500">EXP: {item.calibration_expiry}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right hidden md:block">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 leading-none">In Stock</p>
                  <p className="text-xl font-bold text-slate-900 leading-none">{item.quantity.toString().padStart(2, '0')}</p>
                </div>
                <div className={cn(
                    "px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-widest",
                    isExpired ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                )}>
                  {status}
                </div>
              </div>
            </div>
          );
        })}

        {alertItems.length === 0 && (
          <div className="py-24 text-center bg-white rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-emerald-500">
             <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">System Operational</h3>
             <p className="text-slate-400 text-xs mt-1">Zero instruments require calibration attention at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

export default Alerts;
