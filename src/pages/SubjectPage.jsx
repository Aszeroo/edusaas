import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Card, Button, Input, Modal, ConfirmModal, CheckboxSelect } from '../components/UI';
import { Plus, Trash2, Edit, BookOpen } from 'lucide-react';

export default function SubjectPage({ teacherId, isAdmin }) {
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedSub, setSelectedSub] = useState('');
  
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ classrooms: [] }); // กำหนดค่าเริ่มต้นให้ classrooms เป็น Array
  const [activeItem, setActiveItem] = useState(null);
  const [confirmDel, setConfirmDel] = useState({ isOpen: false, id: null, type: '' });

  // ดึงข้อมูลรายวิชาและห้องเรียน
  useEffect(() => {
    const qSub = query(collection(db, 'subjects'));
    const qClass = query(collection(db, 'classrooms'));
    
    const unsubSub = onSnapshot(qSub, snap => setSubjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubClass = onSnapshot(qClass, snap => setClassrooms(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    return () => { unsubSub(); unsubClass(); };
  }, [teacherId, isAdmin]);

  // ดึงข้อมูลงาน เมื่อมีการคลิกเลือกวิชา
  useEffect(() => {
    if (selectedSub) {
      const qAsn = query(collection(db, 'assignments'), where('subjectId', '==', selectedSub));
      return onSnapshot(qAsn, snap => setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    } else {
      setAssignments([]);
    }
  }, [selectedSub]);

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if(activeItem) await updateDoc(doc(db, 'subjects', activeItem.id), { name: form.name });
    else await addDoc(collection(db, 'subjects'), { name: form.name, teacherId });
    setModal(null); setForm({ classrooms: [] }); setActiveItem(null);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();

    if (!form.classrooms || form.classrooms.length === 0) {
      alert("กรุณาเลือกห้องเรียนอย่างน้อย 1 ห้องครับ");
      return;
    }

    try {
      // จัดเตรียมข้อมูลโดยใช้ตัวแปร classrooms (ลบคำว่า classroomId ทิ้งเด็ดขาด)
      const dataToSave = {
        title: form.title,
        maxScore: Number(form.maxScore),
        classrooms: form.classrooms
      };

      if (activeItem) {
        await updateDoc(doc(db, 'assignments', activeItem.id), dataToSave);
      } else {
        await addDoc(collection(db, 'assignments'), { 
          ...dataToSave,
          subjectId: selectedSub,
          dateCreated: new Date().toISOString() 
        });
      }
      
      setModal(null); 
      setForm({ classrooms: [] }); 
      setActiveItem(null);
      
    } catch (error) {
      console.error("Error saving: ", error);
      alert("บันทึกไม่สำเร็จ: " + error.message);
    }
  };

  const handleDelete = async () => {
    if(confirmDel.id) {
      await deleteDoc(doc(db, confirmDel.type === 'subject' ? 'subjects' : 'assignments', confirmDel.id));
      if(confirmDel.type === 'subject' && selectedSub === confirmDel.id) setSelectedSub('');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold dark:text-white">จัดการรายวิชาและงาน</h1>
        <Button icon={Plus} onClick={() => {setForm({ classrooms: [] }); setActiveItem(null); setModal('SUBJECT');}}>สร้างวิชา</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 space-y-3 h-fit">
          <h2 className="font-bold mb-4 dark:text-white">เลือกวิชา</h2>
          {subjects.map(s => (
            <div key={s.id} className={`flex justify-between items-center p-3 rounded-xl cursor-pointer border ${selectedSub === s.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/50 dark:border-indigo-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div onClick={()=>setSelectedSub(s.id)} className="flex-1 font-bold dark:text-white flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-indigo-500" /> {s.name}
              </div>
              <div className="flex space-x-1">
                <button onClick={(e)=>{e.stopPropagation(); setForm({name: s.name, classrooms: []}); setActiveItem(s); setModal('SUBJECT');}} className="p-2 text-indigo-600 bg-indigo-100/50 dark:bg-indigo-900/50 rounded-lg"><Edit size={16}/></button>
                <button onClick={(e)=>{e.stopPropagation(); setConfirmDel({isOpen:true, id: s.id, type: 'subject'});}} className="p-2 text-rose-500 bg-rose-100/50 dark:bg-rose-900/50 rounded-lg"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
          {subjects.length === 0 && <div className="text-center text-sm text-slate-400 py-4">ยังไม่มีรายวิชา</div>}
        </Card>
        
        <Card className="lg:col-span-3 min-h-[400px]">
          {selectedSub ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold dark:text-white">รายชื่องานที่มอบหมาย</h2>
                <Button icon={Plus} onClick={()=>{setForm({ classrooms: [] }); setActiveItem(null); setModal('ASSIGNMENT');}}>เพิ่มงานใหม่</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                    <tr><th className="p-3">ชื่องาน</th><th className="p-3 text-center">คะแนนเต็ม</th><th className="p-3">สั่งห้องเรียน</th><th className="p-3 text-right">จัดการ</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {assignments.map(a => {
                      // ดึงชื่อห้องทั้งหมดที่เลือกไว้ใน Array มาแสดง
                      const roomNames = a.classrooms && Array.isArray(a.classrooms) 
                        ? a.classrooms.map(id => classrooms.find(c => c.id === id)?.name).filter(Boolean).join(', ')
                        : 'ไม่ได้ระบุ';
                        
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="p-3 font-bold dark:text-white">{a.title}</td>
                          <td className="p-3 text-center text-indigo-600 font-extrabold">{a.maxScore}</td>
                          <td className="p-3 text-slate-500">{roomNames}</td>
                          <td className="p-3 text-right space-x-2 whitespace-nowrap">
                            <button onClick={()=>{setForm({title: a.title, maxScore: a.maxScore, classrooms: a.classrooms || []}); setActiveItem(a); setModal('ASSIGNMENT');}} className="text-indigo-600 p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg"><Edit size={16}/></button>
                            <button onClick={()=>setConfirmDel({isOpen:true, id:a.id, type: 'assignment'})} className="text-rose-500 p-2 bg-rose-50 dark:bg-rose-900/50 rounded-lg"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      )
                    })}
                    {assignments.length === 0 && <tr><td colSpan="4" className="text-center py-10 text-slate-400">ยังไม่มีงานในวิชานี้</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="text-center py-20 text-slate-400">เลือกรายวิชาทางซ้ายเพื่อดูและจัดการงาน</div>}
        </Card>
      </div>

      <Modal isOpen={modal==='SUBJECT'} onClose={()=>setModal(null)} title={activeItem?"แก้ไขรายวิชา":"สร้างวิชาใหม่"}>
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <Input label="ชื่อวิชา" value={form?.name||''} onChange={e=>setForm({...form, name: e.target.value})} required />
          <Button type="submit" className="w-full">บันทึกวิชา</Button>
        </form>
      </Modal>

      <Modal isOpen={modal==='ASSIGNMENT'} onClose={()=>setModal(null)} title={activeItem?"แก้ไขงาน":"เพิ่มงานใหม่"}>
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <Input label="ชื่องาน" value={form?.title||''} onChange={e=>setForm({...form, title: e.target.value})} required />
          <Input label="คะแนนเต็ม" type="number" value={form?.maxScore||''} onChange={e=>setForm({...form, maxScore: e.target.value})} required />
          
          <CheckboxSelect 
            label="ห้องเรียนที่มอบหมาย" 
            options={classrooms.map(c => ({label: c.name, value: c.id}))} 
            selected={form?.classrooms || []} 
            onChange={vals => setForm({...form, classrooms: vals})} 
          />
          
          <Button type="submit" className="w-full mt-4">บันทึกงาน</Button>
        </form>
      </Modal>

      <ConfirmModal isOpen={confirmDel.isOpen} onClose={()=>setConfirmDel({isOpen:false, id:null, type:''})} onConfirm={handleDelete} title="ยืนยันการลบข้อมูล" message="หากลบ ข้อมูลที่เกี่ยวข้องจะหายไป ต้องการดำเนินการต่อหรือไม่?" />
    </div>
  );
}