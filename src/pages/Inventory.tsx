import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, Instrument, Location, handleFirestoreError } from '../firebase';
import { Plus, Search, Filter, Edit2, Trash2, X, MapPin, Boxes } from 'lucide-react';
import { calculateInstrumentStatus, getStatusColor } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

const Inventory: React.FC = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);

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

  const filteredInstruments = useMemo(() => {
    return instruments.filter(i => {
      const matchesSearch = i.instrument_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            i.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = locationFilter === 'all' || i.location_id === locationFilter;
      const matchesStatus = statusFilter === 'all' || calculateInstrumentStatus(i.calibration_expiry) === statusFilter;
      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [instruments, searchTerm, locationFilter, statusFilter]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const calibration_expiry = formData.get('calibration_expiry') as string;
    const data: Omit<Instrument, 'id'> = {
      instrument_name: formData.get('instrument_name') as string,
      manufacturer: formData.get('manufacturer') as string,
      quantity: parseInt(formData.get('quantity') as string),
      location_id: formData.get('location_id') as string,
      calibration_date: formData.get('calibration_date') as string,
      calibration_expiry: calibration_expiry,
      status: calculateInstrumentStatus(calibration_expiry),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingInstrument) {
        await updateDoc(doc(db, 'instruments', editingInstrument.id), data as any);
      } else {
        await addDoc(collection(db, 'instruments'), data as any);
      }
      setIsModalOpen(false);
      setEditingInstrument(null);
    } catch (error) {
      handleFirestoreError(error, editingInstrument ? 'update' : 'create', 'instruments');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this instrument?')) {
      try {
        await deleteDoc(doc(db, 'instruments', id));
      } catch (error) {
        handleFirestoreError(error, 'delete', 'instruments');
      }
    }
  };

  const getLocationName = (id: string) => {
    return locations.find(l => l.id === id)?.location_name || 'Unknown';
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">Inventory Management</h2>
          <p className="text-slate-500 text-sm">View and manage the complete instrument list</p>
        </div>
        <button
          onClick={() => { setEditingInstrument(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-all shadow-sm font-semibold text-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          Add Instrument
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Filter by name or brand..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="all">All Sites</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.location_name}</option>
            ))}
          </select>
          <select
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white shadow-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Valid">Valid</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredInstruments.map((instrument) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={instrument.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group border-t-4 border-t-slate-100 hover:border-t-blue-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 line-clamp-1">{instrument.instrument_name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{instrument.manufacturer}</p>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingInstrument(instrument); setIsModalOpen(true); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(instrument.id)} className="p-1.5 hover:bg-rose-50 rounded text-rose-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium lowercase italic opacity-80">location</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1 uppercase tracking-tighter">
                    <MapPin className="w-3 h-3 text-blue-600" /> {getLocationName(instrument.location_id)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium lowercase italic opacity-80">stock</span>
                  <span className={cn("font-bold text-sm", instrument.quantity < 10 ? "text-rose-600" : "text-slate-900")}>{instrument.quantity.toString().padStart(2, '0')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium lowercase italic opacity-80">expiry</span>
                  <span className="font-mono text-slate-500">{instrument.calibration_expiry}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase",
                    instrument.status === 'Expired' ? "bg-rose-100 text-rose-700" :
                    instrument.status === 'Expiring Soon' ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700"
                )}>
                  {instrument.status}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">
                  {editingInstrument ? 'Modify Asset' : 'Register New Asset'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Instrument Name</label>
                    <input
                      name="instrument_name"
                      defaultValue={editingInstrument?.instrument_name}
                      required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Manufacturer</label>
                    <input
                      name="manufacturer"
                      defaultValue={editingInstrument?.manufacturer}
                      required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Quantity</label>
                    <input
                      name="quantity"
                      type="number"
                      min="0"
                      defaultValue={editingInstrument?.quantity ?? 1}
                      required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Location</label>
                    <select
                      name="location_id"
                      defaultValue={editingInstrument?.location_id}
                      required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white text-sm font-medium"
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.location_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Calibration Expiry</label>
                    <input
                      name="calibration_expiry"
                      type="date"
                      defaultValue={editingInstrument?.calibration_expiry}
                      required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-bold text-[11px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
                  >
                    {editingInstrument ? 'Update' : 'Register'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

export default Inventory;
