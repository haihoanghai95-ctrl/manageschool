/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, KeyRound, Mail, AlertCircle, Sparkles, Phone, User, UserPlus, Heart } from 'lucide-react';
import { UserSession, ParentAccount, TeacherAccount } from '../types';
import { StorageService } from '../utils/storage';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
  settings: {
    schoolName: string;
    schoolLogo?: string;
    themeColor: string;
  };
}

type LoginRole = 'admin' | 'teacher' | 'parent';
type AuthMode = 'login' | 'register';

export default function Login({ onLoginSuccess, settings }: LoginProps) {
  const schoolName = settings.schoolName;
  const schoolLogo = settings.schoolLogo;
  const [role, setRole] = useState<LoginRole>('admin');
  const [parentMode, setParentMode] = useState<AuthMode>('login');
  const [teacherMode, setTeacherMode] = useState<AuthMode>('login');

  // Admin login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Parent login/register states
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [parentName, setParentName] = useState('');

  // Teacher login/register states
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    setTimeout(() => {
      if (!email.trim() || !password.trim()) {
        setError('Vui lòng điền đầy đủ email và mật khẩu.');
        setLoading(false);
        return;
      }

      // Kiểm tra mật khẩu quản trị
      const storedAdminPass = StorageService.getAdminPassword();
      if (password.trim() !== storedAdminPass) {
        setError('Mật khẩu quản trị viên không chính xác.');
        setLoading(false);
        return;
      }

      // Đăng nhập thành công
      const session: UserSession = {
        isAdmin: true,
        email: email.trim(),
      };
      
      StorageService.saveSession(session);
      onLoginSuccess(session);
      setLoading(false);
    }, 100);
  };

  const handleParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    setTimeout(() => {
      const trimmedPhone = parentPhone.trim();
      const trimmedPassword = parentPassword.trim();

      if (parentMode === 'login') {
        if (!trimmedPhone || !trimmedPassword) {
          setError('Vui lòng điền số điện thoại và mật khẩu.');
          setLoading(false);
          return;
        }

        const parents = StorageService.getParents();
        const matchedParent = parents.find(p => p.phone === trimmedPhone && p.password === trimmedPassword);

        if (!matchedParent) {
          // Check if phone matches any student parentPhone, fatherPhone, motherPhone, or guardianPhone to help them log in with default password
          const students = StorageService.getStudents();
          const matchedStudent = students.find(s => 
            s.parentPhone === trimmedPhone || 
            s.fatherPhone === trimmedPhone || 
            s.motherPhone === trimmedPhone || 
            s.guardianPhone === trimmedPhone
          );

          if (matchedStudent && trimmedPassword === '123') {
            let roleName = 'Phụ huynh';
            if (matchedStudent.fatherPhone === trimmedPhone) {
              roleName = 'Ba';
            } else if (matchedStudent.motherPhone === trimmedPhone) {
              roleName = 'Mẹ';
            } else if (matchedStudent.guardianPhone === trimmedPhone) {
              roleName = 'Người nuôi dưỡng';
            }

            // Auto register them for smooth UX if they use default password '123'
            const newParent: ParentAccount = {
              phone: trimmedPhone,
              name: `${roleName} của bé ${matchedStudent.fullName}`,
              password: '123'
            };
            StorageService.saveParents([...parents, newParent]);
            
            const session: UserSession = {
              isAdmin: false,
              isParent: true,
              parentPhone: trimmedPhone,
              parentName: newParent.name,
              email: `${trimmedPhone}@parent.school.edu.vn`,
            };
            StorageService.saveSession(session);
            onLoginSuccess(session);
            setLoading(false);
            return;
          }

          setError('Số điện thoại hoặc mật khẩu phụ huynh không đúng.');
          setLoading(false);
          return;
        }

        // Đăng nhập thành công
        const session: UserSession = {
          isAdmin: false,
          isParent: true,
          parentPhone: matchedParent.phone,
          parentName: matchedParent.name,
          email: `${matchedParent.phone}@parent.school.edu.vn`,
        };
        StorageService.saveSession(session);
        onLoginSuccess(session);
      } else {
        // Register Mode
        const trimmedName = parentName.trim();
        if (!trimmedName || !trimmedPhone || !trimmedPassword) {
          setError('Vui lòng điền đầy đủ thông tin đăng ký.');
          setLoading(false);
          return;
        }

        const parents = StorageService.getParents();
        if (parents.some(p => p.phone === trimmedPhone)) {
          setError('Số điện thoại này đã được đăng ký tài khoản.');
          setLoading(false);
          return;
        }

        // Add new parent account
        const newParent: ParentAccount = {
          phone: trimmedPhone,
          name: trimmedName,
          password: trimmedPassword,
        };

        StorageService.saveParents([...parents, newParent]);

        // Check if phone number links to an existing student
        const students = StorageService.getStudents();
        const childList = students.filter(s => s.parentPhone === trimmedPhone);

        if (childList.length > 0) {
          setSuccess(`Đăng ký thành công! Đã tìm thấy và tự động liên kết ${childList.length} con: ${childList.map(c => c.fullName).join(', ')}.`);
        } else {
          setSuccess('Đăng ký thành công! Hãy liên hệ Ban Giám Hiệu để liên kết tài khoản với lớp của con.');
        }

        // Auto login after 1.5 seconds
        setTimeout(() => {
          const session: UserSession = {
            isAdmin: false,
            isParent: true,
            parentPhone: trimmedPhone,
            parentName: trimmedName,
            email: `${trimmedPhone}@parent.school.edu.vn`,
          };
          StorageService.saveSession(session);
          onLoginSuccess(session);
          setLoading(false);
        }, 200);
      }
    }, 100);
  };

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    setTimeout(() => {
      const trimmedPhone = teacherPhone.trim();
      const trimmedPassword = teacherPassword.trim();

      if (teacherMode === 'login') {
        if (!trimmedPhone || !trimmedPassword) {
          setError('Vui lòng điền số điện thoại và mật khẩu.');
          setLoading(false);
          return;
        }

        const teachers = StorageService.getTeachers();
        const matchedTeacher = teachers.find(t => t.phone === trimmedPhone && t.password === trimmedPassword);

        if (!matchedTeacher) {
          setError('Số điện thoại hoặc mật khẩu giáo viên không đúng.');
          setLoading(false);
          return;
        }

        // Đăng nhập thành công làm Giáo viên
        const session: UserSession = {
          isAdmin: false,
          isTeacher: true,
          teacherPhone: matchedTeacher.phone,
          teacherName: matchedTeacher.name,
          email: `${matchedTeacher.phone}@teacher.school.edu.vn`,
        };
        StorageService.saveSession(session);
        onLoginSuccess(session);
      } else {
        // Đăng ký tài khoản giáo viên mới
        const trimmedName = teacherName.trim();
        if (!trimmedName || !trimmedPhone || !trimmedPassword) {
          setError('Vui lòng điền đầy đủ thông tin đăng ký.');
          setLoading(false);
          return;
        }

        const teachers = StorageService.getTeachers();
        if (teachers.some(t => t.phone === trimmedPhone)) {
          setError('Số điện thoại này đã được đăng ký tài khoản giáo viên.');
          setLoading(false);
          return;
        }

        const newTeacher: TeacherAccount = {
          phone: trimmedPhone,
          name: trimmedName,
          password: trimmedPassword,
        };

        StorageService.saveTeachers([...teachers, newTeacher]);
        setSuccess('Đăng ký tài khoản giáo viên thành công! Đang tự động đăng nhập...');

        // Auto login sau 1.5 giây
        setTimeout(() => {
          const session: UserSession = {
            isAdmin: false,
            isTeacher: true,
            teacherPhone: trimmedPhone,
            teacherName: trimmedName,
            email: `${trimmedPhone}@teacher.school.edu.vn`,
          };
          StorageService.saveSession(session);
          onLoginSuccess(session);
          setLoading(false);
        }, 200);
      }
    }, 100);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 overflow-hidden bg-gradient-to-b from-sky-50 to-pink-50 dark:from-slate-950 dark:to-slate-900 font-sans">
      {/* Playful Floating Preschool Background Elements */}
      <div className="absolute top-10 left-10 text-4xl animate-bounce delay-100 select-none hidden md:block">☀️</div>
      <div className="absolute top-20 right-20 text-4xl animate-pulse select-none hidden md:block">☁️</div>
      <div className="absolute bottom-16 left-20 text-3xl animate-bounce delay-300 select-none hidden md:block">🎈</div>
      <div className="absolute bottom-24 right-16 text-3xl animate-pulse select-none hidden md:block">🧸</div>
      <div className="absolute top-1/3 left-12 text-3xl animate-pulse select-none hidden md:block">🎨</div>
      <div className="absolute top-2/3 right-12 text-3xl animate-bounce delay-200 select-none hidden md:block">🌟</div>

      {/* Subtle Background Decorative Lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2" />
      
      <div className="w-full max-w-md p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg relative z-10 text-slate-800 dark:text-slate-100 flex flex-col items-center">
        {/* Custom School Logo */}
        {schoolLogo ? (
          <img
            src={schoolLogo}
            alt="School Logo"
            className="w-16 h-16 rounded-2xl object-cover shadow-md mb-4 border border-slate-100 dark:border-slate-800"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-tr from-sky-400 to-amber-300 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center text-white text-3xl shadow-md mb-4 border border-slate-100 dark:border-slate-800 select-none animate-bounce">
            🏫
          </div>
        )}
        
        <h1 className="text-2xl font-bold text-center tracking-tight text-slate-900 dark:text-white mb-1">
          Hệ Thống Điểm Danh AI
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 max-w-xs font-normal">
          {schoolName || 'Cổng Quản Lý & Điểm Danh Học Sinh'}
        </p>

        {/* Tab Switch: Admin vs Teacher vs Parent */}
        <div className="w-full flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-6 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => { setRole('admin'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              role === 'admin'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Quản trị
          </button>
          <button
            type="button"
            onClick={() => { setRole('teacher'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              role === 'teacher'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Giáo viên
          </button>
          <button
            type="button"
            onClick={() => { setRole('parent'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              role === 'parent'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Phụ huynh
          </button>
        </div>

        {error && (
          <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-lg flex items-center gap-2.5 text-rose-800 dark:text-rose-200 text-xs animate-shake">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="w-full mb-4 p-3 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-lg flex items-center gap-2.5 text-emerald-800 dark:text-emerald-200 text-xs">
            <Heart size={16} className="shrink-0 text-emerald-500 fill-emerald-500" />
            <span>{success}</span>
          </div>
        )}

        {role === 'admin' && (
          /* ADMIN LOGIN FORM */
          <form onSubmit={handleAdminSubmit} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Email Quản Trị
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.edu.vn"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none transition duration-200"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => alert('Vui lòng liên hệ ban giám hiệu nhà trường để khôi phục mật khẩu.')}
                  className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition font-medium"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <KeyRound size={16} />
                </span>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none transition duration-200"
                  required
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-55 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Đăng Nhập Quản Trị</span>
                </>
              )}
            </button>
          </form>
        )}

        {role === 'teacher' && (
          /* TEACHER LOGIN & REGISTER FORM */
          <form onSubmit={handleTeacherSubmit} className="w-full space-y-4">
            {teacherMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Họ và tên giáo viên
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Cô Mai / Thầy Hùng"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none transition duration-200"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Số Điện Thoại Giáo Viên
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  placeholder="09XXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none transition duration-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Mật khẩu tự chọn
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <KeyRound size={16} />
                </span>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none transition duration-200"
                  required
                />
              </div>
            </div>

            {/* Toggle between Teacher Login and Register Mode */}
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                {teacherMode === 'login' ? 'Chưa có tài khoản giáo viên?' : 'Đã có tài khoản giáo viên?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTeacherMode(teacherMode === 'login' ? 'register' : 'login');
                  setError('');
                  setSuccess('');
                }}
                className="text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 transition font-bold"
              >
                {teacherMode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-55 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : teacherMode === 'login' ? (
                <>
                  <LogIn size={16} />
                  <span>Đăng Nhập Giáo Viên</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Đăng Ký Tài Khoản</span>
                </>
              )}
            </button>
          </form>
        )}

        {role === 'parent' && (
          /* PARENT LOGIN & REGISTER FORM */
          <form onSubmit={handleParentSubmit} className="w-full space-y-4">
            {parentMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Họ và tên phụ huynh
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none transition duration-200"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Số Điện Thoại Phụ Huynh
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="09XXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none transition duration-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Mật khẩu tự chọn
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <KeyRound size={16} />
                </span>
                <input
                  type="password"
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none transition duration-200"
                  required
                />
              </div>
            </div>

            {/* Toggle between Parent Login and Register Mode */}
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                {parentMode === 'login' ? 'Chưa có tài khoản phụ huynh?' : 'Đã có tài khoản phụ huynh?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setParentMode(parentMode === 'login' ? 'register' : 'login');
                  setError('');
                  setSuccess('');
                }}
                className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition font-bold"
              >
                {parentMode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-55 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : parentMode === 'login' ? (
                <>
                  <LogIn size={16} />
                  <span>Đăng Nhập Phụ Huynh</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Đăng Ký Tài Khoản</span>
                </>
              )}
            </button>
          </form>
        )}
        
        <div className="mt-8 text-center text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">
          Student Attendance Manager • Phiên Bản Điểm Danh Gương Mặt AI
        </div>
      </div>
    </div>
  );
}
