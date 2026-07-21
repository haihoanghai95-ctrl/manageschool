/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Palette,
  Sun,
  Moon,
  School,
  Save,
  RotateCcw,
  Sparkles,
  Check,
  AlertCircle,
  X,
  Bell,
  Plus,
  Trash2,
  Edit2,
  Play,
  Users,
  Calendar,
  Heart,
  Coins,
  ShieldCheck,
  CheckSquare,
  Info
} from 'lucide-react';
import { SchoolSettings, ParentReminderRule } from '../types';
import { StorageService } from '../utils/storage';

interface SettingsProps {
  settings: SchoolSettings;
  onSaveSettings: (settings: SchoolSettings) => void;
}

export default function SettingsComponent({ settings, onSaveSettings }: SettingsProps) {
  // Input states
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [startTime, setStartTime] = useState(settings.startTime);
  const [lateTime, setLateTime] = useState(settings.lateTime);
  const [themeColor, setThemeColor] = useState<SchoolSettings['themeColor']>(settings.themeColor);
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [schoolLogo, setSchoolLogo] = useState<string | undefined>(settings.schoolLogo);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // --- Parent Notification Reminder States ---
  const [reminderRules, setReminderRules] = useState<ParentReminderRule[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ParentReminderRule | null>(null);
  
  // Rule Form States
  const [ruleType, setRuleType] = useState<'vaccination' | 'event' | 'tuition' | 'holiday_rsvp'>('vaccination');
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleContentTemplate, setRuleContentTemplate] = useState('');
  const [ruleDaysBefore, setRuleDaysBefore] = useState(3);
  const [ruleIsActive, setRuleIsActive] = useState(true);
  const [ruleTargetAudience, setRuleTargetAudience] = useState<'all' | 'by_class'>('all');
  const [ruleTargetClassId, setRuleTargetClassId] = useState('');

  // --- Attendance Database Cleanup States ---
  const [totalRecords, setTotalRecords] = useState(0);
  const [oldRecords, setOldRecords] = useState(0);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);

  const loadAttendanceStats = () => {
    try {
      const records = StorageService.getAttendance();
      setTotalRecords(records.length);
      
      const now = new Date();
      const limitDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const limitString = limitDate.toISOString().split('T')[0];
      
      const oldOnes = records.filter(r => r.date < limitString);
      setOldRecords(oldOnes.length);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickCleanup = () => {
    if (oldRecords === 0) {
      setErrorMsg('Không có bản ghi điểm danh nào cũ hơn 30 ngày để xóa.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    setCleanupConfirmOpen(true);
  };

  const handleConfirmCleanup = () => {
    const result = StorageService.clearOldAttendanceRecords(30);
    setCleanupConfirmOpen(false);
    loadAttendanceStats();
    setSuccessMsg(`🧹 Đã dọn dẹp thành công ${result.clearedCount} bản ghi điểm danh cũ hơn 30 ngày.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Load rules and classrooms on mount
  useEffect(() => {
    setReminderRules(StorageService.getParentReminderRules());
    setClassrooms(StorageService.getClassrooms());
    loadAttendanceStats();
  }, []);

  const handleToggleRuleActive = (id: string) => {
    const updated = reminderRules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
    setReminderRules(updated);
    StorageService.saveParentReminderRules(updated);
    setSuccessMsg('Đã cập nhật trạng thái hoạt động của nhắc nhở tự động!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteRule = (id: string) => {
    const updated = reminderRules.filter(r => r.id !== id);
    setReminderRules(updated);
    StorageService.saveParentReminderRules(updated);
    setSuccessMsg('Đã xóa cấu hình nhắc nhở tự động cho phụ huynh.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingRule(null);
    setRuleType('vaccination');
    setRuleTitle('💉 Nhắc nhở: Lịch tiêm ngừa vắc-xin ho gà - uốn ván cho bé');
    setRuleContentTemplate('Kính gửi quý phụ huynh bé {{studentName}}, nhà trường xin thông báo lịch tiêm chủng mở rộng diễn ra vào ngày thứ Sáu tới tại Phòng Y tế. Kính mong phụ huynh mang theo sổ tiêm ngừa của bé.');
    setRuleDaysBefore(3);
    setRuleIsActive(true);
    setRuleTargetAudience('all');
    setRuleTargetClassId(classrooms[0]?.id || '');
    setIsRuleModalOpen(true);
  };

  const handleOpenEditModal = (rule: ParentReminderRule) => {
    setEditingRule(rule);
    setRuleType(rule.type);
    setRuleTitle(rule.title);
    setRuleContentTemplate(rule.contentTemplate);
    setRuleDaysBefore(rule.daysBefore);
    setRuleIsActive(rule.isActive);
    setRuleTargetAudience(rule.targetAudience);
    setRuleTargetClassId(rule.targetClassId || classrooms[0]?.id || '');
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim() || !ruleContentTemplate.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ tiêu đề và nội dung mẫu thông báo.');
      return;
    }

    let updated: ParentReminderRule[];
    if (editingRule) {
      updated = reminderRules.map(r => r.id === editingRule.id ? {
        ...r,
        type: ruleType,
        title: ruleTitle.trim(),
        contentTemplate: ruleContentTemplate.trim(),
        daysBefore: Number(ruleDaysBefore),
        isActive: ruleIsActive,
        targetAudience: ruleTargetAudience,
        targetClassId: ruleTargetAudience === 'by_class' ? ruleTargetClassId : undefined
      } : r);
      setSuccessMsg('Đã cập nhật cấu hình nhắc nhở phụ huynh!');
    } else {
      const newRule: ParentReminderRule = {
        id: `rule_${Date.now()}`,
        type: ruleType,
        title: ruleTitle.trim(),
        contentTemplate: ruleContentTemplate.trim(),
        daysBefore: Number(ruleDaysBefore),
        isActive: ruleIsActive,
        targetAudience: ruleTargetAudience,
        targetClassId: ruleTargetAudience === 'by_class' ? ruleTargetClassId : undefined
      };
      updated = [...reminderRules, newRule];
      setSuccessMsg('Đã thêm mới cấu hình nhắc nhở phụ huynh thành công!');
    }

    setReminderRules(updated);
    StorageService.saveParentReminderRules(updated);
    setIsRuleModalOpen(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleTestSend = (rule: ParentReminderRule) => {
    const students = StorageService.getStudents();
    let targetStudents = students;
    if (rule.targetAudience === 'by_class' && rule.targetClassId) {
      targetStudents = students.filter(s => s.classId === rule.targetClassId);
    }

    if (targetStudents.length === 0) {
      setErrorMsg('Không tìm thấy học sinh phù hợp để gửi thử nghiệm.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    const currentNotifs = StorageService.getParentNotifications();
    const newNotifs: any[] = [];

    // Map rule type to notification type
    let notifType: any = 'activity_create';
    if (rule.type === 'vaccination') notifType = 'reminder_vaccine';
    else if (rule.type === 'tuition') notifType = 'reminder_payment';
    else if (rule.type === 'event') notifType = 'reminder_event';
    else if (rule.type === 'holiday_rsvp') notifType = 'reminder_holiday';

    targetStudents.forEach(student => {
      let content = rule.contentTemplate
        .replace(/\{\{studentName\}\}/g, student.fullName)
        .replace(/\{\{className\}\}/g, student.className || 'Lớp học')
        .replace(/\{\{month\}\}/g, '07/2026')
        .replace(/\{\{dueDate\}\}/g, '10/07/2026')
        .replace(/\{\{eventDate\}\}/g, '25/07/2026')
        .replace(/\{\{rsvpDeadline\}\}/g, '23/07/2026');

      let title = rule.title
        .replace(/\{\{month\}\}/g, '07/2026');

      newNotifs.push({
        id: `notif_reminder_${Date.now()}_${student.id}`,
        classId: student.classId,
        className: student.className || 'Lớp mầm non',
        type: notifType,
        title: title,
        content: content,
        createdAt: new Date().toISOString(),
        isRead: false
      });
    });

    StorageService.saveParentNotifications([...newNotifs, ...currentNotifs]);
    
    // Update lastTriggered for the rule
    const updatedRules = reminderRules.map(r => r.id === rule.id ? { ...r, lastTriggered: new Date().toISOString().split('T')[0] } : r);
    setReminderRules(updatedRules);
    StorageService.saveParentReminderRules(updatedRules);

    setSuccessMsg(`🚀 Đã gửi thành công ${targetStudents.length} thông báo nhắc nhở tới phụ huynh!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Logo file reader handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Dung lượng ảnh logo phải nhỏ hơn 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSchoolLogo(event.target.result as string);
          setSuccessMsg('Đã tải lên logo thành công! Nhấp "Áp dụng cài đặt" để lưu lưu thay đổi.');
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!schoolName.trim()) {
      setErrorMsg('Tên trường không được để trống.');
      return;
    }

    const updatedSettings: SchoolSettings = {
      schoolName: schoolName.trim(),
      startTime,
      lateTime,
      themeColor,
      darkMode,
      schoolLogo,
    };

    onSaveSettings(updatedSettings);
    setSuccessMsg('Đã lưu thành công cấu hình hệ thống và áp dụng giao diện mầm non mới!');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  // Reset to default
  const handleReset = () => {
    setResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    const defaults: SchoolSettings = {
      schoolName: 'TRƯỜNG MẦM NON 3 - PHƯỜNG BÀN CỜ TP.HỒ CHÍ MINH',
      startTime: '07:30',
      lateTime: '07:45',
      themeColor: 'blue',
      darkMode: false,
      schoolLogo: undefined,
    };
    
    setSchoolName(defaults.schoolName);
    setStartTime(defaults.startTime);
    setLateTime(defaults.lateTime);
    setThemeColor(defaults.themeColor);
    setDarkMode(defaults.darkMode);
    setSchoolLogo(undefined);
    
    onSaveSettings(defaults);
    setSuccessMsg('Đã khôi phục cài đặt gốc thành công!');
    setResetConfirmOpen(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Color options - updated to playful child-friendly preschool themes
  const colorOptions: { id: SchoolSettings['themeColor']; name: string; bgClass: string; borderClass: string }[] = [
    { id: 'blue', name: 'Xanh Da Trời (Mầm Non)', bgClass: 'bg-sky-500', borderClass: 'border-sky-400' },
    { id: 'emerald', name: 'Xanh Lá Măng Non', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-400' },
    { id: 'violet', name: 'Tím Bong Bóng Bé Ngoan', bgClass: 'bg-purple-500', borderClass: 'border-purple-400' },
    { id: 'rose', name: 'Hồng Kẹo Ngọt Trẻ Thơ', bgClass: 'bg-pink-500', borderClass: 'border-pink-400' },
    { id: 'amber', name: 'Vàng Mặt Trời Ám Áp', bgClass: 'bg-amber-500', borderClass: 'border-amber-400' },
  ];

  const getThemeTextClass = () => {
    switch (themeColor) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-violet-600';
      case 'rose': return 'text-rose-600';
      case 'amber': return 'text-amber-600';
      default: return 'text-indigo-600';
    }
  };

  const getThemeBgClass = () => {
    switch (themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-white';
      default: return 'bg-indigo-600 hover:bg-indigo-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Cấu Hình Hệ Thống <Settings className={getThemeTextClass()} size={24} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tùy biến thời khóa biểu, quản lý tên trường, lựa chọn tông màu phong cách giao diện phù hợp.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2.5 animate-bounce">
          <Check size={18} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2.5">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Card: School profile settings */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-50 dark:border-slate-800 pb-3">
            <School size={16} /> Hồ sơ trường học
          </h3>

          <div className="space-y-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <div>
              <label className="block mb-1.5 ml-0.5">Tên trường học / Đơn vị chủ quản <span className="text-rose-500">*</span></label>
              <input
                id="settings-school-name"
                type="text"
                placeholder="Trường Mầm Non 3"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 ml-0.5 flex items-center gap-1">
                  <Clock size={13} className="text-slate-400" /> Giờ bắt đầu học chính thức
                </label>
                <input
                  id="settings-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 ml-0.5 flex items-center gap-1">
                  <AlertCircle size={13} className="text-amber-500" /> Giờ tính đi muộn (Late threshold)
                </label>
                <input
                  id="settings-late-time"
                  type="time"
                  value={lateTime}
                  onChange={(e) => setLateTime(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                  required
                />
              </div>
            </div>

            {/* School Logo upload section */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80">
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Logo trường mầm non
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Logo Preview box */}
                <div className="relative group shrink-0">
                  {schoolLogo ? (
                    <img
                      src={schoolLogo}
                      alt="Logo trường học"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-md bg-slate-50 dark:bg-slate-850"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-400 to-amber-300 dark:from-slate-800 dark:to-slate-700 flex flex-col items-center justify-center text-white font-bold text-3xl shadow-md border border-slate-100 dark:border-slate-800 select-none">
                      🏫
                    </div>
                  )}
                </div>

                {/* Upload and remove buttons */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="px-4 py-2 bg-sky-550 text-white hover:bg-sky-500 dark:bg-sky-650 dark:hover:bg-sky-600 rounded-xl font-bold text-[10px] tracking-wider uppercase cursor-pointer transition text-center inline-block shadow-sm">
                      Tải logo lên
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    {schoolLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          setSchoolLogo(undefined);
                          setSuccessMsg('Đã xóa logo trường thành công. Hãy bấm "Áp dụng cài đặt" để lưu.');
                          setTimeout(() => setSuccessMsg(''), 3000);
                        }}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-[10px] tracking-wider uppercase transition cursor-pointer"
                      >
                        Xóa logo
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] font-normal normal-case text-slate-400 dark:text-slate-500 leading-normal">
                    Chọn ảnh định dạng PNG, JPG hoặc GIF dưới 2MB. Logo này sẽ hiển thị ở thanh điều hướng bên, màn hình đăng nhập và giao diện phụ huynh.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Card: UI Customization color themes */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-50 dark:border-slate-800 pb-3">
              <Palette size={16} /> Giao diện & Chủ đề màu sắc
            </h3>

            {/* Dark mode selector */}
            <div className="space-y-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <label className="block">Chế độ hiển thị</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDarkMode(false)}
                  className={`py-3 rounded-xl border font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    !darkMode
                      ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/20'
                      : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Sun size={15} /> Sáng (Light)
                </button>
                <button
                  type="button"
                  onClick={() => setDarkMode(true)}
                  className={`py-3 rounded-xl border font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    darkMode
                      ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/20'
                      : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Moon size={15} /> Tối (Dark)
                </button>
              </div>
            </div>

            {/* Color circles */}
            <div className="space-y-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <label className="block">Tông màu giao diện chủ đạo</label>
              <div className="flex flex-wrap gap-2.5">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThemeColor(opt.id)}
                    className={`w-9 h-9 rounded-full ${opt.bgClass} flex items-center justify-center text-white cursor-pointer hover:scale-110 active:scale-95 transition-all relative ${
                      themeColor === opt.id ? 'ring-4 ring-slate-300 dark:ring-slate-700 ring-offset-2 dark:ring-offset-slate-900 shadow-md' : 'shadow-xs'
                    }`}
                    title={opt.name}
                  >
                    {themeColor === opt.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2.5 pt-6 border-t border-slate-50 dark:border-slate-800/80">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <RotateCcw size={14} />
              <span>Khôi phục gốc</span>
            </button>
            <button
              id="save-settings-submit"
              type="submit"
              className={`flex-1 py-3 rounded-xl font-bold text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer ${getThemeBgClass()}`}
            >
              <Save size={14} />
              <span>Áp dụng cài đặt</span>
            </button>
          </div>
        </div>

      </form>

      {/* --- PARENT NOTIFICATION REMINDERS SECTION --- */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6 mt-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bell size={16} className={getThemeTextClass()} /> Thiết lập lịch & Nhắc nhở cho Phụ huynh
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">
              Tự động hóa thông báo lịch tiêm chủng, học phí, sự kiện, và ngày lễ hội
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm ${getThemeBgClass()}`}
          >
            <Plus size={14} />
            <span>Thêm nhắc nhở mới</span>
          </button>
        </div>

        {/* Tip & Instruction Panel */}
        <div className="p-4 bg-blue-500/5 dark:bg-blue-950/10 border border-blue-500/10 rounded-2xl flex gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <Info size={16} className="text-blue-550 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-100">Cơ chế hoạt động:</span>
            <p>
              Hệ thống sẽ dựa trên các cấu hình này để tự động gửi thông báo đến điện thoại phụ huynh qua ứng dụng vào đúng thời điểm (ví dụ: nhắc học phí trước 5 ngày, lịch tiêm ngừa trước 3 ngày). Bạn có thể bấm <strong className="text-blue-600 dark:text-blue-450">"Gửi thử ngay"</strong> để kích hoạt gửi thông báo hàng loạt tức thời cho phụ huynh trải nghiệm.
            </p>
          </div>
        </div>

        {/* Reminders Table / Cards list */}
        {reminderRules.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <span className="text-2xl">📭</span>
            <p className="font-bold text-slate-500">Chưa có cấu hình nhắc nhở nào</p>
            <p className="text-[10px] text-slate-400 max-w-xs">Nhấp "Thêm nhắc nhở mới" để thiết lập thông báo tự động cho phụ huynh học sinh.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-150/60 dark:border-slate-800/80">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[20%]">Loại nhắc nhở</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[35%]">Nội dung mẫu & Tiêu đề</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[15%]">Thời gian / Đối tượng</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[10%] text-center">Trạng thái</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[20%] text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {reminderRules.map((rule) => {
                  let badgeColor = 'bg-sky-50 text-sky-650 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30';
                  let icon = '💉';
                  let typeText = 'Tiêm chủng';

                  if (rule.type === 'tuition') {
                    badgeColor = 'bg-amber-50 text-amber-650 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
                    icon = '💰';
                    typeText = 'Đóng học phí';
                  } else if (rule.type === 'event') {
                    badgeColor = 'bg-emerald-50 text-emerald-650 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
                    icon = '📅';
                    typeText = 'Sự kiện trường';
                  } else if (rule.type === 'holiday_rsvp') {
                    badgeColor = 'bg-rose-50 text-rose-650 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
                    icon = '🎏';
                    typeText = 'Lễ hội / RSVP';
                  }

                  return (
                    <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="p-3.5 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${badgeColor} self-start`}>
                            <span>{icon}</span> {typeText}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            ID: <span className="font-mono">{rule.id}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 align-top">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                            {rule.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed bg-slate-50/50 dark:bg-slate-850/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            {rule.contentTemplate}
                          </p>
                        </div>
                      </td>
                      <td className="p-3.5 align-top">
                        <div className="flex flex-col gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock size={12} className="text-slate-400" /> Trước {rule.daysBefore} ngày
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <Users size={12} className="text-slate-400" />
                            {rule.targetAudience === 'all'
                              ? 'Tất cả học sinh'
                              : `Lớp ${classrooms.find(c => c.id === rule.targetClassId)?.name || rule.targetClassId || '...'}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 align-top text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRuleActive(rule.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition cursor-pointer ${
                            rule.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-550/15 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50 dark:border-slate-750'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${rule.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {rule.isActive ? 'Bật' : 'Tắt'}
                        </button>
                      </td>
                      <td className="p-3.5 align-top">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                          {/* Test Send Button */}
                          <button
                            type="button"
                            onClick={() => handleTestSend(rule)}
                            title="Gửi hàng loạt thông báo thử nghiệm tới phụ huynh để xem trước ngay"
                            className="w-full sm:w-auto px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 transition cursor-pointer border border-blue-200/40 dark:border-blue-900/30"
                          >
                            <Play size={10} className="fill-blue-600 dark:fill-blue-400" /> Gửi thử ngay
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(rule)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition"
                              title="Sửa cấu hình"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Bạn có chắc chắn muốn xóa cấu hình nhắc nhở này không?')) {
                                  handleDeleteRule(rule.id);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer transition"
                              title="Xóa cấu hình"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {rule.lastTriggered && (
                          <div className="text-[9px] text-slate-400 dark:text-slate-500 text-center mt-1.5 font-medium">
                            Gửi gần nhất: <span className="font-mono">{rule.lastTriggered}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- QUICK MEMORY CLEANUP SECTION --- */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6 mt-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trash2 size={16} className="text-rose-500" /> Tối ưu hóa bộ nhớ &amp; Dọn dẹp dữ liệu
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">
              Xóa nhanh các bản ghi lịch sử điểm danh cũ để giải phóng dung lượng bộ nhớ đệm của trình duyệt
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/10 rounded-2xl flex gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <Info size={16} className="text-rose-550 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[10px]">Lưu ý dọn dẹp bộ nhớ:</span>
            <p className="normal-case">
              Để tránh làm đầy dung lượng lưu trữ cục bộ (<span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">localStorage</span>) của trình duyệt web, giáo viên có thể thực hiện xóa bớt các bản ghi lịch sử điểm danh đã cũ. Hệ thống sẽ giữ lại toàn bộ dữ liệu điểm danh trong vòng <strong className="text-rose-600 dark:text-rose-450 font-bold">30 ngày gần nhất</strong> để giáo viên tra cứu báo cáo chuyên cần, và xóa các bản ghi cũ hơn để tối ưu hiệu năng. Thao tác này an toàn và khuyên dùng khi ứng dụng chạy lâu ngày.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số bản ghi hiện tại</span>
            <span className="text-2xl font-black text-slate-850 dark:text-slate-100 mt-2">
              {totalRecords} <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">bản ghi</span>
            </span>
          </div>
          
          <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Bản ghi cũ &gt; 30 ngày có thể xóa</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
              {oldRecords} <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">bản ghi</span>
            </span>
          </div>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleQuickCleanup}
              disabled={oldRecords === 0}
              className={`w-full py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer ${
                oldRecords > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white active:scale-98'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
              id="cleanup-old-attendance-btn"
            >
              <Trash2 size={16} />
              <span>Dọn dẹp lịch sử ({oldRecords})</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- ADD / EDIT REMINDER RULE DIALOG --- */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsRuleModalOpen(false)} />

          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRuleModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-4 border-b border-slate-50 dark:border-slate-800 pb-3">
              <Bell size={22} className="shrink-0" />
              <h2 className="text-base font-bold">
                {editingRule ? 'Cập nhật cấu hình nhắc nhở' : 'Thêm mới cấu hình nhắc nhở phụ huynh'}
              </h2>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rule Type */}
                <div>
                  <label className="block mb-1.5 ml-0.5">Loại nhắc nhở</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="vaccination">💉 Lịch tiêm chủng mầm non</option>
                    <option value="tuition">💰 Hạn đóng học phí hàng tháng</option>
                    <option value="event">📅 Sự kiện quan trọng của trường</option>
                    <option value="holiday_rsvp">🎏 Ngày lễ / Đăng ký tham dự</option>
                  </select>
                </div>

                {/* Days before */}
                <div>
                  <label className="block mb-1.5 ml-0.5">Số ngày gửi thông báo trước</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={ruleDaysBefore}
                    onChange={(e) => setRuleDaysBefore(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Title template */}
              <div>
                <label className="block mb-1.5 ml-0.5">Tiêu đề thông báo mẫu <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề thông báo mẫu gửi phụ huynh..."
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-normal normal-case text-slate-800 dark:text-slate-100 outline-none"
                  required
                />
              </div>

              {/* Content template */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block ml-0.5">Nội dung mẫu tin nhắn gửi phụ huynh <span className="text-rose-500">*</span></label>
                  <span className="text-[8px] text-blue-500 font-extrabold normal-case">Hỗ trợ các biến động</span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Kính gửi quý phụ huynh bé {{studentName}} lớp {{className}}..."
                  value={ruleContentTemplate}
                  onChange={(e) => setRuleContentTemplate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-normal normal-case text-slate-800 dark:text-slate-100 outline-none leading-relaxed"
                  required
                />
                
                {/* Variable placeholders guide */}
                <div className="mt-1.5 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 normal-case text-[9px] text-slate-400 dark:text-slate-500 leading-normal space-y-1 font-medium">
                  <p className="font-bold text-slate-600 dark:text-slate-400">Các biến mẫu tự động thay thế bằng dữ liệu thật:</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[8px] text-slate-500">
                    <div><span className="text-blue-550 font-bold">{"{{studentName}}"}</span>: Tên học sinh</div>
                    <div><span className="text-blue-550 font-bold">{"{{className}}"}</span>: Tên lớp học</div>
                    <div><span className="text-blue-550 font-bold">{"{{month}}"}</span>: Tháng hiện tại</div>
                    <div><span className="text-blue-550 font-bold">{"{{dueDate}}"}</span>: Hạn nộp học phí</div>
                    <div><span className="text-blue-550 font-bold">{"{{eventDate}}"}</span>: Ngày sự kiện</div>
                    <div><span className="text-blue-550 font-bold">{"{{rsvpDeadline}}"}</span>: Hạn đăng ký RSVP</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Audience */}
                <div>
                  <label className="block mb-1.5 ml-0.5">Đối tượng nhận thông báo</label>
                  <select
                    value={ruleTargetAudience}
                    onChange={(e) => setRuleTargetAudience(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="all">👥 Tất cả các lớp học</option>
                    <option value="by_class">🏫 Chỉ một lớp cụ thể</option>
                  </select>
                </div>

                {/* Target Class (conditional) */}
                {ruleTargetAudience === 'by_class' && (
                  <div>
                    <label className="block mb-1.5 ml-0.5">Chọn lớp mầm non</label>
                    <select
                      value={ruleTargetClassId}
                      onChange={(e) => setRuleTargetClassId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                    >
                      {classrooms.map(c => (
                        <option key={c.id} value={c.id}>Lớp {c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Is Active toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="rule-is-active"
                  checked={ruleIsActive}
                  onChange={(e) => setRuleIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md bg-slate-50 border-slate-200 cursor-pointer"
                />
                <label htmlFor="rule-is-active" className="text-xs font-bold text-slate-650 dark:text-slate-300 cursor-pointer select-none">
                  Kích hoạt tự động quét lịch gửi nhắc nhở này
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-155 dark:hover:bg-slate-800 transition cursor-pointer text-center"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase shadow-md transition cursor-pointer text-center ${getThemeBgClass()}`}
                >
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION DIALOG */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setResetConfirmOpen(false)} />
          
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setResetConfirmOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-amber-500 mb-3">
              <AlertCircle size={24} />
              <h2 className="text-lg font-bold">Khôi phục cài đặt gốc</h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình hệ thống về mặc định ban đầu không? Thao tác này sẽ đặt tên trường về <strong className="text-slate-900 dark:text-white">"Trường MẦM NON 3"</strong> và khôi phục cài đặt thời gian.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEANUP CONFIRMATION DIALOG */}
      {cleanupConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setCleanupConfirmOpen(false)} />
          
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setCleanupConfirmOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <AlertCircle size={24} />
              <h2 className="text-lg font-bold">Xác nhận dọn dẹp lịch sử</h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed normal-case font-semibold">
              Bạn có chắc chắn muốn xóa vĩnh viễn <strong className="text-rose-600 dark:text-rose-400">{oldRecords}</strong> bản ghi điểm danh đã <strong className="text-slate-900 dark:text-white">cũ hơn 30 ngày</strong> không? Thao tác này sẽ giải phóng dung lượng bộ nhớ đệm của trình duyệt và không thể khôi phục.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCleanupConfirmOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmCleanup}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-750 text-white font-medium rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
                id="cleanup-confirm-btn"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
