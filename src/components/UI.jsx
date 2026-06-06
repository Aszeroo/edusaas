import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Check } from 'lucide-react';

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 ${className}`}>{children}</div>
);

export const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, type="button", disabled=false }) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200",
    danger: "bg-rose-50 text-rose-600",
    success: "bg-emerald-500 text-white"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${variants[variant] || variants.primary} ${className}`}>
      {Icon && <Icon className="w-4 h-4 mr-2 inline" />} {children}
    </button>
  );
};

export const Input = ({ label, type = 'text', value, onChange, placeholder, isPasswordToggle = false, required = false, readOnly = false }) => {
  const [show, setShow] = useState(false);
  const inputType = isPasswordToggle ? (show ? 'text' : 'password') : type;
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="block text-sm font-medium dark:text-slate-300">{label}</label>}
      <div className="relative">
        <input type={inputType} value={value || ''} onChange={onChange} required={required} readOnly={readOnly} placeholder={placeholder} className={`block w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900 dark:text-white ${readOnly ? 'opacity-60' : ''}`} />
        {isPasswordToggle && <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-3 text-slate-400">{show ? <EyeOff size={20}/> : <Eye size={20}/>}</button>}
      </div>
    </div>
  );
};

export const Select = ({ label, value, onChange, options, required = false }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="block text-sm font-medium dark:text-slate-300">{label}</label>}
    <select value={value || ''} onChange={onChange} required={required} className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900 dark:text-white">
      <option value="">-- กรุณาเลือก --</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// ส่วนนี้มีการใส่ export const ให้ถูกต้องแล้วครับ
export const CheckboxSelect = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const clickOut = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  return (
    <div className="space-y-1.5 w-full relative" ref={dropdownRef}>
      {label && <label className="block text-sm font-medium dark:text-slate-300">{label}</label>}
      <div className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900 dark:text-white cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        {selected && selected.length > 0 ? `${selected.length} ห้องที่เลือก` : "-- เลือกห้องเรียน --"}
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {options.map(opt => (
            <div key={opt.value} className="flex items-center p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" onClick={() => {
              const newSelected = (selected || []).includes(opt.value) 
                ? selected.filter(i => i !== opt.value) 
                : [...(selected || []), opt.value];
              onChange(newSelected);
            }}>
              <div className={`w-5 h-5 border rounded flex items-center justify-center mr-3 ${(selected || []).includes(opt.value) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                {(selected || []).includes(opt.value) && <Check size={14} color="white"/>}
              </div>
              <span className="dark:text-white">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold dark:text-white">{title}</h3><button onClick={onClose}><X className="dark:text-white"/></button></div>
        {children}
      </div>
    </div>
  );
};

export const AlertModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
        <h3 className="text-xl font-bold dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 mb-6">{message}</p>
        <Button onClick={onClose} className="w-full">ตกลง</Button>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
        <h3 className="text-xl font-bold dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 mb-6">{message}</p>
        <div className="flex gap-4">
          <Button onClick={onClose} variant="secondary" className="w-full">ยกเลิก</Button>
          <Button onClick={() => { onConfirm(); onClose(); }} variant="danger" className="w-full">ยืนยัน</Button>
        </div>
      </div>
    </div>
  );
};