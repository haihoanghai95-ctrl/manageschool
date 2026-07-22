/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Menu,
  School,
  Clock,
  LayoutDashboard,
  GraduationCap,
  Users,
  Camera,
  History,
  BarChart3,
  Settings,
  Moon,
  Sun,
  UserCheck,
  AlertCircle,
  X,
  LogOut,
  Bell,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  BookOpen,
  Sparkles,
  DollarSign,
  Calendar,
  Trash2,
  Edit,
  Pill,
  Wifi,
  WifiOff
} from 'lucide-react';

import { Classroom, Student, AttendanceRecord, SchoolSettings, UserSession, AbsenceReport, TeacherAccount, WeeklyMenu, TeacherNotification } from './types';
import { StorageService } from './utils/storage';
import { syncOnMount } from './utils/firebaseSync';

// Import modular pages
import { motion, AnimatePresence } from 'motion/react';
import Login from './components/Login';
import ParentDashboard from './components/ParentDashboard';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classrooms from './components/Classrooms';
import Teachers from './components/Teachers';
import Students from './components/Students';
import Health from './components/Health';
import CameraAttendance from './components/CameraAttendance';
import AttendanceHistory from './components/AttendanceHistory';
import Reports from './components/Reports';
import MenuPosting from './components/MenuPosting';
import SettingsComponent from './components/Settings';
import DailyAssessments from './components/DailyAssessments';
import Events from './components/Events';
import NoonSupervision from './components/NoonSupervision';

