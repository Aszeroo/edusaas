import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Card, Button } from '../components/UI';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  useEffect(() => { return onSnapshot(collection(db, 'users'), snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()})))); }, []);
  const changeRole = async (id, currentRole) => {
    if(currentRole === 'admin') return;
    await updateDoc(doc(db, 'users', id), { role: currentRole === 'teacher' ? 'student' : 'teacher' });
  };
  return (
    <div className="space-y-6 max-w-5xl mx-auto"><h1 className="text-3xl font-extrabold dark:text-white">จัดการสมาชิกทั้งหมด</h1>
      <Card className="border-none"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b"><tr><th className="pb-4">ชื่อ</th><th className="pb-4">อีเมล</th><th className="pb-4">สิทธิ์</th><th className="pb-4 text-right">ปรับสิทธิ์</th></tr></thead>
      <tbody className="divide-y">{users.map(u => (<tr key={u.id}><td className="py-4 font-medium dark:text-white">{u.name}</td><td className="py-4 text-slate-500">{u.email}</td><td className="py-4 font-bold text-indigo-600">{u.role.toUpperCase()}</td><td className="py-4 text-right">{u.role !== 'admin' && <Button variant="secondary" onClick={()=>changeRole(u.id, u.role)}>สลับสิทธิ์</Button>}</td></tr>))}</tbody></table></div></Card>
    </div>
  );
}