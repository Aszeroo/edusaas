import React, { useState, useEffect } from 'react';
import { db } from '../context/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query } from 'firebase/firestore';
import { Card, Button, Input, Select, Modal, ConfirmModal, AlertModal } from '../components/UI';
import { Plus, Trash2, Edit, User as UserIcon, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TeacherClassrooms() {
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [scores, setScores] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  const [modal, setModal] = useState(null); 
  const [form, setForm] = useState({});
  const [activeItem, setActiveItem] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  
  // States สำหรับระบบเลือกหลายรายการ (Multi-select)
  const [selectedStudents, setSelectedStudents] = useState([]);

  // States สำหรับระะบบแจ้งเตือน
  const [confirmDel, setConfirmDel] = useState({ isOpen: false, id: null, type: '', ids: [] });
  const [alertData, setAlertData] = useState({ isOpen: false, title: '', message: '' });
  const [importConfirm, setImportConfirm] = useState({ isOpen: false, data: [] });
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const qClass = query(collection(db, 'classrooms'));
    const qSub = query(collection(db, 'subjects'));
    
    const unsubC = onSnapshot(qClass, snap => setClassrooms(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubSub = onSnapshot(qSub, snap => setSubjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubS = onSnapshot(collection(db, 'students'), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubA = onSnapshot(collection(db, 'attendance'), snap => setAttendance(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubSc = onSnapshot(collection(db, 'scores'), snap => setScores(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubAsn = onSnapshot(collection(db, 'assignments'), snap => setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    return () => { unsubC(); unsubSub(); unsubS(); unsubA(); unsubSc(); unsubAsn(); };
  }, []);

  // รีเซ็ตการเลือกเมื่อเปลี่ยนห้องเรียน
  useEffect(() => {
    setSelectedStudents([]);
  }, [selectedClass]);

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if(activeItem) await updateDoc(doc(db, 'classrooms', activeItem.id), { name: form.name, desc: form.desc || '' });
    else await addDoc(collection(db, 'classrooms'), { name: form.name, desc: form.desc || '' });
    setModal(null); setActiveItem(null); setForm({});
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const studentData = {
      email: form.email || '', 
      number: form.number || '', 
      prefix: form.prefix || '', 
      firstName: form.firstName || '', 
      lastName: form.lastName || ''
    };

    if(activeItem) await updateDoc(doc(db, 'students', activeItem.id), studentData);
    else await addDoc(collection(db, 'students'), { classroomId: selectedClass, ...studentData });
    setModal(null); setActiveItem(null); setForm({});
  };

  // อัปเดตฟังก์ชันลบ เพื่อรองรับการลบหลายรายการพร้อมกัน
  const handleDelete = async () => {
    try {
      if (confirmDel.type === 'bulk-student' && confirmDel.ids) {
        // ใช้ Promise.all เพื่อลบหลายรายการพร้อมกัน
        await Promise.all(confirmDel.ids.map(id => deleteDoc(doc(db, 'students', id))));
        setSelectedStudents([]); // เคลียร์การเลือกหลังจากลบเสร็จ
        setAlertData({ isOpen: true, title: 'สำเร็จ', message: `ลบข้อมูลนักเรียนจำนวน ${confirmDel.ids.length} คน เรียบร้อยแล้ว` });
      } else if (confirmDel.id) {
        // ลบรายการเดียวปกติ
        await deleteDoc(doc(db, confirmDel.type === 'student' ? 'students' : 'classrooms', confirmDel.id));
        if(confirmDel.type === 'classroom' && selectedClass === confirmDel.id) setSelectedClass('');
      }
    } catch (error) {
      console.error(error);
      setAlertData({ isOpen: true, title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถลบข้อมูลได้' });
    }
    setConfirmDel({ isOpen: false, id: null, type: '', ids: [] });
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if(data.length === 0) {
           setAlertData({ isOpen: true, title: 'ไม่สามารถนำเข้าได้', message: 'ไม่พบข้อมูลในไฟล์ Excel หรือไฟล์ว่างเปล่า' });
           return;
        }

        setImportConfirm({ isOpen: true, data: data });
      } catch (error) {
        console.error("Import Error: ", error);
        setAlertData({ isOpen: true, title: 'เกิดข้อผิดพลาด', message: 'เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบรูปแบบไฟล์อีกครั้ง' });
      }
      e.target.value = null; 
    };
    reader.readAsBinaryString(file);
  };

  const executeImport = async () => {
    setIsImporting(true);
    const data = importConfirm.data;
    try {
      for (const row of data) {
        const number = row['เลขที่'] || row['Number'] || row['No.'] || '';
        const prefix = row['คำนำหน้า'] || row['คำนำหน้าชื่อ'] || row['Prefix'] || '';
        const firstName = row['ชื่อ'] || row['ชื่อจริง'] || row['FirstName'] || '';
        const lastName = row['นามสกุล'] || row['LastName'] || '';
        const email = row['อีเมล'] || row['Email'] || '';

        if (firstName) {
          await addDoc(collection(db, 'students'), {
            classroomId: selectedClass,
            number: String(number),
            prefix: String(prefix),
            firstName: String(firstName),
            lastName: String(lastName),
            email: String(email)
          });
        }
      }
      setImportConfirm({ isOpen: false, data: [] });
      setAlertData({ isOpen: true, title: 'นำเข้าสำเร็จ 🎉', message: `นำเข้าข้อมูลนักเรียนจำนวน ${data.length} คน เข้าสู่ห้องเรียนเรียบร้อยแล้ว!` });
    } catch (error) {
      console.error(error);
      setAlertData({ isOpen: true, title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message });
    }
    setIsImporting(false);
  };

  const classStds = students.filter(s => s.classroomId === selectedClass).sort((a,b)=>Number(a.number)-Number(b.number));

  // ฟังก์ชันเลือกนักเรียนทั้งหมด
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(classStds.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  // ฟังก์ชันเลือกนักเรียนทีละคน
  const handleSelectStudent = (id) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(studentId => studentId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold dark:text-white">ห้องเรียนและนักเรียน</h1>
        <Button icon={Plus} onClick={()=>{setForm({}); setActiveItem(null); setModal('CLASS');}}>สร้างห้องเรียน</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 space-y-3 h-fit">
          <h2 className="font-bold mb-4 dark:text-white">เลือกห้องเรียน</h2>
          {classrooms.map(c => (
            <div key={c.id} className={`flex justify-between items-center p-3 rounded-xl cursor-pointer border ${selectedClass === c.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div onClick={()=>setSelectedClass(c.id)} className="flex-1 font-bold dark:text-white">{c.name}</div>
              <div className="flex space-x-1">
                <button onClick={(e)=>{e.stopPropagation(); setForm(c); setActiveItem(c); setModal('CLASS');}} className="p-2 text-indigo-600 bg-indigo-100/50 dark:bg-indigo-900/50 rounded-lg"><Edit size={16}/></button>
                <button onClick={(e)=>{e.stopPropagation(); setConfirmDel({isOpen:true, id: c.id, type: 'classroom'});}} className="p-2 text-rose-500 bg-rose-100/50 dark:bg-rose-900/50 rounded-lg"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
          {classrooms.length === 0 && <div className="text-center text-sm text-slate-400 py-4">ยังไม่มีห้องเรียน</div>}
        </Card>
        
        <Card className="lg:col-span-3 min-h-[400px]">
          {selectedClass ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold dark:text-white">รายชื่อนักเรียน <span className="text-slate-500 font-normal text-sm ml-2">({classStds.length} คน)</span></h2>
                
                <div className="flex space-x-3 w-full sm:w-auto">
                  {/* ปุ่มลบข้อมูลที่เลือก จะแสดงเมื่อมีการเลือกนักเรียนอย่างน้อย 1 คน */}
                  {selectedStudents.length > 0 && (
                    <Button 
                      variant="danger" 
                      icon={Trash2} 
                      onClick={() => setConfirmDel({ isOpen: true, type: 'bulk-student', ids: selectedStudents })}
                    >
                      ลบที่เลือก ({selectedStudents.length})
                    </Button>
                  )}
                  
                  <label className={`flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${isImporting ? 'bg-slate-200 text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                     <Upload className="w-4 h-4 mr-2" /> 
                     {isImporting ? 'กำลังนำเข้า...' : 'Import Excel'}
                     <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImportExcel} disabled={isImporting} />
                  </label>
                  <Button icon={Plus} onClick={()=>{setForm({}); setActiveItem(null); setModal('STUDENT');}}>เพิ่มนักเรียน</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="p-3 w-12 text-center">
                        {/* Checkbox สำหรับเลือกทั้งหมด */}
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={classStds.length > 0 && selectedStudents.length === classStds.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="p-3">เลขที่</th>
                      <th className="p-3">ชื่อ-นามสกุล</th>
                      <th className="p-3">อีเมล</th>
                      <th className="p-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {classStds.map(s => (
                      <tr key={s.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/20 ${selectedStudents.includes(s.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                        <td className="p-3 text-center">
                           {/* Checkbox สำหรับเลือกทีละคน */}
                           <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={selectedStudents.includes(s.id)}
                            onChange={() => handleSelectStudent(s.id)}
                          />
                        </td>
                        <td className="p-3 font-bold dark:text-white">{s.number}</td>
                        <td className="p-3 dark:text-white">{s.prefix || ''}{s.firstName} {s.lastName}</td>
                        <td className="p-3 text-slate-500">{s.email}</td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                           <button onClick={()=>{setForm(s); setActiveItem(s); setModal('STUDENT');}} className="text-indigo-600 p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg"><Edit size={16}/></button>
                           <button onClick={()=>{setActiveItem(s); setModal('VIEW');}} className="text-blue-600 p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg"><UserIcon size={16}/></button>
                           <button onClick={()=>setConfirmDel({isOpen:true, id:s.id, type: 'student'})} className="text-rose-500 p-2 bg-rose-50 dark:bg-rose-900/50 rounded-lg"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                    {classStds.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-slate-400">ยังไม่มีนักเรียนในห้องนี้</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="text-center py-20 text-slate-400">เลือกห้องเรียนทางซ้ายเพื่อดูรายชื่อและจัดการนักเรียน</div>}
        </Card>
      </div>

      <Modal isOpen={modal==='CLASS'} onClose={()=>{setModal(null); setActiveItem(null);}} title={activeItem?"แก้ไขห้องเรียน":"สร้างห้องเรียน"}>
        <form onSubmit={handleSaveClass} className="space-y-4">
          <Input label="ชื่อห้องเรียน" value={form?.name||''} onChange={e=>setForm({...form, name: e.target.value})} required />
          <Input label="รายละเอียด" value={form?.desc||''} onChange={e=>setForm({...form, desc: e.target.value})} />
          <Button type="submit" className="w-full">บันทึก</Button>
        </form>
      </Modal>

      <Modal isOpen={modal==='STUDENT'} onClose={()=>{setModal(null); setActiveItem(null);}} title={activeItem?"แก้ไขนักเรียน":"เพิ่มนักเรียน"}>
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <Input label="อีเมล" type="email" value={form?.email||''} onChange={e=>setForm({...form, email: e.target.value})} />
          <Input label="เลขที่" type="number" value={form?.number||''} onChange={e=>setForm({...form, number: e.target.value})} required />
          <Select 
            label="คำนำหน้า" 
            options={[
              { label: 'นาย', value: 'นาย' },
              { label: 'นาง', value: 'นาง' },
              { label: 'นางสาว', value: 'นางสาว' },
              { label: 'เด็กชาย', value: 'เด็กชาย' },
              { label: 'เด็กหญิง', value: 'เด็กหญิง' }
            ]} 
            value={form?.prefix||''} 
            onChange={e=>setForm({...form, prefix: e.target.value})} 
          />
          <Input label="ชื่อจริง" value={form?.firstName||''} onChange={e=>setForm({...form, firstName: e.target.value})} required />
          <Input label="นามสกุล" value={form?.lastName||''} onChange={e=>setForm({...form, lastName: e.target.value})} required />
          <Button type="submit" className="w-full">บันทึก</Button>
        </form>
      </Modal>

      <Modal isOpen={modal==='VIEW'} onClose={()=>{setModal(null); setActiveItem(null);}} title="ข้อมูลนักเรียน (รายวิชา)">
         {activeItem && (
           <div className="space-y-4">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold">{activeItem?.firstName?.charAt(0) || '?'}</div>
                <div>
                  <h2 className="text-2xl font-bold dark:text-white">{activeItem.prefix || ''}{activeItem.firstName} {activeItem.lastName}</h2>
                  <p className="text-slate-500 font-medium mt-1">เลขที่ {activeItem.number}</p>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 pb-2">
                {subjects.map(sub => {
                  const hasAssignment = assignments.some(a => a.subjectId === sub.id && (a.classrooms || []).includes(activeItem.classroomId));
                  if (!hasAssignment) return null;

                  const subAtt = attendance.filter(a => a.studentId === activeItem.id && a.subjectId === sub.id);
                  const present = subAtt.filter(a => a.status === 'present').length;
                  const late = subAtt.filter(a => a.status === 'late').length;
                  const leave = subAtt.filter(a => a.status === 'leave').length;
                  const absent = subAtt.filter(a => a.status === 'absent').length;

                  const subAsnIds = assignments.filter(a => a.subjectId === sub.id).map(a => a.id);
                  const subScores = scores.filter(sc => sc.studentId === activeItem.id && subAsnIds.includes(sc.assignmentId));
                  const totalScore = subScores.reduce((sum, sc) => sum + Number(sc.score || 0), 0);

                  return (
                    <div key={sub.id} className="border-l-4 border-indigo-500 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl shadow-sm border-t border-r border-b border-slate-100 dark:border-slate-700">
                      <h3 className="font-bold text-lg dark:text-white mb-3">{sub.name}</h3>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                         <div className="text-center p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">มา</p><p className="font-extrabold text-emerald-700 dark:text-emerald-300">{present}</p></div>
                         <div className="text-center p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg"><p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">สาย</p><p className="font-extrabold text-amber-700 dark:text-amber-300">{late}</p></div>
                         <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">ลา</p><p className="font-extrabold text-blue-700 dark:text-blue-300">{leave}</p></div>
                         <div className="text-center p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg"><p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">ขาด</p><p className="font-extrabold text-rose-700 dark:text-rose-300">{absent}</p></div>
                      </div>
                      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                         <span className="text-sm font-bold text-slate-500">คะแนนเก็บรวม</span>
                         <span className="font-extrabold text-indigo-600 text-lg">{totalScore} <span className="text-xs font-normal text-slate-400">แต้ม</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
         )}
      </Modal>

      <Modal isOpen={importConfirm.isOpen} onClose={() => setImportConfirm({ isOpen: false, data: [] })} title="ตรวจสอบการนำเข้าข้อมูล">
         <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-full flex items-center justify-center mx-auto text-emerald-500">
               <FileSpreadsheet size={32} />
            </div>
            <div className="space-y-1">
               <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">พบข้อมูลนักเรียนทั้งหมด {importConfirm.data?.length || 0} คน</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400">คุณต้องการนำเข้ารายชื่อชุดนี้ลงสู่ห้องเรียนนี้ใช่หรือไม่?</p>
            </div>
            <div className="flex gap-4 pt-4">
               <Button onClick={() => setImportConfirm({ isOpen: false, data: [] })} variant="secondary" className="w-full">ยกเลิก</Button>
               <Button onClick={executeImport} variant="primary" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">ใช่, นำเข้าข้อมูล</Button>
            </div>
         </div>
      </Modal>

      {/* อัปเดตข้อความ ConfirmModal เพื่อให้ครอบคลุมการลบแบบทีละคน และแบบเป็นกลุ่ม */}
      <ConfirmModal 
        isOpen={confirmDel.isOpen} 
        onClose={()=>setConfirmDel({isOpen:false, id:null, type:'', ids: []})} 
        onConfirm={handleDelete} 
        title="ยืนยันการลบข้อมูล" 
        message={confirmDel.type === 'bulk-student' ? `ต้องการลบข้อมูลนักเรียนที่เลือกจำนวน ${confirmDel.ids.length} คน ใช่หรือไม่? ข้อมูลคะแนนและสถิติที่เกี่ยวข้องจะหายไปด้วย` : "ต้องการลบข้อมูลนี้ใช่หรือไม่? ข้อมูลคะแนนและสถิติที่เกี่ยวข้องจะหายไปด้วย"} 
      />
      
      <AlertModal isOpen={alertData.isOpen} onClose={()=>setAlertData({isOpen:false, title:'', message:''})} title={alertData.title} message={alertData.message} />
    </div>
  );
}