export default function App() {
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error' | 'offline'>('syncing');
  const [showRulesHelper, setShowRulesHelper] = useState(false);
  const [rulesCopied, setRulesCopied] = useState(false);

  // App toast notifications state
  const [appToasts, setAppToasts] = useState<{ id: string; type: 'success' | 'warning' | 'info' | 'error'; title: string; message: string; }[]>([]);

  const showAppToast = (type: 'success' | 'warning' | 'info' | 'error', title: string, message: string) => {
    const newToast = { id: 'app_toast_' + Date.now() + Math.random().toString(36).substring(2, 5), type, title, message };
    setAppToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setAppToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 4500);
  };

  // State Management loaded from localStorage
  const [session, setSession] = useState<UserSession | null>(() => StorageService.getSession());
  const [settings, setSettings] = useState<SchoolSettings>(() => StorageService.getSettings());
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => StorageService.getClassrooms());
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeachers());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu>(() => StorageService.getWeeklyMenu());

  // Absence Reports and Notifications states
  const [absenceReports, setAbsenceReports] = useState<AbsenceReport[]>(() => StorageService.getAbsenceReports());
  const [teacherNotifications, setTeacherNotifications] = useState<TeacherNotification[]>(() => StorageService.getTeacherNotifications());
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'absence' | 'other'>('absence');

  // State for editing welcome banner
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    welcomeTitle: '',
    welcomeSubtitle: '',
    welcomeTag: '',
    schoolName: ''
  });

  // Reusable Firebase and LocalStorage Sync logic
  const runFirebaseSync = async () => {
    setSyncStatus('syncing');
    try {
      const result = await syncOnMount();
      if (result) {
        setSettings(result.settings);
        setClassrooms(result.classrooms);
        setStudents(result.students);
        setTeachers(result.teachers);
        setAttendance(result.attendance);
        setWeeklyMenu(result.weeklyMenu);
        setAbsenceReports(result.absenceReports);
        
        if (result.isOffline) {
          setSyncStatus('offline');
          return;
        }
      }
      setSyncStatus('synced');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isPermissionError = errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("insufficient");
      const isOfflineError = errMsg.toLowerCase().includes("offline") || 
                             errMsg.toLowerCase().includes("could not reach cloud firestore backend") ||
                             errMsg.toLowerCase().includes("network") ||
                             errMsg.toLowerCase().includes("unavailable") ||
                             errMsg.toLowerCase().includes("failed to get document because the client is offline");
      if (isOfflineError) {
        console.warn("Firebase sync operating in offline mode.");
        setSyncStatus('offline');
      } else if (isPermissionError) {
        console.warn("Firebase sync warning: Security rules permission blocked. Setup guide is now active.");
        setSyncStatus('error');
      } else {
        console.error("Firebase sync error:", err);
        setSyncStatus('error');
      }
    }
  };

  // Initialize Storage and Seed database on first load
  useEffect(() => {
    StorageService.initialize();
    setSettings(StorageService.getSettings());
    runFirebaseSync();
  }, []);

  // Listen for online/offline and custom attendance sync events
  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus('syncing');
      showAppToast('info', 'Đã Kết Nối Mạng 🌐', 'Hệ thống đang kiểm tra và đồng bộ lại các dữ liệu tạm thời...');
      
      const didSync = await StorageService.syncUnsyncedAttendance();
      if (didSync) {
        showAppToast('success', 'Đồng Bộ Thành Công ⚡', 'Dữ liệu điểm danh lưu tạm đã được tải lên Firebase thành công!');
        // Refresh local memory and state
        const updatedAttendance = StorageService.getAttendance();
        setAttendance(updatedAttendance);
      }
      
      await runFirebaseSync();
    };

    const handleOffline = () => {
      setSyncStatus('offline');
      showAppToast('warning', 'Mất Kết Nối Mạng 📡', 'Bạn đang hoạt động ngoại tuyến. Các thay đổi sẽ được lưu tạm tại trình duyệt.');
    };

    const handleAttendanceOfflineSaved = () => {
      showAppToast('warning', 'Đã Lưu Tạm Ngoại Tuyến 💾', 'Thiết bị mất mạng! Bản ghi điểm danh đã được lưu tạm vào bộ nhớ thiết bị.');
    };

    const handleAttendanceSyncedOnline = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.isRecovery) {
        // Handled by handleOnline
        return;
      }
      showAppToast('success', 'Đã Đồng Bộ Cloud ☁️', 'Bản ghi điểm danh mới đã được lưu và đồng bộ lên Firebase!');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('attendance-offline-saved', handleAttendanceOfflineSaved);
    window.addEventListener('attendance-synced-online', handleAttendanceSyncedOnline);

    // Initial check on mount
    if (!navigator.onLine) {
      setSyncStatus('offline');
    } else {
      StorageService.syncUnsyncedAttendance().then(didSync => {
        if (didSync) {
          showAppToast('success', 'Tự Động Đồng Bộ ⚡', 'Đã tự động tải lên các bản ghi điểm danh ngoại tuyến trước đó.');
          const updatedAttendance = StorageService.getAttendance();
          setAttendance(updatedAttendance);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('attendance-offline-saved', handleAttendanceOfflineSaved);
      window.removeEventListener('attendance-synced-online', handleAttendanceSyncedOnline);
    };
  }, []);

  // Layout states
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [healthSubTab, setHealthSubTab] = useState<'indicators' | 'medication'>('indicators');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Sync dark mode class with HTML element
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // --- PERSISTENCE HANDLERS ---

  const handleSaveSettings = (newSettings: SchoolSettings) => {
    StorageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleSaveWeeklyMenu = (newMenu: WeeklyMenu) => {
    StorageService.saveWeeklyMenu(newMenu);
    setWeeklyMenu(newMenu);
  };

  const handleSaveClassrooms = (newClassrooms: Classroom[]) => {
    const preparedClassrooms = newClassrooms.map(c => {
      if (!c.createdBy) {
        return { ...c, createdBy: session?.isTeacher ? session.teacherPhone : 'admin' };
      }
      return c;
    });

    if (session?.isTeacher) {
      const allClassrooms = StorageService.getClassrooms();
      const otherClassrooms = allClassrooms.filter(c => c.createdBy !== session.teacherPhone && !c.coTeachers?.includes(session.teacherPhone!));
      const newAllClassrooms = [...otherClassrooms, ...preparedClassrooms];
      StorageService.saveClassrooms(newAllClassrooms);
      setClassrooms(newAllClassrooms);
    } else {
      StorageService.saveClassrooms(preparedClassrooms);
      setClassrooms(preparedClassrooms);
    }
    // Reload students to compute studentCount dynamic variables
    setStudents(StorageService.getStudents());
  };

  const handleSaveStudents = (newStudents: Student[]) => {
    if (session?.isTeacher) {
      const allStudents = StorageService.getStudents();
      const teacherClassIds = classrooms.filter(c => c.createdBy === session.teacherPhone || c.coTeachers?.includes(session.teacherPhone!)).map(c => c.id);
      const otherStudents = allStudents.filter(s => !teacherClassIds.includes(s.classId));
      const newAllStudents = [...otherStudents, ...newStudents];
      StorageService.saveStudents(newAllStudents);
      setStudents(newAllStudents);
    } else {
      StorageService.saveStudents(newStudents);
      setStudents(newStudents);
    }
    // Reload classrooms to update dynamic studentCount
    setClassrooms(StorageService.getClassrooms());
  };

  const handleSaveTeachers = (newTeachers: TeacherAccount[]) => {
    StorageService.saveTeachers(newTeachers);
    setTeachers(newTeachers);
  };

  const handleSaveAttendance = (newAttendance: AttendanceRecord[]) => {
    if (session?.isTeacher) {
      const allAttendance = StorageService.getAttendance();
      const teacherClassIds = classrooms.filter(c => c.createdBy === session.teacherPhone || c.coTeachers?.includes(session.teacherPhone!)).map(c => c.id);
      const otherAttendance = allAttendance.filter(a => !teacherClassIds.includes(a.classId));
      const newAllAttendance = [...otherAttendance, ...newAttendance];
      StorageService.saveAttendance(newAllAttendance);
      setAttendance(newAllAttendance);
    } else {
      StorageService.saveAttendance(newAttendance);
      setAttendance(newAttendance);
    }
  };

  const handleApproveAbsence = (reportId: string) => {
    const updated = absenceReports.map(r => {
      if (r.id === reportId) {
        return { ...r, status: 'approved' as const };
      }
      return r;
    });
    setAbsenceReports(updated);
    StorageService.saveAbsenceReports(updated);

    // Auto-create attendance entry
    const report = absenceReports.find(r => r.id === reportId);
    if (report) {
      const attendances = StorageService.getAttendance();
      const exists = attendances.some(a => a.studentId === report.studentId && a.date === report.startDate);
      if (!exists) {
        const newAttendance: AttendanceRecord = {
          id: `att_abs_${report.id}`,
          studentId: report.studentId,
          studentCode: '',
          studentName: report.studentName,
          classId: report.classId,
          className: report.className,
          date: report.startDate,
          time: '--:--:--',
          status: 'absent',
          notes: `Nghỉ có phép: ${report.reason}`
        };
        const std = students.find(s => s.id === report.studentId);
        if (std) {
          newAttendance.studentCode = std.studentCode;
        }
        const updatedAttendances = [newAttendance, ...attendances];
        handleSaveAttendance(updatedAttendances);
      }
    }
  };

  const handleRejectAbsence = (reportId: string) => {
    const updated = absenceReports.map(r => {
      if (r.id === reportId) {
        return { ...r, status: 'rejected' as const };
      }
      return r;
    });
    setAbsenceReports(updated);
    StorageService.saveAbsenceReports(updated);
  };

  const handleMarkNotifAsReadInApp = (id: string) => {
    const updated = teacherNotifications.map(n => n.id === id ? { ...n, isRead: true, read: true } : n);
    setTeacherNotifications(updated);
    StorageService.saveTeacherNotifications(updated);
  };

  const handleNotificationClick = (notif: TeacherNotification) => {
    // 1. Mark notification as read
    handleMarkNotifAsReadInApp(notif.id);

    // 2. Hide dropdown
    setNotifDropdownOpen(false);

    // 3. Navigate to appropriate tab / subtab
    if (notif.type === 'medication_request' || notif.content.toLowerCase().includes('dặn thuốc') || notif.content.toLowerCase().includes('gửi thuốc')) {
      setHealthSubTab('medication');
      setCurrentTab('health');
    } else if (notif.type === 'talent_register' || notif.type === 'talent_change') {
      setCurrentTab('students');
    } else if (notif.type === 'fee_payment') {
      setCurrentTab('reports');
    } else if (notif.type === 'absence_request') {
      setNotifTab('absence');
      setNotifDropdownOpen(true);
    }
  };

  const handleMarkAllNotifsAsReadInApp = () => {
    const updated = teacherNotifications.map(n => ({ ...n, isRead: true, read: true }));
    setTeacherNotifications(updated);
    StorageService.saveTeacherNotifications(updated);
  };

  const handleClearAllNotifsInApp = () => {
    // Keep only read ones, or clear all? The user requested to clear all
    setTeacherNotifications([]);
    StorageService.saveTeacherNotifications([]);
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    // 1. Reload local storage values immediately so the states are populated right after login
    StorageService.initialize();
    setSettings(StorageService.getSettings());
    setClassrooms(StorageService.getClassrooms());
    setTeachers(StorageService.getTeachers());
    setStudents(StorageService.getStudents());
    setAttendance(StorageService.getAttendance());
    setWeeklyMenu(StorageService.getWeeklyMenu());
    setAbsenceReports(StorageService.getAbsenceReports());
    setTeacherNotifications(StorageService.getTeacherNotifications());

    // 2. Set the session to transition the screen
    setSession(newSession);

    // 3. Trigger Firebase Sync to pull latest cloud data
    setTimeout(() => {
      runFirebaseSync();
    }, 100);
  };

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    StorageService.saveSession(null);
    setSession(null);
    setCurrentTab('dashboard');
    setLogoutConfirmOpen(false);
  };

  // Helper mapping active tabs to header breadcrumbs
  const getTabBreadcrumb = () => {
    switch (currentTab) {
      case 'classrooms': return 'Hồ sơ • Quản lý lớp học';
      case 'students': return 'Học viên • Danh sách học sinh';
      case 'health': return 'Sức khỏe • Chỉ số thể chất';
      case 'attendance': return 'Nhận diện • Điểm danh trực tiếp';
      case 'history': return 'Nhật ký • Lịch sử quét camera';
      case 'reports': return 'Phân tích • Báo cáo chuyên cần';
      case 'menu': return 'Thực phẩm • Đăng thực đơn tuần';
      case 'events': return 'Sự kiện • Hoạt động trường học';
      case 'noonsupervision': return 'Công tác • Quản lý trực trưa';
      case 'settings': return 'Tùy chỉnh • Cấu hình hệ thống';
      default: return 'Tổng quan • Dashboard';
    }
  };

  // Switch Theme Color mapping to CSS styles
  const getThemeAccentClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-600 dark:text-emerald-400';
      case 'violet': return 'text-violet-600 dark:text-violet-400';
      case 'rose': return 'text-rose-600 dark:text-rose-400';
      case 'amber': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getPreschoolBannerStyles = () => {
    switch (settings.themeColor) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-850 dark:text-emerald-300',
          accent: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
        };
      case 'violet':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30 text-purple-850 dark:text-purple-300',
          accent: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
        };
      case 'rose':
        return {
          bg: 'bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30 text-pink-850 dark:text-pink-300',
          accent: 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400',
        };
      case 'amber':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-850 dark:text-amber-300',
          accent: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
        };
      default:
        return {
          bg: 'bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30 text-sky-850 dark:text-sky-300',
          accent: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',
        };
    }
  };

  // --- COMPUTE TENANT-SPECIFIC DATA LISTS ---
  const teacherClassIds = useMemo(() => {
    if (!session?.isTeacher) return [];
    return classrooms
      .filter(c => c.createdBy === session.teacherPhone || c.coTeachers?.includes(session.teacherPhone!))
      .map(c => c.id);
  }, [classrooms, session]);

  const displayedClassrooms = useMemo(() => {
    if (session?.isTeacher) {
      return classrooms.filter(c => c.createdBy === session.teacherPhone || c.coTeachers?.includes(session.teacherPhone!));
    }
    return classrooms;
  }, [classrooms, session]);

  const displayedStudents = useMemo(() => {
    if (session?.isTeacher) {
      return students.filter(s => teacherClassIds.includes(s.classId));
    }
    return students;
  }, [students, session, teacherClassIds]);

  // Calculate students with overdue talent fee by more than 3 days
  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return displayedStudents.filter(s => {
      if (s.talentFeePaid || !s.talentFee || s.talentFee <= 0 || !s.talentFeeDueDate) {
        return false;
      }
      const dueDate = new Date(s.talentFeeDueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 3;
    }).length;
  }, [displayedStudents]);

  const displayedAttendance = useMemo(() => {
    if (session?.isTeacher) {
      return attendance.filter(a => teacherClassIds.includes(a.classId));
    }
    return attendance;
  }, [attendance, session, teacherClassIds]);

  const displayedAbsenceReports = useMemo(() => {
    if (session?.isTeacher) {
      return absenceReports.filter(r => teacherClassIds.includes(r.classId));
    }
    return absenceReports;
  }, [absenceReports, session, teacherClassIds]);

  const displayedNotifications = useMemo(() => {
    if (session?.isTeacher) {
      return teacherNotifications.filter(n => teacherClassIds.includes(n.classId));
    }
    return teacherNotifications;
  }, [teacherNotifications, session, teacherClassIds]);

  // Render Login screen if user session is absent
  if (!session) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        settings={settings}
      />
    );
  }

  // Render Parent Dashboard if logged in user is a parent
  if (session.isParent) {
    return (
      <ParentDashboard
        session={session}
        onLogout={handleConfirmLogout}
        settings={settings}
      />
    );
  }

  const canEditBanner = session && (session.isAdmin || session.isTeacher);

  return (
    <div className={`min-h-screen flex ${settings.themeColor === 'rose' ? 'bg-pink-50/50 dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'} text-slate-800 dark:text-slate-100 transition-colors duration-300`}>
      
      {/* 1. COLLAPSIBLE NAV SIDEBAR */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'health') {
            setHealthSubTab('indicators');
          }
          setCurrentTab(tab);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        settings={settings}
        session={session}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        overdueCount={overdueCount}
      />

      {/* 2. MAIN WORKING ZONE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen relative">
        
        {/* Top Header navbar - Hidden in Print */}
        <header className="no-print h-16 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 px-8 flex items-center justify-between z-10 shrink-0">
          
          <div className="flex items-center gap-3">
            {/* Hamburger button on Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            
            {/* Breadcrumb Info in Clean Minimalism style */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <span className="font-medium">Quản lý</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {currentTab === 'classrooms' ? 'Quản lý lớp học' :
                 currentTab === 'students' ? 'Quản lý học sinh' :
                 currentTab === 'health' ? 'Sức khỏe học sinh' :
                 currentTab === 'attendance' ? 'Điểm danh Camera' :
                 currentTab === 'history' ? 'Lịch sử điểm danh' :
                 currentTab === 'reports' ? 'Báo cáo thống kê' :
                 currentTab === 'menu' ? 'Đăng thực đơn' :
                 currentTab === 'events' ? 'Sự kiện trường' :
                 currentTab === 'settings' ? 'Cài đặt hệ thống' : 'Tổng quan'}
              </span>
            </div>
          </div>

          {/* Quick Stats Header Shortcuts */}
          <div className="flex items-center gap-3">
            
            {/* Cloud Sync Status Badge */}
            <button
              onClick={() => setShowRulesHelper(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-full text-xs font-semibold select-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={
                syncStatus === 'offline'
                  ? "Bạn đang ở chế độ ngoại tuyến. Dữ liệu điểm danh được lưu tạm tại trình duyệt và tự động đồng bộ khi có mạng."
                  : syncStatus === 'error'
                  ? "Lỗi phân quyền Firestore. Nhấp để xem hướng dẫn cấu hình lại Security Rules."
                  : "Xem cấu hình phân quyền Cloud Firebase"
              }
            >
              {syncStatus === 'syncing' ? (
                <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Đang đồng bộ...
                </span>
              ) : syncStatus === 'synced' ? (
                <span className="flex items-center gap-1.5 text-emerald-500 font-medium" title="Đã kết nối với database Firebase của bạn">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  Cloud Synced
                </span>
              ) : syncStatus === 'offline' ? (
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                  <WifiOff size={12} className="text-slate-400 dark:text-slate-500 animate-pulse" />
                  Ngoại tuyến (Lưu tạm)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-500 font-medium">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  Lỗi đồng bộ (Sửa Rules)
                </span>
              )}
            </button>

            {/* Digital Clock display in clean pill style */}
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              <Clock size={14} className={getThemeAccentClass()} />
              <span>{new Date().toLocaleDateString('vi-VN')}</span>
            </div>

            {/* Quick theme toggler shortcut */}
            <button
              onClick={() => handleSaveSettings({ ...settings, darkMode: !settings.darkMode })}
              className="p-2 rounded-full border border-slate-200/60 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer transition"
              title="Chuyển chế độ Sáng/Tối"
            >
              {settings.darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Quick absence reports notifications bell */}
            <div className="relative">
              {(() => {
                const pendingAbsenceCount = displayedAbsenceReports.filter(r => r.status === 'pending').length;
                const unreadNotifCount = displayedNotifications.filter(n => !n.isRead).length;
                const totalNotifBadgeCount = pendingAbsenceCount + unreadNotifCount;
                const hasPendingLeaveRequests = pendingAbsenceCount > 0;

                return (
                  <button
                    onClick={() => {
                      if (!notifDropdownOpen) {
                        setTeacherNotifications(StorageService.getTeacherNotifications());
                      }
                      setNotifDropdownOpen(!notifDropdownOpen);
                    }}
                    className={`p-2 rounded-full border cursor-pointer transition-all relative flex items-center justify-center ${
                      hasPendingLeaveRequests
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 ring-2 ring-rose-400/30 dark:ring-rose-500/20 shadow-xs animate-bell-shake'
                        : 'border-slate-200/60 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                    title={
                      hasPendingLeaveRequests
                        ? `Có ${pendingAbsenceCount} đơn xin nghỉ phép mới chưa được duyệt!`
                        : 'Thông báo từ phụ huynh'
                    }
                  >
                    <Bell size={16} className={hasPendingLeaveRequests ? 'animate-bell-shake text-rose-500 dark:text-rose-400' : ''} />
                    {totalNotifBadgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                        {totalNotifBadgeCount}
                      </span>
                    )}
                  </button>
                );
              })()}

              {/* Notification Dropdown Panel */}
              {notifDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setNotifDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-40 overflow-hidden animate-scale-in text-xs text-slate-850 dark:text-slate-100">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                          <Bell size={15} className="text-rose-500" />
                          Thông báo từ Phụ huynh
                        </span>
                        {notifTab === 'other' && displayedNotifications.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleMarkAllNotifsAsReadInApp}
                              className="text-[9px] font-extrabold uppercase text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                            >
                              Đọc hết
                            </button>
                            <span className="text-slate-200">|</span>
                            <button
                              type="button"
                              onClick={handleClearAllNotifsInApp}
                              className="text-[9px] font-extrabold uppercase text-rose-500 hover:text-rose-600 transition cursor-pointer"
                            >
                              Xóa sạch
                            </button>
                          </div>
                        )}
                      </div>

                      {/* TABS SWITCHER */}
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setNotifTab('absence')}
                          className={`flex-1 py-1.5 rounded-lg text-center font-extrabold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                            notifTab === 'absence'
                              ? 'bg-white dark:bg-slate-900 shadow-2xs text-slate-900 dark:text-white'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <span>Đơn báo vắng</span>
                          {displayedAbsenceReports.filter(r => r.status === 'pending').length > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                              {displayedAbsenceReports.filter(r => r.status === 'pending').length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifTab('other')}
                          className={`flex-1 py-1.5 rounded-lg text-center font-extrabold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                            notifTab === 'other'
                              ? 'bg-white dark:bg-slate-900 shadow-2xs text-slate-900 dark:text-white'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <span>Tương tác khác</span>
                          {displayedNotifications.filter(n => !n.isRead).length > 0 && (
                            <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                              {displayedNotifications.filter(n => !n.isRead).length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifTab === 'absence' ? (
                        displayedAbsenceReports.filter(r => r.status === 'pending').length === 0 ? (
                          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                            <Check size={28} className="text-emerald-500 bg-emerald-500/10 p-1.5 rounded-full" />
                            <p className="font-bold text-slate-700 dark:text-slate-300">Không có đơn báo vắng chưa duyệt.</p>
                            <p className="text-[10px] text-slate-400">Các đơn xin nghỉ đã được xử lý xong.</p>
                          </div>
                        ) : (
                          displayedAbsenceReports.filter(r => r.status === 'pending').map((report) => (
                            <div key={report.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-bold text-slate-850 dark:text-slate-100">
                                    {report.studentName} <span className="font-normal text-slate-400">({report.className})</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    Nghỉ: <span className="font-bold text-slate-600 dark:text-slate-300">{report.startDate}</span>
                                    {report.startDate !== report.endDate && <> → <span className="font-bold text-slate-600 dark:text-slate-300">{report.endDate}</span></>}
                                  </p>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>

                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px]">
                                <span className="font-bold text-slate-400">Lý do:</span> {report.reason}
                              </p>

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="text-[10px] text-slate-400 font-mono">SĐT: {report.parentPhone}</span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRejectAbsence(report.id)}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                                  >
                                    Từ chối
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveAbsence(report.id)}
                                    className={`px-3 py-1 text-[10px] font-extrabold text-white rounded-lg transition cursor-pointer shadow-xs ${
                                      settings.themeColor === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500' :
                                      settings.themeColor === 'violet' ? 'bg-violet-600 hover:bg-violet-500' :
                                      settings.themeColor === 'rose' ? 'bg-rose-600 hover:bg-rose-500' :
                                      settings.themeColor === 'amber' ? 'bg-amber-600 hover:bg-amber-500' :
                                      'bg-indigo-600 hover:bg-indigo-500'
                                    }`}
                                  >
                                    Đồng ý
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )
                      ) : (
                        displayedNotifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                            <span className="text-2xl">🔔</span>
                            <p className="font-bold text-slate-700 dark:text-slate-300">Không có thông báo tương tác.</p>
                            <p className="text-[10px] text-slate-400">Mọi hành động từ phụ huynh sẽ báo ở đây.</p>
                          </div>
                        ) : (
                          displayedNotifications.map((notif) => {
                            const getNotifIcon = () => {
                              switch (notif.type) {
                                case 'fee_payment':
                                  return <DollarSign size={13} className="text-emerald-500" />;
                                case 'talent_register':
                                  return <Sparkles size={13} className="text-pink-500" />;
                                case 'talent_change':
                                  return <BookOpen size={13} className="text-amber-500" />;
                                case 'absence_request':
                                  return <Calendar size={13} className="text-rose-500" />;
                                case 'medication_request':
                                  return <Pill size={13} className="text-rose-500" />;
                                default:
                                  return <Bell size={13} className="text-blue-500" />;
                              }
                            };

                            const getIconBg = () => {
                              switch (notif.type) {
                                case 'fee_payment':
                                  return 'bg-emerald-50 dark:bg-emerald-950/30';
                                case 'talent_register':
                                  return 'bg-pink-50 dark:bg-pink-950/30';
                                case 'talent_change':
                                  return 'bg-amber-50 dark:bg-amber-950/30';
                                case 'absence_request':
                                  return 'bg-rose-50 dark:bg-rose-950/30';
                                case 'medication_request':
                                  return 'bg-rose-50 dark:bg-rose-950/30';
                                default:
                                  return 'bg-blue-50 dark:bg-blue-950/30';
                              }
                            };

                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-850 relative flex items-start gap-3 cursor-pointer select-none group ${
                                  !notif.isRead ? 'bg-blue-500/[0.02] dark:bg-blue-500/[0.04]' : 'opacity-80'
                                }`}
                              >
                                <div className={`p-2 rounded-xl shrink-0 ${getIconBg()}`}>
                                  {getNotifIcon()}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="font-bold text-slate-850 dark:text-slate-100 truncate text-[11px]">
                                      {notif.studentName} <span className="font-normal text-slate-400">({notif.className})</span>
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono shrink-0">
                                      {new Date(notif.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    {notif.content}
                                  </p>
                                  <div className="flex items-center justify-between gap-2 pt-1">
                                    <span className="text-[10px] text-slate-400">SĐT: {notif.parentPhone}</span>
                                    {!notif.isRead && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkNotifAsReadInApp(notif.id);
                                        }}
                                        className="text-[10px] text-blue-500 hover:text-blue-600 font-bold transition cursor-pointer"
                                      >
                                        Đánh dấu đã đọc
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {!notif.isRead && (
                                  <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            );
                          })
                        )
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-850 text-center border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setCurrentTab('dashboard');
                          setNotifDropdownOpen(false);
                        }}
                        className="w-full text-[10px] font-extrabold uppercase text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 tracking-wider transition cursor-pointer"
                      >
                        {notifTab === 'absence' ? 'Xem chi tiết báo vắng' : 'Đến bảng điều khiển giáo viên'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Attendance quick trigger badge */}
            <button
              onClick={() => setCurrentTab('attendance')}
              className={`p-2 rounded-full text-white flex items-center justify-center cursor-pointer relative ${
                settings.themeColor === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500' :
                settings.themeColor === 'violet' ? 'bg-violet-600 hover:bg-violet-500' :
                settings.themeColor === 'rose' ? 'bg-rose-600 hover:bg-rose-500' :
                settings.themeColor === 'amber' ? 'bg-amber-600 hover:bg-amber-500' :
                'bg-indigo-600 hover:bg-indigo-500'
              }`}
              title="Bật Camera điểm danh"
            >
              <Camera size={16} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </button>

          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto pb-12">
          
          {/* Preschool Friendly Header Announcement Bar */}
          <div className={`mb-6 p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs transition-all duration-300 relative overflow-hidden ${getPreschoolBannerStyles().bg}`}>
            
            {/* Cute Animated Chibi Boy SVG on Left */}
            <div className="shrink-0 hidden lg:block select-none">
              <svg className="w-28 h-28 filter drop-shadow-sm transition-transform duration-300 hover:scale-105" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Dynamic Ground Shadow (scales in sync with jump) */}
                <ellipse cx="76" cy="112" rx="18" ry="3.5" fill="#000000" fillOpacity="0.16" className="animate-shadow-scale" />

                {/* JUMPING GROUP (Moves boy and balloon up and down) */}
                <g className="animate-chibi-jump">
                  {/* FLOATING BALLOON */}
                  <g className="animate-balloon">
                    {/* Balloon String */}
                    <path d="M40 38 Q45 52 70 76" stroke="#B0C4DE" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    {/* Balloon Body */}
                    <circle cx="36" cy="24" r="18" fill="#60A5FA" fillOpacity="0.8" />
                    <path d="M36 6 A18 18 0 0 1 54 24 A18 18 0 0 1 36 42 A18 18 0 0 1 18 24 A18 18 0 0 1 36 6 Z" fill="url(#blueBalloonGrad)" />
                    {/* Cute Bear Face Printed on Balloon */}
                    <circle cx="36" cy="25" r="10" fill="#FFFFFF" fillOpacity="0.7" />
                    {/* Bear Ears */}
                    <circle cx="28" cy="17" r="3.5" fill="#FFFFFF" fillOpacity="0.7" />
                    <circle cx="44" cy="17" r="3.5" fill="#FFFFFF" fillOpacity="0.7" />
                    <circle cx="28" cy="17" r="1.5" fill="#3B82F6" />
                    <circle cx="44" cy="17" r="1.5" fill="#3B82F6" />
                    {/* Bear Face details */}
                    <circle cx="33" cy="24" r="1" fill="#1E3A8A" />
                    <circle cx="39" cy="24" r="1" fill="#1E3A8A" />
                    <path d="M35 27 C35 28 37 28 37 27" stroke="#1E3A8A" strokeWidth="0.8" fill="none" />
                    {/* Balloon Highlight */}
                    <ellipse cx="29" cy="16" rx="4" ry="2" fill="#FFFFFF" fillOpacity="0.6" transform="rotate(-30 29 16)" />
                    {/* Balloon Tie */}
                    <path d="M34 42 L38 42 L36 45 Z" fill="#3B82F6" />
                  </g>

                  {/* CHIBI BOY BODY & HEAD */}
                  <g className="animate-chibi-body">
                    {/* Body / Blue Uniform Shirt */}
                    <path d="M58 88 C58 88 62 110 76 110 C90 110 94 88 94 88 Z" fill="#1D4ED8" />
                    <path d="M68 88 L76 96 L84 88" fill="#FFFFFF" />
                    {/* Cute Red Necktie */}
                    <path d="M75 96 H77 L78 103 L76 106 L74 103 Z" fill="#EF4444" />
                    
                    {/* Animated Arm holding balloon string */}
                    <g className="animate-arm">
                      <path d="M60 90 Q65 82 70 76" stroke="#FCE1D4" strokeWidth="7" strokeLinecap="round" fill="none" />
                    </g>

                    {/* Left Arm resting */}
                    <path d="M92 90 Q97 98 94 104" stroke="#FCE1D4" strokeWidth="6" strokeLinecap="round" fill="none" />

                    {/* CHIBI HEAD */}
                    <g className="animate-chibi-head">
                      {/* Hair back */}
                      <path d="M54 75 C54 58 64 47 76 47 C88 47 98 58 98 75" stroke="#1E293B" strokeWidth="10" strokeLinecap="round" />
                      {/* Face */}
                      <circle cx="76" cy="76" r="21" fill="#FCE1D4" />
                      {/* Ears */}
                      <circle cx="53" cy="76" r="4.5" fill="#FCE1D4" />
                      <circle cx="99" cy="76" r="4.5" fill="#FCE1D4" />
                      {/* Hair Front */}
                      <path d="M54 70 C57 58 66 48 76 49 C86 48 95 58 98 70 C93 66 87 66 82 68 C77 70 72 68 67 66 C62 64 58 66 54 70 Z" fill="#1E293B" />
                      {/* Cute Kindergarten Cap */}
                      <path d="M60 49 C67 42 85 42 92 49 L94 52 H58 L60 49 Z" fill="#1D4ED8" />
                      <path d="M76 42 V37" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="76" cy="36" r="2.5" fill="#F59E0B" />
                      {/* Blinking Eyes */}
                      <g className="animate-eye">
                        <circle cx="68" cy="75" r="2.5" fill="#1E293B" />
                        <circle cx="84" cy="75" r="2.5" fill="#1E293B" />
                      </g>
                      {/* Blushing Cheeks */}
                      <ellipse cx="63" cy="80" rx="3.5" ry="1.5" fill="#F87171" fillOpacity="0.5" />
                      <ellipse cx="89" cy="80" rx="3.5" ry="1.5" fill="#F87171" fillOpacity="0.5" />
                      {/* Smile */}
                      <path d="M73 82 Q76 85 79 82" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </g>
                  </g>
                </g>
                
                {/* Gradients */}
                <defs>
                  <radialGradient id="blueBalloonGrad" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#93C5FD" />
                    <stop offset="70%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                  </radialGradient>
                </defs>
              </svg>
            </div>

            {/* Middle Text Area - Unified into a single elegant horizontal row */}
            <div className="flex-1 min-w-0 py-1">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                <span className="tracking-tight flex items-center gap-1.5 flex-wrap justify-center lg:justify-start">
                  <span>{settings.welcomeTitle || 'Chào mừng quý thầy cô đến với cổng quản trị'}</span>
                  <span className="font-extrabold text-sky-600 dark:text-sky-400">
                    {settings.schoolName || 'TRƯỜNG MẦM NON 3'}
                  </span>!
                </span>
                
                <span className="hidden lg:inline text-slate-300 dark:text-slate-700 font-normal">|</span>
                
                <span className="text-[11px] opacity-90 text-slate-600 dark:text-slate-300 font-medium">
                  {settings.welcomeSubtitle || 'Chúc cô và các bé một ngày thật nhiều niềm vui!'}
                </span>

                {settings.welcomeTag && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-850 text-[9px] font-extrabold text-rose-500 border border-rose-100 dark:border-pink-950">
                    {settings.welcomeTag}
                  </span>
                )}

                {canEditBanner && (
                  <button
                    onClick={() => {
                      setBannerForm({
                        welcomeTitle: settings.welcomeTitle || 'Chào mừng quý thầy cô đến với cổng quản trị',
                        welcomeSubtitle: settings.welcomeSubtitle || 'Chúc cô và các bé mầm non một ngày học tập, vui chơi thật nhiều niềm vui!',
                        welcomeTag: settings.welcomeTag || 'Bé Ngoan Xuất Sắc 🌟',
                        schoolName: settings.schoolName || 'TRƯỜNG MẦM NON 3 - PHƯỜNG BÀN CỜ TP.HỒ CHÍ MINH'
                      });
                      setIsEditingBanner(true);
                    }}
                    className="inline-flex items-center gap-1 text-[9px] bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 px-2 py-0.5 rounded-full transition duration-200 cursor-pointer font-bold shrink-0 ml-1"
                    title="Chỉnh sửa chữ biểu ngữ"
                  >
                    <Edit size={9} /> Chỉnh sửa
                  </button>
                )}
              </div>
            </div>

            {/* Cute Animated Chibi Girl SVG on Right */}
            <div className="shrink-0 select-none">
              <svg className="w-28 h-28 filter drop-shadow-sm transition-transform duration-300 hover:scale-105" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* FLOATING PINK BALLOON WITH RABBIT */}
                <g className="animate-balloon">
                  {/* Balloon String */}
                  <path d="M80 38 Q75 52 50 76" stroke="#FFC0CB" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  {/* Balloon Body */}
                  <circle cx="84" cy="24" r="18" fill="#EC4899" fillOpacity="0.85" />
                  <path d="M84 6 A18 18 0 0 1 102 24 A18 18 0 0 1 84 42 A18 18 0 0 1 66 24 A18 18 0 0 1 84 6 Z" fill="url(#pinkBalloonGrad)" />
                  {/* Cute White Bunny Face Printed on Balloon */}
                  <circle cx="84" cy="25" r="9" fill="#FFFFFF" />
                  {/* Bunny Ears */}
                  <ellipse cx="80" cy="14" rx="2.5" ry="5" fill="#FFFFFF" />
                  <ellipse cx="88" cy="14" rx="2.5" ry="5" fill="#FFFFFF" />
                  <ellipse cx="80" cy="15" rx="1.2" ry="3" fill="#FCA5A5" />
                  <ellipse cx="88" cy="15" rx="1.2" ry="3" fill="#FCA5A5" />
                  {/* Bunny Eyes & Bow */}
                  <circle cx="81.5" cy="24" r="0.8" fill="#374151" />
                  <circle cx="86.5" cy="24" r="0.8" fill="#374151" />
                  {/* Pink Bunny Nose */}
                  <polygon points="83.5,26.5 84.5,26.5 84,27" fill="#F43F5E" />
                  {/* Balloon Highlight */}
                  <ellipse cx="77" cy="16" rx="4" ry="2" fill="#FFFFFF" fillOpacity="0.65" transform="rotate(-30 77 16)" />
                  {/* Balloon Tie */}
                  <path d="M82 42 L86 42 L84 45 Z" fill="#F43F5E" />
                </g>

                {/* CHIBI GIRL BODY & HEAD */}
                <g className="animate-chibi-body">
                  {/* Body / Pink Dress over White Shirt */}
                  <path d="M38 108 L46 88 L62 88 L70 108 Z" fill="#F472B6" stroke="#DB2777" strokeWidth="1" />
                  {/* White long sleeves */}
                  <path d="M38 108 C36 102 42 88 46 88" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" fill="none" />
                  <path d="M70 108 C72 102 66 88 62 88" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" fill="none" />
                  {/* White Collar */}
                  <path d="M48 88 Q54 94 60 88" fill="#FFFFFF" />
                  
                  {/* Cute Bunny Pocket Detail on Dress */}
                  <circle cx="56" cy="98" r="4" fill="#FFFFFF" />
                  <path d="M54 94 L54 91 L55 92 L54 94 Z" fill="#FFFFFF" />
                  <path d="M58 94 L58 91 L57 92 L58 94 Z" fill="#FFFFFF" />
                  
                  {/* Animated Arm holding balloon string */}
                  <g className="animate-arm">
                    <path d="M42 90 Q45 82 50 76" stroke="#FCE1D4" strokeWidth="6.5" strokeLinecap="round" fill="none" />
                  </g>

                  {/* Left Arm resting */}
                  <path d="M66 90 Q70 96 68 102" stroke="#FCE1D4" strokeWidth="5.5" strokeLinecap="round" fill="none" />

                  {/* CHIBI HEAD */}
                  <g className="animate-chibi-head">
                    {/* Hair back */}
                    <path d="M32 75 C32 56 42 45 54 45 C66 45 76 56 76 75" stroke="#78350F" strokeWidth="11" strokeLinecap="round" />
                    
                    {/* Face */}
                    <circle cx="54" cy="76" r="21" fill="#FCE1D4" />
                    
                    {/* Hair Front with beautiful bangs */}
                    <path d="M32 68 C35 56 44 46 54 47 C64 46 73 56 76 68 C71 63 64 62 59 64 C54 66 49 64 44 62 C39 60 35 63 32 68 Z" fill="#78350F" />
                    
                    {/* Cute Pink Bows on Hair sides */}
                    <path d="M34 62 L28 58 V66 Z" fill="#EC4899" />
                    <path d="M74 62 L80 58 V66 Z" fill="#EC4899" />
                    <circle cx="34" cy="62" r="2" fill="#FFFFFF" />
                    <circle cx="74" cy="62" r="2" fill="#FFFFFF" />

                    {/* Blinking Big Eyes */}
                    <g className="animate-eye">
                      <circle cx="46" cy="75" r="3" fill="#1F2937" />
                      <circle cx="62" cy="75" r="3" fill="#1F2937" />
                      {/* Catchlights */}
                      <circle cx="45" cy="74" r="1" fill="#FFFFFF" />
                      <circle cx="61" cy="74" r="1" fill="#FFFFFF" />
                    </g>
                    
                    {/* Blushing Cheeks */}
                    <ellipse cx="41" cy="80" rx="3.5" ry="1.5" fill="#FCA5A5" fillOpacity="0.8" />
                    <ellipse cx="67" cy="80" rx="3.5" ry="1.5" fill="#FCA5A5" fillOpacity="0.8" />
                    
                    {/* Open Happy Smile */}
                    <path d="M50 82 Q54 86 58 82" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </g>
                </g>
                
                {/* Gradients */}
                <defs>
                  <radialGradient id="pinkBalloonGrad" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#FBCFE8" />
                    <stop offset="70%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#BE185D" />
                  </radialGradient>
                </defs>
              </svg>
            </div>

          </div>
          
          {/* Tab Routing rendering with smooth fade-in and subtle slide-up transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {currentTab === 'dashboard' && (
                <Dashboard
                  students={displayedStudents}
                  classrooms={displayedClassrooms}
                  attendance={displayedAttendance}
                  settings={settings}
                  setCurrentTab={setCurrentTab}
                  onAttendanceChange={handleSaveAttendance}
                  absenceReports={displayedAbsenceReports}
                  onApproveAbsence={handleApproveAbsence}
                  onRejectAbsence={handleRejectAbsence}
                  onSaveStudents={handleSaveStudents}
                />
              )}

              {currentTab === 'classrooms' && (
                <Classrooms
                  classrooms={displayedClassrooms}
                  allClassrooms={classrooms}
                  saveClassrooms={handleSaveClassrooms}
                  settings={settings}
                  students={displayedStudents}
                  attendance={displayedAttendance}
                  saveAttendance={handleSaveAttendance}
                  teachers={teachers}
                  currentTeacherPhone={session?.teacherPhone}
                />
              )}

              {!session?.isTeacher && currentTab === 'teachers' && (
                <Teachers
                  teachers={teachers}
                  saveTeachers={handleSaveTeachers}
                  classrooms={classrooms}
                  saveClassrooms={handleSaveClassrooms}
                  settings={settings}
                />
              )}

              {currentTab === 'students' && (
                <Students
                  students={displayedStudents}
                  classrooms={displayedClassrooms}
                  saveStudents={handleSaveStudents}
                  settings={settings}
                />
              )}

              {currentTab === 'health' && (
                <Health
                  students={displayedStudents}
                  classrooms={displayedClassrooms}
                  settings={settings}
                  initialActiveTab={healthSubTab}
                  onSaveStudents={handleSaveStudents}
                />
              )}

              {currentTab === 'attendance' && (
                <CameraAttendance
                  students={displayedStudents}
                  attendance={displayedAttendance}
                  saveAttendance={handleSaveAttendance}
                  settings={settings}
                />
              )}

              {currentTab === 'history' && (
                <AttendanceHistory
                  attendance={displayedAttendance}
                  classrooms={displayedClassrooms}
                  students={displayedStudents}
                  saveAttendance={handleSaveAttendance}
                  settings={settings}
                />
              )}

              {currentTab === 'assessments' && (
                <DailyAssessments
                  students={displayedStudents}
                  classrooms={displayedClassrooms}
                  settings={settings}
                  isTeacher={session?.isTeacher}
                />
              )}

              {currentTab === 'reports' && (
                <Reports
                  students={displayedStudents}
                  classrooms={displayedClassrooms}
                  attendance={displayedAttendance}
                  settings={settings}
                  isTeacher={session?.isTeacher}
                />
              )}

              {currentTab === 'menu' && (
                <MenuPosting
                  weeklyMenu={weeklyMenu}
                  onSaveMenu={handleSaveWeeklyMenu}
                  settings={settings}
                />
              )}

              {currentTab === 'events' && (
                <Events
                  students={displayedStudents}
                  settings={settings}
                />
              )}

              {currentTab === 'noonsupervision' && (
                <NoonSupervision
                  settings={settings}
                  teachers={teachers}
                  session={session}
                />
              )}

              {!session?.isTeacher && currentTab === 'settings' && (
                <SettingsComponent
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                />
              )}
            </motion.div>
          </AnimatePresence>

        </main>
      </div>

      {/* LOGOUT CONFIRMATION DIALOG */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setLogoutConfirmOpen(false)} />
          
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setLogoutConfirmOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <LogOut size={24} />
              <h2 className="text-lg font-bold">Đăng xuất khỏi hệ thống</h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng điểm danh không? Phiên đăng nhập hiện tại sẽ kết thúc.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
              >
                Xác nhận đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANNER EDITING DIALOG */}
      {isEditingBanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsEditingBanner(false)} />
          
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setIsEditingBanner(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-sky-600 dark:text-sky-400 mb-4">
              <Sparkles size={24} />
              <h2 className="text-lg font-bold">Chỉnh sửa nội dung biểu ngữ</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Tiêu đề chào mừng
                </label>
                <input
                  type="text"
                  value={bannerForm.welcomeTitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, welcomeTitle: e.target.value })}
                  placeholder="Ví dụ: Chào mừng quý thầy cô đến với cổng quản trị"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Tên trường học
                </label>
                <input
                  type="text"
                  value={bannerForm.schoolName}
                  onChange={(e) => setBannerForm({ ...bannerForm, schoolName: e.target.value })}
                  placeholder="Ví dụ: TRƯỜNG MẦM NON 3"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Lời chúc / Phụ đề
                </label>
                <textarea
                  rows={2}
                  value={bannerForm.welcomeSubtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, welcomeSubtitle: e.target.value })}
                  placeholder="Ví dụ: Chúc cô và các bé mầm non một ngày học tập, vui chơi thật nhiều niềm vui!"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Nhãn nổi bật (Mác bé ngoan)
                </label>
                <input
                  type="text"
                  value={bannerForm.welcomeTag}
                  onChange={(e) => setBannerForm({ ...bannerForm, welcomeTag: e.target.value })}
                  placeholder="Ví dụ: Bé Ngoan Xuất Sắc 🌟"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsEditingBanner(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveSettings({
                    ...settings,
                    welcomeTitle: bannerForm.welcomeTitle,
                    welcomeSubtitle: bannerForm.welcomeSubtitle,
                    welcomeTag: bannerForm.welcomeTag,
                    schoolName: bannerForm.schoolName
                  });
                  setIsEditingBanner(false);
                }}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {showRulesHelper && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setShowRulesHelper(false)} />
          
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 relative z-[130] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-wide">
                  Cấu hình bảo mật Firestore
                </h3>
              </div>
              <button 
                onClick={() => setShowRulesHelper(false)} 
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-xl border border-amber-500/20 text-xs flex gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold mb-1">Thiếu quyền đọc/ghi dữ liệu (Missing or insufficient permissions)</p>
                  <p>Hệ thống kết nối thành công với Firebase <strong>diemdanh-56430</strong>, nhưng Firestore từ chối truy cập do các quy tắc bảo mật hiện tại của bạn đang chặn mọi yêu cầu.</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold">1</span>
                  Các bước khắc phục nhanh:
                </h4>
                <ol className="list-decimal list-inside pl-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <li>Truy cập trang quản lý Rules của dự án trên Firebase Console bằng link dưới đây.</li>
                  <li>Copy đoạn mã cấu hình phân quyền bên dưới.</li>
                  <li>Dán đè vào trình soạn thảo Rules trên Firebase Console và nhấn <strong>Publish (Xuất bản)</strong>.</li>
                </ol>
              </div>

              {/* Link button */}
              <div className="pt-1">
                <a 
                  href="https://console.firebase.google.com/u/0/project/diemdanh-56430/firestore/rules" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm hover:shadow transition"
                >
                  Mở trang cấu hình Rules Firebase
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* Code display with copy */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-850 dark:text-slate-200 text-xs">Mã Quy Tắc (Firestore Security Rules):</span>
                  <button
                    onClick={() => {
                      const rulesText = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
                      navigator.clipboard.writeText(rulesText);
                      setRulesCopied(true);
                      setTimeout(() => setRulesCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer font-semibold transition"
                  >
                    {rulesCopied ? (
                      <>
                        <Check size={12} className="text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Đã copy!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy mã rules</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <pre className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto border border-slate-800 shadow-inner">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                  </pre>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowRulesHelper(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs uppercase cursor-pointer transition"
              >
                Đóng hướng dẫn
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 8. FLOATING SYSTEM TOAST NOTIFICATIONS */}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {appToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className={`p-4 rounded-2xl shadow-xl border backdrop-blur-md flex gap-3 pointer-events-auto ${
                toast.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : toast.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                  : toast.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' ? (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-bold">✓</span>
                ) : toast.type === 'warning' ? (
                  <AlertTriangle size={18} className="text-amber-500" />
                ) : toast.type === 'error' ? (
                  <AlertCircle size={18} className="text-rose-500" />
                ) : (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">i</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-black uppercase tracking-wide mb-0.5 leading-none">
                  {toast.title}
                </h5>
                <p className="text-[11px] font-medium leading-relaxed opacity-90">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => setAppToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-0.5"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
