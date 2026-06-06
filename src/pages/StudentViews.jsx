import React, { useState, useEffect } from 'react';
import { db, auth } from '../context/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Card } from '../components/UI';
import { BookText, BookOpen, BarChart2 } from 'lucide-react';

export function StudentDashboard() {
  const [myInfo, setMyInfo] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [scores, setScores] = useState([]);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    if(!auth.currentUser) return;
    const unsub = onSnapshot(query(collection(db, 'students'), where('email', '==', auth.currentUser.email)), snap => {
      if(!snap.empty) {
        const std = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setMyInfo(std);

        onSnapshot(collection(db, 'subjects'), res => setSubjects(res.docs.map(d=>({id:d.id, ...d.data()}))));
        onSnapshot(collection(db, 'assignments'), res => setAssignments(res.docs.map(d=>({id:d.id, ...d.data()}))));
        onSnapshot(query(collection(db, 'attendance'), where('studentId', '==', std.id)), res => setAttendance(res.docs.map(d=>d.data())));
        onSnapshot(query(collection(db, 'scores'), where('studentId', '==', std.id)), res => setScores(res.docs.map(d=>d.data())));
      }
    });
    return () => unsub();
  }, []);

  if (!myInfo) return <div className="text-center py-20 text-slate-500 font-bold text-xl">รอคุณครูเพิ่มข้อมูลนักเรียนเข้าสู่ระบบ...</div>;

  // แก้ไขเงื่อนไขตรงนี้: ให้แสดงวิชาเมื่อมีการเช็คชื่อแล้ว หรือมีการสั่งงาน
  const mySubjects = subjects.filter(sub =>
    attendance.some(a => a.subjectId === sub.id) || 
    assignments.some(a => a.subjectId === sub.id && (a.classrooms || []).includes(myInfo.classroomId))
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold">{myInfo.prefix || ''}{myInfo.firstName} {myInfo.lastName}</h1>
          <p className="mt-4 text-xl opacity-90 font-medium">เลขที่ {myInfo.number}</p>
        </div>
        <BookOpen className="absolute -bottom-10 -right-10 w-64 h-64 text-white opacity-10" />
      </div>

      <h2 className="text-2xl font-extrabold dark:text-white flex items-center mb-6 pt-4">
        <BarChart2 className="w-6 h-6 mr-3 text-indigo-500"/> สถิติการเรียนรายวิชา
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mySubjects.map(sub => {
          const subAtt = attendance.filter(a => a.subjectId === sub.id);
          const present = subAtt.filter(a => a.status === 'present').length;
          const late = subAtt.filter(a => a.status === 'late').length;
          const leave = subAtt.filter(a => a.status === 'leave').length;
          const absent = subAtt.filter(a => a.status === 'absent').length;

          const subAsnIds = assignments.filter(a => a.subjectId === sub.id).map(a => a.id);
          const subScores = scores.filter(sc => subAsnIds.includes(sc.assignmentId));
          const totalScore = subScores.reduce((sum, sc) => sum + Number(sc.score || 0), 0);

          return (
            <Card key={sub.id} className="border-t-4 border-t-indigo-500 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold dark:text-white mb-4">{sub.name}</h3>
              
              <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl text-center border border-emerald-100 dark:border-emerald-800/30">
                  <p className="text-xs text-emerald-600 font-bold mb-1">มา</p>
                  <p className="text-2xl font-extrabold text-emerald-500">{present}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl text-center border border-amber-100 dark:border-amber-800/30">
                  <p className="text-xs text-amber-600 font-bold mb-1">สาย</p>
                  <p className="text-2xl font-extrabold text-amber-500">{late}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center border border-blue-100 dark:border-blue-800/30">
                  <p className="text-xs text-blue-600 font-bold mb-1">ลา</p>
                  <p className="text-2xl font-extrabold text-blue-500">{leave}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl text-center border border-rose-100 dark:border-rose-800/30">
                  <p className="text-xs text-rose-600 font-bold mb-1">ขาด</p>
                  <p className="text-2xl font-extrabold text-rose-500">{absent}</p>
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl flex justify-between items-center border border-indigo-100 dark:border-indigo-800/30">
                <span className="font-bold text-indigo-700 dark:text-indigo-300">คะแนนเก็บรวม</span>
                <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {totalScore} <span className="text-sm font-normal">แต้ม</span>
                </span>
              </div>
            </Card>
          );
        })}
        {mySubjects.length === 0 && (
          <div className="col-span-full text-center py-10 text-slate-400">ยังไม่มีรายวิชาที่ลงทะเบียน หรือยังไม่มีการเช็คชื่อ/สั่งงานมายังห้องของคุณ</div>
        )}
      </div>
    </div>
  );
}

