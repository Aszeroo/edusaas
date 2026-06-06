import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot, setDoc, doc, query, where } from 'firebase/firestore';
import { Card, Input, Select } from '../components/UI';

export default function TeacherAttendance({ teacherId, isAdmin }) {
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // ดึงวิชาของครูคนนั้นๆ มาแสดง
    const qSub = query(collection(db, 'subjects'));
    const qClass = query(collection(db, 'classrooms'));

    const unsubSub = onSnapshot(qSub, snap => setSubjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubC = onSnapshot(qClass, snap => setClassrooms(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubS = onSnapshot(collection(db, 'students'), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubA = onSnapshot(collection(db, 'attendance'), snap => setAttendance(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    return () => { unsubSub(); unsubC(); unsubS(); unsubA(); };
  }, [teacherId, isAdmin]);

  const handleMark = async (studentId, status) => {
    // แก้ ID ให้เก็บรายวิชาด้วย จะได้ไม่ทับกันหากวันนึงเรียน 2 วิชา
    const docId = `${studentId}_${selectedSub}_${selectedDate}`;
    await setDoc(doc(db, 'attendance', docId), { 
      studentId, 
      subjectId: selectedSub, 
      classroomId: selectedClass, 
      date: selectedDate, 
      status 
    });
  };

  const classStds = students.filter(s => s.classroomId === selectedClass).sort((a,b)=>Number(a.number)-Number(b.number));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <h1 className="text-3xl font-extrabold dark:text-white">ระบบเช็คชื่อ</h1>
      
      <Card className="flex flex-col md:flex-row gap-4">
        <Select label="เลือกวิชา" options={subjects.map(s=>({label: s.name, value: s.id}))} value={selectedSub} onChange={e=>setSelectedSub(e.target.value)} />
        <Select label="เลือกห้องเรียน" options={classrooms.map(c=>({label: c.name, value: c.id}))} value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} />
        <Input label="วันที่" type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
      </Card>

      {/* ต้องเลือกทั้งวิชาและห้องเรียน ถึงจะแสดงรายชื่อ */}
      {selectedSub && selectedClass && classStds.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="pb-4 w-16">เลขที่</th>
                  <th className="pb-4">ชื่อ-นามสกุล</th>
                  <th className="pb-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {classStds.map(s => {
                  // เช็คชื่อโดยกรองให้ตรงกับวิชาที่เลือกด้วย
                  const att = attendance.find(a => a.studentId === s.id && a.date === selectedDate && a.subjectId === selectedSub);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="py-4 font-bold dark:text-white">{s.number}</td>
                      <td className="py-4 dark:text-white">{s.firstName} {s.lastName}</td>
                      <td className="py-4 text-center space-x-2 flex justify-center whitespace-nowrap">
                        <button onClick={()=>handleMark(s.id, 'present')} className={`px-4 py-2 rounded-xl text-xs font-bold ${att?.status === 'present' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>มา</button>
                        <button onClick={()=>handleMark(s.id, 'late')} className={`px-4 py-2 rounded-xl text-xs font-bold ${att?.status === 'late' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>สาย</button>
                        <button onClick={()=>handleMark(s.id, 'leave')} className={`px-4 py-2 rounded-xl text-xs font-bold ${att?.status === 'leave' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>ลา</button>
                        <button onClick={()=>handleMark(s.id, 'absent')} className={`px-4 py-2 rounded-xl text-xs font-bold ${att?.status === 'absent' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>ขาด</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}