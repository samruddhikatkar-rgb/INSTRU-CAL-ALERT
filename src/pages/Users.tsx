import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, UserProfile, handleFirestoreError } from '../firebase';
import { Users as UsersIcon, Shield, User as UserIcon, Trash2, Mail, BadgeCheck } from 'lucide-react';
import { motion } from 'motion/react';

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleToggle = async (user: UserProfile) => {
    const newRole = user.role === 'Admin' ? 'Staff' : 'Admin';
    if (window.confirm(`Change ${user.name}'s role to ${newRole}?`)) {
      try {
        await updateDoc(doc(db, 'users', user.id), { role: newRole });
      } catch (error) {
        handleFirestoreError(error, 'update', 'users');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Remove this user and their access?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (error) {
        handleFirestoreError(error, 'delete', 'users');
      }
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">User Management</h2>
        <p className="text-slate-500 text-sm">Manage access and roles for your team members</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {users.map((user) => (
          <motion.div
            layout
            key={user.id}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-center sm:items-start group transition-all hover:bg-slate-50/50 border-t-4 border-t-slate-100 hover:border-t-blue-500"
          >
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors shadow-inner">
                {user.role === 'Admin' ? (
                  <Shield className="w-8 h-8 text-blue-600" />
                ) : (
                  <UserIcon className="w-8 h-8 text-slate-400 group-hover:text-blue-400" />
                )}
            </div>
            
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-slate-900 truncate tracking-tight">{user.name}</h3>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                  user.role === 'Admin' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-500 border-slate-200"
                )}>
                  {user.role}
                </span>
              </div>
              <p className="text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 text-xs font-medium italic opacity-70">
                <Mail className="w-3 h-3" />
                {user.email}
              </p>

              <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-2">
                <button
                  onClick={() => handleRoleToggle(user)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95"
                >
                  Promote/Demote
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="px-4 py-2 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-lg transition-all shadow-sm active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

export default Users;
