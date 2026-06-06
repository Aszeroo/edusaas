import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, KeyRound } from 'lucide-react';
import { auth, db } from './context/firebase';
import { onAuthStateChanged, signOut, updatePassword, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
// 🌟 อัปเดตบรรทัดนี้: เพิ่มคำสั่งคิวรี และ อัปเดตเอกสารข้อมูล
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Card, Button, Input, Modal, AlertModal } from './components/UI';

import StudentManagement from './pages/StudentManagement';
import Sidebar from './components/Sidebar';
import AdminDashboard from './pages/AdminDashboard';
import TeacherOverview from './pages/TeacherOverview';
import TeacherClassrooms from './pages/TeacherClassrooms';
import TeacherAttendance from './pages/TeacherAttendance';
import TeacherScores from './pages/TeacherScores';
import { StudentDashboard, StudentAssignments } from './pages/StudentViews';
import SubjectPage from './pages/SubjectPage';
import ScoreReporting from './pages/ScoreReporting';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('');
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [alertData, setAlertData] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (docSnap.exists()) {
          const profile = docSnap.data();
          setUserProfile(profile);
          if (profile.role === 'admin') setCurrentView('admin_users');
          else if (profile.role === 'teacher') setCurrentView('teacher_dashboard');
          else setCurrentView('student_dashboard');
        }
      } else { setUserProfile(null); }
      setLoading(false);
    });
  }, []);

  // 🌟 ฟังก์ชันเปลี่ยนรหัสผ่าน (เพิ่มระบบซิงค์หาตารางครูอัตโนมัติ)
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if(newPassword.length < 6) return setAlertData({isOpen:true, title:'แจ้งเตือน', message:'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'});
    try {
      // 1. เปลี่ยนรหัสผ่านในระบบรักษาความปลอดภัยหลักของ Firebase
      await updatePassword(auth.currentUser, newPassword);
      
      // 2. ⚡ ระบบซิงค์ข้อมูล: ตรวจสอบว่าเป็นนักเรียนหรือไม่ ถ้าใช่ ให้บันทึกรหัสใหม่ลง Firestore ของครูด้วย
      if (userProfile && userProfile.role === 'student') {
        const qStudent = query(collection(db, 'students'), where('email', '==', auth.currentUser.email.toLowerCase()));
        const querySnapshot = await getDocs(qStudent);
        
        if (!querySnapshot.empty) {
          // หากเจอนักเรียนที่มีอีเมลตรงกันในระบบ ให้บันทึกรหัสผ่านใหม่ลงไปทันที
          await updateDoc(doc(db, 'students', querySnapshot.docs[0].id), {
            password: newPassword
          });
        }
      }

      setAlertData({isOpen:true, title:'สำเร็จ', message:'เปลี่ยนรหัสผ่านสำเร็จ และบันทึกข้อมูลเรียบร้อยแล้ว!'});
      setNewPassword(''); setIsProfileOpen(false);
    } catch (error) { 
      setAlertData({isOpen:true, title:'ข้อผิดพลาด', message:'อาจต้องล็อกอินใหม่เพื่อความปลอดภัย: ' + error.message}); 
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">กำลังโหลด...</div>;
  if (!user || !userProfile) return <AuthScreen setIsDarkMode={setIsDarkMode} isDarkMode={isDarkMode} />;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans">
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}
      
      <Sidebar role={userProfile.role} name={userProfile.name} currentView={currentView} setCurrentView={setCurrentView} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} openProfile={() => setIsProfileOpen(true)} signOut={() => signOut(auth)} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        <header className="h-20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
           <div className="flex items-center">
             <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800"><Menu className="w-6 h-6" /></button>
             <div className="font-medium text-slate-500">วิทยาลัยเทคโนโลยีวานิชบริหารธุรกิจ</div>
           </div>
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">{isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {currentView === 'admin_users' && <AdminDashboard />}
          {currentView === 'teacher_dashboard' && <TeacherOverview teacherId={user.uid} isAdmin={userProfile.role === 'admin'} />}
          {currentView === 'subjects' && <SubjectPage teacherId={user.uid} />}
          {currentView === 'teacher_classrooms' && <TeacherClassrooms teacherId={user.uid} isAdmin={userProfile.role === 'admin'} />}
          {currentView === 'student_management' && <StudentManagement />}
          {currentView === 'teacher_attendance' && <TeacherAttendance teacherId={user.uid} isAdmin={userProfile.role === 'admin'} />}
          {currentView === 'teacher_scores' && <TeacherScores teacherId={user.uid} isAdmin={userProfile.role === 'admin'} />}
          {currentView === 'reports' && <ScoreReporting teacherId={user.uid} />}
          {currentView === 'student_dashboard' && <StudentDashboard />}
          {currentView === 'student_assignments' && <StudentAssignments />}
        </div>
      </main>

      <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="จัดการโปรไฟล์ของฉัน">
        <div className="space-y-4">
          <Input label="ชื่อ-นามสกุล" value={userProfile.name} readOnly />
          <Input label="อีเมล" value={userProfile.email} readOnly />
          <hr className="my-6 border-slate-200 dark:border-slate-800" />
          <h3 className="font-bold flex items-center text-slate-800 dark:text-white mb-2"><KeyRound className="w-4 h-4 mr-2 text-indigo-500"/> เปลี่ยนรหัสผ่านใหม่</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input label="รหัสผ่านใหม่" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} isPasswordToggle required />
            <Button type="submit" className="w-full">อัปเดตรหัสผ่าน</Button>
          </form>
        </div>
      </Modal>

      <AlertModal isOpen={alertData.isOpen} onClose={()=>setAlertData({isOpen:false})} title={alertData.title} message={alertData.message} />
    </div>
  );
}

