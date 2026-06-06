import React, { useState, useEffect } from 'react';
import { db, auth } from '../context/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Card } from '../components/UI';
import { BookOpen, CheckSquare, Award, Clock } from 'lucide-react';

export function StudentDashboard() {
  const [myInfo, setMyInfo] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [finalScores, setFinalScores] = useState([]); // ดึงข้อมูล 100 แต้ม

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'students'), where('email', '==', auth.currentUser.email.toLowerCase()));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setMyInfo({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!myInfo) return;
    const unsubSub = onSnapshot(collection(db, 'subjects'), snap => {
      setSubjects(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const unsubAtt = onSnapshot(query(collection(db, 'attendance'), where('studentId', '==', myInfo.id)), snap => {
      setAttendance(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    // ดึงคะแนนสรุปของเด็กคนนี้
    const unsubFinal = onSnapshot(query(collection(db, 'final_scores'), where('studentId', '==', myInfo.id)), snap => {
      setFinalScores(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    return () => { unsubSub(); unsubAtt(); unsubFinal(); };
  }, [myInfo]);

  if (!myInfo) return <div className="flex justify-center items-center h-full min-h-[400px] text-slate-500 font-medium">รอคุณครูเพิ่มข้อมูลนักเรียนเข้าสู่ระบบ...</div>;

  // 🌟 ฟิลเตอร์ใหม่: ดึงวิชามาโชว์ถ้าห้องตรงกัน หรือ "เคยโดนเช็คชื่อ" หรือ "มีคะแนนตัดเกรดแล้ว"
  const mySubjects = subjects.filter(sub => {
    const inClass = (sub.classrooms || []).includes(myInfo.classroomId);
    const hasAtt = attendance.some(a => a.subjectId === sub.id);
    const hasScore = finalScores.some(f => f.subjectId === sub.id);
    return inClass || hasAtt || hasScore;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-8 text-white shadow-lg shadow-indigo-200 dark:shadow-none relative overflow-hidden">
         <BookOpen className="absolute -right-6 -bottom-6 w-48 h-48 opacity-10" />
         <h1 className="text-4xl font-extrabold relative z-10">{myInfo.prefix || ''}{myInfo.firstName} {myInfo.lastName}</h1>
         <p className="text-indigo-100 text-lg mt-2 relative z-10 font-medium">เลขที่ {myInfo.number}</p>
      </div>

      <div className="flex items-center space-x-3 mb-4 mt-8">
         <CheckSquare className="text-indigo-600" />
         <h2 className="text-2xl font-bold dark:text-white">สถิติการเรียนและคะแนน (100 แต้ม)</h2>
      </div>

      {mySubjects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mySubjects.map(sub => {
            const subAtt = attendance.filter(a => a.subjectId === sub.id);
            const present = subAtt.filter(a => a.status === 'present').length;
            const late = subAtt.filter(a => a.status === 'late').length;
            const leave = subAtt.filter(a => a.status === 'leave').length;
            const absent = subAtt.filter(a => a.status === 'absent').length;

            // ดึงข้อมูลคะแนนที่ครูตัดเกรดแล้ว
            const fScore = finalScores.find(f => f.subjectId === sub.id);

            return (
              <Card key={sub.id} className="border-t-4 border-t-indigo-500 hover:shadow-md transition-all">
                <h3 className="font-bold text-xl mb-4 dark:text-white">{sub.name}</h3>
                
                <div className="grid grid-cols-4 gap-2 mb-5">
                   <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl"><p className="text-xs font-bold text-emerald-600 mb-1">มา</p><p className="font-extrabold text-xl text-emerald-700 dark:text-emerald-400">{present}</p></div>
                   <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl"><p className="text-xs font-bold text-amber-600 mb-1">สาย</p><p className="font-extrabold text-xl text-amber-700 dark:text-amber-400">{late}</p></div>
                   <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl"><p className="text-xs font-bold text-blue-600 mb-1">ลา</p><p className="font-extrabold text-xl text-blue-700 dark:text-blue-400">{leave}</p></div>
                   <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl"><p className="text-xs font-bold text-rose-600 mb-1">ขาด</p><p className="font-extrabold text-xl text-rose-700 dark:text-rose-400">{absent}</p></div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-3">
                     <span className="font-bold text-slate-700 dark:text-slate-200">คะแนนเก็บรวมสุทธิ</span>
                     {fScore ? (
                       <span className="font-extrabold text-indigo-600 text-3xl">{fScore.total} <span className="text-sm font-normal text-slate-400">/ 100</span></span>
                     ) : (
                       <span className="text-sm text-amber-600 bg-amber-100 px-3 py-1 rounded-full font-bold">รอครูสรุปคะแนน</span>
                     )}
                  </div>
                  
                  {fScore && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400 mt-4 border-t border-slate-200 dark:border-slate-700 pt-3">
                      <div className="flex justify-between bg-white dark:bg-slate-900 p-2 rounded shadow-sm"><span>ใบงาน:</span><strong className="text-slate-700 dark:text-slate-300">{fScore.assignmentScore}/30</strong></div>
                      <div className="flex justify-between bg-white dark:bg-slate-900 p-2 rounded shadow-sm"><span>มาเรียน:</span><strong className="text-slate-700 dark:text-slate-300">{fScore.attendanceScore}/10</strong></div>
                      <div className="flex justify-between bg-white dark:bg-slate-900 p-2 rounded shadow-sm"><span>พฤติกรรม:</span><strong className="text-slate-700 dark:text-slate-300">{fScore.behavior}/10</strong></div>
                      <div className="flex justify-between bg-white dark:bg-slate-900 p-2 rounded shadow-sm"><span>ปฏิบัติ:</span><strong className="text-slate-700 dark:text-slate-300">{fScore.practical}/10</strong></div>
                      <div className="flex justify-between bg-white dark:bg-slate-900 p-2 rounded shadow-sm"><span>ทฤษฎี:</span><strong className="text-slate-700 dark:text-slate-300">{fScore.theory}/20</strong></div>
                      <div className="flex justify-between bg-white dark:bg-slate-900 p-2 rounded shadow-sm"><span>ฝึกหัด:</span><strong className="text-slate-700 dark:text-slate-300">{fScore.exercise}/10</strong></div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
           ยังไม่มีรายวิชาที่ลงทะเบียน หรือยังไม่มีการเช็คชื่อ/สั่งงานมายังห้องของคุณ
        </div>
      )}
    </div>
  );
}

export function StudentAssignments() {
  const [myInfo, setMyInfo] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'students'), where('email', '==', auth.currentUser.email.toLowerCase()));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) setMyInfo({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!myInfo) return;
    const unsubA = onSnapshot(collection(db, 'assignments'), snap => setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubSub = onSnapshot(collection(db, 'subjects'), snap => setSubjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubSc = onSnapshot(query(collection(db, 'scores'), where('studentId', '==', myInfo.id)), snap => setScores(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsubA(); unsubSub(); unsubSc(); };
  }, [myInfo]);

  if (!myInfo) return <div className="flex justify-center items-center h-full text-slate-500 font-medium">กำลังโหลดข้อมูลงาน...</div>;

  const myAssignments = assignments.filter(a => (a.classrooms || []).includes(myInfo.classroomId)).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
       <div className="flex items-center space-x-3 mb-6">
         <Award className="text-indigo-600 w-8 h-8" />
         <h1 className="text-3xl font-extrabold dark:text-white">งานที่ได้รับมอบหมาย</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myAssignments.map(a => {
          const sub = subjects.find(s => s.id === a.subjectId);
          const sc = scores.find(s => s.assignmentId === a.id);
          
          return (
            <Card key={a.id} className="flex flex-col h-full hover:-translate-y-1 transition-transform border-t-4 border-t-indigo-400">
               <div className="flex-1">
                 <div className="text-xs font-bold text-indigo-500 mb-2 uppercase tracking-wide">{sub?.name || 'ไม่ระบุวิชา'}</div>
                 <h3 className="font-bold text-lg dark:text-white leading-tight mb-2">{a.title}</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{a.desc || 'ไม่มีรายละเอียด'}</p>
               </div>
               
               <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <div className="text-xs text-slate-400 flex items-center">
                   <Clock className="w-3 h-3 mr-1"/> {new Date(a.createdAt).toLocaleDateString('th-TH')}
                 </div>
                 {sc ? (
                   <div className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800">
                     ได้ {sc.score} / {a.maxScore}
                   </div>
                 ) : (
                   <div className="font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-lg border border-amber-100 dark:border-amber-800">
                     รอตรวจ
                   </div>
                 )}
               </div>
            </Card>
          );
        })}
        {myAssignments.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            ยังไม่มีงานที่มอบหมาย
          </div>
        )}
      </div>
    </div>
  );
}