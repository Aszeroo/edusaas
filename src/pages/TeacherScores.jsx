import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { Card, Button, Select, AlertModal } from '../components/UI';
import { CheckCircle2, ClipboardList, FileSpreadsheet, Save } from 'lucide-react';

export default function TeacherScores() {
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'summary'

  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  // ข้อมูลทั้งหมดที่ต้องใช้คำนวณ
  const [allScores, setAllScores] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [finalScores, setFinalScores] = useState([]); // เก็บข้อมูลคะแนนดิบที่ครูกรอกเอง

  const [selectedSub, setSelectedSub] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAssign, setSelectedAssign] = useState('');
  
  const [tempScores, setTempScores] = useState({});
  const [tempFinalScores, setTempFinalScores] = useState({});
  const [alertData, setAlertData] = useState({ isOpen: false, title: '', message: '' });

  // 1. โหลดข้อมูลพื้นฐานทั้งหมด
  useEffect(() => {
    const unsubSub = onSnapshot(query(collection(db, 'subjects')), snap => setSubjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubClass = onSnapshot(query(collection(db, 'classrooms')), snap => setClassrooms(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubScores = onSnapshot(collection(db, 'scores'), snap => setAllScores(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    return () => { unsubSub(); unsubClass(); unsubScores(); };
  }, []);

  // 2. โหลดข้อมูลนักเรียน งาน สถิติ เมื่อเลือกวิชาและห้อง
  useEffect(() => {
    if (selectedClass) {
      onSnapshot(query(collection(db, 'students'), where('classroomId', '==', selectedClass)), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    }
    
    if (selectedSub && selectedClass) {
      // โหลดงาน
      const qAsn = query(collection(db, 'assignments'), where('subjectId', '==', selectedSub), where('classrooms', 'array-contains', selectedClass));
      onSnapshot(qAsn, snap => setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()}))));
      
      // โหลดการเข้าเรียนเพื่อคำนวณ (มาเรียน)
      const qAtt = query(collection(db, 'attendance'), where('subjectId', '==', selectedSub), where('classroomId', '==', selectedClass));
      onSnapshot(qAtt, snap => setAttendance(snap.docs.map(d => d.data())));

      // โหลดคะแนนดิบที่กรอกในตารางสรุป
      const qFinal = query(collection(db, 'final_scores'), where('subjectId', '==', selectedSub), where('classroomId', '==', selectedClass));
      onSnapshot(qFinal, snap => {
        const fData = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setFinalScores(fData);
        // นำข้อมูลไปใส่ใน temp state ให้พร้อมแก้ไข
        const temp = {};
        fData.forEach(f => { temp[f.studentId] = { ...f }; });
        setTempFinalScores(temp);
      });
    }
  }, [selectedSub, selectedClass]);

  // เคลียร์ฟอร์มชั่วคราวเวลาเปลี่ยนงาน
  useEffect(() => {
    if (selectedAssign) setTempScores({});
  }, [selectedAssign]);


  /* --- ฟังก์ชันสำหรับ "แท็บให้คะแนนใบงาน" --- */
  const handleToggleSubmit = async (studentId, isCurrentlySubmitted) => {
    const existingScore = allScores.find(sc => sc.studentId === studentId && sc.assignmentId === selectedAssign);
    if(existingScore) await updateDoc(doc(db, 'scores', existingScore.id), { isSubmitted: !isCurrentlySubmitted });
    else await addDoc(collection(db, 'scores'), { studentId, assignmentId: selectedAssign, isSubmitted: true, score: 0 });
  };

  const saveSingleScore = async (studentId) => {
    let val = tempScores[studentId];
    const existingScore = allScores.find(sc => sc.studentId === studentId && sc.assignmentId === selectedAssign);
    if (val === undefined) {
      if (existingScore) val = existingScore.score; else return;
    }
    if(existingScore) {
      await updateDoc(doc(db, 'scores', existingScore.id), { score: Number(val), isSubmitted: true });
    } else {
      await addDoc(collection(db, 'scores'), { studentId, assignmentId: selectedAssign, isSubmitted: true, score: Number(val) });
    }
    setAlertData({isOpen: true, title: 'สำเร็จ', message: 'บันทึกคะแนนเรียบร้อยแล้ว!'});
  };


  /* --- ฟังก์ชันสำหรับ "แท็บสรุปคะแนน (ตารางตัดเกรด)" --- */
  const handleFinalChange = (studentId, field, value) => {
    setTempFinalScores(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [field]: value }
    }));
  };

  const saveAllFinalScores = async () => {
    try {
      // บันทึกข้อมูลของนักเรียนทุกคนในห้องลง Firebase
      for (const s of classStds) {
        const val = tempFinalScores[s.id] || {};
        const existing = finalScores.find(f => f.studentId === s.id);
        const data = {
          studentId: s.id,
          subjectId: selectedSub,
          classroomId: selectedClass,
          behavior: Number(val.behavior || 0),
          practical: Number(val.practical || 0),
          theory: Number(val.theory || 0),
          exercise: Number(val.exercise || 0),
          quiz: Number(val.quiz || 0)
        };

        if (existing) {
           await updateDoc(doc(db, 'final_scores', existing.id), data);
        } else {
           // บันทึกเฉพาะคนที่มีการกรอกคะแนนเพื่อลดขยะใน Database
           if (data.behavior || data.practical || data.theory || data.exercise || data.quiz) {
              await addDoc(collection(db, 'final_scores'), data);
           }
        }
      }
      setAlertData({isOpen: true, title: 'สำเร็จ', message: 'บันทึกตารางสรุปคะแนนของทุกคนเรียบร้อยแล้ว!'});
    } catch (err) {
      setAlertData({isOpen: true, title: 'เกิดข้อผิดพลาด', message: err.message});
    }
  };


  /* --- ตัวแปรสำหรับใช้แสดงผลตาราง --- */
  const classStds = students.sort((a,b) => Number(a.number) - Number(b.number));
  const activeAssign = assignments.find(a => a.id === selectedAssign);

  // คำนวณคะแนนเต็มของใบงานทั้งหมดในวิชานี้
  const totalMaxAsn = assignments.reduce((sum, a) => sum + Number(a.maxScore || 0), 0);
  // คำนวณจำนวนครั้งที่มีการเช็คชื่อไปแล้ว (นับจากวันที่ที่เช็คชื่อ)
  const totalClasses = new Set(attendance.map(a => a.date)).size;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <h1 className="text-3xl font-extrabold dark:text-white">ระบบให้คะแนน</h1>
      
      <Card className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 dark:bg-slate-800/50">
        <Select label="เลือกวิชา" options={subjects.map(s=>({label: s.name, value: s.id}))} value={selectedSub} onChange={e=>{setSelectedSub(e.target.value); setSelectedAssign('');}} />
        <Select label="เลือกห้องเรียน" options={classrooms.map(c=>({label: c.name, value: c.id}))} value={selectedClass} onChange={e=>{setSelectedClass(e.target.value); setSelectedAssign('');}} />
      </Card>

      {/* เมนูเลือกระบบการกรอกคะแนน (แสดงเมื่อเลือกวิชาและห้องแล้ว) */}
      {selectedSub && selectedClass && (
        <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl w-fit dark:bg-slate-800">
          <button 
            onClick={() => setActiveTab('assignments')} 
            className={`flex items-center px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'assignments' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <ClipboardList className="w-5 h-5 mr-2"/> ให้คะแนนใบงาน
          </button>
          <button 
            onClick={() => setActiveTab('summary')} 
            className={`flex items-center px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <FileSpreadsheet className="w-5 h-5 mr-2"/> สรุปคะแนน (ตัดเกรด)
          </button>
        </div>
      )}

      {/* ----------------------------------------------------
          แท็บ 1: ให้คะแนนใบงานรายชิ้น (เหมือนระบบเดิมเป๊ะๆ)
      ------------------------------------------------------ */}
      {activeTab === 'assignments' && selectedSub && selectedClass && (
        <>
          <div className="w-full md:w-1/3">
            <Select label="เลือกงานที่ต้องการตรวจ" options={assignments.map(a=>({label: a.title, value: a.id}))} value={selectedAssign} onChange={e=>setSelectedAssign(e.target.value)} />
          </div>

          {selectedAssign && activeAssign && (
            <Card className="animate-in fade-in zoom-in duration-300">
              <div className="mb-6 pb-4 border-b dark:border-slate-800">
                <h2 className="text-xl font-bold dark:text-white">{activeAssign.title} <span className="text-slate-500 font-normal text-sm ml-2">(คะแนนเต็ม {activeAssign.maxScore})</span></h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-slate-500 border-b dark:border-slate-800">
                    <tr><th className="p-3 w-20">เลขที่</th><th className="p-3">ชื่อ-นามสกุล</th><th className="p-3 text-center w-32">สถานะ</th><th className="p-3 text-right">ให้คะแนน</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {classStds.map(s => {
                      const scRec = allScores.find(sc => sc.studentId === s.id && sc.assignmentId === selectedAssign);
                      const isSub = scRec?.isSubmitted || false;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="p-3 font-bold dark:text-white">{s.number}</td>
                          <td className="p-3 dark:text-white">{s.prefix || ''}{s.firstName} {s.lastName}</td>
                          <td className="p-3 text-center">
                            <button onClick={()=>handleToggleSubmit(s.id, isSub)} className={`px-4 py-2 rounded-xl text-xs font-bold ${isSub ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                              {isSub ? 'ส่งแล้ว' : 'ยังไม่ส่ง'}
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                               <input type="number" min="0" max={activeAssign.maxScore} value={tempScores[s.id] !== undefined ? tempScores[s.id] : (scRec?.score || '')} onChange={(e)=>setTempScores({...tempScores, [s.id]: e.target.value})} placeholder="0" className="w-20 text-center rounded-lg border p-2 dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                               <span className="text-slate-400">/ {activeAssign.maxScore}</span>
                               <button onClick={()=>saveSingleScore(s.id)} className="text-emerald-600 hover:text-white hover:bg-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg transition-colors"><CheckCircle2 size={20}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}


      {/* ----------------------------------------------------
          แท็บ 2: สรุปคะแนนตัดเกรด 100 คะแนน (ของใหม่!)
      ------------------------------------------------------ */}
      {activeTab === 'summary' && selectedSub && selectedClass && (
        <Card className="animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-end mb-6 pb-4 border-b dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold dark:text-white text-indigo-600 flex items-center">
                ตารางสรุปคะแนนประจำวิชา (100 คะแนน)
              </h2>
              <p className="text-sm text-slate-500 mt-1">ใบงานและมาเรียนดึงจากระบบอัตโนมัติ กรุณากรอกคะแนนในช่องสีขาวเพื่อสรุปยอด</p>
            </div>
            <Button onClick={saveAllFinalScores} icon={Save} variant="success">บันทึกคะแนนทั้งห้อง</Button>
          </div>
          
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-center text-sm whitespace-nowrap border-collapse">
              <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="p-3 border dark:border-slate-700 w-16">เลขที่</th>
                  <th className="p-3 border dark:border-slate-700 text-left min-w-[180px]">ชื่อ-นามสกุล</th>
                  <th className="p-3 border dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 w-20">ใบงาน<br/>(30)</th>
                  <th className="p-3 border dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 w-20">มาเรียน<br/>(10)</th>
                  <th className="p-3 border dark:border-slate-700 w-24">พฤติกรรม<br/>(10)</th>
                  <th className="p-3 border dark:border-slate-700 w-24">สอบปฏิบัติ<br/>(10)</th>
                  <th className="p-3 border dark:border-slate-700 w-24 text-blue-600">สอบทฤษฎี<br/>(20)</th>
                  <th className="p-3 border dark:border-slate-700 w-24">แบบฝึกหัด<br/>(10)</th>
                  <th className="p-3 border dark:border-slate-700 w-24">แบบทดสอบ<br/>(10)</th>
                  <th className="p-3 border dark:border-slate-700 bg-slate-800 text-white dark:bg-slate-700 w-24 font-extrabold text-base">รวม<br/>(100)</th>
                </tr>
              </thead>
              <tbody>
                {classStds.map(s => {
                  // 1. คำนวณคะแนนใบงาน (เทียบบัญญัติไตรยางศ์จากคะแนนเต็มทั้งหมด -> 30)
                  const stdScores = allScores.filter(sc => sc.studentId === s.id && assignments.some(a => a.id === sc.assignmentId));
                  const sumAsn = stdScores.reduce((acc, sc) => acc + Number(sc.score || 0), 0);
                  const asnPoints = totalMaxAsn === 0 ? 0 : Math.round((sumAsn / totalMaxAsn) * 30);

                  // 2. คำนวณการมาเรียน (เทียบบัญญัติไตรยางศ์จากจำนวนครั้งที่สอน -> 10)
                  // ให้ มา = 1, สาย/ลา = 0.5 (ปรับเปลี่ยนได้)
                  const stdAtt = attendance.filter(a => a.studentId === s.id);
                  const presentCount = stdAtt.filter(a => a.status === 'present').length;
                  const lateLeaveCount = stdAtt.filter(a => a.status === 'late' || a.status === 'leave').length;
                  const attFormula = presentCount + (lateLeaveCount * 0.5);
                  const attPoints = totalClasses === 0 ? 0 : Math.round((attFormula / totalClasses) * 10);

                  // 3. ดึงค่าที่ครูพิมพ์ในช่อง (ถ้าไม่มีให้เป็น 0)
                  const fs = tempFinalScores[s.id] || {};
                  const behavior = Number(fs.behavior || 0);
                  const practical = Number(fs.practical || 0);
                  const theory = Number(fs.theory || 0);
                  const exercise = Number(fs.exercise || 0);
                  const quiz = Number(fs.quiz || 0);

                  // 4. รวมคะแนนทั้งหมด
                  const total = asnPoints + attPoints + behavior + practical + theory + exercise + quiz;

                  const inputClass = "w-16 p-2 text-center border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 font-semibold";

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="p-2 border dark:border-slate-700 font-bold dark:text-slate-300">{s.number}</td>
                      <td className="p-2 border dark:border-slate-700 text-left dark:text-white whitespace-nowrap">{s.prefix || ''}{s.firstName} {s.lastName}</td>
                      
                      {/* ช่องดึงอัตโนมัติ */}
                      <td className="p-2 border dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-900/10 font-extrabold text-indigo-600 text-lg">{asnPoints}</td>
                      <td className="p-2 border dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/10 font-extrabold text-emerald-600 text-lg">{attPoints}</td>
                      
                      {/* ช่องกรอกมือ */}
                      <td className="p-2 border dark:border-slate-700"><input type="number" min="0" max="10" placeholder="0" value={fs.behavior ?? ''} onChange={e=>handleFinalChange(s.id, 'behavior', e.target.value)} className={inputClass}/></td>
                      <td className="p-2 border dark:border-slate-700"><input type="number" min="0" max="10" placeholder="0" value={fs.practical ?? ''} onChange={e=>handleFinalChange(s.id, 'practical', e.target.value)} className={inputClass}/></td>
                      <td className="p-2 border dark:border-slate-700"><input type="number" min="0" max="20" placeholder="0" value={fs.theory ?? ''} onChange={e=>handleFinalChange(s.id, 'theory', e.target.value)} className={`${inputClass} border-blue-200 bg-blue-50/30`}/></td>
                      <td className="p-2 border dark:border-slate-700"><input type="number" min="0" max="10" placeholder="0" value={fs.exercise ?? ''} onChange={e=>handleFinalChange(s.id, 'exercise', e.target.value)} className={inputClass}/></td>
                      <td className="p-2 border dark:border-slate-700"><input type="number" min="0" max="10" placeholder="0" value={fs.quiz ?? ''} onChange={e=>handleFinalChange(s.id, 'quiz', e.target.value)} className={inputClass}/></td>
                      
                      {/* ผลรวม 100 คะแนน */}
                      <td className="p-2 border dark:border-slate-700 bg-slate-800 text-white dark:bg-slate-700 font-black text-xl">{total}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AlertModal isOpen={alertData.isOpen} onClose={()=>setAlertData({isOpen:false})} title={alertData.title} message={alertData.message} />
    </div>
  );
}