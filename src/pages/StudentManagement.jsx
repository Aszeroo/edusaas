import React, { useState, useEffect } from 'react';
import { db, auth } from '../context/firebase'; // 🌟 นำเข้า auth เพื่อตรวจสอบรหัสผ่านครู
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'; // 🌟 นำเข้าระบบตรวจสอบความปลอดภัย
import { Card, Button, Input, Select, Modal, ConfirmModal, AlertModal } from '../components/UI';
import { Search, Edit, Trash2, KeyRound, Users, Filter, ShieldAlert } from 'lucide-react';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState(''); 
  
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [activeItem, setActiveItem] = useState(null);
  
  // 🌟 States สำหรับระบบตรวจสอบความปลอดภัยของคุณครู
  const [verifyModal, setVerifyModal] = useState({ isOpen: false, targetStudent: null });
  const [teacherPassword, setTeacherPassword] = useState('');

  const [confirmDel, setConfirmDel] = useState({ isOpen: false, id: null });
  const [alertData, setAlertData] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    const unsubS = onSnapshot(collection(db, 'students'), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubC = onSnapshot(collection(db, 'classrooms'), snap => setClassrooms(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsubS(); unsubC(); };
  }, []);

  // 🌟 ฟังก์ชันตรวจสอบรหัสผ่านของคุณครู ก่อนอนุญาตให้เข้าดู/แก้ไขข้อมูลเด็ก
  const handleVerifyTeacher = async (e) => {
    e.preventDefault();
    try {
      // ตรวจสอบรหัสผ่านของครูที่กำลังใช้งานระบบอยู่ปัจจุบัน
      const credential = EmailAuthProvider.credential(auth.currentUser.email, teacherPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // ถ้ารหัสครูถูกต้อง ให้เปิดโมดอลแก้ไขข้อมูลเด็กคนนั้น
      const student = verifyModal.targetStudent;
      setForm(student);
      setActiveItem(student);
      setModal('EDIT');
      
      // ปิดโมดอลยืนยันสิทธิ์และล้างช่องรหัสผ่านครู
      setVerifyModal({ isOpen: false, targetStudent: null });
      setTeacherPassword('');
    } catch (error) {
      setAlertData({ isOpen: true, title: 'ไม่อนุญาต', message: 'รหัสผ่านของคุณครูไม่ถูกต้อง ไม่สามารถเข้าถึงข้อมูลสิทธิ์นี้ได้ครับ' });
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      if (activeItem) {
        await updateDoc(doc(db, 'students', activeItem.id), {
          email: form.email || '',
          password: form.password || '', // รหัสผ่านเดิมของเด็ก (ฝั่งครูแก้ไขไม่ได้แล้ว)
          number: form.number || '',
          prefix: form.prefix || '',
          firstName: form.firstName || '',
          lastName: form.lastName || '',
          classroomId: form.classroomId || ''
        });
        setAlertData({ isOpen: true, title: 'สำเร็จ', message: 'อัปเดตข้อมูลนักเรียนเรียบร้อยแล้ว' });
      }
      setModal(null); 
      setActiveItem(null); 
      setForm({});
    } catch (error) {
      setAlertData({ isOpen: true, title: 'ผิดพลาด', message: error.message });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'students', confirmDel.id));
      setAlertData({ isOpen: true, title: 'สำเร็จ', message: 'ลบข้อมูลนักเรียนเรียบร้อยแล้ว' });
    } catch (error) {
      setAlertData({ isOpen: true, title: 'ผิดพลาด', message: error.message });
    }
    setConfirmDel({ isOpen: false, id: null });
  };

  const filteredStudents = students.filter(s => {
    const searchStr = searchTerm.toLowerCase();
    const fullName = `${s.prefix||''}${s.firstName||''} ${s.lastName||''}`.toLowerCase();
    const email = (s.email||'').toLowerCase();
    const number = String(s.number||'');
    const matchesSearch = fullName.includes(searchStr) || email.includes(searchStr) || number.includes(searchStr);
    const matchesClass = filterClass ? s.classroomId === filterClass : true;
    return matchesSearch && matchesClass;
  }).sort((a, b) => {
    const classA = classrooms.find(c => c.id === a.classroomId)?.name || '';
    const classB = classrooms.find(c => c.id === b.classroomId)?.name || '';
    if (classA !== classB) return classA.localeCompare(classB);
    return Number(a.number) - Number(b.number);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold dark:text-white flex items-center">
          <Users className="w-8 h-8 mr-3 text-indigo-500" />
          ศูนย์ข้อมูลนักเรียน
        </h1>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 border-b pb-6 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ, สกุล, อีเมล, เลขที่..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div className="relative w-full sm:w-56">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                 <Filter className="text-slate-400 w-4 h-4" />
              </div>
              <select 
                value={filterClass} 
                onChange={(e) => setFilterClass(e.target.value)}
                className="pl-9 pr-4 py-2.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">-- ทุกห้องเรียน --</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-sm font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-5 py-2.5 rounded-xl flex items-center justify-center whitespace-nowrap shadow-sm border border-indigo-100 dark:border-indigo-800/50">
            แสดง {filteredStudents.length} รายการ
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-4 border-b dark:border-slate-700 rounded-tl-xl font-bold">ห้องเรียน</th>
                <th className="p-4 border-b dark:border-slate-700 font-bold">เลขที่</th>
                <th className="p-4 border-b dark:border-slate-700 font-bold">ชื่อ-นามสกุล</th>
                <th className="p-4 border-b dark:border-slate-700 font-bold">อีเมล</th>
                <th className="p-4 border-b dark:border-slate-700 font-bold">รหัสผ่าน</th>
                <th className="p-4 border-b dark:border-slate-700 text-right rounded-tr-xl font-bold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map(s => {
                const cName = classrooms.find(c => c.id === s.classroomId)?.name || 'ไม่มีห้อง';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 text-indigo-600 dark:text-indigo-400 font-bold">{cName}</td>
                    <td className="p-4 font-bold dark:text-slate-300">{s.number}</td>
                    <td className="p-4 dark:text-white font-medium">{s.prefix || ''}{s.firstName} {s.lastName}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{s.email || '-'}</td>
                    {/* 🌟 ซ่อนรหัสผ่านแสดงเป็นจุดไข่ปลา ป้องกันสายตาคนรอบข้าง */}
                    <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-lg tracking-widest">
                       {s.password ? '••••••••' : <span className="italic text-sm text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded tracking-normal">ไม่ได้ระบุ</span>}
                    </td>
                    <td className="p-4 text-right space-x-2">
                       {/* 🌟 เมื่อครูกดแก้ไขข้อมูล ระบบจะเปิดหน้ายืนยันสิทธิ์ก่อน */}
                       <button onClick={()=>setVerifyModal({ isOpen: true, targetStudent: s })} className="text-blue-600 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 transition-colors" title="จัดการข้อมูล">
                         <Edit size={16}/>
                       </button>
                       <button onClick={()=>setConfirmDel({isOpen:true, id: s.id})} className="text-rose-500 p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg hover:bg-rose-100 transition-colors" title="ลบนักเรียน">
                         <Trash2 size={16}/>
                       </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-slate-400 text-lg">
                    {searchTerm || filterClass ? 'ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไข' : 'ยังไม่มีข้อมูลนักเรียนในระบบ'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 🌟 โมดอลยืนยันตัวตนคุณครูก่อนเข้าหน้าแก้ไข */}
      <Modal isOpen={verifyModal.isOpen} onClose={() => { setVerifyModal({isOpen: false, targetStudent: null}); setTeacherPassword(''); }} title="สิทธิ์การเข้าถึงข้อมูลระบบ">
        <form onSubmit={handleVerifyTeacher} className="space-y-5">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl flex items-start border border-amber-100 dark:border-amber-800/30">
            <ShieldAlert className="text-amber-500 w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              เพื่อความปลอดภัยส่วนบุคคลของข้อมูลนักเรียน กรุณากรอกรหัสผ่านเข้าใช้งานของคุณครูเพื่อตรวจสอบและยืนยันตนเองก่อนครับ
            </p>
          </div>
          <Input 
            label="รหัสผ่านของคุณครู" 
            type="password" 
            value={teacherPassword} 
            onChange={e=>setTeacherPassword(e.target.value)} 
            isPasswordToggle 
            placeholder="กรอกรหัสผ่านของคุณครู..."
            required 
          />
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">ยืนยันตัวตน</Button>
        </form>
      </Modal>

      {/* โมดอลจัดการข้อมูลนักเรียน */}
      <Modal isOpen={modal==='EDIT'} onClose={()=>{setModal(null); setActiveItem(null);}} title="จัดการข้อมูลนักเรียน">
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="ย้ายห้องเรียน" 
              options={classrooms.map(c=>({label: c.name, value: c.id}))} 
              value={form?.classroomId || ''} 
              onChange={e=>setForm({...form, classroomId: e.target.value})} 
              required
            />
            <Input label="เลขที่" type="number" value={form?.number||''} onChange={e=>setForm({...form, number: e.target.value})} required />
          </div>

          <div className="grid grid-cols-3 gap-4">
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
            <div className="col-span-2">
              <Input label="ชื่อจริง" value={form?.firstName||''} onChange={e=>setForm({...form, firstName: e.target.value})} required />
            </div>
          </div>
          
          <Input label="นามสกุล" value={form?.lastName||''} onChange={e=>setForm({...form, lastName: e.target.value})} required />
          
          <div className="p-5 bg-indigo-50/50 dark:bg-slate-800/80 rounded-2xl border border-indigo-100 dark:border-slate-700 space-y-4 mt-4">
            <h4 className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center mb-2">
               <KeyRound className="w-5 h-5 mr-2" /> บัญชีเข้าใช้งาน (ล็อกอิน)
            </h4>
            
            <Input 
            label="อีเมลเข้าสู่ระบบ" 
            type="email" value={form?.email||''} 
            onChange={e=>setForm({...form, email: e.target.value})} 
            readOnly={true}
            />
            
            {/* 🌟 ล็อกช่องอินพุตให้ Read-only ดูรหัสผ่านและกดเปิดดวงตาได้อย่างเดียว แก้ไขไม่ได้ ป้องกันข้อมูลในระบบพัง */}
            <Input 
              label="รหัสผ่านของนักเรียน (ดูได้อย่างเดียว)" 
              isPasswordToggle={true} 
              value={form?.password||''} 
              readOnly={true}
              placeholder="ไม่ได้ระบุรหัสผ่าน" 
            />
            <p className="text-[11px] text-slate-400 leading-tight">
              * คุณครูสามารถกดดูรหัสผ่านปัจจุบันเพื่อแจ้งให้นักเรียนทราบได้ แต่ไม่สามารถแก้ไขแทนได้ หากนักเรียนเปลี่ยนรหัสผ่านในระบบ ข้อมูลนี้จะอัปเดตเองอัตโนมัติ
            </p>
          </div>

          <Button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">บันทึกการแก้ไขข้อมูล</Button>
        </form>
      </Modal>

      <ConfirmModal isOpen={confirmDel.isOpen} onClose={()=>setConfirmDel({isOpen:false, id:null})} onConfirm={handleDelete} title="ยืนยันการลบนักเรียน" message="ต้องการลบข้อมูลนักเรียนคนนี้ใช่หรือไม่? ข้อมูลทั้งหมดที่เกี่ยวข้องจะถูกลบออก" />
      <AlertModal isOpen={alertData.isOpen} onClose={()=>setAlertData({isOpen:false, title:'', message:''})} title={alertData.title} message={alertData.message} />
    </div>
  );
}