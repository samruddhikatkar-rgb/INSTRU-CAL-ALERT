import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, Location, handleFirestoreError } from '../firebase';
import { Plus, Edit2, Trash2, MapPin, X, Boxes } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'Admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'locations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      location_name: formData.get('location_name') as string,
    };

    try {
      if (editingLocation) {
        await updateDoc(doc(db, 'locations', editingLocation.id), data);
      } else {
        await addDoc(collection(db, 'locations'), data);
      }
      setIsModalOpen(false);
      setEditingLocation(null);
    } catch (error) {
      handleFirestoreError(error, editingLocation ? 'update' : 'create', 'locations');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure? This might orphan instruments at this location!')) {
      try {
        await deleteDoc(doc(db, 'locations', id));
      } catch (error) {
        handleFirestoreError(error, 'delete', 'locations');
      }
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">Locations</h2>
          <p className="text-slate-500 text-sm">Manage warehouses and storage areas</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingLocation(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-all shadow-sm font-semibold text-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <motion.div
            layout
            key={location.id}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden border-t-4 border-t-slate-100 hover:border-t-blue-500"
          >
            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
               <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{location.location_name}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">ID: {location.id}</p>

            {isAdmin && (
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => { setEditingLocation(location); setIsModalOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(location.id)}
                  className="px-3 py-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">
                  {editingLocation ? 'Modify Site' : 'Register New Site'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Location Name</label>
                  <input
                    name="location_name"
                    defaultValue={editingLocation?.location_name}
                    required
                    placeholder="e.g. Warehouse A, Slot B4"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="flex gap-4 pt-2">
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
                    {editingLocation ? 'Update' : 'Create'}
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

export default Locations;
