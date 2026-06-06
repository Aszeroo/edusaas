import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Card, Button, Select } from '../components/UI';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ScoreReporting({ teacherId }) {
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [scores, setScores] = useState([]);
  
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    onSnapshot(query(collection(db, 'subjects')), snap => setSubjects(snap.docs.map(d=>({id:d.id, ...d.data()}))));
    onSnapshot(query(collection(db, 'classrooms')), snap => setClassrooms(snap.docs.map(d=>({id:d.id, ...d.data()}))));
  }, [teacherId]);

  useEffect(() => {
    if (selectedClass) {
      onSnapshot(query(collection(db, 'students'), where('classroomId', '==', selectedClass)), snap => setStudents(snap.docs.map(d=>({id:d.id, ...d.data()}))));
    }
    if (selectedClass && selectedSub) {
      onSnapshot(query(collection(db, 'attendance'), where('classroomId', '==', selectedClass), where('subjectId', '==', selectedSub)), snap => setAttendance(snap.docs.map(d=>({id:d.id, ...d.data()}))));
      
      // แก้ไขตรงนี้: เปลี่ยนจากการหา classroomId เป็น array-contains classrooms
      const qAsn = query(
        collection(db, 'assignments'), 
        where('subjectId', '==', selectedSub),
        where('classrooms', 'array-contains', selectedClass)
      );
      onSnapshot(qAsn, snap => setAssignments(snap.docs.map(d=>({id:d.id, ...d.data()}))));
      
      onSnapshot(collection(db, 'scores'), snap => setScores(snap.docs.map(d=>({id:d.id, ...d.data()}))));
    }
  }, [selectedClass, selectedSub]);

  const generateReportData = () => {
    return students.sort((a,b)=>Number(a.number)-Number(b.number)).map(s => {
      const studentAtt = attendance.filter(a => a.studentId === s.id);
      const subAsnIds = assignments.map(asn => asn.id);
      const studentScores = scores.filter(sc => sc.studentId === s.id && subAsnIds.includes(sc.assignmentId));
      
      return {
        number: s.number,
        prefix: s.prefix || '',
        firstName: s.firstName,
        lastName: s.lastName,
        room: classrooms.find(c => c.id === selectedClass)?.name || '-',
        present: studentAtt.filter(a => a.status === 'present').length,
        absent: studentAtt.filter(a => a.status === 'absent').length,
        leave: studentAtt.filter(a => a.status === 'leave').length,
        late: studentAtt.filter(a => a.status === 'late').length,
        totalScore: studentScores.reduce((sum, sc) => sum + Number(sc.score || 0), 0)
      };
    });
  };

  const exportPDF = () => {
    const reportData = generateReportData();
    const subName = subjects.find(s => s.id === selectedSub)?.name || '';
    const className = classrooms.find(c => c.id === selectedClass)?.name || '';
    
    let tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif;">
        <thead>
          <tr style="background-color: #f8fafc; text-align: center; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 12px; border: 1px solid #e2e8f0;">เลขที่</th>
            <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">ชื่อ-นามสกุล</th>
            <th style="padding: 12px; border: 1px solid #e2e8f0; color: #059669;">มา</th>
            <th style="padding: 12px; border: 1px solid #e2e8f0; color: #e11d48;">ขาด</th>
            <th style="padding: 12px; border: 1px solid #e2e8f0; color: #2563eb;">ลา</th>
            <th style="padding: 12px; border: 1px solid #e2e8f0; color: #d97706;">สาย</th>
            <th style="padding: 12px; border: 1px solid #e2e8f0; color: #4f46e5; text-align: right;">คะแนนรวม</th>
          </tr>
        </thead>
        <tbody>
    `;

    reportData.forEach(s => {
      tableHTML += `
        <tr style="text-align: center; border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${s.number}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">${s.prefix}${s.firstName} ${s.lastName}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.present}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.absent}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.leave}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.late}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${s.totalScore}</td>
        </tr>
      `;
    });
    tableHTML += `</tbody></table>`;

    const printWindow = window.open('', '', 'width=900,height=650');
    printWindow.document.write(`
      <html>
        <head>
          <title>รายงานคะแนนและสถิติ - ${subName}</title>
        </head>
        <body style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="margin-bottom: 5px;">รายงานคะแนนและสถิติการเข้าเรียน</h2>
          <p style="margin-top: 0; color: #64748b;">วิชา: <strong>${subName}</strong> | ห้องเรียน: <strong>${className}</strong></p>
          ${tableHTML}
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportExcel = () => {
    const excelData = generateReportData().map(r => ({
      "เลขที่": r.number, 
      "ชื่อ-นามสกุล": `${r.prefix}${r.firstName} ${r.lastName}`, 
      "ห้อง": r.room,
      "มาเรียน": r.present, 
      "ขาด": r.absent, 
      "ลา": r.leave, 
      "สาย": r.late, 
      "คะแนนรวม": r.totalScore
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Score_Report_${selectedClass}.xlsx`);
  };

  const reportPreview = generateReportData();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
       <h1 className="text-3xl font-extrabold dark:text-white">รายงานและ Export</h1>
       <Card className="flex flex-col md:flex-row gap-4">
          <Select label="เลือกวิชา" options={subjects.map(s=>({label: s.name, value: s.id}))} value={selectedSub} onChange={e=>setSelectedSub(e.target.value)} />
          <Select label="เลือกห้องเรียน" options={classrooms.map(c=>({label: c.name, value: c.id}))} value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} />
       </Card>
       
       {selectedClass && selectedSub && students.length > 0 && (
         <Card>
            <div className="flex gap-4 mb-6">
              <Button icon={Download} onClick={exportPDF} variant="secondary">Export PDF</Button>
              <Button icon={Download} onClick={exportExcel} variant="success">Export Excel</Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4">เลขที่</th>
                    <th className="pb-3 pr-4">ชื่อ-นามสกุล</th>
                    <th className="pb-3 pr-4 text-center">มา</th>
                    <th className="pb-3 pr-4 text-center">ขาด</th>
                    <th className="pb-3 pr-4 text-center">ลา</th>
                    <th className="pb-3 pr-4 text-center">สาย</th>
                    <th className="pb-3 text-right">คะแนนรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportPreview.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="py-3 font-bold dark:text-white">{s.number}</td>
                      <td className="py-3 dark:text-white">{s.prefix || ''}{s.firstName} {s.lastName}</td>
                      <td className="py-3 text-center text-emerald-600 font-bold">{s.present}</td>
                      <td className="py-3 text-center text-rose-500 font-bold">{s.absent}</td>
                      <td className="py-3 text-center text-blue-500 font-bold">{s.leave}</td>
                      <td className="py-3 text-center text-amber-500 font-bold">{s.late}</td>
                      <td className="py-3 text-right font-extrabold text-indigo-600">{s.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </Card>
       )}
    </div>
  );
}