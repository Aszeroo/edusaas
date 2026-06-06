import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Card, Button, Select, AlertModal } from '../components/UI';
import { FileSpreadsheet, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TeacherScores() {
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [scores, setScores] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [finalScoresDb, setFinalScoresDb] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [activeTab, setActiveTab] = useState('ASSIGNMENTS'); // 'ASSIGNMENTS' | 'FINAL'

  // 🌟 State สำหรับแท็บ "ให้คะแนนใบงาน"
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [assignmentInput, setAssignmentInput] = useState({});

  // State สำหรับแท็บ "สรุปคะแนน" (พฤติกรรม, ปฏิบัติ, ทฤษฎี, แบบฝึกหัด, ทดสอบ)
  const [finalInput, setFinalInput] = useState({});
  const [alertData, setAlertData] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    const unsubSub = onSnapshot(collection(db, 'subjects'), snap => setSubjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubClass = onSnapshot(collection(db, 'classrooms'), snap => setClassrooms(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubStd = onSnapshot(collection(db, 'students'), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubAsn = onSnapshot(collection(db, 'assignments'), snap => setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubSc = onSnapshot(collection(db, 'scores'), snap => setScores(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubAtt = onSnapshot(collection(db, 'attendance'), snap => setAttendance(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubFinal = onSnapshot(collection(db, 'final_scores'), snap => setFinalScoresDb(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubSub(); unsubClass(); unsubStd(); unsubAsn(); unsubSc(); unsubAtt(); unsubFinal(); };
  }, []);

  // เมื่อเปลี่ยนวิชา/ห้อง ให้ดึงคะแนนเก่าของแท็บ "สรุปคะแนน" มาใส่ช่อง Input
  useEffect(() => {
    if (selectedSubject && selectedClass) {
      const inputs = {};
      finalScoresDb.forEach(f => {
        if (f.subjectId === selectedSubject && f.classroomId === selectedClass) {
          inputs[f.studentId] = {
            behavior: f.behavior || 0,
            practical: f.practical || 0,
            theory: f.theory || 0,
            exercise: f.exercise || 0,
            quiz: f.quiz || 0
          };
        }
      });
      setFinalInput(inputs);
    }
  }, [selectedSubject, selectedClass, finalScoresDb]);

  // 🌟 เมื่อเปลี่ยนใบงาน ให้ดึงคะแนนเดิมมาแสดงในช่องกรอก
  useEffect(() => {
    if (selectedAssignment) {
      const inputs = {};
      scores.forEach(sc => {
        if (sc.assignmentId === selectedAssignment) {
          inputs[sc.studentId] = sc.score;
        }
      });
      setAssignmentInput(inputs);
    } else {
      setAssignmentInput({});
    }
  }, [selectedAssignment, scores]);

  const classStds = students.filter(s => s.classroomId === selectedClass).sort((a,b)=>Number(a.number)-Number(b.number));
  const classAsn = assignments.filter(a => a.subjectId === selectedSubject && (a.classrooms || []).includes(selectedClass));

  // ฟังก์ชันคำนวณคะแนนใบงานรวม
  const getAssignmentScore30 = (studentId) => {
    if (classAsn.length === 0) return 0;
    let totalMax = 0;
    let totalGot = 0;
    classAsn.forEach(a => {
      totalMax += Number(a.maxScore || 0);
      const sc = scores.find(s => s.assignmentId === a.id && s.studentId === studentId);
      if (sc) totalGot += Number(sc.score || 0);
    });
    if (totalMax === 0) return 0;
    return Math.round((totalGot / totalMax) * 30);
  };

  // ฟังก์ชันคำนวณคะแนนมาเรียน
  const getAttendanceScore10 = (studentId) => {
    const stdAtt = attendance.filter(a => a.subjectId === selectedSubject && a.classroomId === selectedClass);
    if (stdAtt.length === 0) return 0;
    
    const uniqueDates = new Set(stdAtt.map(a => a.date)).size;
    if (uniqueDates === 0) return 0;

    const myAtt = stdAtt.filter(a => a.studentId === studentId);
    let score = 0;
    myAtt.forEach(a => {
      if (a.status === 'present') score += 1;
      else if (a.status === 'late') score += 0.5;
    });

    return Math.round((score / uniqueDates) * 10);
  };

  // 🌟 ฟังก์ชันจัดการการพิมพ์คะแนนใบงาน
  const handleAssignmentScoreChange = (studentId, value) => {
    const val = value === '' ? '' : Number(value);
    setAssignmentInput(prev => ({ ...prev, [studentId]: val }));
  };

  // 🌟 ฟังก์ชันบันทึกคะแนนใบงานรายชิ้น
  const handleSaveAssignmentScores = async () => {
    try {
      for (const studentId of Object.keys(assignmentInput)) {
        const scoreVal = assignmentInput[studentId];
        if (scoreVal === '' || scoreVal === null) continue;

        const docId = `${selectedAssignment}_${studentId}`;
        await setDoc(doc(db, 'scores', docId), {
          assignmentId: selectedAssignment,
          studentId: studentId,
          score: Number(scoreVal),
          updatedAt: new Date().toISOString()
        });
      }
      setAlertData({ isOpen: true, title: 'สำเร็จ', message: 'บันทึกคะแนนของใบงานนี้เรียบร้อยแล้ว!' });
    } catch (error) {
      setAlertData({ isOpen: true, title: 'เกิดข้อผิดพลาด', message: error.message });
    }
  };

  const handleFinalInputChange = (studentId, field, value) => {
    const val = value === '' ? '' : Number(value);
    setFinalInput(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: val
      }
    }));
  };

  // บันทึกคะแนนลงตาราง final_scores (ตัดเกรด 100 แต้ม)
  const handleSaveFinalScores = async () => {
    try {
      for (const s of classStds) {
        const asgnScore = getAssignmentScore30(s.id);
        const attScore = getAttendanceScore10(s.id);
        
        const inputs = finalInput[s.id] || {};
        const behavior = Number(inputs.behavior || 0);
        const practical = Number(inputs.practical || 0);
        const theory = Number(inputs.theory || 0);
        const exercise = Number(inputs.exercise || 0);
        const quiz = Number(inputs.quiz || 0);
        
        const total = asgnScore + attScore + behavior + practical + theory + exercise + quiz;
        const docId = `${selectedSubject}_${s.id}`;

        await setDoc(doc(db, 'final_scores', docId), {
          studentId: s.id,
          subjectId: selectedSubject,
          classroomId: selectedClass,
          assignmentScore: asgnScore,
          attendanceScore: attScore,
          behavior,
          practical,
          theory,
          exercise,
          quiz,
          total,
          updatedAt: new Date().toISOString()
        });
      }
      setAlertData({ isOpen: true, title: 'สำเร็จ', message: 'บันทึกตารางสรุปคะแนนของทุกคนเรียบร้อยแล้ว!' });
    } catch (error) {
      setAlertData({ isOpen: true, title: 'เกิดข้อผิดพลาด', message: error.message });
    }
  };

  const handleExportExcel = () => {
    const subName = subjects.find(s => s.id === selectedSubject)?.name || 'Unknown';
    const exportData = classStds.map(s => {
      const asgnScore = getAssignmentScore30(s.id);
      const attScore = getAttendanceScore10(s.id);
      const inputs = finalInput[s.id] || {};
      const total = asgnScore + attScore + Number(inputs.behavior||0) + Number(inputs.practical||0) + Number(inputs.theory||0) + Number(inputs.exercise||0) + Number(inputs.quiz||0);
      
      return {
        'เลขที่': s.number,
        'ชื่อ-นามสกุล': `${s.prefix || ''}${s.firstName} ${s.lastName}`,
        'ใบงาน (30)': asgnScore,
        'มาเรียน (10)': attScore,
        'พฤติกรรม (10)': inputs.behavior || 0,
        'สอบปฏิบัติ (10)': inputs.practical || 0,
        'สอบทฤษฎี (20)': inputs.theory || 0,
        'แบบฝึกหัด (10)': inputs.exercise || 0,
        'แบบทดสอบ (10)': inputs.quiz || 0,
        'รวม (100)': total
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'FinalScores');
    XLSX.writeFile(wb, `สรุปคะแนน_${subName}.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 print:m-0 print:p-0">
      
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-extrabold dark:text-white">ระบบให้คะแนน</h1>
      </div>

      <Card className="print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

        {selectedSubject && selectedClass && (
          <div className="flex space-x-2 mt-6 border-b dark:border-slate-800">
            <button 
              onClick={() => setActiveTab('ASSIGNMENTS')}
              className={`px-4 py-2 font-bold rounded-t-xl transition-colors ${activeTab === 'ASSIGNMENTS' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
               ให้คะแนนใบงาน
            </button>
            <button 
              onClick={() => setActiveTab('FINAL')}
              className={`px-4 py-2 font-bold rounded-t-xl transition-colors ${activeTab === 'FINAL' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
               สรุปคะแนน (ตัดเกรด)
            </button>
          </div>
        )}
      </Card>

      {/* 🌟 1. แท็บให้คะแนนใบงานรายชิ้น (นำกลับมาแล้ว) 🌟 */}
      {selectedSubject && selectedClass && activeTab === 'ASSIGNMENTS' && (
        <Card className="print:hidden">
          <div className="mb-6 max-w-sm">
            <Select 
              label="เลือกใบงานที่จะตรวจ" 
              options={classAsn.map(a => ({label: `${a.title} (เต็ม ${a.maxScore})`, value: a.id}))} 
              value={selectedAssignment} 
              onChange={e => setSelectedAssignment(e.target.value)} 
            />
          </div>

          {selectedAssignment ? (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-20 text-center">เลขที่</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">ชื่อ-นามสกุล</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-48 text-center text-indigo-600">
                      คะแนนที่ได้ (เต็ม {classAsn.find(a => a.id === selectedAssignment)?.maxScore || 0})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classStds.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="p-3 font-bold dark:text-slate-300 text-center">{s.number}</td>
                      <td className="p-3 dark:text-white font-medium">{s.prefix || ''}{s.firstName} {s.lastName}</td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          min="0" 
                          max={classAsn.find(a => a.id === selectedAssignment)?.maxScore || 100}
                          value={assignmentInput[s.id] ?? ''} 
                          onChange={e => handleAssignmentScoreChange(s.id, e.target.value)} 
                          className="w-full p-2 text-center font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-indigo-400" 
                          placeholder="-"
                        />
                      </td>
                    </tr>
                  ))}
                  {classStds.length === 0 && <tr><td colSpan="3" className="text-center py-10 text-slate-400">ยังไม่มีนักเรียนในห้องนี้</td></tr>}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <Button onClick={handleSaveAssignmentScores} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                  บันทึกคะแนนใบงานนี้
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              กรุณาเลือกใบงานที่ต้องการตรวจคะแนนจากด้านบน
            </div>
          )}
        </Card>
      )}

      {/* 🌟 2. แท็บสรุปคะแนนตัดเกรด (100 คะแนน) และส่วน Print PDF 🌟 */}
      {selectedSubject && selectedClass && activeTab === 'FINAL' && (
        <Card id="print-container" className="print:shadow-none print:border-none print:p-0 print:m-0 print:bg-transparent">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
             <div>
               <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-400 flex items-center">
                 ตารางสรุปคะแนนประจำวิชา (100 คะแนน)
               </h2>
               <p className="text-sm text-slate-500 mt-1">ใบงานและมาเรียนดึงจากระบบอัตโนมัติ กรุณากรอกคะแนนในช่องสีขาวเพื่อสรุปยอด</p>
             </div>
             
             <div className="flex flex-wrap gap-2">
                <Button onClick={handleExportExcel} variant="secondary" icon={FileSpreadsheet} className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200">
                  Export Excel
                </Button>
                <Button onClick={handleExportPDF} variant="secondary" icon={Printer} className="text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200">
                  Export PDF
                </Button>
                <Button onClick={handleSaveFinalScores} className="bg-emerald-500 hover:bg-emerald-600 border-none shadow-md">
                  บันทึกคะแนนทั้งห้อง
                </Button>
             </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <h2 className="hidden print:block text-xl font-bold mb-4 text-center text-black">
              สรุปคะแนนวิชา: {subjects.find(s=>s.id===selectedSubject)?.name} | ห้อง: {classrooms.find(c=>c.id===selectedClass)?.name}
            </h2>
            <table className="w-full text-center text-sm border-collapse border border-slate-300 print:border-slate-800 print:text-black">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 print:bg-gray-100">
                <tr>
                  <th className="p-3 border border-slate-300 print:border-black w-16">เลขที่</th>
                  <th className="p-3 border border-slate-300 print:border-black text-left">ชื่อ-นามสกุล</th>
                  <th className="p-3 border border-slate-300 print:border-black text-indigo-600 w-20">ใบงาน<br/>(30)</th>
                  <th className="p-3 border border-slate-300 print:border-black text-emerald-600 w-20">มาเรียน<br/>(10)</th>
                  <th className="p-3 border border-slate-300 print:border-black w-20">พฤติกรรม<br/>(10)</th>
                  <th className="p-3 border border-slate-300 print:border-black w-20">สอบปฏิบัติ<br/>(10)</th>
                  <th className="p-3 border border-slate-300 print:border-black text-blue-600 w-20">สอบทฤษฎี<br/>(20)</th>
                  <th className="p-3 border border-slate-300 print:border-black w-20">แบบฝึกหัด<br/>(10)</th>
                  <th className="p-3 border border-slate-300 print:border-black w-20">ทดสอบ<br/>(10)</th>
                  <th className="p-3 border border-slate-300 print:border-black bg-slate-800 text-white w-20">รวม<br/>(100)</th>
                </tr>
              </thead>
              <tbody>
                {classStds.map(s => {
                  const asgnScore = getAssignmentScore30(s.id);
                  const attScore = getAttendanceScore10(s.id);
                  const inputs = finalInput[s.id] || {};
                  
                  const behavior = Number(inputs.behavior || 0);
                  const practical = Number(inputs.practical || 0);
                  const theory = Number(inputs.theory || 0);
                  const exercise = Number(inputs.exercise || 0);
                  const quiz = Number(inputs.quiz || 0);
                  
                  const totalScore = asgnScore + attScore + behavior + practical + theory + exercise + quiz;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 print:hover:bg-white print:break-inside-avoid">
                      <td className="p-2 border border-slate-300 print:border-black font-bold dark:text-white">{s.number}</td>
                      <td className="p-2 border border-slate-300 print:border-black text-left font-medium dark:text-white whitespace-nowrap">{s.prefix || ''}{s.firstName} {s.lastName}</td>
                      <td className="p-2 border border-slate-300 print:border-black font-bold text-indigo-600 text-lg bg-indigo-50/30 print:bg-white">{asgnScore}</td>
                      <td className="p-2 border border-slate-300 print:border-black font-bold text-emerald-600 text-lg bg-emerald-50/30 print:bg-white">{attScore}</td>
                      
                      <td className="p-1 border border-slate-300 print:border-black">
                        <input type="number" min="0" max="10" value={inputs.behavior ?? ''} onChange={e => handleFinalInputChange(s.id, 'behavior', e.target.value)} className="w-full p-1.5 text-center border-none rounded focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:text-white print:p-0" />
                      </td>
                      <td className="p-1 border border-slate-300 print:border-black">
                        <input type="number" min="0" max="10" value={inputs.practical ?? ''} onChange={e => handleFinalInputChange(s.id, 'practical', e.target.value)} className="w-full p-1.5 text-center border-none rounded focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:text-white print:p-0" />
                      </td>
                      <td className="p-1 border border-slate-300 print:border-black">
                        <input type="number" min="0" max="20" value={inputs.theory ?? ''} onChange={e => handleFinalInputChange(s.id, 'theory', e.target.value)} className="w-full p-1.5 text-center border-none rounded focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:text-white print:p-0" />
                      </td>
                      <td className="p-1 border border-slate-300 print:border-black">
                        <input type="number" min="0" max="10" value={inputs.exercise ?? ''} onChange={e => handleFinalInputChange(s.id, 'exercise', e.target.value)} className="w-full p-1.5 text-center border-none rounded focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:text-white print:p-0" />
                      </td>
                      <td className="p-1 border border-slate-300 print:border-black">
                        <input type="number" min="0" max="10" value={inputs.quiz ?? ''} onChange={e => handleFinalInputChange(s.id, 'quiz', e.target.value)} className="w-full p-1.5 text-center border-none rounded focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:text-white print:p-0" />
                      </td>
                      
                      <td className="p-2 border border-slate-300 print:border-black font-extrabold text-white text-lg bg-slate-800 print:bg-white print:text-black">{totalScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 🌟 CSS ฉบับสมบูรณ์สำหรับปลดล็อคโครงสร้างตอนสั่ง Print */}
      <style>{`
        @media print {
          /* ซ่อน Sidebar และ Header ของ App.jsx */
          aside, header, nav { 
            display: none !important; 
          }
          
          /* ปลดล็อคความสูงและ Scrollbar เพื่อให้เนื้อหาไหลลงไปตามธรรมชาติ */
          html, body, #root, main, .overflow-y-auto, .overflow-hidden, .h-screen {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            position: static !important;
            background: white !important;
          }

          /* ซ่อนปุ่มหรือองค์ประกอบที่ไม่ต้องการตอน Print */
          .print\\:hidden { 
            display: none !important; 
          }

          /* ทำให้ตารางแสดงผลสวยงามและตัดหน้ากระดาษได้ถูกต้อง */
          table { page-break-inside: auto; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }

          /* เปลี่ยน Input ช่องกรอกคะแนนให้เป็นตัวหนังสือปกติ */
          input[type="number"] {
            -moz-appearance: textfield;
            background: transparent !important;
            color: black !important;
            font-size: 1.125rem !important;
            font-weight: bold !important;
          }
          input::-webkit-outer-spin-button, input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
        }
      `}</style>

      <AlertModal isOpen={alertData.isOpen} onClose={()=>setAlertData({isOpen:false, title:'', message:''})} title={alertData.title} message={alertData.message} />
    </div>
  );
}