/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  UserCheck,
  Search,
  Download,
  Award,
  FileSpreadsheet
} from 'lucide-react';
import { Classroom, Student, AttendanceRecord, SchoolSettings } from '../types';

interface ReportsProps {
  students: Student[];
  classrooms: Classroom[];
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
  isTeacher?: boolean;
}

export default function Reports({ students, classrooms, attendance, settings, isTeacher = false }: ReportsProps) {
  const [selectedClassId, setSelectedClassId] = useState(() => {
    if (isTeacher && classrooms.length > 0) {
      return classrooms[0].id;
    }
    return 'all';
  });

  // If teacher has no classrooms, show warning message
  if (isTeacher && classrooms.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-xs max-w-lg mx-auto my-12">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Filter size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Bạn chưa có lớp học nào</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          Hệ thống báo cáo thống kê yêu cầu ít nhất một lớp học do chính bạn tạo để hiển thị thông tin. Vui lòng tạo lớp học tại phần "Quản lý lớp học" trước.
        </p>
      </div>
    );
  }

  // 1. Filter students and attendance records by the selected class
  const filteredStudents = useMemo(() => {
    if (selectedClassId === 'all') return students;
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  const filteredAttendance = useMemo(() => {
    if (selectedClassId === 'all') return attendance;
    return attendance.filter(a => a.classId === selectedClassId);
  }, [attendance, selectedClassId]);

  // Get all unique months from attendance data
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    attendance.forEach(record => {
      if (record.date && record.date.length >= 7) {
        monthsSet.add(record.date.substring(0, 7)); // YYYY-MM
      }
    });
    
    // Fallback to current month if empty
    if (monthsSet.size === 0) {
      monthsSet.add(new Date().toISOString().substring(0, 7));
    }
    
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
  }, [attendance]);

  const [localSelectedMonth, setLocalSelectedMonth] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const activeMonth = localSelectedMonth || availableMonths[0] || new Date().toISOString().substring(0, 7);

  // Calculate detailed monthly attendance summary per student
  const monthlyStudentSummary = useMemo(() => {
    return filteredStudents.map(student => {
      const studentRecords = attendance.filter(rec => 
        rec.studentId === student.id && 
        rec.date.startsWith(activeMonth)
      );

      const present = studentRecords.filter(r => r.status === 'present').length;
      const late = studentRecords.filter(r => r.status === 'late').length;
      const absent = studentRecords.filter(r => r.status === 'absent').length;
      const total = present + late + absent;
      const attended = present + late;
      const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

      const classroom = classrooms.find(c => c.id === student.classId);
      const className = classroom ? classroom.name : student.className || 'Không rõ';

      return {
        studentId: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        className,
        present,
        late,
        absent,
        attended,
        totalDays: total,
        rate,
      };
    });
  }, [filteredStudents, attendance, activeMonth, classrooms]);

  const searchedStudentSummary = useMemo(() => {
    if (!studentSearch.trim()) return monthlyStudentSummary;
    const query = studentSearch.toLowerCase().trim();
    return monthlyStudentSummary.filter(s => 
      s.fullName.toLowerCase().includes(query) || 
      s.studentCode.toLowerCase().includes(query)
    );
  }, [monthlyStudentSummary, studentSearch]);

  const handleExportMonthlyReport = () => {
    try {
      const parts = activeMonth.split('-');
      const formattedMonth = `${parts[1]}/${parts[0]}`;
      const fileNameMonth = `${parts[1]}_${parts[0]}`;
      
      const exportData = [
        [
          `BÁO CÁO THỐNG KÊ CHI TIẾT CHUYÊN CẦN CUỐI THÁNG - THÁNG ${formattedMonth}`
        ],
        [
          `Lớp học: ${selectedClassId === 'all' ? 'Tất cả khối lớp' : (classrooms.find(c => c.id === selectedClassId)?.name || '')}`
        ],
        [],
        [
          'STT',
          'Mã Học Sinh',
          'Họ Và Tên',
          'Lớp Học',
          'Số Ngày Đúng Giờ (Present)',
          'Số Ngày Đi Muộn (Late)',
          'Số Ngày Vắng Mặt (Absent)',
          'Tổng Số Ngày Đi Học (Attended)',
          'Tổng Số Buổi Điểm Danh (Total)',
          'Tỷ Lệ Đi Học (Attendance Rate)',
          'Đánh giá chuyên cần'
        ],
        ...searchedStudentSummary.map((s, idx) => {
          let rating = 'Yếu';
          if (s.rate >= 95) rating = 'Xuất sắc';
          else if (s.rate >= 90) rating = 'Khá';
          else if (s.rate >= 75) rating = 'Trung bình';
          
          return [
            idx + 1,
            s.studentCode,
            s.fullName,
            s.className,
            s.present,
            s.late,
            s.absent,
            s.attended,
            s.totalDays,
            `${s.rate}%`,
            rating
          ];
        })
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(exportData);

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }
      ];

      ws['!cols'] = [
        { wch: 8 },  // STT
        { wch: 15 }, // Mã Học Sinh
        { wch: 25 }, // Họ và Tên
        { wch: 15 }, // Lớp học
        { wch: 25 }, // Đúng giờ
        { wch: 22 }, // Đi muộn
        { wch: 22 }, // Vắng mặt
        { wch: 25 }, // Đi học
        { wch: 25 }, // Tổng buổi
        { wch: 25 }, // Tỷ lệ
        { wch: 20 }  // Đánh giá
      ];

      XLSX.utils.book_append_sheet(wb, ws, `Thang_${fileNameMonth}`);
      XLSX.writeFile(wb, `Bao_Cao_Chuyen_Can_${fileNameMonth}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('Xuất file báo cáo tháng thất bại.');
    }
  };

  // Export daily attendance matrix grid to Excel
  const handleExportDailyMatrixExcel = () => {
    try {
      const parts = activeMonth.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const formattedMonth = `${parts[1]}/${parts[0]}`;
      const fileNameMonth = `${parts[1]}_${parts[0]}`;

      // Get days of the month
      const daysInMonth = new Date(year, month, 0).getDate();

      // Header rows
      const exportData: any[][] = [
        [`BẢNG ĐIỂM DANH CHI TIẾT HÀNG NGÀY - THÁNG ${formattedMonth}`],
        [`Lớp học: ${selectedClassId === 'all' ? 'Tất cả khối lớp' : (classrooms.find(c => c.id === selectedClassId)?.name || '')}`],
        [`Ký hiệu chuyên cần:  ✓ (Đúng giờ)  |  M (Đi muộn)  |  V (Vắng học)  |  - (Không học/Không có dữ liệu)`],
        [],
      ];

      // Prepare headers
      const headers = ['STT', 'Mã Học Sinh', 'Họ Và Tên', 'Lớp Học'];
      for (let d = 1; d <= daysInMonth; d++) {
        headers.push(String(d).padStart(2, '0'));
      }
      headers.push('Tổng Đúng Giờ', 'Tổng Muộn', 'Tổng Vắng', 'Tỷ Lệ (%)');
      exportData.push(headers);

      // Prepare student rows
      searchedStudentSummary.forEach((s, idx) => {
        const rowData: any[] = [
          idx + 1,
          s.studentCode,
          s.fullName,
          s.className,
        ];

        // For each day in month, check attendance status
        for (let d = 1; d <= daysInMonth; d++) {
          const dayStr = String(d).padStart(2, '0');
          const dateStr = `${activeMonth}-${dayStr}`;
          
          const record = attendance.find(rec => 
            rec.studentId === s.studentId && 
            rec.date === dateStr
          );

          if (record) {
            if (record.status === 'present') {
              rowData.push('✓');
            } else if (record.status === 'late') {
              rowData.push('M');
            } else if (record.status === 'absent') {
              rowData.push('V');
            } else {
              rowData.push('-');
            }
          } else {
            rowData.push('-');
          }
        }

        // Add summary columns
        rowData.push(s.present, s.late, s.absent, `${s.rate}%`);
        exportData.push(rowData);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(exportData);

      // Merge headers across the sheet columns
      const totalCols = headers.length;
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } }
      ];

      // Column widths
      const colWidths = [
        { wch: 6 },  // STT
        { wch: 14 }, // Mã học sinh
        { wch: 22 }, // Họ và tên
        { wch: 14 }, // Lớp học
      ];
      // For each day of the month, short width
      for (let d = 1; d <= daysInMonth; d++) {
        colWidths.push({ wch: 4.5 });
      }
      // For totals
      colWidths.push(
        { wch: 14 }, // Tổng Đi Học
        { wch: 14 }, // Tổng Đi Muộn
        { wch: 12 }, // Tổng Vắng
        { wch: 12 }  // Tỷ Lệ
      );
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, `Chi_Tiet_${fileNameMonth}`);
      XLSX.writeFile(wb, `Bao_Cao_Diem_Danh_Chi_Tiet_${fileNameMonth}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('Xuất bảng điểm danh chi tiết thất bại.');
    }
  };

  // Map theme colors
  const getThemeTextClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-violet-600';
      case 'rose': return 'text-rose-600';
      case 'amber': return 'text-amber-600';
      default: return 'text-blue-600';
    }
  };

  const getThemeBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600';
      case 'violet': return 'bg-violet-600';
      case 'rose': return 'bg-rose-600';
      case 'amber': return 'bg-amber-600';
      default: return 'bg-blue-600';
    }
  };

  // 2. High-level aggregate metrics
  const summaryMetrics = useMemo(() => {
    const present = filteredAttendance.filter(r => r.status === 'present').length;
    const late = filteredAttendance.filter(r => r.status === 'late').length;
    const absent = filteredAttendance.filter(r => r.status === 'absent').length;
    const totalDaysCount = Array.from(new Set(filteredAttendance.map(r => r.date))).length || 1;

    const rate = (present + late + absent) > 0 
      ? Math.round(((present + late) / (present + late + absent)) * 100) 
      : 96;

    return {
      presentDays: present,
      lateDays: late,
      absentDays: absent,
      attendanceRate: rate,
      totalActiveSchoolDays: totalDaysCount,
    };
  }, [filteredAttendance]);

  // 3. Donut chart SVG values calculation (Pie Chart replacement)
  const donutChartSegments = useMemo(() => {
    const { presentDays, lateDays, absentDays } = summaryMetrics;
    const total = presentDays + lateDays + absentDays;
    
    if (total === 0) {
      return {
        presentPct: 85, latePct: 10, absentPct: 5,
        presentOffset: 0, lateOffset: 85, absentOffset: 95
      };
    }

    const presentPct = Math.round((presentDays / total) * 100);
    const latePct = Math.round((lateDays / total) * 100);
    const absentPct = Math.max(0, 100 - presentPct - latePct);

    // Circumference of our donut path is 2 * PI * R where R = 40 (approx 251.2)
    const circ = 251.2;
    
    const presentStroke = (presentPct / 100) * circ;
    const lateStroke = (latePct / 100) * circ;
    const absentStroke = (absentPct / 100) * circ;

    return {
      presentPct, latePct, absentPct,
      presentStroke, lateStroke, absentStroke,
      circ
    };
  }, [summaryMetrics]);

  // 4. Monthly attendance metrics (Column Chart replacement)
  const monthlyBarData = useMemo(() => {
    const monthlyGroups: Record<string, { present: number; late: number; absent: number }> = {};
    
    filteredAttendance.forEach((a) => {
      const monthStr = a.date.substring(0, 7); // YYYY-MM
      if (!monthlyGroups[monthStr]) {
        monthlyGroups[monthStr] = { present: 0, late: 0, absent: 0 };
      }
      if (a.status === 'present') monthlyGroups[monthStr].present++;
      else if (a.status === 'late') monthlyGroups[monthStr].late++;
      else if (a.status === 'absent') monthlyGroups[monthStr].absent++;
    });

    // Populate current month if empty
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (Object.keys(monthlyGroups).length === 0) {
      monthlyGroups[currentMonth] = { present: 14, late: 2, absent: 1 };
    }

    return Object.entries(monthlyGroups).map(([month, stats]) => {
      const parts = month.split('-');
      const label = `T${parts[1]}/${parts[0].substring(2)}`;
      const total = stats.present + stats.late + stats.absent;
      const rate = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 95;
      return {
        label,
        rate,
        ...stats,
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredAttendance]);

  // 5. Line chart points calculation for general attendance trend
  const lineChartPoints = useMemo(() => {
    if (monthlyBarData.length === 0) return '';
    const h = 100;
    const w = 300;
    const pad = 20;
    
    const stepX = (w - pad * 2) / Math.max(1, monthlyBarData.length - 1);
    
    return monthlyBarData.map((d, i) => {
      const x = pad + i * stepX;
      // Map rate [0% - 100%] to chart height
      const y = h - pad - (d.rate / 100) * (h - pad * 2);
      return { x, y };
    });
  }, [monthlyBarData]);

  return (
    <div className="space-y-6">
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Báo Cáo Thống Kê & Phân Tích <BarChart3 className={getThemeTextClass()} size={24} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Phân tích tỷ lệ đi học, đánh giá hiệu quả kỷ luật chuyên cần của từng lớp học theo thời gian.
          </p>
        </div>

        {/* Class Filter selector */}
        <div className="no-print flex items-center gap-2.5 shrink-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter size={14} /> Lọc theo lớp:
          </span>
          <select
            id="reports-class-filter"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-inner outline-none"
          >
            {!isTeacher && <option value="all">Tất cả khối lớp</option>}
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Dynamic metrics summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Total school days */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Số buổi học đã diễn ra</p>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{summaryMetrics.totalActiveSchoolDays} buổi</h3>
          </div>
        </div>

        {/* Metric 2: Total presences */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Tổng số lượt đúng giờ</p>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{summaryMetrics.presentDays} lượt</h3>
          </div>
        </div>

        {/* Metric 3: Total lateness */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Tổng số lần đi muộn</p>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{summaryMetrics.lateDays} lần</h3>
          </div>
        </div>

        {/* Metric 4: Total absences */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Tổng số học sinh vắng</p>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{summaryMetrics.absentDays} lượt</h3>
          </div>
        </div>
      </div>

      {/* 3. High Fidelity Custom SVGs layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SVG Bar Chart (Column Chart) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <BarChart3 className="text-blue-500" size={18} /> Phân Tích Chuyên Cần Lũy Kế Theo Tháng
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Tỷ lệ đi học và số lượt phân bổ chi tiết</p>
          </div>

          <div className="flex-1 w-full min-h-[180px] flex items-center justify-center">
            {monthlyBarData.length > 0 ? (
              <svg viewBox="0 0 400 160" className="w-full h-full overflow-visible">
                {/* Grid lines */}
                <line x1="30" y1="20" x2="380" y2="20" stroke="rgba(226, 232, 240, 0.12)" strokeDasharray="2" />
                <line x1="30" y1="70" x2="380" y2="70" stroke="rgba(226, 232, 240, 0.12)" strokeDasharray="2" />
                <line x1="30" y1="120" x2="380" y2="120" stroke="rgba(226, 232, 240, 0.12)" strokeDasharray="2" />

                {/* Y labels */}
                <text x="15" y="24" className="fill-slate-400 dark:fill-slate-500 text-[9px] font-bold" textAnchor="middle">100%</text>
                <text x="15" y="74" className="fill-slate-400 dark:fill-slate-500 text-[9px] font-bold" textAnchor="middle">50%</text>
                <text x="15" y="124" className="fill-slate-400 dark:fill-slate-500 text-[9px] font-bold" textAnchor="middle">0%</text>

                {/* Render bars dynamically */}
                {monthlyBarData.map((d, i) => {
                  const barWidth = 32;
                  const stepX = (350 - barWidth) / Math.max(1, monthlyBarData.length - 1 || 1);
                  const x = 40 + i * stepX;
                  
                  // Height based on rate [0-100] map to [20 - 120] height
                  const barHeight = (d.rate / 100) * 100;
                  const y = 120 - barHeight;

                  return (
                    <g key={i} className="group cursor-pointer">
                      {/* Background block hover glow */}
                      <rect
                        x={x - 6}
                        y="15"
                        width={barWidth + 12}
                        height="115"
                        className="fill-slate-50/0 dark:fill-slate-800/0 hover:fill-slate-50 dark:hover:fill-slate-800/20 transition-all rounded-lg"
                        rx="6"
                      />
                      
                      {/* Column block */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={settings.themeColor === 'emerald' ? '#10b981' : settings.themeColor === 'violet' ? '#8b5cf6' : settings.themeColor === 'rose' ? '#ec4899' : settings.themeColor === 'amber' ? '#f59e0b' : '#3b82f6'}
                        rx="4"
                        className="transition-all duration-300"
                      />

                      {/* Tooltip on top of columns */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        className="fill-slate-700 dark:fill-slate-300 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {d.rate}%
                      </text>

                      {/* X Label */}
                      <text
                        x={x + barWidth / 2}
                        y="140"
                        textAnchor="middle"
                        className="fill-slate-400 dark:fill-slate-500 text-[9px] font-bold"
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <p className="text-xs text-slate-400">Không có dữ liệu tháng nào.</p>
            )}
          </div>
        </div>

        {/* SVG Donut Chart (Pie Chart) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <PieChart className="text-emerald-500" size={18} /> Phân Phối Trạng Thái Điểm Danh
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Biểu đồ cơ cấu tỉ lệ điểm danh tổng hợp</p>
          </div>

          <div className="flex-1 w-full min-h-[140px] flex items-center justify-center">
            {donutChartSegments.presentPct > 0 || donutChartSegments.latePct > 0 || donutChartSegments.absentPct > 0 ? (
              <svg viewBox="0 0 120 120" className="w-40 h-40 overflow-visible">
                {/* 3 Rings drawing using stroke-dasharray */}
                {/* Ring 1: Present (Emerald) */}
                <circle
                  cx="60"
                  cy="60"
                  r="40"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray={`${donutChartSegments.presentStroke} ${donutChartSegments.circ}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 60 60)"
                />
                
                {/* Ring 2: Late (Amber) */}
                {donutChartSegments.latePct > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="10"
                    strokeDasharray={`${donutChartSegments.lateStroke} ${donutChartSegments.circ}`}
                    strokeDashoffset={-donutChartSegments.presentStroke}
                    transform="rotate(-90 60 60)"
                  />
                )}

                {/* Ring 3: Absent (Rose) */}
                {donutChartSegments.absentPct > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="transparent"
                    stroke="#f43f5e"
                    strokeWidth="10"
                    strokeDasharray={`${donutChartSegments.absentStroke} ${donutChartSegments.circ}`}
                    strokeDashoffset={-(donutChartSegments.presentStroke + donutChartSegments.lateStroke)}
                    transform="rotate(-90 60 60)"
                  />
                )}

                {/* Center text indicating the average rate */}
                <text x="60" y="58" textAnchor="middle" dominantBaseline="middle" className="fill-slate-800 dark:fill-white text-[12px] font-extrabold">
                  {summaryMetrics.attendanceRate}%
                </text>
                <text x="60" y="72" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 dark:fill-slate-500 text-[7px] font-bold uppercase tracking-wider">
                  Chuyên cần
                </text>
              </svg>
            ) : (
              <p className="text-xs text-slate-400">Không có dữ liệu.</p>
            )}
          </div>

          {/* Color legends mapping */}
          <div className="space-y-2 border-t border-slate-50 dark:border-slate-800 pt-4 text-xs font-semibold">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Đúng giờ
              </span>
              <span className="text-slate-900 dark:text-white">{donutChartSegments.presentPct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Đi muộn
              </span>
              <span className="text-slate-900 dark:text-white">{donutChartSegments.latePct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Vắng học
              </span>
              <span className="text-slate-900 dark:text-white">{donutChartSegments.absentPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Connected Trend Line Chart (Polyline) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <TrendingUp className="text-emerald-500" size={18} /> Biểu Đồ Đường Xu Hướng Chuyên Cần Theo Tháng
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Xu hướng đi học đều đặn của học sinh qua các chu kỳ tháng</p>
        </div>

        <div className="w-full min-h-[140px] flex items-center justify-center">
          {monthlyBarData.length > 0 && lineChartPoints.length > 0 ? (
            <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
              {/* Connected trend line path */}
              <polyline
                fill="none"
                stroke={settings.themeColor === 'emerald' ? '#10b981' : settings.themeColor === 'violet' ? '#8b5cf6' : settings.themeColor === 'rose' ? '#ec4899' : settings.themeColor === 'amber' ? '#f59e0b' : '#3b82f6'}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={lineChartPoints.map(p => `${p.x},${p.y}`).join(' ')}
              />

              {/* Data point glowing rings and coordinates */}
              {lineChartPoints.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    fill="#ffffff"
                    stroke={settings.themeColor === 'emerald' ? '#10b981' : settings.themeColor === 'violet' ? '#8b5cf6' : settings.themeColor === 'rose' ? '#ec4899' : settings.themeColor === 'amber' ? '#f59e0b' : '#3b82f6'}
                    strokeWidth="2.5"
                  />
                  
                  {/* Tooltip value */}
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    className="fill-slate-700 dark:fill-slate-300 text-[8px] font-bold"
                  >
                    {monthlyBarData[idx].rate}%
                  </text>

                  {/* Month Label */}
                  <text
                    x={p.x}
                    y="95"
                    textAnchor="middle"
                    className="fill-slate-400 dark:fill-slate-500 text-[8px] font-bold"
                  >
                    {monthlyBarData[idx].label}
                  </text>
                </g>
              ))}
            </svg>
          ) : (
            <p className="text-xs text-slate-400">Không có đủ dữ liệu chu kỳ tháng.</p>
          )}
        </div>
      </div>

      {/* 5. Monthly Student Attendance & Absence Summary Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col gap-6" id="monthly-summary-section">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex-1 min-w-[280px] md:min-w-[400px]">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Tổng Hợp Đi Học & Vắng Mặt Cuối Tháng Của Từng Bé <FileSpreadsheet className="text-emerald-500 shrink-0" size={22} />
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Thống kê tổng hợp số buổi đúng giờ, đi muộn, vắng mặt của từng học sinh trong tháng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Month selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-150 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tháng:</span>
              <select
                id="monthly-summary-month-select"
                value={activeMonth}
                onChange={(e) => setLocalSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                {availableMonths.map(m => {
                  const parts = m.split('-');
                  return (
                    <option key={m} value={m}>Tháng {parts[1]}/{parts[0]}</option>
                  );
                })}
              </select>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportMonthlyReport}
              className="no-print px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer shrink-0"
              title="Xuất file báo cáo Excel tổng hợp chuyên cần tháng"
              id="monthly-summary-export-btn"
            >
              <Download size={14} />
              <span>Xuất Excel Tổng Hợp</span>
            </button>

            {/* Export Daily Excel Button */}
            <button
              onClick={handleExportDailyMatrixExcel}
              className="no-print px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer shrink-0"
              title="Xuất bảng điểm danh chi tiết từng ngày trong tháng"
              id="monthly-detail-export-btn"
            >
              <FileSpreadsheet size={14} />
              <span>Xuất Excel Chi Tiết</span>
            </button>
          </div>
        </div>

        {/* Filter / Search input */}
        <div className="no-print flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 dark:bg-slate-850/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={15} />
            <input
              type="text"
              id="monthly-summary-search"
              placeholder="Tìm theo tên, mã bé..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium ml-auto select-none">
            Hiển thị <span className="font-bold text-slate-700 dark:text-slate-300">{searchedStudentSummary.length}</span> trên <span className="font-bold text-slate-700 dark:text-slate-300">{monthlyStudentSummary.length}</span> học sinh
          </div>
        </div>

        {/* Summary Table */}
        <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/55 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 select-none text-[10px] uppercase">
                  <th className="px-4 py-3 font-bold text-center w-12">STT</th>
                  <th className="px-4 py-3 font-bold">Mã Học Sinh</th>
                  <th className="px-4 py-3 font-bold">Họ Và Tên</th>
                  <th className="px-4 py-3 font-bold">Lớp Học</th>
                  <th className="px-4 py-3 font-bold text-center">Số Ngày Đi Học</th>
                  <th className="px-4 py-3 font-bold text-center">Số Ngày Vắng Mặt</th>
                  <th className="px-4 py-3 font-bold text-center">Tỷ Lệ Đi Học</th>
                  <th className="px-4 py-3 font-bold text-center">Đánh Giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                {searchedStudentSummary.length > 0 ? (
                  searchedStudentSummary.map((student, idx) => {
                    // Decide rating details
                    let ratingLabel = 'Yếu';
                    let ratingBadgeColor = 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400';
                    if (student.rate >= 95) {
                      ratingLabel = 'Xuất sắc';
                      ratingBadgeColor = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400';
                    } else if (student.rate >= 90) {
                      ratingLabel = 'Khá';
                      ratingBadgeColor = 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400';
                    } else if (student.rate >= 75) {
                      ratingLabel = 'Trung bình';
                      ratingBadgeColor = 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400';
                    }

                    return (
                      <tr key={student.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 text-[11px] font-bold">{student.studentCode}</td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-100 font-bold">{student.fullName}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{student.className}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[13px]">
                              {student.attended} ngày
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              ({student.present} đúng giờ, {student.late} muộn)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {student.absent > 0 ? (
                            <span className="bg-rose-50 dark:bg-rose-950/35 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg text-xs font-extrabold font-mono">
                              {student.absent} ngày
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">0 ngày</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-extrabold text-slate-700 dark:text-slate-300 font-mono">
                          {student.rate}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${ratingBadgeColor}`}>
                            <Award size={10} />
                            {ratingLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-medium">
                      Không tìm thấy học sinh nào phù hợp với điều kiện lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
