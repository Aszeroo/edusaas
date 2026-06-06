import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Card, Button, Select, Input, AlertModal } from '../components/UI';
import { CheckSquare, Save } from 'lucide-react';

export default function TeacherAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 🌟 เพิ่ม State สำหรับ "รอบการเช็คชื่อ" (ค่าเริ่มต้นคือรอบ 1)
  const [selectedPeriod, setSelectedPeriod] = useState('1'); 

  const [currentAttendance, setCurrentAttendance] = useState({});
  const [alertData, setAlertData] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    const unsubSub = onSnapshot(collection(db, 'subjects'), snap => setSubjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubClass = onSnapshot(collection(db, 'classrooms'), snap => setClassrooms(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubStd = onSnapshot(collection(db, 'students'), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubAtt = onSnapshot(collection(db, 'attendance'), snap => setAttendance(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsubSub(); unsubClass(); unsubStd(); unsubAtt(); };
  }, []);

  // 🌟 ดึงข้อมูลการเช็คชื่อ โดยเช็คทั้ง วันที่ และ "รอบที่"
  useEffect(() => {
    if (selectedSubject && selectedClass && selectedDate && selectedPeriod) {
      const attForSession = attendance.filter(
        a => a.subjectId === selectedSubject &&
             a.classroomId === selectedClass &&
             a.date === selectedDate &&
             (a.period || '1') === selectedPeriod // รองรับข้อมูลเก่าที่ยังไม่มีฟิลด์ period ให้ถือเป็นรอบ 1
      );
      const newAtt = {};
      attForSession.forEach(a => newAtt[a.studentId] = a.status);
      setCurrentAttendance(newAtt);
    } else {
      setCurrentAttendance({});
    }
  }, [selectedSubject, selectedClass, selectedDate, selectedPeriod, attendance]);

  const classStds = students.filter(s => s.classroomId === selectedClass).sort((a,b)=>Number(a.number)-Number(b.number));

  const handleStatusChange = (studentId, status) => {
    setCurrentAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status) => {
    const newAtt = { ...currentAttendance };
    classStds.forEach(s => { newAtt[s.id] = status; });
    setCurrentAttendance(newAtt);
  };

  const handleSave = async () => {
    if (!selectedSubject || !selectedClass || !selectedDate || !selectedPeriod) {
      return setAlertData({ isOpen: true, title: 'แจ้งเตือน', message: 'กรุณาเลือกข้อมูลและรอบให้ครบถ้วนก่อนบันทึก' });
    }
    
    // ตรวจสอบว่าเช็คชื่อครบทุกคนหรือไม่
    const missing = classStds.filter(s => !currentAttendance[s.id]);
    if (missing.length > 0) {
      return setAlertData({ isOpen: true, title: 'แจ้งเตือน', message: `กรุณาเช็คชื่อให้ครบทุกคน (ขาดอีก ${missing.length} คน)` });
    }

    try {
      for (const studentId of Object.keys(currentAttendance)) {
        const status = currentAttendance[studentId];
        // 🌟 เปลี่ยน ID ของ Doc ให้รองรับหลายรอบใน 1 วัน
        const docId = `${selectedSubject}_${selectedClass}_${selectedDate}_${selectedPeriod}_${studentId}`;
        
        await setDoc(doc(db, 'attendance', docId), {
          subjectId: selectedSubject,
          classroomId: selectedClass,
          studentId: studentId,
          date: selectedDate,
          period: selectedPeriod, // บันทึกรอบที่เก็บลงฐานข้อมูล
          status: status,
          timestamp: new Date().toISOString()
        });
      }
      setAlertData({ isOpen: true, title: 'สำเร็จ', message: `บันทึกการเช็คชื่อวันที่ ${selectedDate} (รอบที่ ${selectedPeriod}) เรียบร้อยแล้ว!` });
    } catch (error) {
      setAlertData({ isOpen: true, title: 'ข้อผิดพลาด', message: error.message });
    }
  };

  const StatusButton = ({ sId, status, label, colorClass, activeClass }) => {
    const isActive = currentAttendance[sId] === status;
    return (
      <button
        onClick={() => handleStatusChange(sId, status)}
        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all border ${isActive ? activeClass : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700'}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold dark:text-white flex items-center">
          <CheckSquare className="w-8 h-8 mr-3 text-indigo-500" />
          ระบบเช็คชื่อ
        </h1>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Select 
            label="เลือกวิชา" 
            options={subjects.map(s => ({label: s.name, value: s.id}))} 
            value={selectedSubject} 
            onChange={e => setSelectedSubject(e.target.value)} 
          />
          <Select 
            label="เลือกห้องเรียน" 
            options={classrooms.map(c => ({label: c.name, value: c.id}))} 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)} 
          />
          <Input 
            type="date" 
            label="วันที่" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
          />
          {/* 🌟 เพิ่ม Dropdown เลือกรอบการเช็คชื่อ */}
          <Select 
            label="เลือกรอบที่ (คาบ)" 
            options={[
              { label: 'รอบที่ 1', value: '1' },
              { label: 'รอบที่ 2', value: '2' },
              { label: 'รอบที่ 3', value: '3' }
            ]} 
            value={selectedPeriod} 
            onChange={e => setSelectedPeriod(e.target.value)} 
          />
        </div>

        {selectedSubject && selectedClass && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-end mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <span className="text-sm font-bold text-slate-500 mr-2 flex items-center">เช็คชื่อด่วน (ทั้งห้อง):</span>
               <button onClick={() => handleMarkAll('present')} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200">มาทั้งหมด</button>
               <button onClick={() => handleMarkAll('late')} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200">สายทั้งหมด</button>
               <button onClick={() => handleMarkAll('leave')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200">ลาทั้งหมด</button>
               <button onClick={() => handleMarkAll('absent')} className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-200">ขาดทั้งหมด</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr>
                    <th className="p-3 w-16">เลขที่</th>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {classStds.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="p-3 font-bold dark:text-slate-300">{s.number}</td>
                      <td className="p-3 dark:text-white font-medium">{s.prefix || ''}{s.firstName} {s.lastName}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center space-x-1 sm:space-x-2">
                           <StatusButton sId={s.id} status="present" label="มา" activeClass="bg-emerald-500 text-white border-emerald-600 shadow-sm" />
                           <StatusButton sId={s.id} status="late" label="สาย" activeClass="bg-amber-500 text-white border-amber-600 shadow-sm" />
                           <StatusButton sId={s.id} status="leave" label="ลา" activeClass="bg-blue-500 text-white border-blue-600 shadow-sm" />
                           <StatusButton sId={s.id} status="absent" label="ขาด" activeClass="bg-rose-500 text-white border-rose-600 shadow-sm" />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {classStds.length === 0 && <tr><td colSpan="3" className="text-center py-10 text-slate-400">ยังไม่มีนักเรียนในห้องนี้</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button onClick={handleSave} icon={Save} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg px-8">
                บันทึกการเช็คชื่อ (รอบที่ {selectedPeriod})
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      <AlertModal isOpen={alertData.isOpen} onClose={()=>setAlertData({isOpen:false, title:'', message:''})} title={alertData.title} message={alertData.message} />
    </div>
  );
}