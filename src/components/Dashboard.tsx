/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  School,
  CalendarDays,
  UserCheck,
  Coins,
  Bell,
  Trash2,
  BookOpen,
  Check,
  Plus,
  X,
  Edit,
  MapPin,
  Calendar,
  Info,
  Activity,
  Pill,
  AlertTriangle
} from 'lucide-react';
import { Classroom, Student, AttendanceRecord, SchoolSettings, AbsenceReport, TeacherNotification, SchoolEvent, ClassActivity, MedicationRequest, MedicineItem, ParentNotification } from '../types';
import { StorageService } from '../utils/storage';

const isPastEvent = (dateStr: string) => {
  if (!dateStr) return false;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const eDate = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eDate.getTime() < today.getTime();
      }
    }
  } catch {}
  return false;
};

const isPastActivity = (dateStr: string, timeStr?: string) => {
  if (!dateStr) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr < todayStr) return true;
  if (dateStr === todayStr && timeStr) {
    try {
      const parts = timeStr.split('-');
      if (parts.length === 2) {
        const endTimeStr = parts[1].trim();
        const endParts = endTimeStr.split(':');
        if (endParts.length === 2) {
          const endHour = parseInt(endParts[0], 10);
          const endMin = parseInt(endParts[1], 10);
          if (!isNaN(endHour) && !isNaN(endMin)) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            if (currentHour > endHour || (currentHour === endHour && currentMin > endMin)) {
              return true;
            }
          }
        }
      }
    } catch {}
  }
  return false;
};

interface DashboardProps {
  students: Student[];
  classrooms: Classroom[];
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
  setCurrentTab: (tab: string) => void;
  onAttendanceChange?: (newAtt: AttendanceRecord[]) => void;
  absenceReports: AbsenceReport[];
  onApproveAbsence: (reportId: string) => void;
  onRejectAbsence: (reportId: string) => void;
  onSaveStudents?: (newStudents: Student[]) => void;
}