function AuthScreen({ setIsDarkMode, isDarkMode }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [alertData, setAlertData] = useState({ isOpen: false, title: '', message: '' });
  
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) { 
        await signInWithEmailAndPassword(auth, email, password); 
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const assignedRole = email.toLowerCase() === 'admin@edusaas.com' ? 'admin' : 'student';
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        
        await setDoc(doc(db, 'users', cred.user.uid), { 
          uid: cred.user.uid, 
          email: email.toLowerCase(), 
          name: fullName, 
          role: assignedRole, 
          createdAt: new Date().toISOString() 
        });

        if (assignedRole === 'student') {
          const cleanFirstName = firstName.trim();
          const cleanLastName = lastName.trim();

          const qStudent = query(collection(db, 'students'));
          const querySnapshot = await getDocs(qStudent);
          
          let matchedDocId = null;

          querySnapshot.forEach((documentSnap) => {
            const s = documentSnap.data();
            const dbFName = (s.firstName || '').trim();
            const dbLName = (s.lastName || '').trim();

            if (dbFName === cleanFirstName && dbLName === cleanLastName) {
              if (!s.email || s.email.trim() === '') {
                matchedDocId = documentSnap.id;
              }
            }
          });

          if (matchedDocId) {
            await updateDoc(doc(db, 'students', matchedDocId), {
              email: email.toLowerCase(),
              password: password
            });
            window.alert('✅ ลงทะเบียนสำเร็จ และระบบได้เชื่อมโยงข้อมูลรายวิชาของคุณเรียบร้อยแล้ว!');
            window.location.reload(); 
          } else {
            window.alert('⚠️ ลงทะเบียนสำเร็จ!\nแต่ระบบไม่พบชื่อของคุณในฐานข้อมูลห้องเรียน (หรืออาจมีบัญชีนี้ในระบบแล้ว)\n\nกรุณาแจ้งคุณครูเพื่อผูกบัญชีให้ครับ');
            window.location.reload();
          }
        }
      }
    } catch (error) { 
      setAlertData({isOpen: true, title:'เกิดข้อผิดพลาด', message: error.message}); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative">
      <button onClick={() => setIsDarkMode(!isDarkMode)} className="absolute top-6 right-6 p-2 text-slate-500 bg-white dark:bg-slate-800 rounded-full shadow-sm">{isDarkMode ? <Sun/> : <Moon/>}</button>
      <Card className="w-full max-w-[450px] p-8 border-none shadow-xl">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white text-center mb-6">EduSaaS</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="ชื่อจริง" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="เช่น สมชาย" required />
                <Input label="นามสกุล" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="เช่น ใจดี" required />
              </div>
              <p className="text-[11px] text-slate-400 -mt-2 leading-tight">
                * กรอกชื่อและนามสกุลให้ตรงกับในระบบ (ไม่ต้องใส่คำนำหน้า) เพื่อให้ระบบเชื่อมบัญชีให้อัตโนมัติ
              </p>
            </div>
          )}
          <Input label="อีเมล" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Input label="รหัสผ่าน" type="password" value={password} onChange={e=>setPassword(e.target.value)} isPasswordToggle required />
          <Button type="submit" className="w-full mt-4">{isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-indigo-600 cursor-pointer" onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบ'}</p>
      </Card>
      <AlertModal isOpen={alertData.isOpen} onClose={()=>setAlertData({isOpen:false})} title={alertData.title} message={alertData.message} />
    </div>
  );
}