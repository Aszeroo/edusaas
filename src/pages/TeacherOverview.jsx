import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Card, Select, Input } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TeacherOverview({ teacherId, isAdmin }) {
  const [classrooms, setClassrooms] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [timeRange, setTimeRange] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const qClass = query(collection(db, 'classrooms'));
    const unsubC = onSnapshot(qClass, snap => setClassrooms(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubA = onSnapshot(collection(db, 'attendance'), snap => setAttendance(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsubC(); unsubA(); };
  }, [teacherId, isAdmin]);

  // ฟังก์ชันกรองการเข้าเรียน "ทั้งหมด" ตามช่วงเวลา (เพื่อนำไปทำกราฟเปรียบเทียบทุกห้อง)
  const getFilteredAllAttendance = () => {
    if (timeRange === 'term') return attendance;
    const targetDate = new Date(selectedDate);
    return attendance.filter(a => {
      if (timeRange === 'daily') return a.date === selectedDate;
      if (timeRange === 'monthly') return a.date.substring(0,7) === selectedDate.substring(0,7);
      if (timeRange === 'weekly') {
        const dDate = new Date(a.date);
        const day = targetDate.getDay();
        const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(targetDate.setDate(diff)); startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 6);
        return dDate >= startOfWeek && dDate <= endOfWeek;
      }
      return false;
    });
  };

  const filteredAllAtt = getFilteredAllAttendance();

  // ข้อมูลสำหรับห้องที่เลือก (การ์ดสรุปด้านบน)
  const filteredSingleAtt = filteredAllAtt.filter(a => a.classroomId === selectedClass);

  // ข้อมูลสำหรับกราฟ (สรุปทุกห้อง)
  const chartData = classrooms.map(c => {
    const roomAtt = filteredAllAtt.filter(a => a.classroomId === c.id);
    return {
      name: c.name,
      มาเรียน: roomAtt.filter(a => a.status === 'present').length,
      มาสาย: roomAtt.filter(a => a.status === 'late').length,
      ลา: roomAtt.filter(a => a.status === 'leave').length,
      ขาด: roomAtt.filter(a => a.status === 'absent').length,
    }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <h1 className="text-3xl font-extrabold dark:text-white">ภาพรวมการเข้าเรียน (Dashboard)</h1>
      <Card className="flex flex-col md:flex-row gap-4">
        <Select label="เลือกห้องเรียน (เพื่อดูสถิติรายห้อง)" options={classrooms.map(c=>({label: c.name, value: c.id}))} value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} />
        <Select label="ช่วงเวลา" options={[{label: 'รายวัน', value: 'daily'},{label: 'รายสัปดาห์', value: 'weekly'},{label: 'รายเดือน', value: 'monthly'},{label: 'รายเทอม', value: 'term'}]} value={timeRange} onChange={e=>setTimeRange(e.target.value)} />
        {timeRange !== 'term' && <Input label="อ้างอิง" type={timeRange === 'monthly' ? "month" : "date"} value={timeRange === 'monthly' ? selectedDate.substring(0,7) : selectedDate} onChange={e=>setSelectedDate(timeRange === 'monthly' ? `${e.target.value}-01` : e.target.value)} />}
      </Card>
      
      {/* ส่วนการ์ดสถิติรายห้อง */}
      {selectedClass && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="bg-emerald-50 dark:bg-emerald-900/20"><p className="text-emerald-700 font-bold mb-2">มาเรียน (ครั้ง)</p><p className="text-4xl font-extrabold text-emerald-600">{filteredSingleAtt.filter(a => a.status === 'present').length}</p></Card>
          <Card className="bg-amber-50 dark:bg-amber-900/20"><p className="text-amber-700 font-bold mb-2">มาสาย (ครั้ง)</p><p className="text-4xl font-extrabold text-amber-600">{filteredSingleAtt.filter(a => a.status === 'late').length}</p></Card>
          <Card className="bg-blue-50 dark:bg-blue-900/20"><p className="text-blue-700 font-bold mb-2">ลา (ครั้ง)</p><p className="text-4xl font-extrabold text-blue-600">{filteredSingleAtt.filter(a => a.status === 'leave').length}</p></Card>
          <Card className="bg-rose-50 dark:bg-rose-900/20"><p className="text-rose-700 font-bold mb-2">ขาด (ครั้ง)</p><p className="text-4xl font-extrabold text-rose-600">{filteredSingleAtt.filter(a => a.status === 'absent').length}</p></Card>
        </div>
      )}

      {/* ส่วนกราฟเปรียบเทียบทุกห้อง */}
      <Card className="mt-8">
        <h2 className="text-xl font-bold dark:text-white mb-6">กราฟเปรียบเทียบการเข้าเรียนแต่ละห้อง (ตามช่วงเวลาที่เลือก)</h2>
        <div className="h-[400px] w-full">
          {classrooms.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b'}} />
                <YAxis tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend wrapperStyle={{paddingTop: '20px'}} />
                {/* สีของกราฟแต่ละสถานะ */}
                <Bar dataKey="มาเรียน" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="มาสาย" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ลา" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ขาด" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">ยังไม่มีข้อมูลห้องเรียน</div>
          )}
        </div>
      </Card>

    </div>
  );
}