import React from 'react';
import { BookOpen, LogOut, ShieldAlert, BarChart3, Users, CheckSquare, Award, GraduationCap, BookText, X, FileText, UserCog } from 'lucide-react';

export default function Sidebar({ role, name, currentView, setCurrentView, isMobileMenuOpen, setIsMobileMenuOpen, openProfile, signOut }) {
  const NavItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setCurrentView(id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 p-3.5 rounded-2xl font-medium transition-all ${currentView === id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
       <Icon className="w-5 h-5" /> <span>{label}</span>
    </button>
  );

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-slate-900 text-white flex flex-col h-screen transition-transform md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <button className="md:hidden absolute top-6 right-6 text-slate-400" onClick={() => setIsMobileMenuOpen(false)}><X/></button>
      <div className="h-20 flex items-center px-8 font-extrabold text-xl"><BookOpen className="w-6 h-6 mr-3 text-indigo-500"/> EduSaaS</div>
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-[11px] font-bold text-slate-500 uppercase px-4 mb-2">เมนูหลัก</div>
        {role === 'admin' && <NavItem id="admin_users" icon={ShieldAlert} label="จัดการสมาชิก" />}
        {(role === 'admin' || role === 'teacher') && (
          <>
            <NavItem id="teacher_dashboard" icon={BarChart3} label="ภาพรวม" />
            <NavItem id="subjects" icon={BookOpen} label="จัดการรายวิชา" />
            <NavItem id="teacher_classrooms" icon={Users} label="ห้องเรียนและนักเรียน" />
            
            {/* เพิ่มเมนูศูนย์ข้อมูลนักเรียนตรงนี้ */}
            <NavItem id="student_management" icon={UserCog} label="ข้อมูลนักเรียนทั้งหมด" />
            
            <NavItem id="teacher_attendance" icon={CheckSquare} label="เช็คชื่อ" />
            <NavItem id="teacher_scores" icon={Award} label="ให้คะแนน" />
            <NavItem id="reports" icon={FileText} label="รายงานและ Export" />
          </>
        )}
        {role === 'student' && (
          <>
            <NavItem id="student_dashboard" icon={GraduationCap} label="ภาพรวมของฉัน" />
            <NavItem id="student_assignments" icon={BookText} label="รายวิชาและงาน" />
          </>
        )}
      </div>
      <div className="p-6 border-t border-slate-800">
        <div onClick={openProfile} className="bg-slate-800 p-4 rounded-xl cursor-pointer hover:bg-slate-700 transition-colors">
           <p className="font-bold truncate">{name}</p>
           <p className="text-indigo-400 text-xs mt-1 uppercase">{role}</p>
        </div>
        <button onClick={signOut} className="w-full mt-4 text-rose-400 flex items-center justify-center font-bold hover:text-rose-300"><LogOut size={18} className="mr-2"/> ออกจากระบบ</button>
      </div>
    </aside>
  );
}