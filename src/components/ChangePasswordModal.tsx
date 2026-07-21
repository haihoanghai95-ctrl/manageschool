/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, KeyRound, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { UserSession, SchoolSettings } from '../types';
import { StorageService } from '../utils/storage';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  settings: SchoolSettings;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  session,
  settings,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const getThemeButtonClass = () => {
    switch (settings.themeColor) {
      case 'emerald':
        return 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500/50';
      case 'violet':
        return 'bg-violet-600 hover:bg-violet-500 focus:ring-violet-500/50';
      case 'rose':
        return 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500/50';
      case 'amber':
        return 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/50';
      default:
        return 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500/50';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ các thông tin.');
      return;
    }

    if (newPassword.length < 3) {
      setError('Mật khẩu mới phải từ 3 ký tự trở lên.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và mật khẩu nhập lại không khớp.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        // ADMIN ROLE
        if (session.isAdmin) {
          const storedAdminPass = StorageService.getAdminPassword();
          if (currentPassword !== storedAdminPass) {
            setError('Mật khẩu hiện tại của quản trị viên không chính xác.');
            setLoading(false);
            return;
          }
          StorageService.saveAdminPassword(newPassword);
        }
        // TEACHER ROLE
        else if (session.isTeacher && session.teacherPhone) {
          const teachers = StorageService.getTeachers();
          const index = teachers.findIndex((t) => t.phone === session.teacherPhone);
          if (index === -1) {
            setError('Không tìm thấy thông tin tài khoản giáo viên.');
            setLoading(false);
            return;
          }
          if (teachers[index].password !== currentPassword) {
            setError('Mật khẩu hiện tại không chính xác.');
            setLoading(false);
            return;
          }
          teachers[index].password = newPassword;
          StorageService.saveTeachers(teachers);
        }
        // PARENT ROLE
        else if (session.isParent && session.parentPhone) {
          const parents = StorageService.getParents();
          const index = parents.findIndex((p) => p.phone === session.parentPhone);
          if (index === -1) {
            setError('Không tìm thấy thông tin tài khoản phụ huynh.');
            setLoading(false);
            return;
          }
          if (parents[index].password !== currentPassword) {
            setError('Mật khẩu hiện tại không chính xác.');
            setLoading(false);
            return;
          }
          parents[index].password = newPassword;
          StorageService.saveParents(parents);
        } else {
          setError('Vai trò người dùng không hợp lệ.');
          setLoading(false);
          return;
        }

        setSuccess('Đổi mật khẩu thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (err) {
        setError('Có lỗi xảy ra khi đổi mật khẩu.');
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
          />

          {/* Modal box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 overflow-hidden z-10"
          >
            {/* Header decoration */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Thay đổi mật khẩu
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                    {session.isAdmin ? 'Quản trị viên' : session.isTeacher ? 'Giáo viên' : 'Phụ huynh'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-lg flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
                <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-lg flex items-start gap-2.5 text-emerald-800 dark:text-emerald-200 text-xs">
                <ShieldCheck size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Nhập lại mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 font-bold rounded-lg transition text-xs uppercase tracking-wider cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2.5 text-white font-bold rounded-lg transition text-xs uppercase tracking-wider cursor-pointer shadow-xs ${getThemeButtonClass()} flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Cập nhật'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
