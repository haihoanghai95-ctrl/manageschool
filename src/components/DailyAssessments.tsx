/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  MessageSquare,
  Search,
  Calendar,
  Check,
  FileSpreadsheet,
  Filter,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Student, Classroom, SchoolSettings, DailyAssessment } from '../types';
import { StorageService } from '../utils/storage';

interface DailyAssessmentsProps {
  students: Student[];
  classrooms: Classroom[];
  settings: SchoolSettings;
  isTeacher?: boolean;
}

export default function DailyAssessments({
  students,
  classrooms,
  settings,
  isTeacher = false,
}: DailyAssessmentsProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<'status' | 'comments'>('status');
  
  // Date and Class filters
  const [dateFilter, setDateFilter] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [classFilter, setClassFilter] = useState(() => {
    if (classrooms.length > 0) {
      return classrooms[0].id;
    }
    return 'all';
  });

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Daily Assessments persistent state
  const [dailyAssessments, setDailyAssessments] = useState<DailyAssessment[]>([]);
  const [assessmentSuccessMsg, setAssessmentSuccessMsg] = useState<Record<string, string>>({});
  const [teacherExportMonth, setTeacherExportMonth] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  });

  // Daily comments state
  const [commentsState, setCommentsState] = useState<Record<string, { rating: number; text: string }>>({});

  useEffect(() => {
    setDailyAssessments(StorageService.getDailyAssessments());
    setCommentsState(StorageService.getDailyComments());
  }, []);

  // Set default classroom filter if it changes
  useEffect(() => {
    if ((classFilter === 'all' || !classFilter) && classrooms.length > 0) {
      setClassFilter(classrooms[0].id);
    }
  }, [classrooms]);

  // Class names mapping helper
  const classNamesMap = useMemo(() => {
    const m: Record<string, string> = {};
    classrooms.forEach(c => {
      m[c.id] = c.name;
    });
    return m;
  }, [classrooms]);

  // Handle saving detailed status assessment
  const handleSaveAssessment = (
    studentId: string,
    studentName: string,
    classId: string,
    healthStatus: any,
    diningStatus: any,
    sleepStatus: any,
    activityStatus: any,
    hygieneStatus: any,
    notes: string
  ) => {
    const existingIdx = dailyAssessments.findIndex(
      a => a.studentId === studentId && a.date === dateFilter
    );

    const newAssessment: DailyAssessment = {
      id: existingIdx >= 0 ? dailyAssessments[existingIdx].id : `da_${Date.now()}_${studentId}`,
      studentId,
      studentName,
      classId,
      date: dateFilter,
      healthStatus,
      diningStatus,
      sleepStatus,
      activityStatus,
      hygieneStatus,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    let updated = [...dailyAssessments];
    if (existingIdx >= 0) {
      updated[existingIdx] = newAssessment;
    } else {
      updated.push(newAssessment);
    }

    setDailyAssessments(updated);
    StorageService.saveDailyAssessments(updated);

    // Show temporary success feedback
    setAssessmentSuccessMsg(prev => ({
      ...prev,
      [studentId]: 'Đã lưu đánh giá!'
    }));

    setTimeout(() => {
      setAssessmentSuccessMsg(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    }, 3000);
  };

  // Handle saving general comment
  const handleSaveComment = (studentId: string, rating: number, text: string) => {
    const updated = {
      ...commentsState,
      [studentId]: { rating, text }
    };
    setCommentsState(updated);
    StorageService.saveDailyComments(updated);

    setAssessmentSuccessMsg(prev => ({
      ...prev,
      [`comment_${studentId}`]: 'Đã đồng bộ!'
    }));

    setTimeout(() => {
      setAssessmentSuccessMsg(prev => {
        const copy = { ...prev };
        delete copy[`comment_${studentId}`];
        return copy;
      });
    }, 2500);
  };

  // Export monthly class assessments to CSV
  const handleExportMonthlyAssessments = (monthStr: string) => {
    if (!monthStr) return;
    const [year, month] = monthStr.split('-');
    const classId = classFilter;
    const className = classNamesMap[classId] || 'Lớp';

    const classStuds = students.filter(s => s.classId === classId);
    if (classStuds.length === 0) {
      alert(`Lớp ${className} hiện tại chưa có học sinh nào để xuất.`);
      return;
    }

    // Filter assessments for this classroom and month
    const classMonthAssessments = dailyAssessments.filter(a => {
      if (a.classId !== classId) return false;
      const aDate = new Date(a.date);
      return aDate.getFullYear() === parseInt(year) && (aDate.getMonth() + 1) === parseInt(month);
    });

    if (classMonthAssessments.length === 0) {
      alert(`Không có dữ liệu đánh giá nào trong tháng ${month}/${year} của lớp ${className} để xuất file.`);
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Vietnamese
    csvContent += `BÁO CÁO ĐÁNH GIÁ TÌNH TRẠNG TRẺ HẰNG NGÀY THÁNG ${month}/${year}\n`;
    csvContent += `Lớp: ${className}\n\n`;
    csvContent += "Mã học sinh,Họ và tên,Ngày đánh giá,Sức khỏe,Ăn uống,Ngủ trưa,Hoạt động,Vệ sinh,Ghi chú của giáo viên\n";

    classMonthAssessments.sort((a, b) => {
      if (a.studentName && b.studentName) {
        const nameComp = a.studentName.localeCompare(b.studentName);
        if (nameComp !== 0) return nameComp;
      }
      return a.date.localeCompare(b.date);
    });

    classMonthAssessments.forEach(a => {
      const student = classStuds.find(s => s.id === a.studentId);
      const studentCode = student ? student.studentCode : '';
      const escapedNotes = a.notes ? `"${a.notes.replace(/"/g, '""')}"` : '""';
      csvContent += `${studentCode},${a.studentName},${a.date},${a.healthStatus},${a.diningStatus},${a.sleepStatus},${a.activityStatus},${a.hygieneStatus},${escapedNotes}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_danh_gia_lop_${className.replace(/\s+/g, '_')}_thang_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter students based on classroom and search term
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = classFilter === 'all' || s.classId === classFilter;
      const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesClass && matchesSearch;
    });
  }, [students, classFilter, searchTerm]);

  // Theme support classes
  const getThemeFocusClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20';
      case 'violet': return 'focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';
      case 'rose': return 'focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20';
      case 'amber': return 'focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20';
      default: return 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20';
    }
  };

  const getThemeBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500';
      default: return 'bg-indigo-600 hover:bg-indigo-500';
    }
  };

  const getThemeTextClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-violet-600';
      case 'rose': return 'text-rose-600';
      case 'amber': return 'text-amber-600';
      default: return 'text-indigo-600';
    }
  };

  // If teacher has no classrooms, show warning message
  if (isTeacher && classrooms.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-xs max-w-lg mx-auto my-12">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Bạn chưa có lớp học nào</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          Phần Đánh giá trẻ hằng ngày yêu cầu bạn phải có lớp học quản lý trước. Vui lòng tạo lớp học tại mục "Quản lý lớp học".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & GENERAL CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Đánh Giá & Nhận Xét Trẻ Hằng Ngày <Award className={getThemeTextClass()} size={24} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Phân hệ quản lý chuyên sâu cho phép giáo viên đánh giá sức khỏe, dinh dưỡng và viết nhận xét cuối ngày cho học sinh.
          </p>
        </div>

        {/* Sub-tab selections inside toolbar component */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 self-start md:self-center">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'status'
                ? 'bg-white dark:bg-slate-750 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle size={14} />
            <span>Đánh giá chi tiết</span>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'comments'
                ? 'bg-white dark:bg-slate-750 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare size={14} />
            <span>Nhận xét cuối ngày</span>
          </button>
        </div>
      </div>

      {/* 2. FILTERS CONTAINER */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        {/* Class Select Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter size={11} /> Lớp Học
          </label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Date Picker */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar size={11} /> Ngày Đánh Giá
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Search Bar */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Search size={11} /> Tìm Kiếm
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Nhập tên học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Monthly Export File */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FileSpreadsheet size={11} /> Xuất Báo Cáo Tháng
          </label>
          <div className="flex gap-2">
            <input
              type="month"
              value={teacherExportMonth}
              onChange={(e) => setTeacherExportMonth(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={() => handleExportMonthlyAssessments(teacherExportMonth)}
              className={`px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer ${getThemeBgClass()}`}
            >
              <FileSpreadsheet size={13} />
              <span>Xuất file</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. CONTENT PANELS */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-2xl text-center shadow-xs">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search size={20} />
          </div>
          <p className="text-xs text-slate-400 font-bold">Không tìm thấy học sinh nào khớp với điều kiện lọc.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'status' ? (
            // A. DETAILED DAILY STATUS REPORT TAB
            <div className="space-y-4">
              {filteredStudents.map(student => {
                const assessment = dailyAssessments.find(
                  a => a.studentId === student.id && a.date === dateFilter
                );

                return (
                  <StudentAssessmentCard
                    key={student.id}
                    student={student}
                    date={dateFilter}
                    initialAssessment={assessment}
                    onSave={handleSaveAssessment}
                    successMsg={assessmentSuccessMsg[student.id]}
                    settings={settings}
                  />
                );
              })}
            </div>
          ) : (
            // B. COMPACT STAR RATING & COMMENTS REVIEW TAB
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => {
                const review = commentsState[student.id] || {
                  rating: 5,
                  text: 'Hôm nay bé hoạt động bình thường, ngoan ngoãn lắng nghe cô giảng bài.'
                };

                return (
                  <div
                    key={student.id}
                    className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl space-y-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatar || StorageService.getNewAvatar(student.fullName, student.fullName.charCodeAt(0))}
                          className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                          alt={student.fullName}
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white">{student.fullName}</h4>
                          <span className={`text-[9px] font-extrabold uppercase bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-100 dark:border-slate-700/40 text-slate-500`}>
                            Lớp {classNamesMap[student.classId]}
                          </span>
                        </div>
                      </div>
                      
                      {/* Star ratings */}
                      <div className="flex gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => {
                              const updatedReview = { ...review, rating: star };
                              setCommentsState(prev => ({ ...prev, [student.id]: updatedReview }));
                            }}
                            className="text-lg hover:scale-115 transition font-bold"
                          >
                            {star <= review.rating ? '★' : '☆'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={review.text}
                      onChange={(e) => {
                        const updatedReview = { ...review, text: e.target.value };
                        setCommentsState(prev => ({ ...prev, [student.id]: updatedReview }));
                      }}
                      className={`w-full p-3 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 outline-none transition ${getThemeFocusClass()}`}
                      rows={3}
                      placeholder="Viết nhận xét cuối ngày cho bé..."
                    />
                    
                    <div className="flex justify-between items-center text-[10px]">
                      {assessmentSuccessMsg[`comment_${student.id}`] ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold animate-pulse">
                          ✓ {assessmentSuccessMsg[`comment_${student.id}`]}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">● Tự động đồng bộ lên phụ huynh</span>
                      )}
                      <button
                        onClick={() => handleSaveComment(student.id, review.rating, review.text)}
                        className={`px-4 py-1.5 text-white rounded-lg font-bold text-xs cursor-pointer ${getThemeBgClass()}`}
                      >
                        Lưu Nhận Xét
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Private Student Assessment Card component inside file for clean layout
interface StudentAssessmentCardProps {
  key?: string;
  student: Student;
  date: string;
  initialAssessment?: DailyAssessment;
  onSave: (
    studentId: string,
    studentName: string,
    classId: string,
    healthStatus: any,
    diningStatus: any,
    sleepStatus: any,
    activityStatus: any,
    hygieneStatus: any,
    notes: string
  ) => void;
  successMsg?: string;
  settings: SchoolSettings;
}

function StudentAssessmentCard({
  student,
  date,
  initialAssessment,
  onSave,
  successMsg,
  settings,
}: StudentAssessmentCardProps) {
  const [healthStatus, setHealthStatus] = useState(initialAssessment?.healthStatus || 'Khỏe mạnh');
  const [diningStatus, setDiningStatus] = useState(initialAssessment?.diningStatus || 'Ăn ngoan/hết suất');
  const [sleepStatus, setSleepStatus] = useState(initialAssessment?.sleepStatus || 'Ngủ ngon/đủ giấc');
  const [activityStatus, setActivityStatus] = useState(initialAssessment?.activityStatus || 'Bình thường');
  const [hygieneStatus, setHygieneStatus] = useState(initialAssessment?.hygieneStatus || 'Bình thường');
  const [notes, setNotes] = useState(initialAssessment?.notes || '');

  // Keep in sync when initialAssessment or date changes
  useEffect(() => {
    setHealthStatus(initialAssessment?.healthStatus || 'Khỏe mạnh');
    setDiningStatus(initialAssessment?.diningStatus || 'Ăn ngoan/hết suất');
    setSleepStatus(initialAssessment?.sleepStatus || 'Ngủ ngon/đủ giấc');
    setActivityStatus(initialAssessment?.activityStatus || 'Bình thường');
    setHygieneStatus(initialAssessment?.hygieneStatus || 'Bình thường');
    setNotes(initialAssessment?.notes || '');
  }, [initialAssessment, date]);

  const handleSaveLocal = () => {
    onSave(
      student.id,
      student.fullName,
      student.classId,
      healthStatus,
      diningStatus,
      sleepStatus,
      activityStatus,
      hygieneStatus,
      notes
    );
  };

  const getThemeBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500';
      default: return 'bg-indigo-600 hover:bg-indigo-500';
    }
  };

  const getThemeFocusClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20';
      case 'violet': return 'focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20';
      case 'rose': return 'focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20';
      case 'amber': return 'focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20';
      default: return 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20';
    }
  };

  return (
    <div className="p-5 border border-slate-200/60 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 shadow-xs space-y-4 transition hover:shadow-md">
      {/* Student Profile Info */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
        <div className="flex items-center gap-3">
          <img
            src={student.avatar || StorageService.getNewAvatar(student.fullName, student.fullName.charCodeAt(0))}
            className="w-10 h-10 rounded-full object-cover"
            alt="Avatar"
          />
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-white">{student.fullName}</h4>
            <p className="text-[10px] text-slate-400 font-bold font-mono">Mã HS: {student.studentCode}</p>
          </div>
        </div>
        {successMsg && (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-100/30 animate-pulse">
            ✓ {successMsg}
          </span>
        )}
      </div>

      {/* Grid containing status selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {/* Sức khỏe */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>🏃</span> Sức khỏe
          </label>
          <select
            value={healthStatus}
            onChange={(e) => setHealthStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Khỏe mạnh', 'Bình thường', 'Mệt mỏi', 'Sốt', 'Ho'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Ăn uống */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>🍲</span> Ăn uống
          </label>
          <select
            value={diningStatus}
            onChange={(e) => setDiningStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Ăn ngoan/hết suất', 'Ăn một nửa', 'Ăn ít/biếng ăn', 'Bình thường'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Ngủ trưa */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>💤</span> Ngủ trưa
          </label>
          <select
            value={sleepStatus}
            onChange={(e) => setSleepStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Ngủ ngon/đủ giấc', 'Khó ngủ', 'Không ngủ', 'Bình thường'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Hoạt động */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>🌟</span> Hoạt động
          </label>
          <select
            value={activityStatus}
            onChange={(e) => setActivityStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Năng nổ', 'Bình thường', 'Mất tập trung'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Vệ sinh */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>🚽</span> Vệ sinh
          </label>
          <select
            value={hygieneStatus}
            onChange={(e) => setHygieneStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Bình thường', 'Táo bón', 'Tiêu chảy'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes Textarea and Save Button */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <div className="flex-1">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nhập ghi chú nhanh về sức khỏe hoặc sinh hoạt ngày hôm nay..."
            rows={1}
            className={`w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 outline-none resize-none placeholder:text-slate-400 font-medium ${getThemeFocusClass()}`}
          />
        </div>
        <button
          onClick={handleSaveLocal}
          className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition shrink-0 cursor-pointer flex items-center justify-center gap-1.5 h-fit self-end sm:self-auto ${getThemeBgClass()}`}
        >
          <Check size={14} />
          Lưu Đánh Giá
        </button>
      </div>
    </div>
  );
}