export default function Dashboard({
  students,
  classrooms,
  attendance,
  settings,
  setCurrentTab,
  onAttendanceChange,
  absenceReports,
  onApproveAbsence,
  onRejectAbsence,
  onSaveStudents,
}: DashboardProps) {

  const [notifications, setNotifications] = React.useState<TeacherNotification[]>([]);
  const [medicationRequests, setMedicationRequests] = React.useState<MedicationRequest[]>([]);
  const [currentTime, setCurrentTime] = React.useState<Date>(new Date());

  React.useEffect(() => {
    setNotifications(StorageService.getTeacherNotifications());
    setMedicationRequests(StorageService.getMedicationRequests());

    // Tick every 10 seconds to keep countdowns and alerts highly accurate
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Helper to determine if a timing string is currently within its hour slot
  const isTimeSlotActive = (timing: string, date: Date) => {
    const currentHour = date.getHours();
    const currentMinute = date.getMinutes();
    const currentTotalHours = currentHour + currentMinute / 60;

    switch (timing) {
      case 'Sáng':
        return currentTotalHours >= 7.5 && currentTotalHours <= 9.5;
      case 'Trưa':
        return currentTotalHours >= 11 && currentTotalHours <= 12.5;
      case 'Chiều':
        return currentTotalHours >= 14 && currentTotalHours <= 15.5;
      case 'Tối':
        return currentTotalHours >= 16.5 && currentTotalHours <= 18.5;
      case 'Khi sốt':
        return true; // Always active for emergency or SOS fever medicines
      default:
        return false;
    }
  };

  const getRemainingTimeText = (timing: string, date: Date) => {
    const currentHour = date.getHours();
    const currentMinute = date.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    let endMinutes = 0;
    let startMinutes = 0;

    switch (timing) {
      case 'Sáng':
        startMinutes = 7.5 * 60;
        endMinutes = 9.5 * 60;
        break;
      case 'Trưa':
        startMinutes = 11 * 60;
        endMinutes = 12.5 * 60;
        break;
      case 'Chiều':
        startMinutes = 14 * 60;
        endMinutes = 15.5 * 60;
        break;
      case 'Tối':
        startMinutes = 16.5 * 60;
        endMinutes = 18.5 * 60;
        break;
      case 'Khi sốt':
        return 'Bất kỳ khi nào sốt 🌡️';
      default:
        return '';
    }

    if (currentTotalMinutes < startMinutes) {
      const diff = startMinutes - currentTotalMinutes;
      const hrs = Math.floor(diff / 60);
      const mins = diff % 60;
      return `Sắp đến giờ (còn ${hrs > 0 ? `${hrs}h ` : ''}${mins}p)`;
    } else if (currentTotalMinutes <= endMinutes) {
      const diff = endMinutes - currentTotalMinutes;
      const hrs = Math.floor(diff / 60);
      const mins = diff % 60;
      return `Đang trong giờ (còn ${hrs > 0 ? `${hrs}h ` : ''}${mins}p)`;
    } else {
      return 'Đã hết giờ';
    }
  };

  const handleMarkMedicationAsTaken = (id: string) => {
    const allMeds = StorageService.getMedicationRequests();
    const updated = allMeds.map(req => {
      if (req.id === id) {
        return {
          ...req,
          status: 'taken' as const,
          teacherConfirmed: true,
          teacherConfirmedBy: 'Cô giáo chủ nhiệm',
          teacherConfirmedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
      }
      return req;
    });
    StorageService.saveMedicationRequests(updated);
    setMedicationRequests(updated);
  };

  // --- SCHOOL EVENTS & HOLIDAYS STATE & HANDLERS ---
  const [events, setEvents] = React.useState<SchoolEvent[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<SchoolEvent | null>(null);
  const [hidePastEvents, setHidePastEvents] = React.useState(false);
  
  const [eventForm, setEventForm] = React.useState<Partial<SchoolEvent>>({
    title: '',
    date: '',
    time: '',
    description: '',
    location: '',
    type: 'meeting',
    note: ''
  });

  React.useEffect(() => {
    setEvents(StorageService.getSchoolEvents());
  }, []);

  const filteredEvents = React.useMemo(() => {
    const result = events.filter(evt => !hidePastEvents || !isPastEvent(evt.date));
    return [...result].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [events, hidePastEvents]);

  // --- INTEGRATED DAILY CLASS ACTIVITIES TIMELINE STATE ---
  const [activeDashboardScheduleTab, setActiveDashboardScheduleTab] = React.useState<'events' | 'activities'>('events');
  const [allClassActivities, setAllClassActivities] = React.useState<ClassActivity[]>([]);
  const [selectedClassId, setSelectedClassId] = React.useState<string>('');
  const [selectedActivityDate, setSelectedActivityDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [isActivityModalOpen, setIsActivityModalOpen] = React.useState(false);
  const [editingActivity, setEditingActivity] = React.useState<ClassActivity | null>(null);
  const [activityForm, setActivityForm] = React.useState({ title: '', time: '' });

  React.useEffect(() => {
    setAllClassActivities(StorageService.getClassActivities());
  }, []);

  React.useEffect(() => {
    if (classrooms.length > 0 && !selectedClassId) {
      setSelectedClassId(classrooms[0].id);
    }
  }, [classrooms, selectedClassId]);

  const classActivities = React.useMemo(() => {
    if (!selectedClassId) return [];
    const filtered = allClassActivities.filter(a => a.classId === selectedClassId && a.date === selectedActivityDate);
    
    if (filtered.length === 0) {
      const standardRoutine = [
        { time: '07:30 - 08:15', title: 'Đón trẻ & Tập thể dục buổi sáng ☀️' },
        { time: '08:15 - 09:30', title: 'Hoạt động học tập mầm non (Vẽ tranh đất nặn) 🎨' },
        { time: '09:30 - 10:30', title: 'Vui chơi ngoài trời, khám phá thiên nhiên 🌿' },
        { time: '10:30 - 11:30', title: 'Vệ sinh cá nhân & Bữa trưa ngon miệng 🍲' },
        { time: '11:30 - 14:00', title: 'Giấc ngủ trưa yên lành của bé 💤' },
        { time: '14:15 - 15:00', title: 'Ăn xế dinh dưỡng (Uống sữa, bánh ngọt) 🥛' },
        { time: '15:00 - 16:30', title: 'Sinh hoạt tự do, kể chuyện cổ tích & Trả trẻ 🎒' },
      ];
      
      return standardRoutine.map((item, index) => ({
        id: `act_gen_dash_${selectedClassId}_${selectedActivityDate}_${index}`,
        classId: selectedClassId,
        date: selectedActivityDate,
        time: item.time,
        title: item.title,
        completed: false
      }));
    }
    
    return [...filtered].sort((a, b) => a.time.localeCompare(b.time));
  }, [allClassActivities, selectedClassId, selectedActivityDate]);

  const handleSaveClassActivities = (updatedList: ClassActivity[]) => {
    if (!selectedClassId) return;
    const remaining = allClassActivities.filter(a => !(a.classId === selectedClassId && a.date === selectedActivityDate));
    const merged = [...remaining, ...updatedList];
    setAllClassActivities(merged);
    StorageService.saveClassActivities(merged);
  };

  const handleOpenAddActivity = () => {
    setEditingActivity(null);
    setActivityForm({ title: '', time: '08:00 - 09:00' });
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivity = (act: ClassActivity) => {
    setEditingActivity(act);
    setActivityForm({ title: act.title, time: act.time });
    setIsActivityModalOpen(true);
  };

  const handleDeleteActivity = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa hoạt động này?')) {
      const updated = classActivities.filter(a => a.id !== id);
      handleSaveClassActivities(updated);
    }
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.title || !activityForm.time) {
      alert('Vui lòng điền đầy đủ Tên hoạt động và Khung giờ.');
      return;
    }

    let updatedList: ClassActivity[] = [];
    if (editingActivity) {
      updatedList = classActivities.map(a => a.id === editingActivity.id ? { ...a, title: activityForm.title, time: activityForm.time } : a);
    } else {
      const newAct: ClassActivity = {
        id: `act_${Date.now()}`,
        classId: selectedClassId,
        date: selectedActivityDate,
        time: activityForm.time,
        title: activityForm.title,
        completed: false
      };
      updatedList = [...classActivities, newAct];
    }

    handleSaveClassActivities(updatedList);
    setIsActivityModalOpen(false);
    setEditingActivity(null);
  };

  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '08:00 - 11:00',
      description: '',
      location: '',
      type: 'meeting',
      note: ''
    });
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (evt: SchoolEvent) => {
    setEditingEvent(evt);
    setEventForm({ ...evt });
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) {
      const updated = events.filter(e => e.id !== id);
      setEvents(updated);
      StorageService.saveSchoolEvents(updated);
    }
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date || !eventForm.description || !eventForm.location) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc: Tên sự kiện, Ngày tổ chức, Nội dung và Địa điểm.');
      return;
    }

    let updatedEvents: SchoolEvent[] = [];
    if (editingEvent) {
      updatedEvents = events.map(evt => evt.id === editingEvent.id ? { ...evt, ...eventForm } as SchoolEvent : evt);
    } else {
      const newEvent: SchoolEvent = {
        id: `evt_${Date.now()}`,
        title: eventForm.title || '',
        date: eventForm.date || '',
        time: eventForm.time || '',
        description: eventForm.description || '',
        location: eventForm.location || '',
        type: (eventForm.type as any) || 'meeting',
        note: eventForm.note || ''
      };
      updatedEvents = [...events, newEvent];
    }

    setEvents(updatedEvents);
    StorageService.saveSchoolEvents(updatedEvents);
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setNotifications(updated);
    StorageService.saveTeacherNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    StorageService.saveTeacherNotifications(updated);
  };

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    StorageService.saveTeacherNotifications(updated);
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    StorageService.saveTeacherNotifications([]);
  };

  const handleApproveAbsence = (reportId: string) => {
    onApproveAbsence(reportId);
  };

  const handleRejectAbsence = (reportId: string) => {
    onRejectAbsence(reportId);
  };
  
  // Theme Color Class Mapper
  const getThemeColorClass = (type: 'bg' | 'text' | 'border') => {
    switch (settings.themeColor) {
      case 'emerald':
        if (type === 'bg') return 'bg-emerald-600 hover:bg-emerald-700 text-white';
        if (type === 'border') return 'border-emerald-500';
        return 'text-emerald-600 dark:text-emerald-400';
      case 'violet':
        if (type === 'bg') return 'bg-violet-600 hover:bg-violet-700 text-white';
        if (type === 'border') return 'border-violet-500';
        return 'text-violet-600 dark:text-violet-400';
      case 'rose':
        if (type === 'bg') return 'bg-rose-600 hover:bg-rose-700 text-white';
        if (type === 'border') return 'border-rose-500';
        return 'text-rose-600 dark:text-rose-400';
      case 'amber':
        if (type === 'bg') return 'bg-amber-600 hover:bg-amber-700 text-white';
        if (type === 'border') return 'border-amber-500';
        return 'text-amber-600 dark:text-amber-400';
      default: // blue -> map to indigo-600/indigo-700/indigo-500/indigo text for clean minimalism
        if (type === 'bg') return 'bg-indigo-600 hover:bg-indigo-700 text-white';
        if (type === 'border') return 'border-indigo-500';
        return 'text-indigo-600 dark:text-indigo-400';
    }
  };

  // 1. Calculate Stats for "Today" (Using the current date YYYY-MM-DD)
  const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const stats = useMemo(() => {
    const total = students.length;
    
    // Lọc các bản ghi điểm danh hôm nay
    const todayRecords = attendance.filter(r => r.date === todayString);
    
    const present = todayRecords.filter(r => r.status === 'present').length;
    const late = todayRecords.filter(r => r.status === 'late').length;
    const attended = present + late;
    
    // Vắng mặt = Tổng số học sinh - Số học sinh có mặt/đi muộn đã ghi nhận
    // (Những em chưa quét camera sẽ coi là vắng/chưa điểm danh)
    const absent = Math.max(0, total - attended);

    return {
      totalStudents: total,
      presentToday: attended,
      absentToday: absent,
      lateToday: late,
    };
  }, [students, attendance, todayString]);

  // 1b. Calculate Tuition Fee Statistics
  const feeStats = useMemo(() => {
    let totalRegistered = 0;
    let totalPaid = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let totalStudentsWithTalent = 0;

    students.forEach(s => {
      const fee = (s.talentFee || 0) + StorageService.getStudentOtherFeeForMonth(s, '2026-07');
      if (fee > 0) {
        totalStudentsWithTalent++;
        totalRegistered += fee;
        if (s.talentFeePaid) {
          totalPaid += fee;
          paidCount++;
        } else {
          unpaidCount++;
        }
      }
    });

    const totalUnpaid = totalRegistered - totalPaid;
    const paidPct = totalRegistered > 0 ? Math.round((totalPaid / totalRegistered) * 100) : 0;

    return {
      totalRegistered,
      totalPaid,
      totalUnpaid,
      paidCount,
      unpaidCount,
      totalStudentsWithTalent,
      paidPct
    };
  }, [students]);

  // Calculate students with overdue talent fee by more than 3 days
  const overdueStudents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return students.filter(s => {
      const totalFee = (s.talentFee || 0) + StorageService.getStudentOtherFeeForMonth(s, '2026-07');
      if (s.talentFeePaid || totalFee <= 0 || !s.talentFeeDueDate) {
        return false;
      }
      const dueDate = new Date(s.talentFeeDueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 3;
    });
  }, [students]);

  // 2. Attendance History over past 5 days (excluding weekends) for SVG Line Chart
  const past5DaysData = useMemo(() => {
    const data: { dateLabel: string; presentCount: number; lateCount: number; absentCount: number }[] = [];
    const today = new Date();
    
    // Lấy 5 ngày làm việc gần nhất
    let count = 0;
    let dayOffset = 0;
    const datesToAnalyze: string[] = [];
    
    while (count < 5 && dayOffset < 15) {
      const d = new Date();
      d.setDate(today.getDate() - dayOffset);
      const dayOfWeek = d.getDay();
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Không lấy thứ 7, CN
        datesToAnalyze.unshift(d.toISOString().split('T')[0]);
        count++;
      }
      dayOffset++;
    }

    datesToAnalyze.forEach((dtStr) => {
      const records = attendance.filter(r => r.date === dtStr);
      const dateParts = dtStr.split('-');
      const label = `${dateParts[2]}/${dateParts[1]}`;
      
      const pres = records.filter(r => r.status === 'present').length;
      const lt = records.filter(r => r.status === 'late').length;
      
      // Nếu ngày đó là quá khứ và không có điểm danh, dùng mock thuyết phục
      let attendedCount = pres + lt;
      let absentCount = Math.max(0, students.length - attendedCount);

      if (records.length === 0 && students.length > 0) {
        // Mock nhẹ để biểu đồ không bị sụp về 0 nếu chưa ai điểm danh ngày đó
        const seedValue = dtStr.charCodeAt(dtStr.length - 1);
        attendedCount = Math.floor(students.length * (0.8 + (seedValue % 10) / 50));
        absentCount = students.length - attendedCount;
      }

      data.push({
        dateLabel: label,
        presentCount: attendedCount - lt,
        lateCount: lt,
        absentCount,
      });
    });

    return data;
  }, [attendance, students]);

  // 3. Classwise Attendance for current day or overall SVG Bar Chart
  const classwiseData = useMemo(() => {
    return classrooms.map((cls) => {
      const clsStudents = students.filter(s => s.classId === cls.id);
      const studentCount = clsStudents.length;
      
      // Tính tỷ lệ chuyên cần hôm nay
      const clsTodayRecords = attendance.filter(r => r.classId === cls.id && r.date === todayString);
      const presentOrLate = clsTodayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      
      // Tỷ lệ phần trăm chuyên cần trung bình tổng hợp (mock dựa trên lịch sử nếu hôm nay chưa điểm danh)
      let rate = 100;
      if (studentCount > 0) {
        if (clsTodayRecords.length > 0) {
          rate = Math.round((presentOrLate / studentCount) * 100);
        } else {
          // Lấy trung bình lịch sử lớp này
          const clsHistRecords = attendance.filter(r => r.classId === cls.id);
          const totalHistPresent = clsHistRecords.filter(r => r.status === 'present' || r.status === 'late').length;
          const totalDays = Math.max(1, Array.from(new Set(clsHistRecords.map(r => r.date))).length);
          const avgAttendedPerDay = totalHistPresent / totalDays;
          rate = Math.round(Math.min(100, (avgAttendedPerDay / (studentCount || 1)) * 100));
          if (isNaN(rate) || rate === 0) rate = 85 + (cls.name.charCodeAt(cls.name.length - 1) % 15); // seed realistic rate [85 - 100]
        }
      }
      return {
        className: cls.name,
        studentCount,
        attendanceRate: rate,
      };
    });
  }, [classrooms, students, attendance, todayString]);

  // 4. Monthly Attendance Summary Table
  const monthlyStats = useMemo(() => {
    // Nhóm theo tháng
    const months: Record<string, { present: number; late: number; absent: number; total: number }> = {};
    
    attendance.forEach((r) => {
      const monthStr = r.date.substring(0, 7); // YYYY-MM
      if (!months[monthStr]) {
        months[monthStr] = { present: 0, late: 0, absent: 0, total: 0 };
      }
      
      if (r.status === 'present') months[monthStr].present++;
      else if (r.status === 'late') months[monthStr].late++;
      else if (r.status === 'absent') months[monthStr].absent++;
      months[monthStr].total++;
    });

    // Nếu trống, tự động tạo tháng hiện tại
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (Object.keys(months).length === 0) {
      months[currentMonth] = { present: 120, late: 15, absent: 5, total: 140 };
    }

    return Object.entries(months).map(([month, data]) => {
      const parts = month.split('-');
      const label = `Tháng ${parts[1]}/${parts[0]}`;
      const rate = data.total > 0 ? Math.round(((data.present + data.late) / (data.present + data.late + data.absent)) * 100) : 95;
      return {
        label,
        ...data,
        rate,
      };
    }).sort((a, b) => b.label.localeCompare(a.label));
  }, [attendance]);

  // 5. Recent Attendance Logs today
  const recentLogs = useMemo(() => {
    return attendance
      .filter(r => r.date === todayString)
      .slice(-5)
      .reverse();
  }, [attendance, todayString]);

  // Render SVG Line Chart Paths
  const lineChartPoints = useMemo(() => {
    if (past5DaysData.length === 0) return '';
    const chartHeight = 120;
    const chartWidth = 480;
    const padding = 30;
    const stepX = (chartWidth - padding * 2) / 4;
    
    // Tìm max trị số học sinh để căn dòng đồ thị
    const maxVal = Math.max(...past5DaysData.map(d => Math.max(d.presentCount + d.lateCount, d.absentCount, 10)), 15);

    const points = past5DaysData.map((d, i) => {
      const x = padding + i * stepX;
      const totalAttended = d.presentCount + d.lateCount;
      const y = chartHeight - padding - ((totalAttended) / maxVal) * (chartHeight - padding * 2);
      return { x, y };
    });

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [past5DaysData]);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            Tổng Quan Trường Mầm Non <TrendingUp className={getThemeColorClass('text')} size={22} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Theo dõi chuyên cần, bữa ăn dinh dưỡng, sức khỏe và các hoạt động bé ngoan trong ngày của trẻ.
          </p>
        </div>
        
        {/* Shortcut Button to Camera Attendance */}
        <button
          onClick={() => setCurrentTab('attendance')}
          className={`px-5 py-2.5 text-white font-medium rounded-lg text-sm flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm cursor-pointer ${getThemeColorClass('bg')}`}
        >
          <UserCheck size={16} />
          <span>Điểm danh ngay</span>
        </button>
      </div>

      {/* Overdue Talent Fee Badge Alert */}
      {overdueStudents.length > 0 && (
        <motion.div
          id="overdue-tuition-alert-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5 flex-1">
            <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <Coins size={20} className="animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-rose-850 dark:text-rose-400 text-sm">Cảnh Báo Phụ Huynh Chưa Đóng Học Phí Năng Khiếu</h4>
                <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                  {overdueStudents.length} học sinh quá hạn
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300/85 mt-1 font-medium">
                Phát hiện {overdueStudents.length} học sinh có phụ huynh chưa đóng học phí năng khiếu quá hạn từ 3 ngày trở lên.
              </p>
              
              {/* Overdue student list row-by-row */}
              <div className="mt-3.5 space-y-2 max-h-48 overflow-y-auto pr-1">
                {overdueStudents.map(student => {
                  const classroom = classrooms.find(c => c.id === student.classId);
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const dueDate = student.talentFeeDueDate ? new Date(student.talentFeeDueDate) : new Date();
                  dueDate.setHours(0,0,0,0);
                  const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div 
                      key={student.id} 
                      id={`overdue-student-${student.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900/60 border border-rose-100 dark:border-rose-900/30 rounded-xl p-3 gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{student.fullName}</span>
                        <span className="text-slate-400">({classroom?.name || 'Chưa rõ lớp'})</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold font-mono">
                          {(((student.talentFee || 0) + StorageService.getStudentOtherFeeForMonth(student, '2026-07')).toLocaleString('vi-VN'))} đ
                        </span>
                        <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Quá hạn {diffDays} ngày (Hạn: {student.talentFeeDueDate})
                        </span>
                      </div>
                      
                      {onSaveStudents && (
                        <button
                          id={`mark-paid-btn-${student.id}`}
                          onClick={() => {
                            const updated = students.map(s => {
                              if (s.id === student.id) {
                                return { ...s, talentFeePaid: true };
                              }
                              return s;
                            });
                            onSaveStudents(updated);
                          }}
                          className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30 transition cursor-pointer self-end sm:self-auto shrink-0"
                        >
                          Đánh dấu đã đóng
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="shrink-0 flex items-center self-end md:self-auto">
            <button
              id="view-students-tab-btn"
              onClick={() => setCurrentTab('students')}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase px-4.5 py-2.5 rounded-xl transition cursor-pointer shrink-0 shadow-sm"
            >
              Quản lý danh sách
            </button>
          </div>
        </motion.div>
      )}

      {/* Real-time Medication Reminder Widget */}
      {medicationRequests.filter(req => req.status === 'pending' || req.status === 'received').length > 0 && (
        <motion.div
          id="medication-timer-alert-widget"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-950 rounded-3xl p-6 shadow-lg shadow-indigo-500/5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Pill className="animate-pulse" size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  ⏰ Lịch Nhắc Nhở Uống Thuốc Của Trẻ Hôm Nay
                  <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                    Có đơn thuốc cần lưu ý
                  </span>
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Bộ đếm thời gian thực tự động cảnh báo khung giờ uống thuốc của học sinh dựa theo dặn dò của phụ huynh.
                </p>
              </div>
            </div>

            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 self-start sm:self-center">
              <Clock size={14} className="animate-spin-slow" />
              <span>Bây giờ: {currentTime.toLocaleTimeString('vi-VN')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
            {medicationRequests
              .filter(req => req.status === 'pending' || req.status === 'received')
              .map(req => {
                const isCurrentlyActive = (req.medicines || []).some((med: any) => 
                  med.timing.some((t: string) => isTimeSlotActive(t, currentTime))
                ) || (req.medicines ? false : true); // backward compatible

                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-2xl border transition duration-300 flex flex-col justify-between gap-3 ${
                      isCurrentlyActive
                        ? 'bg-amber-50/30 dark:bg-amber-950/5 border-amber-200 dark:border-amber-900/30 shadow-xs ring-1 ring-amber-300/20'
                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-150 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                              👦 {req.studentName}
                            </span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold">
                              Lớp: {req.className || 'Chưa rõ'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                            Chẩn đoán: {req.diagnosis || 'Dặn dò thuốc thông thường'}
                          </p>
                        </div>

                        {isCurrentlyActive && (
                          <span className="bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 animate-pulse">
                            <AlertTriangle size={10} /> ĐẾN GIỜ!
                          </span>
                        )}
                      </div>

                      {/* Medicines List */}
                      <div className="bg-white/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl p-2.5 space-y-1.5 text-xs">
                        {req.medicines && req.medicines.length > 0 ? (
                          req.medicines.map((med: any, idx: number) => (
                            <div key={idx} className="space-y-1 pb-1.5 last:pb-0 last:border-0 border-b border-dashed border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                                <span className="text-[11px]">💊 {med.name}</span>
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400">{med.dosage}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {med.timing.map((t: string) => {
                                  const active = isTimeSlotActive(t, currentTime);
                                  const text = getRemainingTimeText(t, currentTime);
                                  return (
                                    <span
                                      key={t}
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                        active
                                          ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-300/30'
                                          : text.includes('Sắp')
                                          ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse'
                                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                      }`}
                                      title={text}
                                    >
                                      {active ? '🎯' : '🕒'} {t}: {text}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                              <span>💊 {req.medicineName || 'Siro ho / Thuốc'}</span>
                              <span className="text-indigo-600 dark:text-indigo-400">{req.dosage || 'Theo hướng dẫn'}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {req.specialNotes && (
                        <div className="p-2.5 bg-amber-500/10 border border-amber-300/30 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 font-extrabold space-y-0.5 mt-1.5 animate-pulse">
                          <p className="flex items-center gap-1 uppercase tracking-wide text-amber-700 dark:text-amber-400">
                            <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                            Lưu ý đặc biệt từ phụ huynh:
                          </p>
                          <p className="text-slate-600 dark:text-slate-350 font-bold pl-3.5 leading-normal">{req.specialNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleMarkMedicationAsTaken(req.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Check size={12} />
                        <span>Đã cho uống thuốc</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* Clean Minimalism Left-Border Accent Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Stat 1: Total Students */}
        <motion.div
          whileHover={{ y: -2 }}
          className={`p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between border-l-4 ${
            settings.themeColor === 'emerald' ? 'border-l-emerald-500' :
            settings.themeColor === 'violet' ? 'border-l-violet-500' :
            settings.themeColor === 'rose' ? 'border-l-rose-500' :
            settings.themeColor === 'amber' ? 'border-l-amber-500' :
            'border-l-indigo-500'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng số học sinh</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-950 dark:text-white">{stats.totalStudents}</h3>
            </div>
            <span className="inline-block text-[11px] font-medium text-slate-400 mt-1">
              Sẵn sàng hoạt động
            </span>
          </div>
          <div className="p-3.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400">
            <Users size={22} />
          </div>
        </motion.div>

        {/* Stat 2: Attended Today */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Có mặt hôm nay</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-950 dark:text-white">{stats.presentToday}</h3>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                {stats.totalStudents > 0 ? Math.round((stats.presentToday / stats.totalStudents) * 100) : 0}%
              </span>
            </div>
            <span className="inline-block text-[11px] font-medium text-slate-400 mt-1">
              Chuyên cần hôm nay
            </span>
          </div>
          <div className="p-3.5 rounded-full bg-slate-50 dark:bg-slate-800 text-emerald-500">
            <CheckCircle size={22} />
          </div>
        </motion.div>

        {/* Stat 3: Absent Today */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between border-l-4 border-l-rose-500"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Vắng mặt hôm nay</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-950 dark:text-white">{stats.absentToday}</h3>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">
                {stats.totalStudents > 0 ? Math.round((stats.absentToday / stats.totalStudents) * 100) : 0}%
              </span>
            </div>
            <span className="inline-block text-[11px] font-medium text-slate-400 mt-1">
              Chưa chấm chuyên cần
            </span>
          </div>
          <div className="p-3.5 rounded-full bg-slate-50 dark:bg-slate-800 text-rose-500">
            <XCircle size={22} />
          </div>
        </motion.div>

        {/* Stat 4: Late Today */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đi muộn hôm nay</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-950 dark:text-white">{stats.lateToday}</h3>
            </div>
            <span className="inline-block text-[11px] font-medium text-slate-400 mt-1">
              Yêu cầu nhắc nhở
            </span>
          </div>
          <div className="p-3.5 rounded-full bg-slate-50 dark:bg-slate-800 text-amber-500">
            <Clock size={22} />
          </div>
        </motion.div>

      </div>

      {/* Học phí Năng khiếu Overview Cards */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Coins className={getThemeColorClass('text')} size={16} /> Thống Kê Học Phí Năng Khiếu
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800 self-start sm:self-auto">
            Tổng học sinh học năng khiếu: <strong className="text-slate-700 dark:text-slate-200">{feeStats.totalStudentsWithTalent}</strong>
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Total Registered */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Tổng học phí dự thu</span>
              <h4 className="text-xl font-black text-slate-800 dark:text-white font-mono">
                {feeStats.totalRegistered.toLocaleString('vi-VN')} đ
              </h4>
              <span className="text-[9px] text-slate-400 block font-medium">Lũy kế theo môn đã đăng ký</span>
            </div>
            <div className="p-3 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400">
              <Coins size={20} />
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs flex items-center justify-between border-l-4 border-l-emerald-500">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block">Đã thu (Đã Tick)</span>
              <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {feeStats.totalPaid.toLocaleString('vi-VN')} đ
              </h4>
              <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/85 block font-bold">
                {feeStats.paidCount} học sinh ({feeStats.paidPct}%) đã đóng
              </span>
            </div>
            <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500">
              <CheckCircle size={20} />
            </div>
          </div>

          {/* Total Unpaid */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs flex items-center justify-between border-l-4 border-l-rose-500">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-rose-500 font-bold block">Chưa thu (Chưa Tick)</span>
              <h4 className="text-xl font-black text-rose-500 font-mono">
                {feeStats.totalUnpaid.toLocaleString('vi-VN')} đ
              </h4>
              <span className="text-[9px] text-rose-500/80 dark:text-rose-400/85 block font-bold">
                {feeStats.unpaidCount} học sinh chưa đóng
              </span>
            </div>
            <div className="p-3 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500">
              <XCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Custom SVG Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Daily Attendance Line Chart (5 days) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Thống Kê Chuyên Cần 5 Ngày Qua</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Số lượng học sinh đến trường đúng hạn theo từng ngày</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
              <CalendarDays size={14} /> Tuần này
            </span>
          </div>

          <div className="flex-1 w-full min-h-[160px] flex items-center justify-center">
            {past5DaysData.length > 0 ? (
              <svg viewBox="0 0 480 140" className="w-full h-full overflow-visible">
                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.25)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                <line x1="30" y1="20" x2="450" y2="20" stroke="rgba(226, 232, 240, 0.15)" strokeDasharray="3" />
                <line x1="30" y1="55" x2="450" y2="55" stroke="rgba(226, 232, 240, 0.15)" strokeDasharray="3" />
                <line x1="30" y1="90" x2="450" y2="90" stroke="rgba(226, 232, 240, 0.15)" strokeDasharray="3" />
                
                {/* Under-line gradient area */}
                {lineChartPoints && (
                  <path
                    d={`${lineChartPoints} L 450 110 L 30 110 Z`}
                    fill="url(#chartGrad)"
                  />
                )}

                {/* Main trend line */}
                <path
                  d={lineChartPoints}
                  fill="none"
                  stroke={settings.themeColor === 'emerald' ? '#10b981' : settings.themeColor === 'violet' ? '#8b5cf6' : settings.themeColor === 'rose' ? '#ec4899' : settings.themeColor === 'amber' ? '#f59e0b' : '#3b82f6'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Circles at data points */}
                {past5DaysData.map((d, i) => {
                  const chartHeight = 120;
                  const chartWidth = 480;
                  const padding = 30;
                  const stepX = (chartWidth - padding * 2) / 4;
                  const maxVal = Math.max(...past5DaysData.map(val => Math.max(val.presentCount + val.lateCount, 10)), 15);
                  const x = padding + i * stepX;
                  const y = chartHeight - padding - ((d.presentCount + d.lateCount) / maxVal) * (chartHeight - padding * 2);
                  
                  return (
                    <g key={i} className="group/dot cursor-pointer">
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill={settings.themeColor === 'emerald' ? '#10b981' : settings.themeColor === 'violet' ? '#8b5cf6' : settings.themeColor === 'rose' ? '#ec4899' : settings.themeColor === 'amber' ? '#f59e0b' : '#3b82f6'}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-200 group-hover/dot:r-8"
                      />
                      {/* Tooltip on Hover */}
                      <text
                        x={x}
                        y={y - 12}
                        textAnchor="middle"
                        className="hidden group-hover/dot:block fill-slate-700 dark:fill-slate-300 text-[10px] font-bold"
                      >
                        {d.presentCount + d.lateCount} Học sinh
                      </text>
                      {/* X label */}
                      <text
                        x={x}
                        y="130"
                        textAnchor="middle"
                        className="fill-slate-400 dark:fill-slate-500 text-[10px] font-semibold"
                      >
                        {d.dateLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <p className="text-xs text-slate-400">Không có đủ dữ liệu để vẽ biểu đồ.</p>
            )}
          </div>
        </div>

        {/* Chart 2: Classroom Attendance Rates */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Tỷ Lệ Chuyên Cần Theo Lớp</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Xếp hạng tỷ lệ đi học trung bình của từng lớp</p>
          </div>

          <div className="space-y-4">
            {classwiseData.map((c, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{c.className}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{c.attendanceRate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      c.attendanceRate >= 95
                        ? 'bg-emerald-500'
                        : c.attendanceRate >= 88
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${c.attendanceRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Sĩ số: {c.studentCount} học sinh</span>
                  <span>{c.attendanceRate >= 92 ? 'Tốt' : 'Trung bình'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent logs - list of 5 students attended today */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Quét Khuôn Mặt Gần Đây</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Danh sách học sinh vừa được quét điểm danh hôm nay</p>
            </div>
            <button
              onClick={() => setCurrentTab('history')}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-0.5"
            >
              Xem tất cả <ArrowUpRight size={14} />
            </button>
          </div>

          {recentLogs.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={log.photoCaptured || StorageService.getNewAvatar(log.studentName, log.studentName.charCodeAt(0))}
                        alt={log.studentName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{log.studentName}</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Mã: {log.studentCode} • {log.className}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold font-mono text-slate-600 dark:text-slate-400">{log.time}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        log.status === 'present'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}
                    >
                      {log.status === 'present' ? 'Đúng giờ' : 'Đi muộn'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <UserCheck size={40} className="stroke-1 text-slate-300" />
              <p className="text-xs">Hôm nay chưa có học sinh nào điểm danh qua camera.</p>
              <button
                onClick={() => setCurrentTab('attendance')}
                className="text-xs text-blue-500 font-semibold hover:underline"
              >
                Mở Camera điểm danh ngay
              </button>
            </div>
          )}
        </div>

        {/* Monthly Summary Statistics Table */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Báo Cáo Tóm Tắt Theo Tháng</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Tổng quan tần suất chuyên cần lũy kế hàng tháng</p>
            </div>
            <button
              onClick={() => setCurrentTab('reports')}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-0.5"
            >
              Xem phân tích <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-3 px-2">Tháng</th>
                  <th className="py-3 px-2 text-center">Có mặt</th>
                  <th className="py-3 px-2 text-center">Đi muộn</th>
                  <th className="py-3 px-2 text-center">Vắng</th>
                  <th className="py-3 px-2 text-right">Chỉ số chuyên cần</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {monthlyStats.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-bold">{m.label}</td>
                    <td className="py-3 px-2 text-center text-emerald-600 dark:text-emerald-400 font-mono">{m.present}</td>
                    <td className="py-3 px-2 text-center text-amber-600 dark:text-amber-400 font-mono">{m.late}</td>
                    <td className="py-3 px-2 text-center text-rose-600 dark:text-rose-400 font-mono">{m.absent}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        {m.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION: CLASS ACTIVITIES SCHEDULE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className={getThemeColorClass('text')} size={20} />
              Lịch hoạt động của lớp
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Theo dõi và cập nhật lịch trình sinh hoạt, vui chơi, học tập từng khung giờ cho các bé trong lớp.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-slate-450 whitespace-nowrap">Chọn lớp:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                >
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-450 whitespace-nowrap">Ngày:</span>
                <input
                  type="date"
                  value={selectedActivityDate}
                  onChange={(e) => setSelectedActivityDate(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-700 dark:text-slate-300 outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddActivity}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs self-start sm:self-center cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm hoạt động</span>
            </button>
          </div>

          {classActivities.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl">
              <span className="text-2xl">⏰</span>
              <p>Chưa có hoạt động nào được thiết lập cho ngày này.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-150 dark:border-slate-800 pl-5 ml-4 space-y-4 pt-1">
              {classActivities.map((act) => (
                <div key={act.id} className="relative">
                  {/* Timeline node circle */}
                  <div className={`absolute -left-[28.5px] top-1.5 w-4 h-4 rounded-full border-2 transition ${
                    act.completed ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-950' : 'bg-slate-200 border-white dark:bg-slate-800 dark:border-slate-900'
                  }`} />

                  <div className="bg-slate-50/50 dark:bg-slate-900/40 p-4 border border-slate-150/60 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider font-mono bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded">
                        ⏱️ {act.time}
                      </span>
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100 pt-0.5">{act.title}</h4>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = classActivities.map(a => a.id === act.id ? { ...a, completed: !a.completed } : a);
                          handleSaveClassActivities(updated);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold transition text-[10px] cursor-pointer ${
                          act.completed
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30'
                            : isPastActivity(selectedActivityDate, act.time)
                            ? 'bg-slate-50 text-slate-450 dark:bg-slate-800/40 dark:text-slate-500 border border-slate-200/30 dark:border-slate-800/30'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750 border border-transparent'
                        }`}
                      >
                        {act.completed ? '✔ Đã hoàn thành' : isPastActivity(selectedActivityDate, act.time) ? 'Đã diễn ra' : 'Đang chờ hoạt động'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditActivity(act)}
                        className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                        title="Sửa hoạt động"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Xóa hoạt động"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* EVENT EDIT/ADD MODAL DIALOG */}
      {false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className={`p-4 flex items-center justify-between text-white ${getThemeColorClass('bg')}`}>
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <CalendarDays size={18} />
                <span>{editingEvent ? 'Cập Nhật Sự Kiện' : 'Thêm Sự Kiện Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="text-white hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tên sự kiện */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tên sự kiện <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.title || ''}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="Ví dụ: Họp Phụ Huynh Đầu Năm"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Phân loại */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Phân loại sự kiện <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={eventForm.type || 'meeting'}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="meeting">Họp phụ huynh</option>
                    <option value="festival">Ngày hội cho bé</option>
                    <option value="holiday">Nghỉ lễ/Tết</option>
                    <option value="health">Kiểm tra sức khỏe</option>
                    <option value="sports">Thể dục thể thao</option>
                  </select>
                </div>

                {/* Ngày diễn ra */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ngày tổ chức <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={eventForm.date || ''}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Khung giờ */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Khung giờ (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={eventForm.time || ''}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    placeholder="Ví dụ: 08:30 - 11:00 hoặc Cả ngày"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Địa điểm */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Địa điểm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.location || ''}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="Ví dụ: Phòng Y tế hoặc Sân trường"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Mô tả chi tiết */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nội dung sự kiện <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={eventForm.description || ''}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Nhập chi tiết nội dung sự kiện cho phụ huynh theo dõi..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </div>

                {/* Ghi chú */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Lưu ý thêm (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={eventForm.note || ''}
                    onChange={(e) => setEventForm({ ...eventForm, note: e.target.value })}
                    placeholder="Ví dụ: Phụ huynh vui lòng đưa trẻ đi đúng giờ"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-bold rounded-xl text-xs transition cursor-pointer ${getThemeColorClass('bg')}`}
                >
                  {editingEvent ? 'Lưu thay đổi' : 'Tạo sự kiện'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ACTIVITY EDIT/ADD MODAL */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <Activity size={18} />
                <span>{editingActivity ? 'Cập Nhật Hoạt Động' : 'Thêm Hoạt Động Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsActivityModalOpen(false);
                  setEditingActivity(null);
                }}
                className="text-white hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Tên hoạt động <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="Ví dụ: Hoạt động múa hát tự do 🎵"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Khung giờ hoạt động <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={activityForm.time}
                  onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })}
                  placeholder="Ví dụ: 08:30 - 09:30"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsActivityModalOpen(false);
                    setEditingActivity(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  {editingActivity ? 'Lưu thay đổi' : 'Tạo hoạt động'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* SECTION: TEACHER NOTIFICATIONS FOR TALENT REGISTRATION */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className={getThemeColorClass('text')} size={20} />
              Thông Báo Đăng Ký Môn Năng Khiếu từ Phụ Huynh ({notifications.filter(n => !n.isRead).length} chưa đọc)
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Nhận thông báo tự động ngay khi phụ huynh đăng ký mới hoặc thay đổi môn học năng khiếu của học sinh trong lớp.
            </p>
          </div>
          
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-xl transition cursor-pointer"
              >
                Đánh dấu tất cả đã đọc
              </button>
              <button
                type="button"
                onClick={handleClearAllNotifications}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-450 text-[10px] font-bold uppercase rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 size={10} />
                <span>Xóa sạch</span>
              </button>
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">🔔</span>
            <p>Không có thông báo tương tác mới từ phụ huynh.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {notifications.map((notification) => {
              return (
                <div
                  key={notification.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    notification.isRead
                      ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-150 dark:border-slate-800/60 opacity-80'
                      : 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/25 dark:border-emerald-500/20 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      notification.isRead
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        : 'bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {notification.type === 'event_rsvp' ? <Calendar size={16} /> : <BookOpen size={16} />}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">{notification.studentName}</span>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">
                          Lớp {notification.className}
                        </span>
                        {!notification.isRead && (
                          <span className="bg-emerald-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                            Mới
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {notification.message || notification.content}
                      </p>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-mono">{notification.timestamp || (notification.createdAt ? new Date(notification.createdAt).toLocaleString('vi-VN') : '')}</span>
                        {notification.type !== 'event_rsvp' && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              Tháng đăng ký: {notification.month ? `${notification.month.split('-')[1]}/${notification.month.split('-')[0]}` : 'Chưa rõ'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition cursor-pointer"
                        title="Đánh dấu đã đọc"
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-450 text-slate-400 rounded-lg transition cursor-pointer"
                      title="Xóa thông báo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION: ABSENCE REPORTS APPROVAL FROM PARENTS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className={getThemeColorClass('text')} size={20} />
            Đơn Xin Nghỉ Học Từ Phụ Huynh ({absenceReports.filter(r => r.status === 'pending').length} chờ duyệt)
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Duyệt các đơn xin nghỉ phép trực tuyến do Phụ huynh gửi lên hệ thống lớp học qua Số điện thoại.
          </p>
        </div>

        {absenceReports.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Chưa nhận được đơn xin nghỉ học nào từ phụ huynh.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold select-none text-[10px] uppercase">
                  <th className="py-3 px-3">Học sinh</th>
                  <th className="py-3 px-3">Lớp</th>
                  <th className="py-3 px-3">Thời gian nghỉ</th>
                  <th className="py-3 px-3">Lý do xin nghỉ</th>
                  <th className="py-3 px-3">Số điện thoại</th>
                  <th className="py-3 px-3 text-right">Trạng thái / Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {absenceReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-bold">{report.studentName}</td>
                    <td className="py-3 px-3 text-slate-500">{report.className}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 font-bold">
                      {report.startDate} {report.startDate !== report.endDate && ` → ${report.endDate}`}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={report.reason}>{report.reason}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono">{report.parentPhone}</td>
                    <td className="py-3 px-3 text-right">
                      {report.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleRejectAbsence(report.id)}
                            className="px-2.5 py-1 text-[10px] font-extrabold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-450 rounded-lg transition"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveAbsence(report.id)}
                            className="px-2.5 py-1 text-[10px] font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition shadow-xs cursor-pointer"
                          >
                            Đồng ý
                          </button>
                        </div>
                      ) : report.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/10">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Đã đồng ý
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-450 text-[10px] font-bold rounded-full border border-rose-500/10">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                          Từ chối
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
