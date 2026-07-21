/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  Edit,
  Printer,
  AlertCircle,
  FileText,
  CheckCircle,
  X,
  User,
  Users,
  Search,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { NoonSupervisionShift, TeacherAccount, SchoolSettings, Classroom, UserSession } from '../types';
import { StorageService } from '../utils/storage';

export interface SupervisionTemplate {
  id: string;
  title: string;
  description: string;
  shiftName: string;
  teachersType: 'all' | 'main' | 'co';
  notes: string;
}

export const SUPERVISION_TEMPLATES: SupervisionTemplate[] = [
  {
    id: 'standard',
    title: 'Biểu mẫu tiêu chuẩn (Toàn bộ GV)',
    description: 'Ăn uống đầy đủ, ngủ ngoan đúng giờ, phòng thoáng mát.',
    shiftName: 'Ca trực trưa tiêu chuẩn (11h30 - 14h00)',
    teachersType: 'all',
    notes: 'Phòng ngủ của lớp sạch sẽ, thoáng mát (nhiệt độ duy trì mức 26 độ C phù hợp). Toàn bộ học sinh ăn hết suất ăn trưa dinh dưỡng, vệ sinh cá nhân trước khi đi ngủ và vào giấc đúng giờ. Lớp ngủ ngoan, phòng yên tĩnh tuyệt đối, không có bé nào quấy khóc hay có biểu hiện bất thường về sức khỏe.'
  },
  {
    id: 'shift_1_main',
    title: 'Ca I: Ăn trưa & Đón giấc (GV Chủ nhiệm)',
    description: 'Ca đầu giờ trưa dành cho GV chủ nhiệm chăm lo ăn uống, vệ sinh và dỗ giấc ngủ.',
    shiftName: 'Ca I (11h30 - 12h45)',
    teachersType: 'main',
    notes: 'Tổ chức cho các con ăn trưa đầy đủ dinh dưỡng, động viên các bé ăn hết khẩu phần. Hướng dẫn các bé vệ sinh răng miệng cá nhân sạch sẽ trước khi đi ngủ. Các bé đã được dỗ ngủ ổn định, không khí phòng ngủ yên tĩnh, ánh sáng dịu nhẹ giúp toàn bộ học sinh dễ dàng vào giấc ngủ sâu.'
  },
  {
    id: 'shift_2_co',
    title: 'Ca II: Trông giấc & Thức giấc (GV Đồng dạy)',
    description: 'Ca cuối giờ trưa trông giấc ngủ, đo nhiệt độ và đánh thức học sinh.',
    shiftName: 'Ca II (12h45 - 14h00)',
    teachersType: 'co',
    notes: 'Trông giấc ngủ của các con tuyệt đối an toàn suốt ca trực. Đúng giờ quy định đánh thức các con nhẹ nhàng, hướng dẫn các con vệ sinh cá nhân sau khi thức dậy, cho uống nước ấm đầy đủ và hướng dẫn các con tự giác xếp chăn gối, nệm ngủ ngăn nắp gọn gàng. Sức khỏe các bé hoàn toàn bình thường.'
  },
  {
    id: 'care_medication',
    title: 'Trực đặc biệt: Có học sinh uống thuốc/Chăm sóc',
    description: 'Lớp ngủ ngoan, có học sinh ho nhẹ được giáo viên chăm sóc uống thuốc theo yêu cầu.',
    shiftName: 'Ca trực trưa đặc biệt (11h30 - 14h00)',
    teachersType: 'all',
    notes: 'Tình hình lớp ngủ ngoan ổn định, phòng ngủ sạch mát. Có học sinh ho nhẹ đã được giáo viên trực cho uống thuốc đúng liều lượng theo dặn dò chi tiết của phụ huynh gửi trên ứng dụng, giáo viên thường xuyên đo thân nhiệt cơ thể định kỳ bình thường (36.5 độ C). Các bé khác ngủ sâu giấc bình thường.'
  }
];

interface NoonSupervisionProps {
  settings: SchoolSettings;
  teachers: TeacherAccount[];
  session?: UserSession | null;
}

