import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Card, Select, Button } from '../components/UI';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ScoreReporting({ teacherId }) {
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [finalScores, setFinalScores] = useState([]); // 🌟 ดึงข้อมูล 100 แต้ม

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const unsubSub = onSnapshot(collection(db, 'subjects'), snap => setSubjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubClass = onSnapshot(collection(db, 'classrooms'), snap => setClassrooms(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubStd = onSnapshot(collection(db, 'students'), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubAtt = onSnapshot(collection(db, 'attendance'), snap => setAttendance(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    // ดึงตาราง final_scores เพื่อเอาไป Export
    const unsubFinal = onSnapshot(collection(db, 'final_scores'), snap => setFinalScores(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubSub(); unsubClass(); unsubStd(); unsubAtt(); unsubFinal(); };
  }, []);

  const classStds = students.filter(s => s.classroomId === selectedClass).sort((a, b) => Number(a.number) - Number(b.number));

  const handleExportExcel = () => {
    if (!selectedSubject || !selectedClass) return alert('กรุณาเลือกวิชาและห้องเรียน');
    
    const subName = subjects.find(s => s.id === selectedSubject)?.name || 'Unknown';
    const clsName = classrooms.find(c => c.id === selectedClass)?.name || 'Unknown';

    const exportData = classStds.map(s => {
      const stdAtt = attendance.filter(a => a.studentId === s.id && a.subjectId === selectedSubject);
      const present = stdAtt.filter(a => a.status === 'present').length;
      const late = stdAtt.filter(a => a.status === 'late').length;
      const leave = stdAtt.filter(a => a.status === 'leave').length;
      const absent = stdAtt.filter(a => a.status === 'absent').length;

      // 🌟 หาข้อมูล 100 แต้มของเด็กคนนี้
      const fScore = finalScores.find(f => f.studentId === s.id && f.subjectId === selectedSubject) || {};

      return {
        'เลขที่': s.number,
        'ชื่อ-นามสกุล': `${s.prefix || ''}${s.firstName} ${s.lastName}`,
        'มา': present,
        'สาย': late,
        'ลา': leave,
        'ขาด': absent,
        'คะแนนใบงาน (30)': fScore.assignmentScore || 0,
        'คะแนนมาเรียน (10)': fScore.attendanceScore || 0,
        'พฤติกรรม (10)': fScore.behavior || 0,
        'สอบปฏิบัติ (10)': fScore.practical || 0,
        'สอบทฤษฎี (20)': fScore.theory || 0,
        'แบบฝึกหัด (10)': fScore.exercise || 0,
        'แบบทดสอบ (10)': fScore.quiz || 0,
        'คะแนนรวมสุทธิ (100)': fScore.total || 0 // รวมเสร็จสรรพ
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Scores');
    XLSX.writeFile(wb, `รายงานคะแนน_${subName}_${clsName}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <h1 className="text-3xl font-extrabold dark:text-white">รายงานและ Export (คะแนนตัดเกรด)</h1>
      
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
        </div>

        {selectedSubject && selectedClass ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={handleExportExcel} icon={FileSpreadsheet} className="bg-emerald-600 hover:bg-emerald-700">Export Excel (พร้อมคะแนน 100 แต้ม)</Button>
            </div>
            
            <div className="overflow-x-auto mt-6">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3 border-b dark:border-slate-700">เลขที่</th>
                    <th className="p-3 border-b dark:border-slate-700">ชื่อ-นามสกุล</th>
                    <th className="p-3 border-b dark:border-slate-700 text-center text-emerald-600">มา</th>
                    <th className="p-3 border-b dark:border-slate-700 text-center text-rose-600">ขาด</th>
                    <th className="p-3 border-b dark:border-slate-700 text-center">คะแนนรวมสุทธิ (100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classStds.map(s => {
                    const stdAtt = attendance.filter(a => a.studentId === s.id && a.subjectId === selectedSubject);
                    const present = stdAtt.filter(a => a.status === 'present').length;
                    const absent = stdAtt.filter(a => a.status === 'absent').length;
                    
                    // 🌟 หาข้อมูลคะแนนรวมมาโชว์ในตาราง
                    const fScore = finalScores.find(f => f.studentId === s.id && f.subjectId === selectedSubject);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="p-3 font-bold dark:text-slate-300">{s.number}</td>
                        <td className="p-3 dark:text-white">{s.prefix || ''}{s.firstName} {s.lastName}</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">{present}</td>
                        <td className="p-3 text-center text-rose-600 font-bold">{absent}</td>
                        <td className="p-3 text-center">
                          {fScore ? (
                            <span className="font-extrabold text-indigo-600 text-lg bg-indigo-50 px-3 py-1 rounded-lg">{fScore.total}</span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">ยังไม่สรุปคะแนน</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {classStds.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-slate-400">ไม่มีข้อมูลนักเรียน</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">กรุณาเลือกวิชาและห้องเรียนเพื่อดูรายงาน</div>
        )}
      </Card>
    </div>
  );
}