export function StudentAssignments() {
  const [myInfo, setMyInfo] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [myScores, setMyScores] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if(!auth.currentUser) return;
    const unsub = onSnapshot(query(collection(db, 'students'), where('email', '==', auth.currentUser.email)), (snap) => {
      if(!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setMyInfo(data);

        onSnapshot(collection(db, 'subjects'), (subSnap) => {
          setSubjects(subSnap.docs.map(d=>({id:d.id, ...d.data()})));
        });

        if(data.classroomId) {
          onSnapshot(query(collection(db, 'assignments'), where('classrooms', 'array-contains', data.classroomId)), (asnSnap) => {
            setAssignments(asnSnap.docs.map(d=>({id:d.id, ...d.data()})));
          });
        }

        onSnapshot(query(collection(db, 'scores'), where('studentId', '==', data.id)), (scSnap) => {
          setMyScores(scSnap.docs.map(d=>d.data()));
        });
      }
    });
    return () => unsub();
  }, []);

  if (!myInfo) return <div className="text-center py-20 text-slate-500 font-bold text-xl">รอคุณครูเพิ่มข้อมูลนักเรียนเข้าสู่ระบบ...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <h1 className="text-3xl font-extrabold dark:text-white flex items-center mb-8">
        <BookText className="mr-3 text-indigo-500 w-8 h-8"/> งานที่ได้รับมอบหมาย
      </h1>

      {subjects.map(sub => {
         const subAssignments = assignments.filter(a => a.subjectId === sub.id);
         if(subAssignments.length === 0) return null;

         return (
           <Card key={sub.id} className="mb-6 border-l-4 border-l-indigo-500">
             <h2 className="text-xl font-bold flex items-center mb-4 border-b pb-3 dark:border-slate-800 dark:text-white">
                <BookOpen className="w-5 h-5 mr-3 text-indigo-500"/> วิชา: {sub.name}
             </h2>
             <div className="space-y-3">
               {subAssignments.map(asn => {
                  const scoreData = myScores.find(sc => sc.assignmentId === asn.id);
                  const isSubmitted = scoreData?.isSubmitted || false;
                  
                  return (
                    <div key={asn.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-slate-100 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 gap-4 transition-colors hover:border-indigo-200">
                      <div>
                        <h3 className="font-bold text-lg dark:text-white">{asn.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">คะแนนเต็ม {asn.maxScore}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                        <span className={`px-4 py-2 rounded-xl text-xs font-bold ${isSubmitted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                          {isSubmitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง'}
                        </span>
                        
                        <div className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-extrabold text-lg shadow-sm w-24 text-center">
                            {scoreData?.score || 0} <span className="text-xs text-indigo-200 font-normal">/ {asn.maxScore}</span>
                        </div>
                      </div>
                    </div>
                  )
               })}
             </div>
           </Card>
         )
      })}

      {assignments.length === 0 && (
        <Card><div className="text-center py-16 text-slate-400 text-lg">ยังไม่มีงานที่ได้รับมอบหมายในขณะนี้ 🎉</div></Card>
      )}
    </div>
  );
}