export default function NoonSupervision({ settings, teachers: initialTeachers, session }: NoonSupervisionProps) {
  const [shifts, setShifts] = useState<NoonSupervisionShift[]>([]);
  const [teachersList, setTeachersList] = useState<TeacherAccount[]>([]);
  const [classroomsList, setClassroomsList] = useState<Classroom[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('2026-07'); // Default to simulated month
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  
  // Form fields
  const [date, setDate] = useState('2026-07-14');
  const [shiftName, setShiftName] = useState('Ca trực trưa');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [customTeacher, setCustomTeacher] = useState('');
  
  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Validation state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Load initial shifts
    const loadedShifts = StorageService.getNoonSupervisionShifts();
    setShifts(loadedShifts);
    
    // Load school teachers
    const loadedTeachers = StorageService.getTeachers();
    setTeachersList(loadedTeachers);

    // Load classrooms
    const loadedClassrooms = StorageService.getClassrooms();
    setClassroomsList(loadedClassrooms);
  }, []);

  // Find classrooms assigned to this teacher / creator
  const myClassrooms = classroomsList.filter(c => {
    if (!session?.isTeacher) return true; // admins see all
    return c.createdBy === session.teacherPhone || c.coTeachers?.includes(session.teacherPhone!);
  });
  const myClassroomIds = myClassrooms.map(c => c.id);

  // Filter shifts based on selected month and search term
  const filteredShifts = shifts.filter(shift => {
    // If logged in user is a teacher, restrict to their class
    if (session?.isTeacher) {
      if (shift.classId) {
        if (!myClassroomIds.includes(shift.classId)) return false;
      } else {
        // Fallback: match by teacher name if classId is absent
        const isMyShift = session.teacherName ? shift.teachers.includes(session.teacherName) : false;
        if (!isMyShift) return false;
      }
    }

    const shiftMonth = shift.date.substring(0, 7);
    const matchesMonth = shiftMonth === selectedMonth;
    
    const teacherNamesCombined = shift.teachers.join(' ').toLowerCase();
    const notesCombined = (shift.notes || '').toLowerCase();
    const nameCombined = shift.shiftName.toLowerCase();
    const classCombined = (shift.className || '').toLowerCase();
    const dateStr = shift.date.toLowerCase();
    const query = searchTerm.toLowerCase();
    
    const matchesSearch = !searchTerm || 
      teacherNamesCombined.includes(query) || 
      notesCombined.includes(query) || 
      nameCombined.includes(query) ||
      classCombined.includes(query) ||
      dateStr.includes(query);

    return matchesMonth && matchesSearch;
  });

  const getThemeColorClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'violet': return 'bg-violet-600 hover:bg-violet-700 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-700 text-white';
      default: return 'bg-indigo-600 hover:bg-indigo-700 text-white';
    }
  };

  const getThemeTextClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-600 dark:text-emerald-400';
      case 'violet': return 'text-violet-600 dark:text-violet-400';
      case 'rose': return 'text-rose-600 dark:text-rose-400';
      case 'amber': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-indigo-600 dark:text-indigo-400';
    }
  };

  const handleOpenAddModal = () => {
    setEditingShiftId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setShiftName('Ca trực trưa');
    setNotes('');
    setCustomTeacher('');
    setErrorMsg('');

    if (session?.isTeacher) {
      const myClasses = classroomsList.filter(c => c.createdBy === session.teacherPhone || c.coTeachers?.includes(session.teacherPhone!));
      if (myClasses.length > 0) {
        setSelectedClassId(myClasses[0].id);
        setSelectedClassName(myClasses[0].name);
        
        // Auto-select ONLY the current logged-in teacher for the shift
        if (session.teacherName) {
          setSelectedTeachers([session.teacherName]);
        } else {
          setSelectedTeachers([]);
        }
      } else {
        setSelectedClassId('');
        setSelectedClassName('');
        setSelectedTeachers([]);
      }
    } else {
      setSelectedClassId('');
      setSelectedClassName('');
      setSelectedTeachers([]);
    }

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (shift: NoonSupervisionShift) => {
    setEditingShiftId(shift.id);
    setDate(shift.date);
    setShiftName(shift.shiftName);
    setSelectedClassId(shift.classId || '');
    setSelectedClassName(shift.className || '');
    setSelectedTeachers(shift.teachers);
    setNotes(shift.notes || '');
    setCustomTeacher('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const getClassTeachers = (classId: string): TeacherAccount[] => {
    const targetClass = classroomsList.find(c => c.id === classId);
    if (!targetClass) return [];
    const list: TeacherAccount[] = [];
    const mainT = teachersList.find(t => t.phone === targetClass.createdBy);
    if (mainT) list.push(mainT);
    (targetClass.coTeachers || []).forEach(phone => {
      const coT = teachersList.find(t => t.phone === phone);
      if (coT && !list.some(t => t.phone === coT.phone)) list.push(coT);
    });
    return list;
  };

  const handleAutoAssignShifts = () => {
    const targetClass = classroomsList.find(c => c.id === selectedClassId);
    if (!targetClass) return;
    
    const classTeachers = getClassTeachers(selectedClassId);
    if (classTeachers.length === 0) {
      setErrorMsg('Lớp học này chưa có giáo viên phụ trách.');
      return;
    }

    // Determine shift hours based on number of teachers (evenly dividing 11h30 - 14h00)
    const numTeachers = classTeachers.length;
    const shiftNames: string[] = [];
    const startTotalMinutes = 11 * 60 + 30; // 11h30 (690 mins)
    const totalDuration = 150; // 11h30 to 14h00 (150 mins)
    const durationPerTeacher = Math.floor(totalDuration / numTeachers);

    const formatTime = (totalMinutes: number) => {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${hours}h${mins === 0 ? '00' : mins}`;
    };

    for (let i = 0; i < numTeachers; i++) {
      const startMins = startTotalMinutes + i * durationPerTeacher;
      const endMins = (i === numTeachers - 1) ? (startTotalMinutes + totalDuration) : (startMins + durationPerTeacher);
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
      const label = numTeachers === 1 ? 'Ca trực trưa' : `Ca ${romanNumerals[i] || (i + 1)}`;
      shiftNames.push(`${label} (${formatTime(startMins)} - ${formatTime(endMins)})`);
    }

    const generatedShifts: NoonSupervisionShift[] = classTeachers.map((teacher, index) => {
      const sName = shiftNames[index] || `Ca ${index + 1} (Phân chia tự động)`;
      return {
        id: 'sh_' + Date.now() + '_' + index,
        date,
        shiftName: sName,
        teachers: [teacher.name],
        notes: `Trực trưa lớp ${targetClass.name}. Tình hình lớp ngủ ngoan, không có bé nào quấy khóc hay sốt.`,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        classId: selectedClassId,
        className: targetClass.name
      };
    });

    const updatedShifts = [...shifts];
    generatedShifts.forEach(ns => {
      updatedShifts.unshift(ns);
    });

    setShifts(updatedShifts);
    StorageService.saveNoonSupervisionShifts(updatedShifts);
    setIsModalOpen(false);
    showTemporarySuccess(`Đã tự động chia ${generatedShifts.length} ca trực riêng biệt cho các giáo viên của lớp ${targetClass.name} vào ngày ${date}.`);
  };

  const handleApplyTemplate = (template: SupervisionTemplate) => {
    if (!selectedClassId) {
      setErrorMsg('Vui lòng chọn lớp học được trực trước khi áp dụng mẫu biểu mẫu.');
      return;
    }

    const targetClass = classroomsList.find(c => c.id === selectedClassId);
    if (!targetClass) return;

    // Prefill:
    // 1. Time / Date is kept as is, but custom shiftName carries time range
    setShiftName(template.shiftName);

    // 2. Teachers selection according to template rules
    const classTeachers = getClassTeachers(selectedClassId);
    let teacherNames: string[] = [];

    if (template.teachersType === 'all') {
      // Pick current logged-in teacher if they are in this class, otherwise the main teacher
      if (session?.isTeacher && session?.teacherName && classTeachers.some(t => t.name === session.teacherName)) {
        teacherNames = [session.teacherName];
      } else {
        const mainTeacher = classTeachers.find(t => t.phone === targetClass.createdBy);
        if (mainTeacher) {
          teacherNames = [mainTeacher.name];
        } else if (classTeachers.length > 0) {
          teacherNames = [classTeachers[0].name];
        }
      }
    } else if (template.teachersType === 'main') {
      const mainTeacher = classTeachers.find(t => t.phone === targetClass.createdBy);
      if (mainTeacher) {
        teacherNames = [mainTeacher.name];
      } else if (classTeachers.length > 0) {
        teacherNames = [classTeachers[0].name];
      }
    } else if (template.teachersType === 'co') {
      const coTeachers = classTeachers.filter(t => t.phone !== targetClass.createdBy);
      if (coTeachers.length > 0) {
        teacherNames = [coTeachers[0].name];
      } else if (classTeachers.length > 0) {
        teacherNames = [classTeachers[0].name];
      }
    }

    setSelectedTeachers(teacherNames);

    // 3. Notes / Actual report
    setNotes(template.notes);

    showTemporarySuccess(`Đã áp dụng mẫu biểu mẫu thành công: "${template.title}"`);
    setErrorMsg('');
  };

  const handleToggleTeacherSelection = (teacherName: string) => {
    if (selectedTeachers.includes(teacherName)) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers([teacherName]);
    }
  };

  const handleAddCustomTeacher = () => {
    const trimmed = customTeacher.trim();
    if (!trimmed) return;
    setSelectedTeachers([trimmed]);
    setCustomTeacher('');
    setErrorMsg('');
  };

  const handleRemoveSelectedTeacher = (name: string) => {
    setSelectedTeachers(selectedTeachers.filter(t => t !== name));
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Verification check: Exactly 1 teacher is required
    if (selectedTeachers.length === 0) {
      setErrorMsg('Vui lòng chọn hoặc tự nhập tên 1 giáo viên trực.');
      return;
    }

    if (selectedTeachers.length > 1) {
      setErrorMsg('Mỗi ca trực trưa chỉ được phân công tối đa 1 giáo viên.');
      return;
    }

    if (!date) {
      setErrorMsg('Vui lòng chọn ngày trực.');
      return;
    }

    if (!shiftName.trim()) {
      setErrorMsg('Vui lòng nhập tên ca trực.');
      return;
    }

    const selectedClassObj = classroomsList.find(c => c.id === selectedClassId);

    if (session?.isTeacher) {
      if (!selectedClassId) {
        setErrorMsg('Vui lòng chọn lớp học được phân công trực.');
        return;
      }
      
      const targetClass = classroomsList.find(c => c.id === selectedClassId);
      if (!targetClass) {
        setErrorMsg('Lớp học không hợp lệ.');
        return;
      }

      // Check if classroom is indeed one of the teacher's classes
      const isMyClass = targetClass.createdBy === session.teacherPhone || targetClass.coTeachers?.includes(session.teacherPhone!);
      if (!isMyClass) {
        setErrorMsg('Bạn chỉ có quyền xếp lịch trực cho lớp của mình.');
        return;
      }

      // Check if all selected teachers belong to this class
      const classTeachers = getClassTeachers(selectedClassId);
      const classTeacherNames = classTeachers.map(t => t.name);
      
      const hasInvalidTeacher = selectedTeachers.some(name => !classTeacherNames.includes(name));
      if (hasInvalidTeacher) {
        setErrorMsg('Bạn không được phép thêm giáo viên của lớp khác vào ca trực.');
        return;
      }
    }

    const newShift: NoonSupervisionShift = {
      id: editingShiftId || 'sh_' + Date.now(),
      date,
      shiftName: shiftName.trim(),
      teachers: selectedTeachers,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      classId: selectedClassId || undefined,
      className: selectedClassObj ? selectedClassObj.name : undefined
    };

    let updatedShifts = [...shifts];
    if (editingShiftId) {
      updatedShifts = updatedShifts.map(s => s.id === editingShiftId ? newShift : s);
      showTemporarySuccess('Đã cập nhật ca trực trưa thành công.');
    } else {
      updatedShifts.unshift(newShift);
      showTemporarySuccess('Đã thêm ca trực trưa mới thành công.');
    }

    setShifts(updatedShifts);
    StorageService.saveNoonSupervisionShifts(updatedShifts);
    setIsModalOpen(false);
  };

  const requestDeleteShift = (id: string) => {
    const shift = shifts.find(s => s.id === id);
    if (session?.isTeacher && shift) {
      if (shift.classId && !myClassroomIds.includes(shift.classId)) {
        showTemporaryError('Bạn không có quyền xóa ca trực của lớp khác.');
        return;
      }
    }
    setDeleteConfirmId(id);
  };

  const executeDeleteShift = () => {
    if (!deleteConfirmId) return;
    const updated = shifts.filter(s => s.id !== deleteConfirmId);
    setShifts(updated);
    StorageService.saveNoonSupervisionShifts(updated);
    showTemporarySuccess('Đã xóa ca trực trưa thành công.');
    setDeleteConfirmId(null);
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showTemporaryError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // Printable Monthly PDF Logic
  const handleExportMonthlyPDF = () => {
    if (filteredShifts.length === 0) {
      showTemporaryError(`Không có dữ liệu ca trực trưa nào trong tháng ${selectedMonth.split('-')[1]} năm ${selectedMonth.split('-')[0]} để xuất file PDF.`);
      return;
    }

    // Sort shifts by date ascending
    const sortedShifts = [...filteredShifts].sort((a, b) => a.date.localeCompare(b.date));
    const [year, month] = selectedMonth.split('-');

    const schoolName = settings.schoolName || 'TRƯỜNG MẦM NON CHẤT LƯỢNG CAO';
    const welcomeTitle = settings.welcomeTitle || 'BẢNG THEO DÕI CA TRỰC TRƯA';

    // Determine reporting department/teacher name dynamically
    let reporterName = "Tổ giáo viên bán trú & trực trưa";
    if (session?.isTeacher) {
      if (myClassrooms.length > 0) {
        reporterName = `Giáo viên lớp ${myClassrooms.map(c => c.name).join(', ')}`;
      } else {
        reporterName = `Giáo viên ${session.teacherName || ''}`;
      }
    } else {
      const uniqueClasses = Array.from(new Set(sortedShifts.map(s => s.className).filter(Boolean)));
      if (uniqueClasses.length === 1) {
        reporterName = `Giáo viên lớp ${uniqueClasses[0]}`;
      } else if (uniqueClasses.length > 1) {
        reporterName = `Giáo viên các lớp: ${uniqueClasses.join(', ')}`;
      } else {
        reporterName = "Tổ giáo viên bán trú & trực trưa";
      }
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bao Cao Ca Truc Trua - Thang ${month}/${year}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              font-size: 13px;
              line-height: 1.5;
            }
            .header-table {
              width: 100%;
              margin-bottom: 30px;
              border: none;
            }
            .header-left {
              text-align: center;
              width: 45%;
              font-weight: 500;
              text-transform: uppercase;
              font-size: 11px;
            }
            .header-right {
              text-align: center;
              width: 55%;
              font-weight: 500;
              font-size: 11px;
            }
            .title-section {
              text-align: center;
              margin-top: 20px;
              margin-bottom: 25px;
            }
            .main-title {
              font-size: 18px;
              font-weight: 700;
              text-transform: uppercase;
              margin: 0 0 5px 0;
              letter-spacing: 0.5px;
            }
            .sub-title {
              font-size: 13px;
              font-style: italic;
              color: #475569;
              margin: 0;
            }
            table.data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 35px;
            }
            table.data-table th, table.data-table td {
              border: 1px solid #cbd5e1;
              padding: 10px 12px;
              text-align: left;
            }
            table.data-table th {
              background-color: #f8fafc;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.3px;
              color: #334155;
            }
            table.data-table tr:nth-child(even) {
              background-color: #f8fafc/50;
            }
            .teachers-list {
              font-weight: 600;
              color: #0f172a;
            }
            .notes-text {
              color: #334155;
              font-style: italic;
            }
            .date-col {
              white-space: nowrap;
              font-weight: 500;
            }
            .summary-section {
              margin-bottom: 40px;
              padding: 12px 16px;
              background-color: #f8fafc;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
              font-size: 12px;
            }
            .summary-item {
              margin-bottom: 4px;
            }
            .summary-item strong {
              color: #0f172a;
            }
            .signature-section {
              margin-top: 50px;
              width: 100%;
              border: none;
            }
            .signature-col {
              width: 50%;
              text-align: center;
              vertical-align: top;
            }
            .signature-title {
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 60px;
              color: #0f172a;
            }
            .signature-role {
              font-size: 10px;
              font-style: italic;
              color: #64748b;
              margin-top: -55px;
              margin-bottom: 50px;
            }
            .signature-name {
              font-weight: 600;
              font-size: 13px;
              color: #0f172a;
              text-decoration: underline;
            }
            @media print {
              body {
                padding: 20px;
              }
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="header-left">
                <strong>SỞ GD&ĐT THÀNH PHỐ</strong><br/>
                <strong>${schoolName}</strong><br/>
                <span style="font-size: 9px; text-decoration: underline;">Số: ...../BC-TT</span>
              </td>
              <td class="header-right">
                <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
                <strong style="text-decoration: underline; font-size: 10px; letter-spacing: 0.5px;">Độc lập - Tự do - Hạnh phúc</strong><br/>
                <span style="font-size: 11px; font-style: italic; color: #475569;">..., ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</span>
              </td>
            </tr>
          </table>

          <div class="title-section">
            <h1 class="main-title">BÁO CÁO CÔNG TÁC TRỰC TRƯA</h1>
            <p class="sub-title">Tháng ${month} / Năm ${year}</p>
          </div>

          <div class="summary-section">
            <div class="summary-item">Tổng số ca trực trong tháng: <strong>${sortedShifts.length} ca</strong></div>
            <div class="summary-item">Bộ phận báo cáo: <strong>${reporterName}</strong></div>
            <div class="summary-item">Đối tượng giám sát: <strong>Học sinh toàn trường ngủ trưa và nghỉ ngơi sinh hoạt</strong></div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">STT</th>
                <th style="width: 15%;">Ngày trực</th>
                <th style="width: 15%;">Ca trực</th>
                <th style="width: 30%;">Giáo viên phụ trách trực (1 GV)</th>
                <th style="width: 35%;">Tình hình chi tiết ca trực trưa</th>
              </tr>
            </thead>
            <tbody>
              ${sortedShifts.map((s, idx) => {
                const dateObj = new Date(s.date);
                const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][dateObj.getDay()];
                const dateStr = `${dayOfWeek}, ${dateObj.toLocaleDateString('vi-VN')}`;
                return `
                  <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td class="date-col">${dateStr}</td>
                    <td><strong>${s.shiftName}</strong></td>
                    <td class="teachers-list">
                      ${s.teachers.map(t => `• ${t}`).join('<br/>')}
                    </td>
                    <td class="notes-text">${s.notes || 'Lớp ngủ yên, tình hình an toàn, ổn định.'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <table class="signature-section">
            <tr>
              <td class="signature-col">
                <div class="signature-title">XÁC NHẬN CỦA GIÁO VIÊN LỚP</div>
                <div class="signature-role">(Ký và ghi rõ họ tên)</div>
                <div style="height: 60px;"></div>
                <div class="signature-name">Đại diện Giáo viên chủ nhiệm</div>
              </td>
              <td class="signature-col">
                <div class="signature-title">XÁC NHẬN CỦA BAN GIÁM HIỆU</div>
                <div class="signature-role">(Ký tên và đóng dấu)</div>
                <div style="height: 60px;"></div>
                <div class="signature-name">Hiệu Trưởng nhà trường</div>
              </td>
            </tr>
          </table>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    // Print utilizing silent background iframe (wrapped in try/catch to avoid sandboxed errors)
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(printContent);
        doc.close();

        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (e) {
            console.warn('Could not remove print iframe:', e);
          }
        }, 4000);
      }
    } catch (e) {
      console.warn('Iframe print blocked or failed, using download fallback:', e);
    }

    // Always generate a downloadable HTML file because the app is running in an iframe
    // which usually blocks standard window.print() and iframe.print() APIs.
    // Opening the downloaded HTML file triggers window.print() instantly in the user's browser!
    try {
      const blob = new Blob(["\uFEFF" + printContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Bao_cao_ca_truc_trua_thang_${month}_${year}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showTemporarySuccess(`Đã tải xuống báo cáo tháng ${month}/${year}. Hãy mở file này để lưu/in PDF dễ dàng!`);
    } catch (e) {
      console.error('Download failed:', e);
      setErrorMsg('Không thể tải xuống file báo cáo. Vui lòng kiểm tra lại quyền của trình duyệt.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Clock className={`w-6 h-6 ${getThemeTextClass()}`} />
            Quản lý Ca Trực Trưa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ghi nhận thông tin trực trưa, tình hình học sinh ngủ trưa và xuất báo cáo PDF cuối tháng gửi Ban Giám Hiệu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportMonthlyPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Xuất Báo Cáo Tháng (PDF)
          </button>
          <button
            onClick={handleOpenAddModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-xs ${getThemeColorClass()}`}
          >
            <Plus className="w-4 h-4" />
            Thêm Ca Trực Trưa
          </button>
        </div>
      </div>

      {/* Monthly Filter & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 px-3 py-2 rounded-xl border border-slate-150 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Chọn tháng:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-100 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm giáo viên, tình hình..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-xs font-semibold animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isModalOpen && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-xl text-xs font-semibold animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table & List View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 overflow-hidden">
        {filteredShifts.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 mb-3.5">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Không tìm thấy ca trực nào</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto leading-normal">
              Chưa có dữ liệu ca trực nào được ghi nhận cho tháng {selectedMonth.split('-')[1]} năm {selectedMonth.split('-')[0]}. Vui lòng thêm ca trực mới để bắt đầu.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo ca đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-5">Ngày trực / Ca trực</th>
                  <th className="py-4 px-5">Giáo viên trực trưa (1 GV)</th>
                  <th className="py-4 px-5">Tình hình chi tiết ca trực trưa</th>
                  <th className="py-4 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredShifts.map((shift) => {
                  const dateObj = new Date(shift.date);
                  const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][dateObj.getDay()];
                  const formattedDate = dateObj.toLocaleDateString('vi-VN');

                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-850/40 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                          {dayOfWeek}, {formattedDate}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {shift.className && (
                            <div className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/45 text-teal-650 dark:text-teal-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                              Lớp: {shift.className}
                            </div>
                          )}
                          <div className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                            <Clock className="w-3 h-3" />
                            {shift.shiftName}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          {shift.teachers.map((teacher, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/85 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-md mr-1.5"
                            >
                              <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              {teacher}
                            </span>
                          ))}
                        </div>
                        {shift.teachers.length === 0 && (
                          <p className="text-[9px] text-rose-500 font-bold mt-1 flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" /> Chưa phân công giáo viên trực
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic max-w-md leading-relaxed">
                          "{shift.notes || 'Lớp ngủ yên, an toàn, ổn định.'}"
                        </p>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {(!session?.isTeacher || (shift.classId && myClassroomIds.includes(shift.classId))) ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(shift)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-450 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="Sửa thông tin ca trực"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => requestDeleteShift(shift.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-450 dark:hover:text-rose-450 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="Xóa ca trực"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chỉ xem</span>
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

      {/* FORM DIALOG/MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl animate-scale-in text-slate-850 dark:text-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3.5 mb-4">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className={`w-5 h-5 ${getThemeTextClass()}`} />
                {editingShiftId ? 'Cập Nhật Ca Trực Trưa' : 'Thêm Ca Trực Trưa Mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-xl text-xs font-semibold mb-4 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveShift} className="space-y-4">
              {/* Classroom & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Ngày trực:</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Lớp học được trực:</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedClassId(cid);
                      const targetClassObj = classroomsList.find(c => c.id === cid);
                      if (targetClassObj) {
                        setSelectedClassName(targetClassObj.name);
                        // Auto-select the main teacher & co-teachers of this class!
                        const classTeacherNames: string[] = [];
                        const mainTeacher = teachersList.find(t => t.phone === targetClassObj.createdBy);
                        if (mainTeacher) classTeacherNames.push(mainTeacher.name);
                        
                        (targetClassObj.coTeachers || []).forEach(phone => {
                          const coT = teachersList.find(t => t.phone === phone);
                          if (coT) classTeacherNames.push(coT.name);
                        });
                        
                        // Pre-populate selected teachers with the classroom's teachers
                        setSelectedTeachers(classTeacherNames);
                      } else {
                        setSelectedClassName('');
                        setSelectedTeachers([]);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {myClassrooms.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preset Templates Section */}
              <div className="space-y-2 text-left border border-indigo-100/50 dark:border-indigo-950/50 p-3 rounded-2xl bg-indigo-50/15 dark:bg-indigo-950/10">
                <label className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Biểu Mẫu Ca Trực Trưa Sẵn Có (Nhanh):
                </label>
                
                {!selectedClassId ? (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                    💡 Vui lòng chọn lớp học ở trên để mở khóa các biểu mẫu điền nhanh.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {SUPERVISION_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-xl text-left transition-all hover:shadow-xs cursor-pointer group"
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-bold text-slate-850 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {tpl.title}
                          </span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            {tpl.teachersType === 'all' ? 'Cả lớp' : tpl.teachersType === 'main' ? 'GV CN' : 'Phụ tá/Đồng GV'}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal truncate">
                          {tpl.description}
                        </p>
                        <div className="text-[8px] font-mono text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic bg-slate-50 dark:bg-slate-850 p-1 rounded-sm border border-slate-100 dark:border-slate-800">
                          Nội dung: {tpl.notes}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Auto-Scheduler Option */}
              {selectedClassId && !editingShiftId && getClassTeachers(selectedClassId).length > 0 && (
                <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3 text-left space-y-2.5 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 block">⚡ Phân chia lịch trực tự động</span>
                      <span className="text-[10px] text-indigo-750 dark:text-indigo-400 block leading-normal mt-0.5">
                        Lớp học này có <strong className="font-extrabold text-indigo-900 dark:text-indigo-200">{getClassTeachers(selectedClassId).length} giáo viên</strong> phụ trách. Bạn có muốn tự động tạo <strong className="font-extrabold text-indigo-900 dark:text-indigo-200">{getClassTeachers(selectedClassId).length} ca trực riêng biệt</strong> cho ngày này (mỗi giáo viên nhận trực đúng 1 ca riêng biệt) không?
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoAssignShifts}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-[11px] font-extrabold rounded-lg cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Tự Động Tạo {getClassTeachers(selectedClassId).length} Ca Trực Riêng Biệt Cho Lớp
                  </button>
                </div>
              )}

              {/* Tên ca trực Row */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tên ca trực:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Ca trực trưa, Ca I (11h-1h)"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Ca I (11h30-12h45)', 'Ca II (12h45-14h00)', 'Ca I (11h30-12h20)', 'Ca II (12h20-13h10)', 'Ca III (13h10-14h00)', 'Ca chính (11h30-14h00)', 'Ca trực trưa'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setShiftName(option)}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700/50 cursor-pointer transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supervising Teachers Selection */}
              <div className="space-y-2 text-left border border-slate-100 dark:border-slate-800 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-850/30">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Giáo viên trực trưa:
                  </label>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${selectedTeachers.length === 1 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                    Đã chọn: {selectedTeachers.length} / 1 GV
                  </span>
                </div>
                
                {/* List of currently selected teachers for this shift */}
                {selectedTeachers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl">
                    {selectedTeachers.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-lg"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedTeacher(t)}
                          className="hover:bg-indigo-100 dark:hover:bg-indigo-900/50 p-0.5 rounded-full text-indigo-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Teachers of the selected classroom */}
                {selectedClassId && (() => {
                  const targetClass = classroomsList.find(c => c.id === selectedClassId);
                  if (!targetClass) return null;
                  
                  const classTeachers: TeacherAccount[] = [];
                  const mainT = teachersList.find(t => t.phone === targetClass.createdBy);
                  if (mainT) classTeachers.push(mainT);
                  (targetClass.coTeachers || []).forEach(phone => {
                    const coT = teachersList.find(t => t.phone === phone);
                    if (coT && !classTeachers.some(t => t.phone === coT.phone)) classTeachers.push(coT);
                  });

                  if (classTeachers.length === 0) return null;

                  return (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider block">
                        Giáo viên phụ trách lớp ({targetClass.name}):
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {classTeachers.map((teacher) => {
                          const isSelected = selectedTeachers.includes(teacher.name);
                          const isCreator = teacher.phone === targetClass.createdBy;
                          return (
                            <button
                              type="button"
                              key={teacher.phone}
                              onClick={() => handleToggleTeacherSelection(teacher.name)}
                              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                                  : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                              }`}
                            >
                              <input
                                type="radio"
                                checked={isSelected}
                                readOnly
                                className="w-3 h-3 text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="truncate leading-tight">
                                <span className="block truncate">{teacher.name}</span>
                                <span className="block text-[8px] font-normal text-slate-400">
                                  {isCreator ? 'GV Chủ nhiệm' : 'Đồng GV'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Available Other Teachers list */}
                {!session?.isTeacher && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block uppercase tracking-wider">
                      {selectedClassId ? 'Giáo viên khác trong trường:' : 'Chọn giáo viên từ danh sách trường:'}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                      {(() => {
                        let availableTeachers = teachersList;
                        if (selectedClassId) {
                          const targetClass = classroomsList.find(c => c.id === selectedClassId);
                          if (targetClass) {
                            availableTeachers = teachersList.filter(t => 
                              t.phone !== targetClass.createdBy && 
                              !(targetClass.coTeachers || []).includes(t.phone)
                            );
                          }
                        }

                        if (availableTeachers.length === 0) {
                          return <span className="text-[10px] text-slate-400 italic col-span-2 p-2 text-center">Không có giáo viên khác.</span>;
                        }

                        return availableTeachers.map((teacher) => {
                          const isSelected = selectedTeachers.includes(teacher.name);
                          return (
                            <button
                              type="button"
                              key={teacher.phone}
                              onClick={() => handleToggleTeacherSelection(teacher.name)}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
                                  : 'bg-slate-50 border-slate-150 hover:bg-slate-100 text-slate-650 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-350'
                              }`}
                            >
                              <input
                                type="radio"
                                checked={isSelected}
                                readOnly
                                className="w-3 h-3 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="truncate">{teacher.name}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Custom Teacher Entry */}
                {!session?.isTeacher && (
                  <div className="flex gap-2 items-center pt-1">
                    <input
                      type="text"
                      placeholder="Hoặc gõ tên giáo viên khác..."
                      value={customTeacher}
                      onChange={(e) => setCustomTeacher(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTeacher();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTeacher}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                    >
                      Thêm GV
                    </button>
                  </div>
                )}
              </div>

              {/* Duty Shift Notes/Report */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Ghi chú tình hình ca trực:</label>
                <textarea
                  rows={3}
                  placeholder="Nhập ghi nhận chi tiết, sự cố học sinh nếu có, hoặc tình trạng ngủ nghỉ..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs ${getThemeColorClass()}`}
                >
                  {editingShiftId ? 'Cập Nhật' : 'Lưu Lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs" onClick={() => setDeleteConfirmId(null)} />
          
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl animate-scale-in text-slate-850 dark:text-slate-200">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Xác Nhận Xóa Ca Trực Trưa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bạn có chắc chắn muốn xóa ca trực trưa này không? Thao tác này không thể hoàn tác.
                </p>
                {(() => {
                  const targetShift = shifts.find(s => s.id === deleteConfirmId);
                  if (targetShift) {
                    return (
                      <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-left mt-2 space-y-1">
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          📅 Ngày trực: <span className="font-normal">{new Date(targetShift.date).toLocaleDateString('vi-VN')}</span>
                        </p>
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          🕒 Ca trực: <span className="font-normal">{targetShift.shiftName}</span>
                        </p>
                        {targetShift.className && (
                          <p className="font-bold text-slate-700 dark:text-slate-300">
                            🏫 Lớp học: <span className="font-normal">{targetShift.className}</span>
                          </p>
                        )}
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          👩‍🏫 Giáo viên: <span className="font-normal">{targetShift.teachers.join(', ')}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeDeleteShift}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
