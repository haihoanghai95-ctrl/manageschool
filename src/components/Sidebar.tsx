/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Camera,
  History,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  School,
  Menu,
  Contact,
  Utensils,
  Heart,
  ClipboardCheck,
  KeyRound,
  Calendar,
  Clock
} from 'lucide-react';
import { SchoolSettings, UserSession } from '../types';
import ChangePasswordModal from './ChangePasswordModal';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  settings: SchoolSettings;
  session: UserSession | null;
  onLogout: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  overdueCount?: number;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  settings,
  session,
  onLogout,
  mobileOpen,
  setMobileOpen,
  overdueCount,
}: SidebarProps) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'classrooms', label: 'Quản lý lớp học', icon: GraduationCap },
    { id: 'teachers', label: 'Quản lý giáo viên', icon: Contact },
    { id: 'students', label: 'Quản lý học sinh', icon: Users },
    { id: 'health', label: 'Sức khỏe học sinh', icon: Heart },
    { id: 'attendance', label: 'Điểm danh Camera', icon: Camera, badge: 'AI Live' },
    { id: 'history', label: 'Lịch sử điểm danh', icon: History },
    { id: 'assessments', label: 'Đánh giá trẻ hằng ngày', icon: ClipboardCheck },
    { id: 'reports', label: 'Báo cáo thống kê', icon: BarChart3 },
    { id: 'menu', label: 'Đăng thực đơn', icon: Utensils },
    { id: 'events', label: 'Sự kiện trường', icon: Calendar },
    { id: 'noonsupervision', label: 'Quản lý trực trưa', icon: Clock },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
  ].filter(item => {
    if (session?.isTeacher && (item.id === 'settings' || item.id === 'teachers')) return false;
    return true;
  });

  // Map theme colors to CSS accent rings/text
  const getThemeColorClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20';
      case 'violet': return 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20';
      case 'rose': return 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20';
      case 'amber': return 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20';
      default: return 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20'; // blue/indigo
    }
  };

  const getLogoBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600';
      case 'violet': return 'bg-violet-600';
      case 'rose': return 'bg-rose-600';
      case 'amber': return 'bg-amber-600';
      default: return 'bg-indigo-600'; // blue/indigo
    }
  };

  const getActiveItemClass = (itemId: string) => {
    if (currentTab === itemId) {
      switch (settings.themeColor) {
        case 'emerald': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold';
        case 'violet': return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 font-semibold';
        case 'rose': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold';
        case 'amber': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold';
        default: return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold'; // indigo-based minimalism
      }
    }
    return 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100';
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300">
      {/* Sidebar Header */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-100 dark:border-slate-800">
        {settings.schoolLogo ? (
          <img
            src={settings.schoolLogo}
            alt="School Logo"
            className="w-8 h-8 rounded-lg object-cover shrink-0 shadow-xs border border-slate-150 dark:border-slate-800"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xl italic shrink-0 ${getLogoBgClass()}`}>
            🏫
          </div>
        )}
        <div className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
          <h2 className="font-bold text-xs sm:text-sm leading-snug tracking-tight text-slate-800 dark:text-white line-clamp-2" title={settings.schoolName || 'EduAttend'}>
            {settings.schoolName || 'EduAttend'}
          </h2>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {session?.isTeacher ? 'Giáo viên Panel' : 'Admin Panel'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              id={`sidebar-item-${item.id}`}
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group cursor-pointer ${getActiveItemClass(
                item.id
              )}`}
            >
              <Icon size={18} className="shrink-0" />
              <span className={`transition-all duration-300 whitespace-nowrap ${collapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'opacity-100 w-auto'}`}>
                {item.label}
              </span>
              
              {/* Live/AI special badge */}
              {item.badge && !collapsed && (
                <span className="absolute right-3 px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-red-500 text-white animate-pulse">
                  {item.badge}
                </span>
              )}

              {/* Overdue tuition badge for students tab */}
              {item.id === 'students' && overdueCount !== undefined && overdueCount > 0 && (
                <span className={`absolute right-3 px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-rose-500 text-white shrink-0 ${collapsed ? 'scale-75 -top-1 -right-1' : 'animate-pulse'}`}>
                  {overdueCount}
                </span>
              )}
              
              {/* Tooltip on collapsed state */}
              {collapsed && (
                <div className="absolute left-16 px-2 py-1 bg-slate-900 text-white text-xs font-normal rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-md whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}

        {!collapsed && (
          <div className="mx-3 my-4 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800/40 dark:to-teal-950/20 rounded-2xl border border-emerald-100/50 dark:border-teal-900/30 flex flex-col items-center text-center relative overflow-hidden group shadow-xs">
            {/* Playful background blobs */}
            <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-emerald-200/40 dark:bg-emerald-900/10 blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-teal-200/30 dark:bg-teal-900/10 blur-lg" />
            
            <svg className="w-20 h-20 text-emerald-500 drop-shadow-md transition-transform group-hover:scale-105 duration-300 relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Grass land */}
              <path d="M10 80C30 75 70 75 90 80V90H10V80Z" fill="#a7f3d0" />
              {/* Shirt */}
              <path d="M35 75C35 62 65 62 65 75" fill="#f43f5e" />
              {/* Head */}
              <circle cx="50" cy="48" r="18" fill="#fed7aa" />
              {/* Cheeks */}
              <circle cx="40" cy="52" r="2.5" fill="#f43f5e" fillOpacity="0.4" />
              <circle cx="60" cy="52" r="2.5" fill="#f43f5e" fillOpacity="0.4" />
              {/* Cute hair */}
              <path d="M32 42C30 30 45 26 50 34C55 26 70 30 68 42C72 42 70 48 68 48C62 38 38 38 32 48C30 48 28 42 32 42Z" fill="#78350f" />
              <circle cx="33" cy="37" r="4.5" fill="#78350f" />
              <circle cx="67" cy="37" r="4.5" fill="#78350f" />
              {/* Eyes */}
              <circle cx="44" cy="48" r="2.5" fill="#1e293b" />
              <circle cx="56" cy="48" r="2.5" fill="#1e293b" />
              {/* Happy smile */}
              <path d="M46 53C48 56 52 56 54 53" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
              {/* Hands */}
              <circle cx="30" cy="68" r="3.5" fill="#fed7aa" />
              <circle cx="70" cy="68" r="3.5" fill="#fed7aa" />
              {/* Little butterfly/flower details */}
              <circle cx="18" cy="70" r="1.5" fill="#f59e0b" />
              <circle cx="82" cy="72" r="1.5" fill="#fb7185" />
            </svg>
            <div className="mt-1.5 relative z-10">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                Nuôi dạy trẻ 🌸
              </span>
              <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 leading-tight">
                Môi trường mầm non hạnh phúc
              </p>
            </div>
          </div>
        )}
      </nav>

      {/* User Session Info & Log Out */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        {!collapsed && session && (
          <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-xl mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${getLogoBgClass()}`}>
              {session.isTeacher ? 'GV' : 'AD'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                {session.isTeacher ? session.teacherName : 'Admin User'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                {session.isTeacher ? session.teacherPhone : session.email}
              </p>
            </div>
          </div>
        )}
        
        {session && (
          <button
            id="sidebar-change-password-btn"
            onClick={() => setIsChangePasswordOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 transition-all duration-200 cursor-pointer mb-1.5"
          >
            <KeyRound size={18} className="shrink-0" />
            <span className={`transition-all duration-300 ${collapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'opacity-100 w-auto'}`}>
              Đổi mật khẩu
            </span>
            {collapsed && (
              <div className="absolute left-16 px-2 py-1 bg-slate-900 text-white text-xs font-normal rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-md whitespace-nowrap">
                Đổi mật khẩu
              </div>
            )}
          </button>
        )}
        
        <button
          id="sidebar-logout-btn"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={18} className="shrink-0" />
          <span className={`transition-all duration-300 ${collapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'opacity-100 w-auto'}`}>
            Đăng xuất
          </span>
          {collapsed && (
            <div className="absolute left-16 px-2 py-1 bg-slate-900 text-white text-xs font-normal rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-md whitespace-nowrap">
              Đăng xuất
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Container */}
      <aside className={`no-print hidden md:block shrink-0 h-screen transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'} sticky top-0 z-20`}>
        {sidebarContent}
        
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-md hover:text-slate-700 dark:hover:text-white transition cursor-pointer z-30"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          />
          
          {/* Drawer content */}
          <div className="relative w-64 max-w-[80%] h-full z-10 animate-slide-in">
            {sidebarContent}
          </div>
        </div>
      )}

      {session && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          session={session}
          settings={settings}
        />
      )}
    </>
  );
}
