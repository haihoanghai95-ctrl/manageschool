/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  AlertCircle,
  X,
  Check,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Coins,
  ClipboardCheck,
  Printer
} from 'lucide-react';
import { Classroom, Student, AttendanceRecord, SchoolSettings, AttendanceStatus, TeacherAccount } from '../types';

interface ClassroomsProps {
  classrooms: Classroom[];
  saveClassrooms: (classrooms: Classroom[]) => void;
  settings: SchoolSettings;
  students?: Student[];
  attendance?: AttendanceRecord[];
  saveAttendance?: (attendance: AttendanceRecord[]) => void;
  teachers?: TeacherAccount[];
  currentTeacherPhone?: string;
  allClassrooms?: Classroom[];
}

export default function Classrooms({ 
  classrooms, 
  saveClassrooms, 
  settings, 
  students = [], 
  attendance = [], 
  saveAttendance,
  teachers = [],
  currentTeacherPhone,
  allClassrooms = []
}: ClassroomsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Custom confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Form values
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTalentFee, setFormTalentFee] = useState('');
  const [formTalentSubjects, setFormTalentSubjects] = useState<{ id: string; name: string; fee: string; schedule?: string; timeSlot?: string; isMandatory?: boolean }[]>([]);
  const [formCoTeachers, setFormCoTeachers] = useState<string[]>([]);
  const [formPaymentBank, setFormPaymentBank] = useState('');
  const [formPaymentAccountNo, setFormPaymentAccountNo] = useState('');
  const [formPaymentAccountName, setFormPaymentAccountName] = useState('');
  const [formError, setFormError] = useState('');

  // Quick Attendance Dialog State
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<Classroom | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<string>('2026-07-08');
  const [tempStudentAttendances, setTempStudentAttendances] = useState<{ [studentId: string]: { status: AttendanceStatus; notes: string } }>({});
  const [attendanceSuccessMessage, setAttendanceSuccessMessage] = useState('');

  const handleOpenQuickAttendance = (cls: Classroom) => {
    setSelectedClassForAttendance(cls);
    setAttendanceSuccessMessage('');
    
    // Find all students in this class
    const classStudents = students.filter(s => s.classId === cls.id);
    
    // Default to today's date in local system time format
    const todayStr = '2026-07-08';
    setAttendanceDate(todayStr);

    // Populate current statuses from existing attendance list for today
    const currentDayRecordMap: { [studentId: string]: { status: AttendanceStatus; notes: string } } = {};
    
    classStudents.forEach(student => {
      const existing = attendance.find(a => a.studentId === student.id && a.date === todayStr);
      currentDayRecordMap[student.id] = {
        status: existing ? existing.status : 'present', // Default to present
        notes: existing ? existing.notes || '' : ''
      };
    });

    setTempStudentAttendances(currentDayRecordMap);
    setIsAttendanceDialogOpen(true);
  };

  const handleAttendanceDateChange = (newDate: string) => {
    setAttendanceDate(newDate);
    if (!selectedClassForAttendance) return;
    
    const classStudents = students.filter(s => s.classId === selectedClassForAttendance.id);
    const updatedRecordMap: { [studentId: string]: { status: AttendanceStatus; notes: string } } = {};
    
    classStudents.forEach(student => {
      const existing = attendance.find(a => a.studentId === student.id && a.date === newDate);
      updatedRecordMap[student.id] = {
        status: existing ? existing.status : 'present',
        notes: existing ? existing.notes || '' : ''
      };
    });
    setTempStudentAttendances(updatedRecordMap);
  };

  const handleSetAllStatus = (status: AttendanceStatus) => {
    const updated = { ...tempStudentAttendances };
    Object.keys(updated).forEach(studentId => {
      updated[studentId] = {
        ...updated[studentId],
        status
      };
    });
    setTempStudentAttendances(updated);
  };

  const handleSaveQuickAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForAttendance || !saveAttendance) return;

    const classStudents = students.filter(s => s.classId === selectedClassForAttendance.id);
    
    const newRecords: AttendanceRecord[] = classStudents.map(student => {
      const temp = tempStudentAttendances[student.id] || { status: 'present', notes: '' };
      const existing = attendance.find(a => a.studentId === student.id && a.date === attendanceDate);
      
      return {
        id: existing ? existing.id : `att_${student.id}_${attendanceDate}_${Date.now()}`,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        classId: selectedClassForAttendance.id,
        className: selectedClassForAttendance.name,
        date: attendanceDate,
        time: existing ? existing.time : '07:30:00',
        status: temp.status,
        notes: temp.notes || undefined,
        photoCaptured: existing ? existing.photoCaptured : undefined
      };
    });

    const classStudentIds = classStudents.map(s => s.id);
    const filteredAttendance = attendance.filter(a => !(classStudentIds.includes(a.studentId) && a.date === attendanceDate));
    const finalAttendance = [...newRecords, ...filteredAttendance];

    saveAttendance(finalAttendance);
    setAttendanceSuccessMessage('Đã cập nhật điểm danh cả lớp thành công!');
    setTimeout(() => {
      setIsAttendanceDialogOpen(false);
      setSelectedClassForAttendance(null);
    }, 1500);
  };

  // Search filter
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(
      c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classrooms, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredClassrooms.length / itemsPerPage) || 1;
  const paginatedClassrooms = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClassrooms.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClassrooms, currentPage]);

  const getThemeBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500';
      default: return 'bg-blue-600 hover:bg-blue-500';
    }
  };

  const getThemeTextClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-violet-600';
      case 'rose': return 'text-rose-600';
      case 'amber': return 'text-amber-600';
      default: return 'text-blue-600';
    }
  };

  const getThemeFocusClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'focus:ring-emerald-500 focus:border-emerald-500';
      case 'violet': return 'focus:ring-violet-500 focus:border-violet-500';
      case 'rose': return 'focus:ring-rose-500 focus:border-rose-500';
      case 'amber': return 'focus:ring-amber-500 focus:border-amber-500';
      default: return 'focus:ring-blue-500 focus:border-blue-500';
    }
  };

  const handleOpenAdd = () => {
    setDialogMode('add');
    setEditingId(null);
    setFormName('');
    setFormDesc('');
    setFormTalentFee('');
    setFormTalentSubjects([]);
    setFormCoTeachers([]);
    setFormPaymentBank('');
    setFormPaymentAccountNo('');
    setFormPaymentAccountName('');
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cls: Classroom) => {
    setDialogMode('edit');
    setEditingId(cls.id);
    setFormName(cls.name);
    setFormDesc(cls.description);
    setFormTalentFee(cls.talentFee !== undefined ? String(cls.talentFee) : '');
    if (cls.talentSubjects && cls.talentSubjects.length > 0) {
      setFormTalentSubjects(cls.talentSubjects.map(ts => ({ 
        id: ts.id, 
        name: ts.name, 
        fee: String(ts.fee), 
        schedule: ts.schedule || '', 
        timeSlot: ts.timeSlot || '',
        isMandatory: ts.isMandatory || false
      })));
    } else if (cls.talentFee !== undefined && cls.talentFee > 0) {
      setFormTalentSubjects([{ id: `ts_${Date.now()}`, name: 'Năng khiếu chung', fee: String(cls.talentFee), schedule: '', timeSlot: '', isMandatory: false }]);
    } else {
      setFormTalentSubjects([]);
    }
    setFormCoTeachers(cls.coTeachers || []);
    setFormPaymentBank(cls.paymentBank || '');
    setFormPaymentAccountNo(cls.paymentAccountNo || '');
    setFormPaymentAccountName(cls.paymentAccountName || '');
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Tên lớp học không được để trống.');
      return;
    }

    // Kiểm tra trùng tên lớp
    const isDuplicate = classrooms.some(
      c => c.name.toLowerCase() === formName.trim().toLowerCase() && c.id !== editingId
    );
    if (isDuplicate) {
      setFormError('Lớp học này đã tồn tại trong hệ thống.');
      return;
    }

    // Kiểm tra số lượng giáo viên tối thiểu 3 người (1 GV chủ nhiệm + tối thiểu 2 đồng GV)
    const creators = allClassrooms.map(c => c.createdBy).filter(Boolean);
    const otherAvailableTeachersCount = teachers.filter(
      t => t.phone !== currentTeacherPhone && !creators.includes(t.phone)
    ).length;
    if (otherAvailableTeachersCount >= 2 && formCoTeachers.length < 2) {
      setFormError('Lớp học này cần tối thiểu 3 giáo viên quản lý. Vui lòng phân công ít nhất 2 đồng giáo viên!');
      return;
    }

    // Parse talent subjects list
    const parsedTalentSubjects = formTalentSubjects
      .filter(ts => ts.name.trim() !== '')
      .map((ts, index) => ({
        id: ts.id.startsWith('temp_') || ts.id.startsWith('ts_') 
          ? `ts_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}` 
          : ts.id,
        name: ts.name.trim(),
        fee: parseInt(ts.fee.replace(/\D/g, '')) || 0,
        schedule: ts.schedule?.trim() || undefined,
        timeSlot: ts.timeSlot?.trim() || undefined,
        isMandatory: ts.isMandatory || false
      }));
    
    const parsedTalent = parsedTalentSubjects.length > 0 
      ? parsedTalentSubjects.reduce((sum, ts) => sum + ts.fee, 0)
      : (formTalentFee.trim() !== '' ? parseInt(formTalentFee.replace(/\D/g, '')) || 0 : undefined);

    if (dialogMode === 'add') {
      const newClass: Classroom = {
        id: `c_${Date.now()}`,
        name: formName.trim(),
        description: formDesc.trim(),
        studentCount: 0,
        talentFee: parsedTalent,
        talentSubjects: parsedTalentSubjects.length > 0 ? parsedTalentSubjects : undefined,
        coTeachers: formCoTeachers.length > 0 ? formCoTeachers : undefined,
        paymentBank: formPaymentBank.trim() || undefined,
        paymentAccountNo: formPaymentAccountNo.trim() || undefined,
        paymentAccountName: formPaymentAccountName.trim() || undefined,
      };
      saveClassrooms([...classrooms, newClass]);
    } else {
      const updated = classrooms.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            name: formName.trim(),
            description: formDesc.trim(),
            talentFee: parsedTalent,
            talentSubjects: parsedTalentSubjects.length > 0 ? parsedTalentSubjects : undefined,
            coTeachers: formCoTeachers.length > 0 ? formCoTeachers : undefined,
            paymentBank: formPaymentBank.trim() || undefined,
            paymentAccountNo: formPaymentAccountNo.trim() || undefined,
            paymentAccountName: formPaymentAccountName.trim() || undefined,
          };
        }
        return c;
      });
      saveClassrooms(updated);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setClassToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (classToDelete) {
      const filtered = classrooms.filter(c => c.id !== classToDelete.id);
      saveClassrooms(filtered);
      // Điều chỉnh lại phân trang nếu cần
      if (currentPage > Math.ceil(filtered.length / itemsPerPage) && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      setDeleteConfirmOpen(false);
      setClassToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Quản Lý Lớp Học <GraduationCap className={getThemeTextClass()} size={24} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Thêm mới, chỉnh sửa thông tin lớp, sắp xếp chương trình niên khóa của học sinh.
          </p>
        </div>
        
        {/* Actions Button */}
        <div className="flex items-center gap-2 no-print shrink-0">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm flex items-center gap-2 shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Printer size={18} />
            <span>In báo cáo</span>
          </button>
          
          <button
            onClick={handleOpenAdd}
            className={`px-4 py-2.5 text-white font-medium rounded-xl text-sm flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer ${getThemeBgClass()}`}
          >
            <Plus size={18} />
            <span>Thêm lớp học</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="no-print flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search size={18} />
          </span>
          <input
            id="classroom-search"
            type="text"
            placeholder="Tìm kiếm lớp học theo tên hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-1 text-sm text-slate-800 dark:text-slate-200 transition"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-750 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Dạng bảng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-750 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Dạng thẻ
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium shrink-0 self-start sm:self-center">
          Tìm thấy <strong className="text-slate-700 dark:text-slate-200">{filteredClassrooms.length}</strong> lớp học
        </div>
      </div>

      {/* Classrooms List */}
      {paginatedClassrooms.length > 0 ? (
        viewMode === 'table' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-4 px-5">Lớp học</th>
                    <th className="py-4 px-4 text-right text-amber-600 dark:text-amber-400">Danh sách môn Năng khiếu</th>
                    <th className="py-4 px-4 text-right font-extrabold text-slate-800 dark:text-slate-200">Tổng cộng</th>
                    <th className="py-4 px-4 text-center">Sĩ số</th>
                    <th className="py-4 px-5 text-right no-print">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {paginatedClassrooms.map((cls) => {
                    const total = cls.talentFee || 0;

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-5">
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{cls.name}</div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-normal">{cls.description}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {(() => {
                                const creator = teachers.find(t => t.phone === cls.createdBy);
                                const coTeacherNames = (cls.coTeachers || [])
                                  .map(phone => teachers.find(t => t.phone === phone)?.name)
                                  .filter(Boolean);
                                return (
                                  <>
                                    <span className="text-[9px] bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                                      GV: {creator?.name || 'Admin'}
                                    </span>
                                    {coTeacherNames.map((name, i) => (
                                      <span key={i} className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold px-1.5 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-900/30">
                                        Đồng GV: {name}
                                      </span>
                                    ))}
                                    {coTeacherNames.length === 0 && (
                                      <span className="text-[9px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded-md">
                                        Cần thêm đồng GV (tối thiểu 3 GV)
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right text-amber-600 dark:text-amber-400">
                          {cls.talentSubjects && cls.talentSubjects.length > 0 ? (
                            <div className="space-y-1 text-right">
                              {cls.talentSubjects.map(ts => (
                                <div key={ts.id} className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{ts.name}</span>: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{ts.fee.toLocaleString('vi-VN')} đ</span>
                                  {(ts.schedule || ts.timeSlot) && (
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block italic">
                                      ({[ts.schedule, ts.timeSlot].filter(Boolean).join(' | ')})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            cls.talentFee !== undefined ? <span className="font-mono">{cls.talentFee.toLocaleString('vi-VN')} đ</span> : 'Miễn phí'
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                          {total.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">
                            {cls.studentCount || 0}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right no-print">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenQuickAttendance(cls)}
                              className="p-2 rounded-xl text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition cursor-pointer flex items-center gap-1"
                              title="Điểm danh thủ công nhanh"
                            >
                              <ClipboardCheck size={14} />
                              <span className="text-[11px] font-bold">Điểm danh nhanh</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(cls)}
                              className="p-2 rounded-xl text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(cls.id, cls.name)}
                              className="p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Vertical Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedClassrooms.map((cls) => {
                const total = cls.talentFee || 0;

                return (
                  <div key={cls.id} className="p-4.5 space-y-4 bg-white dark:bg-slate-900">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 pr-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cls.name}</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal font-normal">{cls.description || 'Không có mô tả chi tiết cho lớp học này.'}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {(() => {
                            const creator = teachers.find(t => t.phone === cls.createdBy);
                            const coTeacherNames = (cls.coTeachers || [])
                              .map(phone => teachers.find(t => t.phone === phone)?.name)
                              .filter(Boolean);
                            return (
                              <>
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md">
                                  GV: {creator?.name || 'Admin'}
                                </span>
                                {coTeacherNames.map((name, i) => (
                                  <span key={i} className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-md">
                                    Đồng GV: {name}
                                  </span>
                                ))}
                                {coTeacherNames.length === 0 && (
                                  <span className="text-[9px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-md">
                                    Cần thêm đồng GV (tối thiểu 3 GV)
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 shrink-0 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 font-bold">
                        Sĩ số: {cls.studentCount || 0}
                      </span>
                    </div>

                    {/* Talent subjects list detail inside a box */}
                    <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-2.5">
                      <div className="flex justify-between items-center border-b border-slate-200/40 dark:border-slate-800/50 pb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Môn Học Năng Khiếu</span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <span>Tổng HP:</span>
                          <span className="font-mono font-extrabold">{total.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>

                      {cls.talentSubjects && cls.talentSubjects.length > 0 ? (
                        <div className="space-y-2">
                          {cls.talentSubjects.map(ts => (
                            <div key={ts.id} className="bg-white/70 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100/60 dark:border-slate-800/40 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{ts.name}</span>
                                <span className="font-mono text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">{ts.fee.toLocaleString('vi-VN')} đ</span>
                              </div>
                              {(ts.schedule || ts.timeSlot) && (
                                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-slate-400 dark:text-slate-500 italic pl-0.5 font-medium">
                                  {ts.schedule && <span className="flex items-center gap-0.5">📅 {ts.schedule}</span>}
                                  {ts.timeSlot && <span className="flex items-center gap-0.5">⏰ {ts.timeSlot}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-1 font-normal">
                          {cls.talentFee !== undefined ? `Chung: ${cls.talentFee.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                        </div>
                      )}
                    </div>

                    {/* Quick mobile action row */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/40 no-print">
                      <button
                        onClick={() => handleOpenQuickAttendance(cls)}
                        className="flex-1 min-w-[80px] py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <ClipboardCheck size={13} />
                        <span>Điểm danh</span>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(cls)}
                        className="flex-1 min-w-[80px] py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit size={13} />
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id, cls.name)}
                        className="flex-1 min-w-[80px] py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedClassrooms.map((cls) => {
              const total = cls.talentFee || 0;

              return (
                <div
                  key={cls.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Title & Icon */}
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl ${getThemeTextClass()} bg-slate-100 dark:bg-slate-800/80`}>
                        <GraduationCap size={22} />
                      </div>
                      
                      {/* Action Dropdown/Buttons on hover */}
                      <div className="flex items-center gap-1.5 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(cls)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition cursor-pointer"
                          title="Chỉnh sửa lớp"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(cls.id, cls.name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                          title="Xóa lớp"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                        {cls.description || 'Không có mô tả chi tiết cho lớp học này.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {(() => {
                          const creator = teachers.find(t => t.phone === cls.createdBy);
                          const coTeacherNames = (cls.coTeachers || [])
                            .map(phone => teachers.find(t => t.phone === phone)?.name)
                            .filter(Boolean);
                          return (
                            <>
                              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md">
                                GV: {creator?.name || 'Admin'}
                              </span>
                              {coTeacherNames.map((name, i) => (
                                <span key={i} className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-md">
                                  Đồng GV: {name}
                                </span>
                              ))}
                              {coTeacherNames.length === 0 && (
                                <span className="text-[9px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-md">
                                  Cần thêm đồng GV (tối thiểu 3 GV)
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Detailed Info Grid inside card */}
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 text-xs border border-slate-100/50 dark:border-slate-800/50">
                      <div className="flex flex-col border-b border-slate-100/50 dark:border-slate-800/50 pb-1.5 gap-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium text-amber-600 dark:text-amber-400">Học phí năng khiếu:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {cls.talentFee !== undefined ? `${cls.talentFee.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                          </span>
                        </div>
                        {cls.talentSubjects && cls.talentSubjects.length > 0 && (
                          <div className="mt-1.5 space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-normal normal-case pl-1">
                            {cls.talentSubjects.map(ts => (
                              <div key={ts.id} className="bg-amber-500/5 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-500/10 space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{ts.name}</span>
                                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">{ts.fee.toLocaleString('vi-VN')} đ</span>
                                </div>
                                {(ts.schedule || ts.timeSlot) && (
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-slate-400 dark:text-slate-500 italic pl-0.5 font-medium">
                                    {ts.schedule && <span className="flex items-center gap-0.5">📅 {ts.schedule}</span>}
                                    {ts.timeSlot && <span className="flex items-center gap-0.5">⏰ {ts.timeSlot}</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between pt-1.5 font-bold">
                        <span className="text-slate-800 dark:text-white">Tổng cộng:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                          {total.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Student Count Stats Badge & Quick Attendance Action */}
                  <div className="mt-5 pt-3.5 border-t border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                      <Users size={16} />
                      <span>Sĩ số: {cls.studentCount || 0} học sinh</span>
                    </div>
                    <button
                      onClick={() => handleOpenQuickAttendance(cls)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer self-start sm:self-center"
                    >
                      <ClipboardCheck size={13} />
                      <span>Điểm danh nhanh</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <GraduationCap size={48} className="text-slate-300 stroke-1" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Không tìm thấy lớp học nào</h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Hãy điều chỉnh lại từ khóa tìm kiếm hoặc bấm nút "Thêm lớp học" phía trên để tạo lớp học mới.
          </p>
          <button
            onClick={handleOpenAdd}
            className={`px-3 py-1.5 text-xs text-white font-medium rounded-lg cursor-pointer ${getThemeBgClass()}`}
          >
            Tạo lớp đầu tiên
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="no-print flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400">
            Trang {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmOpen && classToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setDeleteConfirmOpen(false)} />
          
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setDeleteConfirmOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertCircle size={24} />
              <h2 className="text-lg font-bold">Xác nhận xóa lớp học</h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa lớp học <strong className="text-slate-900 dark:text-white">"{classToDelete.name}"</strong>? Học sinh thuộc lớp này sẽ hiển thị là "Chưa xếp lớp".
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Modal Add/Edit */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsDialogOpen(false)} />

          {/* Dialog Card */}
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white mb-2">
              <GraduationCap className={getThemeTextClass()} size={22} />
              {dialogMode === 'add' ? 'Thêm Lớp Học Mới' : 'Cập Nhật Lớp Học'}
            </h2>
            <p className="text-xs text-slate-400 mb-4 leading-normal">
              Vui lòng điền tên và mô tả chi tiết cho lớp học. Dữ liệu sẽ được lưu cục bộ trong hệ thống.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <div>
                <label className="block mb-1.5 ml-0.5">Tên lớp học <span className="text-rose-500">*</span></label>
                <input
                  id="class-name-input"
                  type="text"
                  placeholder="Ví dụ: Lớp 12A1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 ml-0.5">Mô tả niên khóa / Ghi chú</label>
                <textarea
                  id="class-desc-input"
                  placeholder="Ví dụ: Khóa học 2023 - 2026 | Khối Toán tin chuyên sâu"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none transition resize-none"
                />
              </div>

              {/* Dynamic Talent Subjects List */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 dark:text-white font-bold ml-0.5">Danh sách môn năng khiếu</label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormTalentSubjects([
                        ...formTalentSubjects,
                        { id: `temp_${Date.now()}_${Math.random()}`, name: '', fee: '', schedule: '', timeSlot: '' }
                      ]);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all cursor-pointer ${getThemeBgClass()}`}
                  >
                    <Plus size={12} /> Thêm môn
                  </button>
                </div>

                {formTalentSubjects.length > 0 ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {formTalentSubjects.map((ts, idx) => (
                      <div key={ts.id} className="space-y-2 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Tên môn (ví dụ: Đàn Piano)"
                              value={ts.name}
                              onChange={(e) => {
                                const updated = [...formTalentSubjects];
                                updated[idx].name = e.target.value;
                                setFormTalentSubjects(updated);
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700/60 rounded-lg bg-white dark:bg-slate-800 text-xs font-normal text-slate-800 dark:text-slate-100 outline-none transition"
                            />
                          </div>
                          <div className="w-28 shrink-0">
                            <input
                              type="text"
                              placeholder="Học phí"
                              value={ts.fee ? Number(ts.fee.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                const updated = [...formTalentSubjects];
                                updated[idx].fee = val;
                                setFormTalentSubjects(updated);
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700/60 rounded-lg bg-white dark:bg-slate-800 text-xs font-normal text-slate-800 dark:text-slate-100 outline-none transition font-mono"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormTalentSubjects(formTalentSubjects.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition shrink-0 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        {/* New fields for schedule and timeSlot */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              placeholder="Lịch học (VD: Thứ Hai, Thứ Tư)"
                              value={ts.schedule || ''}
                              onChange={(e) => {
                                const updated = [...formTalentSubjects];
                                updated[idx].schedule = e.target.value;
                                setFormTalentSubjects(updated);
                              }}
                              className="w-full px-2.5 py-1 border border-slate-200 dark:border-slate-700/60 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-normal text-slate-800 dark:text-slate-100 outline-none transition normal-case"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Giờ học (VD: 16:30 - 17:30)"
                              value={ts.timeSlot || ''}
                              onChange={(e) => {
                                const updated = [...formTalentSubjects];
                                updated[idx].timeSlot = e.target.value;
                                setFormTalentSubjects(updated);
                              }}
                              className="w-full px-2.5 py-1 border border-slate-200 dark:border-slate-700/60 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-normal text-slate-800 dark:text-slate-100 outline-none transition normal-case"
                            />
                          </div>
                        </div>

                        {/* Checkbox for mandatory subject */}
                        <div className="flex items-center gap-2 mt-1 select-none">
                          <input
                            type="checkbox"
                            id={`mandatory-${ts.id}-${idx}`}
                            checked={ts.isMandatory || false}
                            onChange={(e) => {
                              const updated = [...formTalentSubjects];
                              updated[idx].isMandatory = e.target.checked;
                              setFormTalentSubjects(updated);
                            }}
                            className="rounded border-slate-200 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <label htmlFor={`mandatory-${ts.id}-${idx}`} className="text-[10px] text-slate-500 dark:text-slate-400 font-bold select-none cursor-pointer normal-case">
                            Môn học bắt buộc học (Học sinh trong lớp mặc định học)
                          </label>
                        </div>

                        {ts.fee && (
                          <div className="text-right text-[9px] text-amber-600 dark:text-amber-400 font-bold block normal-case mt-0.5">
                            Học phí: {Number(ts.fee).toLocaleString('vi-VN')} đ
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Sum display */}
                    {formTalentSubjects.some(ts => ts.fee) && (
                      <div className="text-right text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono normal-case">
                        Tổng học phí năng khiếu: {
                          formTalentSubjects
                            .reduce((sum, ts) => sum + (parseInt(ts.fee) || 0), 0)
                            .toLocaleString('vi-VN')
                        } đ
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-normal normal-case">
                    Chưa có môn năng khiếu nào. Click "Thêm môn" để tạo mới.
                  </div>
                )}
              </div>

              {/* Co-Teachers (Đồng giáo viên) */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3">
                <div>
                  <label className="block text-slate-800 dark:text-white font-bold ml-0.5 mb-1 flex items-center gap-1.5">
                    <span>Đồng giáo viên</span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold px-1.5 py-0.5 rounded-md">
                      Yêu cầu tối thiểu 3 GV/lớp
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-400 font-normal leading-relaxed mb-3 normal-case">
                    Để đảm bảo quy chuẩn giảng dạy, mỗi lớp học cần được quản lý bởi ít nhất 3 giáo viên (1 giáo viên chủ nhiệm và tối thiểu 2 đồng giáo viên).
                  </p>
                </div>

                {/* List of currently selected co-teachers */}
                {formCoTeachers.length > 0 ? (
                  <div className="space-y-2">
                    {formCoTeachers.map((phone, idx) => {
                      const tInfo = teachers.find(t => t.phone === phone);
                      return (
                        <div key={phone} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                              {(tInfo?.name || 'GV').charAt(0)}
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-bold text-slate-800 dark:text-white">
                                {tInfo?.name || 'Giáo viên ẩn danh'}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono font-normal">
                                SĐT: {phone}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormCoTeachers(formCoTeachers.filter(p => p !== phone));
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition shrink-0 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-normal normal-case">
                    Chưa phân công đồng giáo viên nào cho lớp này.
                  </div>
                )}

                {/* Add co-teacher dropdown select */}
                {(() => {
                  const creators = allClassrooms.map(c => c.createdBy).filter(Boolean);
                  const availableTeachers = teachers.filter(
                    t => t.phone !== currentTeacherPhone && 
                         !formCoTeachers.includes(t.phone) &&
                         !creators.includes(t.phone)
                  );

                  if (availableTeachers.length > 0) {
                    return (
                      <div className="flex gap-2 items-center">
                        <select
                          id="select-co-teacher"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setFormCoTeachers([...formCoTeachers, val]);
                              e.target.value = ''; // Reset select
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700/60 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-normal text-slate-800 dark:text-slate-100 outline-none transition"
                        >
                          <option value="">-- Chọn giáo viên đồng quản lý --</option>
                          {availableTeachers.map(t => (
                            <option key={t.phone} value={t.phone}>
                              {t.name} ({t.phone} - {t.position || 'Giáo viên'})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  } else {
                    return (
                      <p className="text-[9px] text-amber-500 dark:text-amber-400 font-normal italic leading-relaxed normal-case text-center">
                        Không còn giáo viên khả dụng khác trong hệ thống để chọn làm đồng giáo viên. Hãy tạo thêm giáo viên tại mục "Giáo Viên".
                      </p>
                    );
                  }
                })()}

                {/* Warning message if count is less than 2 co-teachers */}
                {formCoTeachers.length < 2 && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] rounded-lg flex items-center gap-1.5 font-semibold normal-case leading-normal">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>
                      Khuyên dùng: Phân công thêm {2 - formCoTeachers.length} đồng giáo viên nữa để đạt tối thiểu 3 giáo viên/lớp theo yêu cầu của trường.
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Bank Account Settings */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3">
                <label className="block text-slate-800 dark:text-white font-bold ml-0.5">Thông tin nhận học phí năng khiếu tại lớp</label>
                <p className="text-[10px] text-slate-400 font-normal leading-relaxed normal-case">
                  Nhập tài khoản ngân hàng của giáo viên lớp để phụ huynh có thể chuyển khoản trực tiếp học phí năng khiếu.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-0.5 uppercase">Tên Ngân Hàng</label>
                    <input
                      type="text"
                      placeholder="VD: Vietcombank"
                      value={formPaymentBank}
                      onChange={(e) => setFormPaymentBank(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/60 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-normal text-slate-800 dark:text-slate-100 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-0.5 uppercase">Số Tài Khoản</label>
                    <input
                      type="text"
                      placeholder="VD: 1023456789"
                      value={formPaymentAccountNo}
                      onChange={(e) => setFormPaymentAccountNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/60 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-normal text-slate-800 dark:text-slate-100 outline-none transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-0.5 uppercase">Tên Chủ Tài Khoản</label>
                    <input
                      type="text"
                      placeholder="VD: NGUYEN VAN A"
                      value={formPaymentAccountName}
                      onChange={(e) => setFormPaymentAccountName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/60 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-normal text-slate-800 dark:text-slate-100 outline-none transition uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  id="class-save-submit"
                  type="submit"
                  className={`flex-1 py-2.5 text-white font-medium rounded-xl text-xs uppercase shadow-md transition cursor-pointer ${getThemeBgClass()}`}
                >
                  {dialogMode === 'add' ? 'Tạo lớp' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAttendanceDialogOpen && selectedClassForAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsAttendanceDialogOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative z-10 animate-scale-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAttendanceDialogOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white mb-2">
              <ClipboardCheck className="text-emerald-500" size={22} />
              Điểm Danh Thủ Công Nhanh: {selectedClassForAttendance.name}
            </h2>
            <p className="text-xs text-slate-400 mb-4 leading-normal font-normal">
              Đặt nhanh trạng thái điểm danh cho cả lớp cùng lúc hoặc điều chỉnh chi tiết cho từng học sinh.
            </p>

            {attendanceSuccessMessage ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2 mb-4 animate-pulse">
                <Check size={16} />
                <span className="font-bold">{attendanceSuccessMessage}</span>
              </div>
            ) : null}

            <form onSubmit={handleSaveQuickAttendance} className="space-y-5">
              {/* Top controls: Date and Bulk Select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-0.5">
                    Ngày điểm danh
                  </label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => handleAttendanceDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none transition cursor-pointer"
                    required
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-0.5">
                    Tích chọn nhanh cả lớp
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('present')}
                      className="py-2 text-[10px] sm:text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-xl transition cursor-pointer"
                    >
                      ✓ Đi đúng giờ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('late')}
                      className="py-2 text-[10px] sm:text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900 rounded-xl transition cursor-pointer"
                    >
                      ⚠ Đi muộn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('absent')}
                      className="py-2 text-[10px] sm:text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900 rounded-xl transition cursor-pointer"
                    >
                      ✗ Vắng mặt
                    </button>
                  </div>
                </div>
              </div>

              {/* Student List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-1">
                  <span>Học sinh ({students.filter(s => s.classId === selectedClassForAttendance.id).length})</span>
                  <span>Trạng thái & Ghi chú</span>
                </div>

                <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl pr-1 bg-white dark:bg-slate-900">
                  {students.filter(s => s.classId === selectedClassForAttendance.id).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-normal normal-case">
                      Lớp này chưa có học sinh nào. Vui lòng thêm học sinh ở mục Học viên.
                    </div>
                  ) : (
                    students
                      .filter(s => s.classId === selectedClassForAttendance.id)
                      .map((student) => {
                        const tempState = tempStudentAttendances[student.id] || { status: 'present', notes: '' };
                        return (
                          <div key={student.id} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-700 dark:text-slate-300">
                            <div className="text-left">
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {student.fullName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 font-normal">
                                MS: {student.studentCode}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              {/* Option Selectors */}
                              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempStudentAttendances(prev => ({
                                      ...prev,
                                      [student.id]: { ...tempState, status: 'present' }
                                    }));
                                  }}
                                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${
                                    tempState.status === 'present'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                                  }`}
                                >
                                  Đúng giờ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempStudentAttendances(prev => ({
                                      ...prev,
                                      [student.id]: { ...tempState, status: 'late' }
                                    }));
                                  }}
                                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${
                                    tempState.status === 'late'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                                  }`}
                                >
                                  Muộn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempStudentAttendances(prev => ({
                                      ...prev,
                                      [student.id]: { ...tempState, status: 'absent' }
                                    }));
                                  }}
                                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${
                                    tempState.status === 'absent'
                                      ? 'bg-rose-500 text-white shadow-xs'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                                  }`}
                                >
                                  Vắng
                                </button>
                              </div>

                              {/* Note Input */}
                              <input
                                type="text"
                                placeholder="Ghi chú (ốm, phép...)"
                                value={tempState.notes}
                                onChange={(e) => {
                                  setTempStudentAttendances(prev => ({
                                    ...prev,
                                    [student.id]: { ...tempState, notes: e.target.value }
                                  }));
                                }}
                                className="px-2.5 py-1.5 text-xs text-black border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 outline-none transition w-full sm:w-44 font-normal"
                              />
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAttendanceDialogOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={students.filter(s => s.classId === selectedClassForAttendance.id).length === 0}
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs uppercase shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getThemeBgClass()}`}
                >
                  Lưu điểm danh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
