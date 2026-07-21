/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  Calendar, 
  BookOpen, 
  Check, 
  Plus, 
  Clock, 
  Utensils, 
  User, 
  Sparkles, 
  FileText, 
  AlertCircle, 
  AlertTriangle,
  X, 
  LogOut, 
  ShieldCheck, 
  ChevronRight,
  ChevronLeft,
  Menu,
  Calculator,
  Smile,
  LogIn,
  Image as ImageIcon,
  Eye,
  Camera,
  Bell,
  CreditCard,
  QrCode,
  Coins,
  KeyRound,
  MapPin,
  Info,
  BellRing,
  Activity,
  Pill,
  Upload,
  ClipboardCheck,
  CheckCircle2,
  Trash2,
  Send,
  Printer
} from 'lucide-react';
import { UserSession, Student, Classroom, TalentSubject, WeeklyMenu, AbsenceReport, AttendanceRecord, HealthRecord, DailyAssessment, TeacherNotification, ClassActivity, ParentNotification, MedicationRequest, MedicineItem } from '../types';
import { StorageService } from '../utils/storage';
import ChangePasswordModal from './ChangePasswordModal';
import { registerParentFCMToken, sendFCMNotification, getLocalFCMLogs } from '../lib/fcmService';

export interface SchoolEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  description: string;
  location: string;
  type: 'meeting' | 'festival' | 'holiday' | 'health' | 'sports';
  note?: string;
}

const DEFAULT_EVENTS: SchoolEvent[] = [
  {
    id: 'evt_1',
    title: 'Họp Phụ Huynh Học Kỳ I',
    date: '2026-07-16',
    time: '08:30 - 11:00',
    description: 'Gặp gỡ giáo viên chủ nhiệm, thảo luận về chương trình học bán trú, hoạt động dã ngoại và định hướng chăm sóc giáo dục bé trong học kỳ mới.',
    location: 'Phòng sinh hoạt lớp chủ nhiệm của bé',
    type: 'meeting',
    note: 'Phụ huynh vui lòng đi đúng giờ và không dẫn theo các bé để buổi họp diễn ra tập trung nhất.'
  },
  {
    id: 'evt_2',
    title: 'Ngày Hội Đọc Sách & Sáng Tạo',
    date: '2026-07-22',
    time: '08:00 - 16:00',
    description: 'Bé tham gia trải nghiệm đọc sách tranh tương tác, thiết kế dấu trang sách (bookmark) xinh xắn và tham gia vẽ tranh cát sáng tạo cùng cô giáo.',
    location: 'Sân trường chính & Thư viện sách thiếu nhi',
    type: 'festival',
    note: 'Nhà trường khuyến khích phụ huynh tặng 1 cuốn sách cũ cho thư viện của trường để nhân rộng văn hóa đọc.'
  },
  {
    id: 'evt_3',
    title: 'Kỷ Niệm Ngày 27/7 (Học sinh nghỉ học)',
    date: '2026-07-27',
    time: 'Cả ngày',
    description: 'Nghỉ lễ tri ân ngày Thương binh - Liệt sĩ. Trường nghỉ dạy 01 ngày theo quy định nhà nước.',
    location: 'Nghỉ tại nhà',
    type: 'holiday',
    note: 'Các con nghỉ học và sinh hoạt tại gia đình. Thứ Ba ngày 28/7 trường đón các con đi học bình thường.'
  },
  {
    id: 'evt_4',
    title: 'Kiểm Tra Sức Khỏe & Răng Miệng Định Kỳ',
    date: '2026-08-04',
    time: '08:00 - 11:30',
    description: 'Đội ngũ bác sĩ từ bệnh viện Nhi đồng đến khám tai mũi họng, kiểm tra răng miệng, đo thị lực và đánh giá thể lực phát triển định kỳ cho các con.',
    location: 'Phòng Y tế trường',
    type: 'health',
    note: 'Phụ huynh cập nhật sổ theo dõi sức khỏe của con tại ứng dụng sau khi có kết quả từ bác sĩ.'
  },
  {
    id: 'evt_5',
    title: 'Ngày Hội Thể Thao "Little Olympics 2026"',
    date: '2026-08-15',
    time: '07:30 - 10:30',
    description: 'Sự kiện thể thao ngoài trời bùng nổ năng lượng cho các bé: Chạy tiếp sức, kéo co, nhảy bao bố và vượt chướng ngại vật liên hoàn.',
    location: 'Sân vận động thể chất ngoài trời của trường',
    type: 'sports',
    note: 'Phụ huynh vui lòng trang bị cho bé giày thể thao mềm, mũ che nắng và mặc đồng phục thể thao của trường.'
  }
];

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

interface ParentDashboardProps {
  session: UserSession;
  onLogout: () => void;
  settings: any;
}

export default function ParentDashboard({ session, onLogout, settings }: ParentDashboardProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);

  // School events state & filters
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [eventRsvps, setEventRsvps] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('sma_parent_event_rsvps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [selectedEventCategory, setSelectedEventCategory] = useState<string>('all');
  const [selectedEventDetails, setSelectedEventDetails] = useState<SchoolEvent | null>(null);
  const [hidePastEvents, setHidePastEvents] = useState<boolean>(false);

  const filteredEvents = useMemo(() => {
    const result = events
      .filter(evt => selectedEventCategory === 'all' || evt.type === selectedEventCategory)
      .filter(evt => !hidePastEvents || !isPastEvent(evt.date));
    
    // Sort chronologically by date
    return [...result].sort((a, b) => {
      return (a.date || '').localeCompare(b.date || '');
    });
  }, [events, selectedEventCategory, hidePastEvents]);

  const handleRsvpChange = (eventId: string, status: 'going' | 'cant') => {
    const key = `${eventId}_${session.parentPhone || 'anonymous'}`;
    const updated = {
      ...eventRsvps,
      [key]: status
    };
    setEventRsvps(updated);
    try {
      localStorage.setItem('sma_parent_event_rsvps', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    // Create Teacher Notification for event RSVP
    const student = selectedStudent || students[0];
    const event = events.find(e => e.id === eventId);
    if (student && event) {
      const statusText = status === 'going' ? 'THAM GIA' : 'BẬN/KHÔNG THAM GIA';
      const contentStr = `Phụ huynh đã xác nhận ${statusText} cho bé ${student.fullName} tham dự sự kiện "${event.title}".`;
      
      const newNotif: TeacherNotification = {
        id: 'notif_rsvp_' + Date.now(),
        studentId: student.id,
        studentName: student.fullName,
        classId: student.classId,
        className: selectedClass?.name || student.className || 'Lớp học',
        parentPhone: session.parentPhone || '',
        parentName: session.parentName || 'Phụ huynh',
        type: 'event_rsvp',
        content: contentStr,
        message: contentStr,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toLocaleString('vi-VN'),
        month: new Date().toISOString().substring(0, 7),
        isRead: false,
        read: false
      };

      try {
        const existingNotifs = StorageService.getTeacherNotifications();
        StorageService.saveTeacherNotifications([newNotif, ...existingNotifs]);
      } catch (e) {
        console.error('Error saving teacher notification:', e);
      }
    }
  };
  
  // Menu tab state: 'menu' | 'talent' | 'absence' | 'attendance' | 'health' | 'assessment' | 'activities' | 'events' | 'medication' | 'fcm'
  const [activeTab, setActiveTab] = useState<'menu' | 'talent' | 'absence' | 'attendance' | 'health' | 'assessment' | 'activities' | 'events' | 'medication' | 'fcm'>('menu');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isQuickMedModalOpen, setIsQuickMedModalOpen] = useState(false);

  // QR and FCM State variables
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [fcmToast, setFcmToast] = useState<{ id: string; title: string; body: string; type: string; sentAt: string } | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(() => localStorage.getItem("fcm_token_device"));
  const [isRegisteringFCM, setIsRegisteringFCM] = useState(false);

  // Subscribe to real-time mock FCM push notification broadcasts
  useEffect(() => {
    const handlePushReceived = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setFcmToast(customEvent.detail);
      }
    };
    window.addEventListener("fcm-push-received", handlePushReceived);
    return () => {
      window.removeEventListener("fcm-push-received", handlePushReceived);
    };
  }, []);

  // Auto-dismiss FCM notification toast after 6 seconds
  useEffect(() => {
    if (!fcmToast) return;
    const timer = setTimeout(() => {
      setFcmToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [fcmToast]);

  // FCM test form and log history states
  const [fcmTestType, setFcmTestType] = useState<'attendance_absent' | 'attendance_late' | 'school_news' | 'general'>('attendance_absent');
  const [fcmTestTitle, setFcmTestTitle] = useState('');
  const [fcmTestBody, setFcmTestBody] = useState('');
  const [fcmLogs, setFcmLogs] = useState<any[]>([]);
  const [selectedFcmLogPayload, setSelectedFcmLogPayload] = useState<string | null>(null);
  const [fcmLogInspectId, setFcmLogInspectId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Initialize FCM logs and set defaults on mount/student change
  useEffect(() => {
    setFcmLogs(getLocalFCMLogs());
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      if (fcmTestType === 'attendance_absent') {
        setFcmTestTitle(`Thông báo vắng học: Bé ${selectedStudent.fullName}`);
        setFcmTestBody(`Bé ${selectedStudent.fullName} lớp ${selectedStudent.className || 'Mầm non'} đã được giáo viên ghi nhận vắng mặt không phép trong buổi điểm danh hôm nay.`);
      } else if (fcmTestType === 'attendance_late') {
        setFcmTestTitle(`Thông báo đi trễ: Bé ${selectedStudent.fullName}`);
        setFcmTestBody(`Bé ${selectedStudent.fullName} lớp ${selectedStudent.className || 'Mầm non'} đã đến lớp muộn vào lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} hôm nay.`);
      } else if (fcmTestType === 'school_news') {
        setFcmTestTitle('Thông báo khẩn từ Nhà trường');
        setFcmTestBody(`Trường kính gửi Quý phụ huynh học sinh thông tin về kế hoạch tiêm chủng mở rộng phòng ngừa dịch bệnh mùa hè vào ngày mai.`);
      } else {
        setFcmTestTitle(`Tin nhắn từ Giáo viên: Bé ${selectedStudent.fullName}`);
        setFcmTestBody(`Hôm nay bé ${selectedStudent.fullName} ăn ngoan, chơi hòa đồng với các bạn và tích cực phát biểu xây dựng bài học.`);
      }
    }
  }, [selectedStudent, fcmTestType]);

  // Attendance Records history list
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [childHealthRecords, setChildHealthRecords] = useState<HealthRecord[]>([]);
  const [healthSubTab, setHealthSubTab] = useState<'indicators' | 'medication'>('indicators');
  const [medicationRequests, setMedicationRequests] = useState<MedicationRequest[]>([]);
  const [medDiagnosis, setMedDiagnosis] = useState('');
  const [medMedicineName, setMedMedicineName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medSpecialNotes, setMedSpecialNotes] = useState('');
  const [medList, setMedList] = useState<MedicineItem[]>([
    { id: 'med_item_' + Date.now() + '_0', name: '', dosage: '', timing: [], mealRelation: 'none' }
  ]);
  const [medPhoto, setMedPhoto] = useState<string | null>(null);
  const [medParentConfirmed, setMedParentConfirmed] = useState(false);
  const [isSendingMedication, setIsSendingMedication] = useState(false);
  const [medSuccess, setMedSuccess] = useState(false);
  const [medError, setMedError] = useState('');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [selectedAttendancePhoto, setSelectedAttendancePhoto] = useState<string | null>(null);
  const [isMedDragging, setIsMedDragging] = useState(false);

  const handleMedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMedError('Kích thước ảnh quá lớn (vui lòng chọn ảnh nhỏ hơn 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedPhoto(reader.result as string);
        setMedError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMedDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsMedDragging(true);
  };

  const handleMedDragLeave = () => {
    setIsMedDragging(false);
  };

  const handleMedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsMedDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMedError('Vui lòng chỉ tải lên tệp tin định dạng hình ảnh (PNG, JPG, JPEG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMedError('Kích thước ảnh quá lớn (vui lòng chọn ảnh nhỏ hơn 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedPhoto(reader.result as string);
        setMedError('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Daily Assessments state
  const [dailyAssessments, setDailyAssessments] = useState<DailyAssessment[]>([]);
  const [assessmentMonth, setAssessmentMonth] = useState('2026-07');

  // View mode for weekly menu: 'text' (bảng biểu) | 'image' (ảnh thực đơn gốc)
  const [menuViewMode, setMenuViewMode] = useState<'text' | 'image'>('text');
  
  // Weekly Menu data
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
  
  // Absence states
  const [absenceReports, setAbsenceReports] = useState<AbsenceReport[]>([]);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Register talent states
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>([]);
  const [isTalentSaving, setIsTalentSaving] = useState(false);
  const [talentSuccess, setTalentSuccess] = useState('');
  const [simulatedMonth, setSimulatedMonth] = useState('2026-07');
  const [isConfirmTalentModalOpen, setIsConfirmTalentModalOpen] = useState(false);
  const [isEditingTalent, setIsEditingTalent] = useState(false);

  // Parent notifications state
  const [parentNotifications, setParentNotifications] = useState<ParentNotification[]>([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  const loadParentNotifications = () => {
    const allNotifs = StorageService.getParentNotifications();
    if (selectedClass) {
      const filtered = allNotifs.filter(n => n.classId === selectedClass.id);
      setParentNotifications(filtered);
    } else {
      setParentNotifications([]);
    }
  };

  const handleMarkParentNotifAsRead = (id: string) => {
    const allNotifs = StorageService.getParentNotifications();
    const updated = allNotifs.map(n => n.id === id ? { ...n, isRead: true } : n);
    StorageService.saveParentNotifications(updated);
    if (selectedClass) {
      setParentNotifications(updated.filter(n => n.classId === selectedClass.id));
    }
  };

  const handleMarkAllParentNotifsAsRead = () => {
    if (!selectedClass) return;
    const allNotifs = StorageService.getParentNotifications();
    const updated = allNotifs.map(n => n.classId === selectedClass.id ? { ...n, isRead: true } : n);
    StorageService.saveParentNotifications(updated);
    setParentNotifications(updated.filter(n => n.classId === selectedClass.id));
  };

  const handleDeleteParentNotif = (id: string) => {
    const allNotifs = StorageService.getParentNotifications();
    const updated = allNotifs.filter(n => n.id !== id);
    StorageService.saveParentNotifications(updated);
    if (selectedClass) {
      setParentNotifications(updated.filter(n => n.classId === selectedClass.id));
    }
  };

  // Class activities states
  const [allClassActivities, setAllClassActivities] = useState<ClassActivity[]>([]);
  const [selectedActivityDate, setSelectedActivityDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    setAllClassActivities(StorageService.getClassActivities());
    loadParentNotifications();
  }, [activeTab, selectedClass]);

  const currentClassActivities = useMemo(() => {
    if (!selectedClass) return [];
    const filtered = allClassActivities.filter(
      a => a.classId === selectedClass.id && a.date === selectedActivityDate
    );
    
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
        id: `act_gen_${selectedClass.id}_${selectedActivityDate}_${index}`,
        classId: selectedClass.id,
        date: selectedActivityDate,
        time: item.time,
        title: item.title,
        completed: false
      }));
    }
    
    return [...filtered].sort((a, b) => a.time.localeCompare(b.time));
  }, [allClassActivities, selectedClass, selectedActivityDate]);

  // Payment states after talent registration
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentSubjects, setPaymentSubjects] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('qr');

  // Initial Load
  useEffect(() => {
    const loadedStudents = StorageService.getStudents();
    const loadedClassrooms = StorageService.getClassrooms();
    const parentPhone = session.parentPhone || '';
    
    // Find students matching this parent's phone number
    const parentStudents = loadedStudents.filter(s => 
      s.parentPhone === parentPhone || 
      s.fatherPhone === parentPhone || 
      s.motherPhone === parentPhone || 
      s.guardianPhone === parentPhone
    );
    setStudents(parentStudents);
    setClassrooms(loadedClassrooms);
    
    if (parentStudents.length > 0) {
      setSelectedStudent(parentStudents[0]);
    }
    
    // Load weekly menu
    setWeeklyMenu(StorageService.getWeeklyMenu());
    
    // Load absence reports for this parent
    const allReports = StorageService.getAbsenceReports();
    const filteredReports = allReports.filter(r => r.parentPhone === parentPhone);
    setAbsenceReports(filteredReports);

    // Load daily assessments
    setDailyAssessments(StorageService.getDailyAssessments());

    // Load school events
    setEvents(StorageService.getSchoolEvents());
  }, [session.parentPhone]);

  // Update selected class when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      const cls = classrooms.find(c => c.id === selectedStudent.classId) || null;
      setSelectedClass(cls);
      
      // Load student registered talent subjects and auto-add mandatory ones
      const registeredIds = StorageService.getStudentRegisteredTalentsForMonth(selectedStudent, simulatedMonth);
      const mandatoryIds = cls?.talentSubjects?.filter(s => s.isMandatory).map(s => s.id) || [];
      const classSubjectIds = cls?.talentSubjects?.map(s => s.id) || [];
      const combinedIds = Array.from(new Set([...registeredIds, ...mandatoryIds])).filter(id => classSubjectIds.includes(id));
      
      setSelectedTalentIds(combinedIds);
      setTalentSuccess('');
      setIsEditingTalent(false);

      // Load attendance logs for this child
      const allAttendance = StorageService.getAttendance();
      const childAttendance = allAttendance.filter(r => r.studentId === selectedStudent.id);
      setAttendanceRecords(childAttendance);

      // Load health records for this child
      const allHealth = StorageService.getHealthRecords();
      const childHealth = allHealth.filter(r => r.studentId === selectedStudent.id);
      setChildHealthRecords(childHealth);

      // Load medication requests for this child
      const allMeds = StorageService.getMedicationRequests();
      const childMeds = allMeds.filter(r => r.studentId === selectedStudent.id);
      setMedicationRequests(childMeds);

      // Reload daily assessments
      setDailyAssessments(StorageService.getDailyAssessments());
    } else {
      setSelectedClass(null);
      setAttendanceRecords([]);
      setChildHealthRecords([]);
      setMedicationRequests([]);
    }
  }, [selectedStudent, classrooms, simulatedMonth]);

  // Refresh absence reports list
  const refreshReports = () => {
    const allReports = StorageService.getAbsenceReports();
    const filteredReports = allReports.filter(r => r.parentPhone === session.parentPhone);
    setAbsenceReports(filteredReports);
  };

  const handleSendMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setMedError('Vui lòng chọn học sinh trước khi gửi thuốc.');
      return;
    }
    if (!medDiagnosis.trim()) {
      setMedError('Vui lòng nhập định bệnh/triệu chứng của bé.');
      return;
    }

    if (medList.length === 0) {
      setMedError('Vui lòng thêm ít nhất một loại thuốc dặn uống.');
      return;
    }

    // Validate medicines list
    for (let i = 0; i < medList.length; i++) {
      const med = medList[i];
      if (!med.name.trim()) {
        setMedError(`Vui lòng nhập tên thuốc cho loại thuốc thứ ${i + 1}.`);
        return;
      }
      if (!med.dosage.trim()) {
        setMedError(`Vui lòng nhập liều lượng/hướng dẫn sử dụng cho thuốc "${med.name}".`);
        return;
      }
      if (med.timing.length === 0) {
        setMedError(`Vui lòng chọn ít nhất một thời điểm uống cho thuốc "${med.name}".`);
        return;
      }
    }

    if (!medParentConfirmed) {
      setMedError('Bạn cần tích chọn xác nhận đồng ý gửi thuốc và chịu trách nhiệm hướng dẫn.');
      return;
    }

    setMedError('');
    setIsSendingMedication(true);

    const assembledMedicineNames = medList.map(m => m.name.trim()).join(', ');
    const assembledDosages = medList.map((m, idx) => {
      const formattedTiming = m.timing.map(t => t === 'Khi sốt' ? 'khi sốt 🌡️' : `buổi ${t}`);
      const timingText = m.timing.length > 0 ? `uống ${formattedTiming.join('/')}` : '';
      const mealText = m.mealRelation === 'before' ? 'trước ăn' : m.mealRelation === 'after' ? 'sau ăn' : 'không yêu cầu bữa ăn';
      const detailParts = [timingText, mealText].filter(Boolean).join(' - ');
      return `💊 [${m.name.trim()}]: ${m.dosage.trim()} (${detailParts})`;
    }).join('; ');

    // Simulate a network delay or just save directly
    setTimeout(() => {
      const newRequest: MedicationRequest = {
        id: 'med_' + Date.now(),
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        classId: selectedStudent.classId,
        className: selectedStudent.className || selectedClass?.name || '',
        diagnosis: medDiagnosis.trim(),
        medicineName: assembledMedicineNames,
        dosage: assembledDosages,
        prescriptionPhoto: medPhoto || undefined,
        parentConfirmed: true,
        parentPhone: session.parentPhone || '',
        parentName: session.parentName || 'Phụ huynh',
        teacherConfirmed: false,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        medicines: medList,
        specialNotes: medSpecialNotes.trim() || undefined
      };

      StorageService.addMedicationRequest(newRequest);

      // Send a notification to the teacher/classroom
      const noteContent = medSpecialNotes.trim() 
        ? `Phụ huynh dặn thuốc bé ${selectedStudent.fullName}: ${assembledMedicineNames}. Lưu ý đặc biệt: ${medSpecialNotes.trim()}`
        : `Phụ huynh dặn thuốc bé ${selectedStudent.fullName}: ${assembledMedicineNames}`;

      const newNotif: TeacherNotification = {
        id: 'notif_' + Date.now(),
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        classId: selectedStudent.classId,
        className: selectedStudent.className || selectedClass?.name || '',
        parentPhone: session.parentPhone || '',
        parentName: session.parentName || 'Phụ huynh',
        type: 'medication_request',
        content: noteContent,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        isRead: false
      };
      
      try {
        const existingNotifs = StorageService.getTeacherNotifications();
        StorageService.saveTeacherNotifications([newNotif, ...existingNotifs]);
      } catch (err) {
        console.error(err);
      }

      // Refresh state
      const allMeds = StorageService.getMedicationRequests();
      const childMeds = allMeds.filter(r => r.studentId === selectedStudent.id);
      setMedicationRequests(childMeds);

      // Reset form
      setMedDiagnosis('');
      setMedMedicineName('');
      setMedDosage('');
      setMedSpecialNotes('');
      setMedList([
        { id: 'med_item_' + Date.now() + '_0', name: '', dosage: '', timing: [], mealRelation: 'none' }
      ]);
      setMedPhoto(null);
      setMedParentConfirmed(false);
      setIsSendingMedication(false);
      setMedSuccess(true);
      setIsQuickMedModalOpen(false);

      setTimeout(() => {
        setMedSuccess(false);
      }, 4500);
    }, 600);
  };

  const handleDeleteMedRequest = (id: string) => {
    if (confirm('Bạn chắc chắn muốn hủy dặn thuốc này?')) {
      const allMeds = StorageService.getMedicationRequests();
      const filtered = allMeds.filter(m => m.id !== id);
      StorageService.saveMedicationRequests(filtered);
      if (selectedStudent) {
        setMedicationRequests(filtered.filter(r => r.studentId === selectedStudent.id));
      }
    }
  };

  const applyPresetMed = (type: 'siro' | 'cream') => {
    if (type === 'siro') {
      setMedDiagnosis('Sổ mũi, ho có đờm nhẹ');
      setMedMedicineName('Siro ho thảo dược Astex');
      setMedDosage('Uống 5ml sau bữa ăn trưa lúc 11:30. Ba mẹ đã chuẩn bị sẵn cốc đong có vạch chia độ trong balo con.');
      setMedSpecialNotes('Cần cho uống thêm nhiều nước ấm sau khi uống siro. Bé hơi nhạy cảm dễ sặc nên nhờ cô bón từng muỗng nhỏ.');
      setMedList([
        { id: 'med_preset_' + Date.now() + '_1', name: 'Siro ho thảo dược Astex', dosage: '5ml', timing: ['Trưa'], mealRelation: 'after' }
      ]);
      setMedPhoto('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=300&auto=format&fit=crop');
    } else {
      setMedDiagnosis('Khô da, mẩn đỏ dị ứng thời tiết');
      setMedMedicineName('Kem bôi Hidem Cream');
      setMedDosage('Thoa một lớp mỏng lên vùng cổ bẹn sau khi bé tắm lau khô người lúc 14:00.');
      setMedSpecialNotes('Chú ý không thoa lên vùng vết thương trầy xước hở. Chỉ bôi mỏng ngoài da sau khi bé tắm sạch.');
      setMedList([
        { id: 'med_preset_' + Date.now() + '_2', name: 'Kem bôi Hidem Cream', dosage: 'Thoa lớp mỏng', timing: ['Chiều'], mealRelation: 'none' }
      ]);
      setMedPhoto('https://images.unsplash.com/photo-1550572017-edd951b55104?q=80&w=300&auto=format&fit=crop');
    }
  };

  // Handle Talent Subjects registration toggle
  const handleTalentToggle = (subjectId: string) => {
    const isLocked = selectedStudent?.talentLastRegisteredMonth === simulatedMonth;
    if (isLocked) return; // Locked for the current month!
    if (!isEditingTalent) return; // Must click Change to edit!
    
    // Check if the subject is mandatory
    const isMandatory = selectedClass?.talentSubjects?.some(s => s.id === subjectId && s.isMandatory);
    if (isMandatory) return; // Cannot toggle off mandatory subjects!
    
    setTalentSuccess('');
    if (selectedTalentIds.includes(subjectId)) {
      setSelectedTalentIds(selectedTalentIds.filter(id => id !== subjectId));
    } else {
      setSelectedTalentIds([...selectedTalentIds, subjectId]);
    }
  };

  // Open confirmation dialog instead of saving immediately
  const handleSaveTalents = () => {
    if (!selectedStudent) return;
    const isLocked = selectedStudent?.talentLastRegisteredMonth === simulatedMonth;
    if (isLocked) return; // Locked for the current month!

    setTalentSuccess('');
    setIsConfirmTalentModalOpen(true);
  };

  // Actual Save & Notification trigger after confirmation
  const confirmSaveTalents = () => {
    if (!selectedStudent) return;
    setIsConfirmTalentModalOpen(false);
    setIsTalentSaving(true);
    setTalentSuccess('');

    setTimeout(() => {
      // Find matching class subjects to compute dynamic talent fee sum
      let totalFee = 0;
      const selectedSubjectNames: string[] = [];
      const selectedSubjectsList: any[] = [];
      if (selectedClass && selectedClass.talentSubjects) {
        selectedClass.talentSubjects.forEach(s => {
          if (selectedTalentIds.includes(s.id)) {
            totalFee += s.fee;
            selectedSubjectNames.push(s.name);
            selectedSubjectsList.push(s);
          }
        });
      }

      // Update student
      const allStudents = StorageService.getStudents();
      const updatedStudents = allStudents.map(s => {
        if (s.id === selectedStudent.id) {
          const map = s.registeredTalentsByMonth || {};
          return {
            ...s,
            registeredTalentsByMonth: {
              ...map,
              [simulatedMonth]: selectedTalentIds
            },
            registeredTalentSubjects: selectedTalentIds,
            talentFee: totalFee,
            talentLastRegisteredMonth: simulatedMonth,
          };
        }
        return s;
      });

      StorageService.saveStudents(updatedStudents);
      
      // Update selected student local state
      const updatedSelected = updatedStudents.find(s => s.id === selectedStudent.id) || null;
      if (updatedSelected) {
        setSelectedStudent(updatedSelected);
        setIsEditingTalent(false);
      }

      // CREATE TEACHER NOTIFICATION
      // Let's determine if it's a register or change
      const isChange = !!selectedStudent.talentLastRegisteredMonth;
      const oldSubjects = selectedStudent.registeredTalentSubjects || [];
      const addedIds = selectedTalentIds.filter(id => !oldSubjects.includes(id));
      const removedIds = oldSubjects.filter(id => !selectedTalentIds.includes(id));

      const addedNames = addedIds.map(id => selectedClass?.talentSubjects?.find(s => s.id === id)?.name).filter(Boolean);
      const removedNames = removedIds.map(id => selectedClass?.talentSubjects?.find(s => s.id === id)?.name).filter(Boolean);

      let content = '';
      let notifType: 'talent_register' | 'talent_change' = 'talent_register';
      
      if (addedNames.length > 0 && removedNames.length === 0) {
        content = `Phụ huynh đã ĐĂNG KÝ mới môn năng khiếu cho bé: ${addedNames.join(', ')} với học phí ${totalFee.toLocaleString('vi-VN')} đ/tháng cho tháng ${simulatedMonth}.`;
        notifType = 'talent_register';
      } else if (removedNames.length > 0 && addedNames.length === 0) {
        content = `Phụ huynh đã HỦY ĐĂNG KÝ môn năng khiếu: ${removedNames.join(', ')}. Danh sách môn còn học: ${selectedSubjectNames.join(', ') || 'Không có môn nào'} (Học phí mới: ${totalFee.toLocaleString('vi-VN')} đ/tháng).`;
        notifType = 'talent_change';
      } else if (addedNames.length > 0 && removedNames.length > 0) {
        content = `Phụ huynh đã THAY ĐỔI môn năng khiếu (ĐĂNG KÝ MỚI: ${addedNames.join(', ')} & HỦY ĐĂNG KÝ: ${removedNames.join(', ')}). Học phí mới: ${totalFee.toLocaleString('vi-VN')} đ/tháng.`;
        notifType = 'talent_change';
      } else {
        content = `Phụ huynh cập nhật lại danh sách môn năng khiếu của bé: ${selectedSubjectNames.join(', ') || 'Không đăng ký môn nào'}. Học phí: ${totalFee.toLocaleString('vi-VN')} đ/tháng.`;
        notifType = 'talent_change';
      }

      const newNotif: TeacherNotification = {
        id: 'notif_talent_' + Date.now(),
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        classId: selectedStudent.classId,
        className: selectedClass?.name || selectedStudent.className || 'Lớp học',
        parentPhone: session.parentPhone || '',
        parentName: session.parentName || 'Phụ huynh',
        type: notifType,
        content,
        createdAt: new Date().toISOString(),
        read: false,
        isRead: false,
      };

      const existingNotifs = StorageService.getTeacherNotifications();
      StorageService.saveTeacherNotifications([newNotif, ...existingNotifs]);
      
      setIsTalentSaving(false);
      setTalentSuccess(
        isChange
          ? `Đã thay đổi đăng ký môn năng khiếu thành công! Giáo viên chủ nhiệm đã nhận được thông báo.`
          : `Xác nhận đăng ký môn năng khiếu thành công và đã tự động gửi thông báo đến Giáo viên lớp!`
      );

      // Open payment modal if there is a positive fee
      const grandTotalFee = totalFee + StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth);
      if (grandTotalFee > 0) {
        setPaymentAmount(grandTotalFee);
        setPaymentSubjects(selectedSubjectsList);
        setPaymentMethod('qr');
        setIsPaymentModalOpen(true);
      }
    }, 600);
  };

  // Submit absence report
  const handleAbsenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedStudent || !selectedClass) {
      setFormError('Không có thông tin học sinh.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Vui lòng chọn ngày nghỉ học đầy đủ.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setFormError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Vui lòng nhập lý do nghỉ học.');
      return;
    }

    const newReport: AbsenceReport = {
      id: `abs_${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      classId: selectedStudent.classId,
      className: selectedClass.name,
      startDate,
      endDate,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      parentPhone: session.parentPhone || '',
    };

    const currentReports = StorageService.getAbsenceReports();
    StorageService.saveAbsenceReports([newReport, ...currentReports]);

    // Create Teacher Notification for leave request
    const newNotif: TeacherNotification = {
      id: `notif_abs_${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      classId: selectedStudent.classId,
      className: selectedClass.name,
      parentPhone: session.parentPhone || '',
      parentName: session.parentName || 'Phụ huynh',
      type: 'absence_request',
      content: `Phụ huynh gửi đơn xin nghỉ học từ ngày ${startDate} đến ${endDate}. Lý do: ${reason.trim()}`,
      createdAt: new Date().toISOString(),
      read: false,
      isRead: false,
    };
    const existingNotifs = StorageService.getTeacherNotifications();
    StorageService.saveTeacherNotifications([newNotif, ...existingNotifs]);

    setFormSuccess('Gửi đơn xin nghỉ học thành công! Đang chờ Nhà Trường phê duyệt.');
    setStartDate('');
    setEndDate('');
    setReason('');
    
    // Refresh lists
    refreshReports();
    
    setTimeout(() => {
      setIsAbsenceModalOpen(false);
      setFormSuccess('');
    }, 1500);
  };

  const handleConfirmPaymentSent = () => {
    if (!selectedStudent) return;
    
    const methodLabel = paymentMethod === 'qr' ? 'Chuyển khoản' : 'Tiền mặt';
    
    // 1. Cập nhật trạng thái đóng học phí của học sinh trong StorageService
    const allStudents = StorageService.getStudents();
    const updatedStudents = allStudents.map(s => {
      if (s.id === selectedStudent.id) {
        const paid = s.paidMonths || [];
        const payMethods = s.paymentMethodsByMonth || {};
        return {
          ...s,
          talentFeePaid: true,
          paymentMethod: methodLabel,
          paidMonths: Array.from(new Set([...paid, simulatedMonth])),
          paymentMethodsByMonth: {
            ...payMethods,
            [simulatedMonth]: methodLabel
          }
        };
      }
      return s;
    });

    StorageService.saveStudents(updatedStudents);

    // 2. Cập nhật các trạng thái cục bộ để giao diện đổi màu và cập nhật ngay lập tức
    const updatedSelected = updatedStudents.find(s => s.id === selectedStudent.id) || null;
    if (updatedSelected) {
      setSelectedStudent(updatedSelected);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedSelected : s));
    }

    // 3. Tạo thông báo cho giáo viên chủ nhiệm
    const newNotif: TeacherNotification = {
      id: 'notif_pay_' + Date.now(),
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      classId: selectedStudent.classId,
      className: selectedClass?.name || selectedStudent.className || 'Lớp học',
      parentPhone: session.parentPhone || '',
      parentName: session.parentName || 'Phụ huynh',
      type: 'fee_payment',
      content: `Phụ huynh báo ĐÃ THANH TOÁN (${methodLabel}) học phí năng khiếu tháng ${simulatedMonth.split('-')[1]} số tiền ${paymentAmount.toLocaleString('vi-VN')} đ cho bé ${selectedStudent.fullName}.`,
      createdAt: new Date().toISOString(),
      read: false,
      isRead: false,
    };

    const existingNotifs = StorageService.getTeacherNotifications();
    StorageService.saveTeacherNotifications([newNotif, ...existingNotifs]);

    alert(`Hệ thống đã tự động ghi nhận thanh toán thành công bằng hình thức ${methodLabel} cho bé ${selectedStudent.fullName}! Toàn bộ số tiền đã thu trên cổng quản trị sẽ tự động cập nhật.`);
    setIsPaymentModalOpen(false);
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/10">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Đã đồng ý
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full border border-rose-500/10">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
            Từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/10">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
            Đang chờ duyệt
          </span>
        );
    }
  };

  const menuItems = [
    { id: 'menu' as const, label: 'Thực đơn dinh dưỡng', icon: Utensils },
    { id: 'talent' as const, label: 'Đăng ký năng khiếu', icon: BookOpen },
    { id: 'absence' as const, label: 'Báo vắng trực tuyến', icon: FileText },
    { id: 'events' as const, label: 'Sự kiện & Ngày lễ', icon: Calendar },
    { id: 'attendance' as const, label: 'Nhật ký điểm danh', icon: Camera },
    { id: 'health' as const, label: 'Sức khỏe của con', icon: Heart },
    { id: 'assessment' as const, label: 'Đánh giá hằng ngày', icon: Smile },
    { id: 'activities' as const, label: 'Lịch hoạt động lớp', icon: Activity },
    { id: 'fcm' as const, label: 'Thông báo đẩy FCM', icon: BellRing },
  ];

  const getLogoBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600';
      case 'violet': return 'bg-violet-600';
      case 'rose': return 'bg-rose-600';
      case 'amber': return 'bg-amber-600';
      default: return 'bg-indigo-600';
    }
  };

  const getActiveItemClass = (itemId: string) => {
    if (activeTab === itemId) {
      switch (settings.themeColor) {
        case 'emerald': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold';
        case 'violet': return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 font-semibold';
        case 'rose': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold';
        case 'amber': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold';
        default: return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold';
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
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
          <h2 className="font-bold text-xs sm:text-sm leading-snug tracking-tight text-slate-800 dark:text-white line-clamp-2" title={settings.schoolName || 'EduAttend'}>
            {settings.schoolName || 'EduAttend'}
          </h2>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            CỔNG PHỤ HUYNH
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group cursor-pointer ${getActiveItemClass(
                item.id
              )}`}
            >
              <Icon size={18} className="shrink-0" />
              <span className={`transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'opacity-100 w-auto'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <button
          onClick={() => setIsChangePasswordOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-650 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 transition-all duration-200 cursor-pointer"
        >
          <KeyRound size={18} className="shrink-0" />
          <span className={`transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'opacity-100 w-auto'}`}>
            Đổi mật khẩu
          </span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={18} className="shrink-0" />
          <span className={`transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'opacity-100 w-auto'}`}>
            Đăng xuất
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${settings.themeColor === 'rose' ? 'bg-pink-50/50 dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'} text-slate-800 dark:text-slate-100 transition-colors duration-300`}>
      
      {/* Global Medication Request Success Toast */}
      {medSuccess && (
        <div className="fixed top-5 right-5 z-[250] max-w-md p-4 bg-emerald-500 text-white rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in font-extrabold text-xs">
          <CheckCircle2 size={18} className="shrink-0 animate-bounce" />
          <span>Gửi đơn dặn thuốc thành công! Đã gửi thông báo đến cô giáo lớp {selectedStudent?.className || selectedClass?.name || 'con'}. 🎉</span>
        </div>
      )}

      {/* 1. SIDEBAR DESKTOP */}
      <aside className={`hidden md:block shrink-0 h-screen sticky top-0 transition-all duration-300 z-20 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        {sidebarContent}
      </aside>

      {/* 2. SIDEBAR MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Sidebar Panel */}
          <aside className="relative w-64 max-w-xs h-full bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col">
            {sidebarContent}
            {/* Close button inside mobile menu */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </aside>
        </div>
      )}

      {/* 3. MAIN WORKING ZONE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen md:h-screen relative">
        
        {/* Top Header navbar */}
        <header className="no-print h-16 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 px-4 md:px-8 flex items-center justify-between z-20 shrink-0">
          
          <div className="flex items-center gap-3">
            {/* Hamburger button on Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 cursor-pointer"
              title={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            
            {/* Breadcrumb Info */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <span className="font-medium">Phụ huynh</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {activeTab === 'menu' ? 'Thực đơn dinh dưỡng tuần' :
                 activeTab === 'talent' ? 'Đăng ký môn năng khiếu' :
                 activeTab === 'absence' ? 'Báo vắng trực tuyến' :
                 activeTab === 'events' ? 'Sự kiện & Ngày lễ' :
                 activeTab === 'attendance' ? 'Nhật ký điểm danh' :
                 activeTab === 'health' ? 'Sức khỏe chỉ số của con' : 
                 activeTab === 'medication' ? 'Dặn thuốc y tế cho con' :
                 activeTab === 'activities' ? 'Lịch hoạt động của lớp con' : 'Đánh giá hằng ngày từ cô'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Cloud Sync Status Badge */}
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-full text-xs font-semibold select-none text-emerald-500 shrink-0" title="Hệ thống đã đồng bộ với đám mây Cloud Firebase">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="hidden xs:inline">Cloud Synced</span>
            </span>

            {/* Digital Clock display */}
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              <Clock size={14} className={settings.themeColor === 'rose' ? 'text-rose-500' : 'text-emerald-500'} />
              <span>{new Date().toLocaleDateString('vi-VN')}</span>
            </div>

            {/* Bell Notification Icon & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer"
                title="Thông báo"
              >
                <Bell size={18} />
                {parentNotifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {parentNotifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {isNotifDropdownOpen && (
                <>
                  {/* Invisible overlay to close on click outside */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsNotifDropdownOpen(false)}
                  />
                  
                  {/* Dropdown body */}
                  <div className="fixed md:absolute top-14 md:top-auto left-4 md:left-auto right-4 md:right-0 mt-2 w-auto md:w-80 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-40 overflow-hidden animate-fade-in">
                    <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        🔔 Thông báo của lớp ({parentNotifications.length})
                      </span>
                      {parentNotifications.filter(n => !n.isRead).length > 0 && (
                        <button
                          onClick={() => {
                            handleMarkAllParentNotifsAsRead();
                          }}
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Đọc tất cả
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {parentNotifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                          <span className="text-xl">📭</span>
                          <p className="text-xs">Không có thông báo nào từ lớp học.</p>
                        </div>
                      ) : (
                        parentNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3.5 transition duration-200 relative group flex gap-2.5 ${
                              notif.isRead 
                                ? 'opacity-70' 
                                : notif.type === 'medication_reject' 
                                  ? 'bg-rose-500/5 dark:bg-rose-950/5 border-l-2 border-rose-500' 
                                  : notif.type === 'attendance_scan' 
                                    ? 'bg-blue-500/5 dark:bg-blue-950/5 border-l-2 border-blue-500' 
                                    : notif.type === 'reminder_vaccine'
                                      ? 'bg-sky-500/5 dark:bg-sky-950/5 border-l-2 border-sky-500'
                                      : notif.type === 'reminder_payment'
                                        ? 'bg-amber-500/5 dark:bg-amber-950/5 border-l-2 border-amber-500'
                                        : notif.type === 'reminder_event'
                                          ? 'bg-emerald-500/5 dark:bg-emerald-950/5 border-l-2 border-emerald-500'
                                          : notif.type === 'reminder_holiday'
                                            ? 'bg-rose-500/5 dark:bg-rose-950/5 border-l-2 border-rose-500'
                                            : 'bg-emerald-500/5'
                            }`}
                          >
                            <div className="shrink-0 mt-0.5 text-base">
                              {notif.type === 'activity_create' ? (
                                <span className="text-emerald-500">✨</span>
                              ) : notif.type === 'medication_reject' ? (
                                <span className="text-rose-500">❌</span>
                              ) : notif.type === 'attendance_scan' ? (
                                <span className="text-blue-500">📸</span>
                              ) : notif.type === 'reminder_vaccine' ? (
                                <span className="text-sky-500">💉</span>
                              ) : notif.type === 'reminder_payment' ? (
                                <span className="text-amber-500">💰</span>
                              ) : notif.type === 'reminder_event' ? (
                                <span className="text-emerald-500">📅</span>
                              ) : notif.type === 'reminder_holiday' ? (
                                <span className="text-rose-500">🎏</span>
                              ) : (
                                <span className="text-blue-500">📝</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase font-mono">
                                  {notif.className}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(notif.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <h5 className={`text-xs font-bold leading-snug ${
                                notif.type === 'medication_reject' 
                                  ? 'text-rose-600 dark:text-rose-400' 
                                  : notif.type === 'attendance_scan' 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : notif.type === 'reminder_vaccine'
                                      ? 'text-sky-600 dark:text-sky-400'
                                      : notif.type === 'reminder_payment'
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : notif.type === 'reminder_event'
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : notif.type === 'reminder_holiday'
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-slate-800 dark:text-white'
                              }`}>
                                {notif.title}
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-normal">
                                {notif.type === 'attendance_scan' && notif.photo ? (
                                  <>
                                    {notif.content.replace('[Ấn vào để xem ảnh camera]', '').replace('[Ấn vào đây để xem ảnh camera]', '')}
                                    <button
                                      onClick={() => setSelectedAttendancePhoto(notif.photo)}
                                      className="inline-flex items-center gap-1 text-blue-650 dark:text-blue-450 font-black hover:underline cursor-pointer ml-1"
                                    >
                                      [Ấn vào đây để xem ảnh camera 📸]
                                    </button>
                                  </>
                                ) : (
                                  notif.content
                                )}
                              </p>

                              {notif.type === 'attendance_scan' && notif.photo && (
                                <div 
                                  onClick={() => setSelectedAttendancePhoto(notif.photo || null)}
                                  className="mt-2.5 relative inline-block cursor-pointer group/photo hover:scale-105 active:scale-95 transition-all duration-200"
                                  title="Xem ảnh camera kích thước đầy đủ"
                                >
                                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-500 shadow-md bg-slate-100 dark:bg-slate-800 group-hover/photo:border-blue-400 group-hover/photo:shadow-lg relative">
                                    <img src={notif.photo} className="w-full h-full object-cover" alt="Biometric scan snapshot" />
                                    <div className="absolute inset-0 bg-slate-950/15 group-hover/photo:bg-slate-950/40 transition-all duration-200 flex items-center justify-center">
                                      <Eye size={16} className="text-white opacity-0 group-hover/photo:opacity-100 drop-shadow-md transition-all duration-200 transform scale-75 group-hover/photo:scale-100" />
                                    </div>
                                  </div>
                                  <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[7px] font-black uppercase tracking-wider shadow-sm">CAM_01</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 pt-1.5">
                                {!notif.isRead && (
                                  <button
                                    onClick={() => handleMarkParentNotifAsRead(notif.id)}
                                    className={`text-[10px] font-bold hover:underline cursor-pointer ${notif.type === 'medication_reject' ? 'text-rose-600 dark:text-rose-400' : notif.type === 'attendance_scan' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                                  >
                                    Đọc
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteParentNotif(notif.id)}
                                  className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer ml-auto"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                            {!notif.isRead && (
                              <span className={`absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full ${notif.type === 'medication_reject' ? 'bg-rose-500' : notif.type === 'attendance_scan' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile Badge (Right) */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl shrink-0">
              <User size={13} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[85px] xs:max-w-[120px] sm:max-w-[180px] md:max-w-none truncate">
                {session.parentName || 'Phụ Huynh'}
              </span>
            </div>
          </div>

        </header>

        {/* Content area */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto pb-12">
          
          {/* Friendly Announcement Bar for Parents */}
          <div className={`mb-6 p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs transition-all duration-300 ${
            settings.themeColor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300' :
            settings.themeColor === 'violet' ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30 text-purple-800 dark:text-purple-300' :
            settings.themeColor === 'rose' ? 'bg-pink-50/50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30 text-pink-850 dark:text-pink-300' :
            settings.themeColor === 'amber' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-850 dark:text-amber-300' :
            'bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30 text-sky-850 dark:text-sky-300'
          }`}>
            <div className="flex items-center gap-3.5">
              <span className="text-3xl animate-bounce">🎈</span>
              <div>
                <h2 className="text-sm font-bold tracking-tight">
                  Chào mừng quý phụ huynh đến với Cổng Kết Nối Gia Đình <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{settings.schoolName || 'TRƯỜNG MẦM NON 3'}</span>!
                </h2>
                <p className="text-[11px] opacity-85 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                  <span>🏫 Cùng đồng hành và theo dõi hành trình học tập, phát triển toàn diện của bé yêu hằng ngày.</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-slate-800 text-[9px] font-bold text-rose-500">Kết Nối 2 Chiều 🌟</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <span className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-xs shadow-2xs select-none" title="Hoạt động nghệ thuật">🎨</span>
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-xs shadow-2xs select-none" title="Giờ ăn bổ dưỡng">🍎</span>
                <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-xs shadow-2xs select-none" title="Rèn luyện thể thao">⚽</span>
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs shadow-2xs select-none" title="Nhạc kịch vui tươi">🎵</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-800 border border-current/10 shadow-3xs text-slate-700 dark:text-slate-300">
                Thân Thiện & An Toàn ❤️
              </span>
            </div>
          </div>

          {/* 2. CHOOSE CHILDREN CARD */}
          {students.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Chưa tìm thấy học sinh liên kết</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Số điện thoại <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300">{session.parentPhone}</code> chưa được Ban Giám Hiệu gán cho học sinh nào. 
                Vui lòng liên hệ trực tiếp với Trường để được cập nhật hồ sơ của con mình.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Child Selector Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Chọn Con Của Bạn</span>
                <div className="flex flex-wrap gap-3">
                  {students.map(student => {
                    const isSelected = selectedStudent?.id === student.id;
                    return (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`px-4 py-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200/50 flex items-center justify-center bg-slate-100 shrink-0">
                          {student.avatar ? (
                            <img src={student.avatar} alt="Avatar con" className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {student.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Mã: {student.studentCode} • {student.className || 'Chưa xếp lớp'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            {/* Child Specific Info Quick Panel */}
            {selectedStudent && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-emerald-500/5 to-indigo-500/5 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="space-y-1.5 w-full sm:max-w-[70%]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Trạng Thái Đóng Học Phí (Tháng {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]})
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                      Tổng cộng: {((selectedStudent.talentFee || 0) + StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth)).toLocaleString('vi-VN')} đ
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium leading-relaxed space-y-1">
                      <span className="block">• Học phí năng khiếu: {(selectedStudent.talentFee || 0).toLocaleString('vi-VN')} đ</span>
                      {StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth) > 0 && (
                        <div className="text-rose-500 dark:text-rose-400 font-bold">
                          <span className="block">• Phí khác: {StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth).toLocaleString('vi-VN')} đ</span>
                          {StorageService.getStudentOtherFeesListForMonth(selectedStudent, simulatedMonth) && StorageService.getStudentOtherFeesListForMonth(selectedStudent, simulatedMonth).length > 0 ? (
                            <div className="pl-3.5 space-y-0.5 text-slate-450 dark:text-slate-500 font-normal">
                              {StorageService.getStudentOtherFeesListForMonth(selectedStudent, simulatedMonth).map((item, idx) => (
                                <span key={item.id || idx} className="block">- {item.name}: {item.amount.toLocaleString('vi-VN')} đ</span>
                              ))}
                            </div>
                          ) : (
                            StorageService.getStudentOtherFeeDescriptionForMonth(selectedStudent, simulatedMonth) && (
                              <span className="block pl-3.5 text-slate-450 dark:text-slate-500 italic font-normal">({StorageService.getStudentOtherFeeDescriptionForMonth(selectedStudent, simulatedMonth)})</span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 sm:ml-3 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 w-full sm:w-auto border-t sm:border-t-0 border-slate-150/40 dark:border-slate-800/40 pt-3 sm:pt-0">
                    {StorageService.isStudentPaidForMonth(selectedStudent, simulatedMonth) ? (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/10 flex items-center gap-1 whitespace-nowrap">
                        <Check size={13} /> Đã đóng
                      </span>
                    ) : (
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-500/10 whitespace-nowrap">
                          Chưa đóng
                        </span>
                        {((selectedStudent.talentFee || 0) + StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth)) > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const list = selectedClass?.talentSubjects?.filter(s => StorageService.getStudentRegisteredTalentsForMonth(selectedStudent, simulatedMonth).includes(s.id)) || [];
                              const talentFee = selectedStudent.talentFee || 0;
                              const otherFee = StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth);
                              setPaymentAmount(talentFee + otherFee);
                              setPaymentSubjects(list);
                              setPaymentMethod('qr');
                              setIsPaymentModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          >
                            <CreditCard size={12} /> Thanh toán
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
                  <div className="space-y-2 w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Lịch Học Năng Khiếu (Tháng {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]})
                    </span>
                    <div className="space-y-2">
                      {(() => {
                        const registeredIds = StorageService.getStudentRegisteredTalentsForMonth(selectedStudent, simulatedMonth);
                        return registeredIds && registeredIds.length > 0 ? (
                          registeredIds.map(tsId => {
                            const subj = selectedClass?.talentSubjects?.find(t => t.id === tsId);
                            if (!subj) return null;
                            return (
                              <div key={tsId} className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100/60 dark:border-indigo-950/40 space-y-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                    {subj.name}
                                  </span>
                                  <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    {subj.fee.toLocaleString('vi-VN')} đ
                                  </span>
                                </div>
                                {(subj.schedule || subj.timeSlot) && (
                                  <div className="grid grid-cols-1 gap-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100/50 dark:border-slate-800/50 pt-1.5 mt-1.5">
                                    {subj.schedule && (
                                      <div className="flex items-center gap-1.5">
                                        <Calendar size={11} className="text-emerald-500 shrink-0" />
                                        <span>Lịch: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{subj.schedule}</strong></span>
                                      </div>
                                    )}
                                    {subj.timeSlot && (
                                      <div className="flex items-center gap-1.5">
                                        <Clock size={11} className="text-amber-500 shrink-0" />
                                        <span>Giờ: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{subj.timeSlot}</strong></span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-slate-400 dark:text-slate-500 text-[11px] italic py-2">
                            Chưa đăng ký môn nào cho con
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-teal-500/5 to-cyan-500/5 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lớp học hiện tại</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">
                      {selectedStudent.className || 'Chưa xếp lớp'}
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-normal">
                      {selectedClass?.description || 'Niên khóa hiện tại'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQRModalOpen(true)}
                    className="bg-teal-600 hover:bg-teal-550 text-white text-[11px] font-extrabold px-3 py-2 rounded-xl transition-all shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0 ml-2"
                  >
                    <QrCode size={13} />
                    <span>Mã QR</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. UPCOMING SCHOOL EVENTS & HOLIDAYS */}
            {activeTab === 'events' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mt-6 animate-fade-in">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                      <Calendar size={18} />
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Lịch Sự Kiện & Ngày Lễ Sắp Tới
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cập nhật kế hoạch họp phụ huynh, ngày hội sáng tạo, khám sức khỏe và lịch nghỉ lễ của trường để đồng hành cùng bé.
                  </p>
                </div>

                 {/* Event Category Filters */}
                <div className="flex flex-wrap items-center gap-3 select-none">
                  <div className="flex flex-wrap gap-1.5 overflow-x-auto max-w-full">
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'meeting', label: 'Họp PH' },
                      { id: 'festival', label: 'Lễ hội' },
                      { id: 'holiday', label: 'Ngày nghỉ' },
                      { id: 'health', label: 'Sức khỏe' },
                      { id: 'sports', label: 'Thể thao' },
                    ].map(category => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedEventCategory(category.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                          selectedEventCategory === category.id
                            ? settings.themeColor === 'emerald' ? 'bg-emerald-600 text-white shadow-xs' :
                              settings.themeColor === 'violet' ? 'bg-violet-600 text-white shadow-xs' :
                              settings.themeColor === 'rose' ? 'bg-rose-600 text-white shadow-xs' :
                              settings.themeColor === 'amber' ? 'bg-amber-600 text-white shadow-xs' :
                              'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/40 dark:border-slate-700/40 hover:bg-slate-150 dark:hover:bg-slate-750 transition-all shadow-3xs whitespace-nowrap shrink-0">
                    <input
                      type="checkbox"
                      checked={hidePastEvents}
                      onChange={(e) => setHidePastEvents(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Ẩn sự kiện đã qua</span>
                  </label>
                </div>
              </div>

              {/* Grid of Events */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {filteredEvents.length === 0 ? (
                  <div className="col-span-full py-8 text-center bg-slate-55 dark:bg-slate-850/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Info size={24} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs text-slate-400 font-semibold italic">Không có sự kiện nào phù hợp hoặc các sự kiện đã qua đã bị ẩn.</p>
                  </div>
                ) : (
                  filteredEvents.map(event => {
                    const rsvpKey = `${event.id}_${session.parentPhone || 'anonymous'}`;
                    const rsvpStatus = eventRsvps[rsvpKey] || 'not_set';
                    
                    // Calculate calendar month and day safely
                    const dateParts = (event.date || '').split('-');
                    const monthLabel = dateParts[1] ? `Thg ${dateParts[1]}` : 'Thg --';
                    const day = dateParts[2] || '--';
                    
                    // Status and type badges styling
                    let badgeBg = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
                    let badgeText = 'Sự kiện';
                    let headerBg = 'bg-indigo-550/10 text-indigo-600 dark:bg-indigo-500/20';

                    if (event.type === 'meeting') {
                      badgeBg = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
                      badgeText = 'Họp phụ huynh';
                      headerBg = 'bg-purple-500/15 text-purple-600 dark:text-purple-400';
                    } else if (event.type === 'festival') {
                      badgeBg = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
                      badgeText = 'Ngày hội';
                      headerBg = 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
                    } else if (event.type === 'holiday') {
                      badgeBg = 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
                      badgeText = 'Nghỉ lễ';
                      headerBg = 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
                    } else if (event.type === 'health') {
                      badgeBg = 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
                      badgeText = 'Sức khỏe';
                      headerBg = 'bg-teal-500/15 text-teal-600 dark:text-teal-400';
                    } else if (event.type === 'sports') {
                      badgeBg = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
                      badgeText = 'Thể chất';
                      headerBg = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
                    }

                    // Check days remaining safely with local time timezone adjustment
                    let diffDays = 0;
                    let hasDateError = false;
                    try {
                      if (dateParts.length === 3) {
                        const yr = parseInt(dateParts[0], 10);
                        const mt = parseInt(dateParts[1], 10);
                        const dy = parseInt(dateParts[2], 10);
                        if (!isNaN(yr) && !isNaN(mt) && !isNaN(dy)) {
                          const evtDate = new Date(yr, mt - 1, dy);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const diffTime = evtDate.getTime() - today.getTime();
                          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        } else {
                          hasDateError = true;
                        }
                      } else {
                        hasDateError = true;
                      }
                    } catch {
                      hasDateError = true;
                    }

                    let diffLabel = '';
                    if (hasDateError) {
                      diffLabel = 'Chưa xác định';
                    } else if (diffDays === 0) {
                      diffLabel = 'Hôm nay';
                    } else if (diffDays === 1) {
                      diffLabel = 'Ngày mai';
                    } else if (diffDays > 1) {
                      diffLabel = `Còn ${diffDays} ngày`;
                    } else {
                      diffLabel = 'Đã diễn ra';
                    }

                      return (
                        <div
                          key={event.id}
                          className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                          {/* Left: Date Block */}
                          <div className="flex sm:flex-col items-center justify-center sm:w-16 h-16 sm:h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 text-center shadow-3xs">
                            <div className={`w-full sm:h-7 px-3 sm:px-0 flex items-center justify-center font-bold text-[10px] uppercase tracking-wider ${headerBg}`}>
                              {monthLabel}
                            </div>
                            <div className="flex-1 px-3 sm:px-0 flex items-center justify-center font-extrabold text-lg sm:text-xl text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-850 w-full">
                              {day}
                            </div>
                          </div>

                          {/* Right: Event Information */}
                          <div className="flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide ${badgeBg}`}>
                                  {badgeText}
                                </span>
                                {diffLabel && (
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                    diffDays === 0 || diffDays === 1 
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold animate-pulse' 
                                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                  }`}>
                                    {diffLabel}
                                  </span>
                                )}
                              </div>
                              
                              <h4 className="text-xs sm:text-sm font-extrabold text-slate-850 dark:text-slate-100 mt-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                                {event.title}
                              </h4>

                              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-normal">
                                {event.description}
                              </p>

                              <div className="grid grid-cols-1 gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-850/60 pt-2">
                                <div className="flex items-center gap-1.5">
                                  <Clock size={11} className="text-indigo-500 shrink-0" />
                                  <span>Thời gian: <strong className="text-slate-700 dark:text-slate-300">{event.time || 'Cả ngày'}</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <MapPin size={11} className="text-amber-500 shrink-0" />
                                  <span className="truncate">Địa điểm: <strong className="text-slate-700 dark:text-slate-300">{event.location}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* RSVP persistence block */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-850/60 mt-auto w-full">
                              {event.type === 'holiday' ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-500 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
                                  🏖️ Toàn trường nghỉ học
                                </span>
                              ) : (
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider shrink-0">Xác nhận:</span>
                                    <div className="flex flex-wrap items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleRsvpChange(event.id, 'going')}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                                          rsvpStatus === 'going'
                                            ? 'bg-emerald-500 text-white shadow-xs'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-450 dark:hover:bg-slate-700'
                                        }`}
                                      >
                                        <Check size={10} className="shrink-0" /> Tham gia
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRsvpChange(event.id, 'cant')}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                                          rsvpStatus === 'cant'
                                            ? 'bg-rose-500 text-white shadow-xs'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-450 dark:hover:bg-slate-700'
                                        }`}
                                      >
                                        <X size={10} className="shrink-0" /> Bận
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedEventDetails(event)}
                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer whitespace-nowrap self-end"
                              >
                                Chi tiết →
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* 4. ACTIVE TAB PANEL RENDERING */}
            <div className="min-h-[400px] mt-4">
              
              {/* TAB 1: WEEKLY MENU PANEL */}
              {activeTab === 'menu' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Utensils size={20} className="text-amber-500" />
                        Thực Đơn Dinh Dưỡng Cho Bé Tuần Này
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Thực đơn được xây dựng khoa học bởi Chuyên gia dinh dưỡng và Ban Giám Hiệu nhằm mang lại bữa ăn ngon miệng nhất cho các bé.
                      </p>
                    </div>
                    <span className="self-start sm:self-center bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-amber-500/10 flex items-center gap-1 shrink-0">
                      <Sparkles size={11} className="animate-spin" style={{ animationDuration: '3s' }} /> Mẫu Chuẩn Quốc Gia
                    </span>
                  </div>

                  {/* SUB-TABS TO SWITCH VIEW MODES */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 select-none pt-2 overflow-x-auto scrollbar-none max-w-full">
                    <button
                      type="button"
                      onClick={() => setMenuViewMode('text')}
                      className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                        menuViewMode === 'text'
                          ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                          : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <FileText size={13} />
                      Chi tiết thực đơn (Dạng bảng chữ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuViewMode('image')}
                      className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                        menuViewMode === 'image'
                          ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                          : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <ImageIcon size={13} />
                      Ảnh thực đơn gốc của trường
                      {weeklyMenu?.menuImage && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      )}
                    </button>
                  </div>

                  {weeklyMenu ? (
                    menuViewMode === 'image' ? (
                      /* SHOW IMAGE MODE */
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                        {weeklyMenu.menuImage ? (
                          <div className="space-y-4 w-full flex flex-col items-center">
                            <p className="text-xs text-slate-400">Ảnh chụp thực đơn gốc từ bảng thông báo của trường:</p>
                            <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-w-lg shadow-md group">
                              <img 
                                src={weeklyMenu.menuImage} 
                                alt="Official School Menu Poster" 
                                className="max-w-full h-auto object-contain cursor-zoom-in rounded-xl max-h-[500px]"
                                onClick={() => {
                                  // Open raw image in window or zoom
                                  const win = window.open();
                                  if (win) {
                                    win.document.write(`<iframe src="${weeklyMenu.menuImage}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  } else {
                                    alert("Để xem rõ hơn, vui lòng bật cửa sổ popups trên trình duyệt.");
                                  }
                                }}
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                <span className="bg-white/95 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 pointer-events-none">
                                  <Eye size={13} /> Xem kích thước lớn
                                </span>
                              </div>
                            </div>
                            <a
                              href={weeklyMenu.menuImage}
                              download="Thuc_Don_Tuan_Truong_Mam_Non.png"
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-250 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                            >
                              Tải ảnh thực đơn về máy
                            </a>
                          </div>
                        ) : (
                          <div className="p-8 text-center flex flex-col items-center gap-3">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full">
                              <ImageIcon size={28} />
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-slate-750 dark:text-slate-300 text-sm">Chưa có ảnh thực đơn gốc</p>
                              <p className="text-xs text-slate-400 max-w-sm">Nhà trường chưa cập nhật ảnh chụp thực đơn tuần này. Quý phụ huynh vui lòng nhấp vào tab "Chi tiết thực đơn" bên cạnh để xem dạng chữ chi tiết.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* SHOW TEXT CARD MODE */
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Monday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Hai</span>
                          <span className="text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded font-bold">Thứ 2 đầu tuần</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.monday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.monday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.monday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.monday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.monday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>

                      {/* Tuesday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Ba</span>
                          <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded font-bold">Bữa ăn giàu kẽm</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.tuesday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.tuesday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.tuesday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.tuesday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.tuesday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>

                      {/* Wednesday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Tư</span>
                          <span className="text-[10px] text-violet-500 bg-violet-50 dark:bg-violet-950/20 px-1.5 py-0.5 rounded font-bold">Thực đơn canxi</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.wednesday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.wednesday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.wednesday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.wednesday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.wednesday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>

                      {/* Thursday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Năm</span>
                          <span className="text-[10px] text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded font-bold">Dinh dưỡng vàng</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.thursday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.thursday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.thursday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.thursday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.thursday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>

                      {/* Friday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Sáu</span>
                          <span className="text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded font-bold">Tổng kết tuần</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.friday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.friday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.friday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.friday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.friday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl text-xs text-slate-400">
                      Chưa cấu hình thực đơn tuần mầm non.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TALENT REGISTRATION PANEL */}
              {activeTab === 'talent' && selectedStudent && (() => {
                const isLocked = selectedStudent.talentLastRegisteredMonth === simulatedMonth;
                return (
                  <div className="space-y-5 animate-fade-in">
                    {/* CONFIRMATION MODAL FOR TALENT REGISTRATION */}
                    {isConfirmTalentModalOpen && (
                      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-fade-in">
                          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                              <Bell size={22} className="animate-bounce" />
                            </div>
                            <div>
                              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                                {!selectedStudent.talentLastRegisteredMonth ? 'Xác Nhận Đăng Ký Năng Khiếu' : 'Xác Nhận Thay Đổi Đăng Ký'}
                              </h3>
                              <span className="text-[10px] text-slate-400 font-bold block">THÁNG GIẢ LẬP: {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]}</span>
                            </div>
                          </div>

                          <div className="space-y-3.5 text-xs">
                            <p className="text-slate-600 dark:text-slate-350 font-medium leading-relaxed">
                              Bạn đang thực hiện {!selectedStudent.talentLastRegisteredMonth ? 'đăng ký mới' : 'thay đổi'} môn năng khiếu cho bé <strong className="text-slate-800 dark:text-slate-200 font-bold">{selectedStudent.fullName}</strong>.
                            </p>

                            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2">
                              {(() => {
                                const actualCount = selectedClass?.talentSubjects?.filter(s => selectedTalentIds.includes(s.id)).length || 0;
                                return (
                                  <>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Môn học đã chọn ({actualCount}):</span>
                                    {actualCount === 0 ? (
                                      <span className="text-slate-500 font-bold italic">Không đăng ký môn nào (Hủy đăng ký)</span>
                                    ) : (
                                      <ul className="space-y-1 pl-3 list-disc text-slate-700 dark:text-slate-300 font-semibold">
                                        {selectedClass?.talentSubjects?.filter(s => selectedTalentIds.includes(s.id)).map(s => (
                                          <li key={s.id}>
                                            {s.name} ({(s.fee).toLocaleString('vi-VN')} đ)
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </>
                                );
                              })()}
                              <div className="border-t border-dashed border-slate-200 dark:border-slate-750 pt-2 flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                                <span>Dự kiến học phí:</span>
                                <span className="text-amber-600 dark:text-amber-400 font-mono">
                                  {(selectedClass?.talentSubjects
                                    ?.filter(s => selectedTalentIds.includes(s.id))
                                    ?.reduce((sum, current) => sum + current.fee, 0) || 0).toLocaleString('vi-VN')} đ/tháng
                                </span>
                              </div>
                            </div>

                            <div className="p-3.5 bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-450 rounded-2xl font-bold leading-relaxed space-y-1">
                              <span className="block text-[10px] uppercase">⚠️ LƯU Ý QUAN TRỌNG:</span>
                              <p className="font-medium text-[11px]">
                                Sau khi xác nhận, đăng ký này sẽ <strong>được khóa lại và không thể tự ý thay đổi</strong> trong tháng này. Đồng thời, hệ thống sẽ <strong>tự động gửi thông báo trực tiếp</strong> đến Giáo viên chủ nhiệm lớp của con.
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setIsConfirmTalentModalOpen(false)}
                              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 rounded-xl cursor-pointer"
                            >
                              Hủy bỏ
                            </button>
                            <button
                              type="button"
                              onClick={confirmSaveTalents}
                              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1"
                            >
                              <Check size={14} strokeWidth={3} />
                              <span>Xác nhận đăng ký</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <BookOpen size={20} className="text-emerald-500" />
                          Đăng Ký Khóa Học Năng Khiếu Cho Con
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Các lớp ngoại khóa năng khiếu giúp trẻ khám phá năng lực bản thân, nâng cao thể chất và tư duy một cách toàn diện.
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                        <span>Khóa tháng:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                          {selectedStudent.talentLastRegisteredMonth || 'Chưa đăng ký'}
                        </span>
                      </div>
                    </div>

                    {/* DYNAMIC TIME SIMULATION CONTROL BAR */}
                    <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl animate-spin">⚙️</span>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Bộ Giả Lập Thời Gian Hệ Thống</span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                            Chuyển đổi tháng để kiểm thử tính năng Khóa / Mở khóa thay đổi đăng ký:
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setSimulatedMonth('2026-07')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                            simulatedMonth === '2026-07'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          Tháng 07/2026
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulatedMonth('2026-08')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                            simulatedMonth === '2026-08'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          Tháng 08/2026 (Tháng sau)
                        </button>
                      </div>
                    </div>

                    {/* LOCK WARNING BANNER */}
                    {isLocked && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs rounded-2xl flex items-start gap-3 animate-fade-in">
                        <div className="p-1.5 bg-amber-500/15 rounded-lg shrink-0 text-amber-600 dark:text-amber-400 mt-0.5">
                          <ShieldCheck size={16} />
                        </div>
                        <div className="space-y-1">
                          <span className="font-extrabold block uppercase tracking-wide">ĐĂNG KÝ ĐÃ KHÓA TRONG THÁNG {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]}</span>
                          <p className="font-medium leading-relaxed opacity-90">
                            Để bảo đảm sự ổn định trong công tác xếp lớp, sau khi đã xác nhận đăng ký môn năng khiếu, phụ huynh <strong>không được tự ý thay đổi đăng ký</strong> trong tháng này.
                          </p>
                          <p className="font-bold text-[11px] text-amber-700 dark:text-amber-350 mt-1 flex items-center gap-1">
                            <span>💡 Hãy bấm chọn nút <strong>"Tháng 08/2026 (Tháng sau)"</strong> ở trên để giả lập bước sang tháng mới và thực hiện thay đổi đăng ký của con!</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CARRY OVER OR EDITING ACTIVE BANNER */}
                    {!isLocked && (
                      !isEditingTalent ? (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-emerald-500/15 rounded-lg shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5 animate-pulse">
                              <ShieldCheck size={16} />
                            </div>
                            <div className="space-y-1">
                              <span className="font-extrabold block uppercase tracking-wide text-emerald-700 dark:text-emerald-400">🌿 TỰ ĐỘNG GIA HẠN ĐĂNG KÝ SANG THÁNG {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]}</span>
                              <p className="font-medium leading-relaxed opacity-90 text-[11px] text-slate-600 dark:text-slate-350">
                                Môn năng khiếu đã chọn ở tháng trước sẽ <strong>mặc định chuyển tiếp</strong> sang tháng này. Phụ huynh không cần làm gì thêm nếu muốn giữ nguyên lịch học.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEditingTalent(true)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] rounded-xl shadow-xs transition duration-150 shrink-0 self-start sm:self-auto cursor-pointer flex items-center gap-1.5 uppercase"
                          >
                            <Plus size={13} strokeWidth={3} />
                            <span>{selectedTalentIds.length > 0 ? 'Thay đổi đăng ký 📝' : 'Đăng ký môn mới ➕'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-400 text-xs rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-sky-500/15 rounded-lg shrink-0 text-sky-600 dark:text-sky-450 mt-0.5">
                              <BookOpen size={16} />
                            </div>
                            <div className="space-y-1">
                              <span className="font-extrabold block uppercase tracking-wide text-sky-700 dark:text-sky-400">✍️ ĐANG THAY ĐỔI ĐĂNG KÝ THÁNG {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]}</span>
                              <p className="font-medium leading-relaxed opacity-90 text-[11px] text-slate-600 dark:text-slate-350">
                                Hãy tích chọn hoặc hủy chọn các môn học bên dưới cho con, sau đó bấm <strong>Lưu & Xác nhận thay đổi</strong> để gửi yêu cầu đến lớp học.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const registeredIds = StorageService.getStudentRegisteredTalentsForMonth(selectedStudent, simulatedMonth);
                              const mandatoryIds = selectedClass?.talentSubjects?.filter(s => s.isMandatory).map(s => s.id) || [];
                              const classSubjectIds = selectedClass?.talentSubjects?.map(s => s.id) || [];
                              const combinedIds = Array.from(new Set([...registeredIds, ...mandatoryIds])).filter(id => classSubjectIds.includes(id));
                              setSelectedTalentIds(combinedIds);
                              setIsEditingTalent(false);
                            }}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 font-bold text-[11px] rounded-xl transition duration-150 shrink-0 self-start sm:self-auto cursor-pointer border border-slate-200 dark:border-slate-700"
                          >
                            Hủy thay đổi ✕
                          </button>
                        </div>
                      )
                    )}

                    {talentSuccess && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2 animate-bounce">
                        <Heart size={16} className="fill-emerald-500 text-emerald-500" />
                        <span>{talentSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* List of available subjects in classroom */}
                      <div className="lg:col-span-2 space-y-3">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Các môn năng khiếu của lớp {selectedStudent.className}</span>
                        
                        {!selectedClass?.talentSubjects || selectedClass.talentSubjects.length === 0 ? (
                          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                            Lớp này hiện chưa cấu hình môn năng khiếu nào từ Ban Giám Hiệu.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {selectedClass.talentSubjects.map((subj: TalentSubject) => {
                              const isChecked = selectedTalentIds.includes(subj.id);
                              return (
                                <div 
                                  key={subj.id}
                                  onClick={() => handleTalentToggle(subj.id)}
                                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between h-full gap-3.5 ${
                                    isChecked
                                      ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                                  } ${isLocked || !isEditingTalent ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer select-none'}`}
                                >
                                  <div className="flex justify-between items-start w-full gap-2">
                                    <div className="space-y-1.5">
                                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block flex flex-wrap items-center gap-1.5">
                                        {subj.name}
                                        {subj.isMandatory && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-extrabold uppercase tracking-wide shrink-0">
                                            Bắt buộc
                                          </span>
                                        )}
                                        {isChecked && (
                                          isLocked ? (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[9px] font-extrabold uppercase tracking-wide shrink-0">
                                              Đã chốt
                                            </span>
                                          ) : !isEditingTalent ? (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold uppercase tracking-wide shrink-0 animate-pulse">
                                              🌿 Đang Học
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[9px] font-extrabold uppercase tracking-wide shrink-0">
                                              Chọn học
                                            </span>
                                          )
                                        )}
                                      </span>
                                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block font-mono">
                                        {(subj.fee).toLocaleString('vi-VN')} đ / tháng
                                      </span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                      isChecked 
                                        ? subj.isMandatory ? 'bg-rose-500 border-rose-500 text-white' : isLocked ? 'bg-slate-400 border-slate-400 text-white' : !isEditingTalent ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-sky-600 border-sky-600 text-white' 
                                        : 'border-slate-200 dark:border-slate-700'
                                    }`}>
                                      {isChecked && <Check size={12} strokeWidth={3} />}
                                    </div>
                                  </div>

                                  {subj.schedule || subj.timeSlot ? (
                                    <div className="space-y-1 w-full text-[11px] text-slate-500 dark:text-slate-400">
                                      {subj.schedule && (
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                                          <Calendar size={12} className="text-emerald-500 shrink-0" />
                                          <span className="truncate">Lịch: <strong className="text-slate-700 dark:text-slate-200 font-bold">{subj.schedule}</strong></span>
                                        </div>
                                      )}
                                      {subj.timeSlot && (
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                                          <Clock size={12} className="text-amber-500 shrink-0" />
                                          <span className="truncate">Giờ: <strong className="text-slate-700 dark:text-slate-200 font-bold">{subj.timeSlot}</strong></span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 w-full">
                                      Dạy 2 buổi/tuần, giáo án chuyên biệt
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Summary Bill and Action */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-fit space-y-4 shadow-sm">
                        <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Tóm tắt đăng ký</span>
                          <Calculator size={16} className="text-slate-400" />
                        </div>

                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between text-slate-400 font-medium">
                            <span>Học sinh:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{selectedStudent.fullName}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 font-medium">
                            <span>Số môn chọn:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {(selectedClass?.talentSubjects?.filter(s => selectedTalentIds.includes(s.id)).length || 0)} môn
                            </span>
                          </div>

                          {(() => {
                            const actualSubjects = selectedClass?.talentSubjects?.filter(s => selectedTalentIds.includes(s.id)) || [];
                            if (actualSubjects.length === 0) return null;
                            return (
                              <div className="border-t border-dashed border-slate-100 dark:border-slate-800 py-2 space-y-2 text-[11px] text-slate-500 font-medium">
                                {actualSubjects.map(s => (
                                  <div key={s.id} className="flex flex-col border-b border-slate-100/50 dark:border-slate-850/50 pb-1.5 last:border-0 last:pb-0">
                                    <div className="flex justify-between font-semibold">
                                      <span>• {s.name}:</span>
                                      <span className="font-mono text-amber-600 dark:text-amber-400">{s.fee.toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    {(s.schedule || s.timeSlot) && (
                                      <div className="text-[9px] text-slate-400 dark:text-slate-500 pl-2.5 italic">
                                        Lịch: {[s.schedule, s.timeSlot].filter(Boolean).join(' | ')}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {(() => {
                            const otherFeeVal = StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth);
                            if (otherFeeVal <= 0) return null;
                            const otherFeesList = StorageService.getStudentOtherFeesListForMonth(selectedStudent, simulatedMonth) || [];
                            const otherFeeDesc = StorageService.getStudentOtherFeeDescriptionForMonth(selectedStudent, simulatedMonth);
                            return (
                              <div className="border-t border-dashed border-slate-100 dark:border-slate-800 py-2.5 space-y-2 text-[11px] text-slate-500 font-medium">
                                <div className="text-rose-500 dark:text-rose-400 font-extrabold flex items-center gap-1">
                                  <span>📌 Khoản phí khác:</span>
                                </div>
                                <div className="space-y-2">
                                  {otherFeesList.length > 0 ? (
                                    otherFeesList.map((f, idx) => (
                                      <div key={f.id || idx} className="flex flex-col border-b border-slate-100/50 dark:border-slate-850/50 pb-1.5 last:border-0 last:pb-0">
                                        <div className="flex justify-between font-semibold">
                                          <span>• {f.name}:</span>
                                          <span className="font-mono text-rose-500 dark:text-rose-450">{f.amount.toLocaleString('vi-VN')} đ</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="flex justify-between font-semibold">
                                      <span>• {otherFeeDesc || 'Phí khác'}:</span>
                                      <span className="font-mono text-rose-500 dark:text-rose-450">{otherFeeVal.toLocaleString('vi-VN')} đ</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {(() => {
                            const talentFeeTotal = selectedClass?.talentSubjects
                              ?.filter(s => selectedTalentIds.includes(s.id))
                              ?.reduce((sum, current) => sum + current.fee, 0) || 0;
                            const otherFeeTotal = StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth);
                            const grandTotal = talentFeeTotal + otherFeeTotal;

                            if (otherFeeTotal > 0) {
                              return (
                                <div className="border-t border-slate-150 dark:border-slate-800 pt-3 space-y-2">
                                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
                                    <span>Tổng học phí năng khiếu:</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{talentFeeTotal.toLocaleString('vi-VN')} đ</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
                                    <span>Tổng khoản phí khác:</span>
                                    <span className="font-mono font-bold text-rose-500 dark:text-rose-400">+{otherFeeTotal.toLocaleString('vi-VN')} đ</span>
                                  </div>
                                  <div className="border-t border-dashed border-slate-200 dark:border-slate-750 pt-2.5 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Dự kiến tổng thanh toán / tháng:</span>
                                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                                      {grandTotal.toLocaleString('vi-VN')} đ
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="border-t border-slate-150 dark:border-slate-800 pt-3 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Dự kiến học phí / tháng:</span>
                                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                                  {talentFeeTotal.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {isLocked ? (
                          <div className="space-y-3 mt-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
                              <span className="text-2xl block">🔒</span>
                              <span className="text-[11px] font-bold text-slate-500 block">Đã Khóa Đăng Ký Tháng {simulatedMonth.split('-')[1]}</span>
                              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                Đăng ký của con đã được chốt và gửi đến Giáo viên. Không thể thay đổi trong tháng này.
                              </p>
                            </div>
                             {(selectedTalentIds.length > 0 || StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth) > 0) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const list = selectedClass?.talentSubjects?.filter(s => selectedTalentIds.includes(s.id)) || [];
                                  const talentFee = list.reduce((sum, current) => sum + current.fee, 0) || 0;
                                  const totalFee = talentFee + StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth);
                                  setPaymentAmount(totalFee);
                                  setPaymentSubjects(list);
                                  setPaymentMethod('qr');
                                  setIsPaymentModalOpen(true);
                                }}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-xl uppercase transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                💳 Xem Thông Tin Thanh Toán Học Phí
                              </button>
                            )}
                          </div>
                        ) : !isEditingTalent ? (
                          <div className="space-y-3 mt-4 animate-fade-in">
                            <button
                              type="button"
                              onClick={() => setIsEditingTalent(true)}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl uppercase transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus size={14} strokeWidth={3} />
                              <span>{selectedTalentIds.length > 0 ? 'Bấm Thay Đổi Đăng Ký 📝' : 'Đăng Ký Môn Năng Khiếu ➕'}</span>
                            </button>
                             {(selectedTalentIds.length > 0 || StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth) > 0) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const list = selectedClass?.talentSubjects?.filter(s => selectedTalentIds.includes(s.id)) || [];
                                  const talentFee = list.reduce((sum, current) => sum + current.fee, 0) || 0;
                                  const totalFee = talentFee + StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth);
                                  setPaymentAmount(totalFee);
                                  setPaymentSubjects(list);
                                  setPaymentMethod('qr');
                                  setIsPaymentModalOpen(true);
                                }}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl uppercase transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                              >
                                💳 Xem Thông Tin Thanh Toán
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 mt-4 animate-fade-in">
                            <button
                              type="button"
                              onClick={handleSaveTalents}
                              disabled={isTalentSaving}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl uppercase transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isTalentSaving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Check size={14} />
                                  <span>Lưu & Xác Nhận Thay Đổi</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const registeredIds = StorageService.getStudentRegisteredTalentsForMonth(selectedStudent, simulatedMonth);
                                const mandatoryIds = selectedClass?.talentSubjects?.filter(s => s.isMandatory).map(s => s.id) || [];
                                const classSubjectIds = selectedClass?.talentSubjects?.map(s => s.id) || [];
                                const combinedIds = Array.from(new Set([...registeredIds, ...mandatoryIds])).filter(id => classSubjectIds.includes(id));
                                setSelectedTalentIds(combinedIds);
                                setIsEditingTalent(false);
                              }}
                              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl uppercase transition cursor-pointer text-center"
                            >
                              Hủy thay đổi ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* TAB 3: ABSENCE REPORT PANEL */}
              {activeTab === 'absence' && selectedStudent && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar size={20} className="text-rose-500" />
                        Đăng Ký Báo Vắng Trên Phần Mềm
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Xin nghỉ học trực tuyến nhanh chóng. Giáo viên chủ nhiệm sẽ nhận thông báo điểm danh vắng phép ngay lập tức trên hệ thống lớp học.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => { setIsAbsenceModalOpen(true); setFormError(''); setFormSuccess(''); }}
                      className="self-start sm:self-center py-2 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold uppercase shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus size={14} />
                      <span>Tạo Đơn Xin Nghỉ Học</span>
                    </button>
                  </div>

                  {/* Absence Reports History Table */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Lịch sử xin nghỉ học của {selectedStudent.fullName}</span>
                    
                    {absenceReports.filter(r => r.studentId === selectedStudent.id).length === 0 ? (
                      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                        Chưa có đơn xin nghỉ học nào được gửi cho {selectedStudent.fullName}.
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800 select-none text-[10px] uppercase">
                                <th className="px-5 py-3.5 font-extrabold">Từ Ngày</th>
                                <th className="px-5 py-3.5 font-extrabold">Đến Ngày</th>
                                <th className="px-5 py-3.5 font-extrabold">Lý Do Xin Nghỉ</th>
                                <th className="px-5 py-3.5 font-extrabold">Ngày Gửi</th>
                                <th className="px-5 py-3.5 text-right font-extrabold">Trạng Thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                              {absenceReports
                                .filter(r => r.studentId === selectedStudent.id)
                                .map((report) => (
                                  <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                    <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-100 font-bold">
                                      {report.startDate}
                                    </td>
                                    <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-100 font-bold">
                                      {report.endDate}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={report.reason}>
                                      {report.reason}
                                    </td>
                                    <td className="px-5 py-3.5 text-[10px] text-slate-400 font-mono">
                                      {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                      {getStatusBadge(report.status)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && selectedStudent && (
                <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Camera size={20} className="text-emerald-500" />
                          Nhật Ký Điểm Danh Nhận Diện Khuôn Mặt (Camera)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Hình ảnh và mốc thời gian thực tế mỗi khi bé bước qua cửa lớp được ghi nhận bởi hệ thống camera AI của trường.
                        </p>
                      </div>
                      
                      {/* Brief statistics badges */}
                      <div className="flex gap-2 shrink-0">
                        <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Đúng Giờ</span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {attendanceRecords.filter(r => r.status === 'present').length} buổi
                          </span>
                        </div>
                        <div className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Đi Muộn</span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                            {attendanceRecords.filter(r => r.status === 'late').length} buổi
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {attendanceRecords.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center space-y-2.5">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mx-auto text-slate-400">
                        <Camera size={24} className="stroke-1" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có dữ liệu camera</h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Bé chưa có lượt quét điểm danh bằng camera tự động ngày hôm nay hoặc giáo viên chưa khởi chạy chế độ quét tại lớp.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {attendanceRecords.map((record) => (
                        <div 
                          key={record.id} 
                          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex gap-4 items-start shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                          {/* Left column: real-time camera snapshot */}
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-800 shrink-0 group">
                            <img 
                              src={record.photoCaptured || selectedStudent.avatar} 
                              alt="Check-in snapshot" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setSelectedAttendancePhoto(record.photoCaptured || selectedStudent.avatar)}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-950 rounded-lg text-[10px] font-bold uppercase shadow-sm cursor-pointer"
                              >
                                Phóng to
                              </button>
                            </div>
                          </div>

                          {/* Right column: check-in details */}
                          <div className="flex-1 space-y-2 text-xs">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Ngày điểm danh</span>
                                <strong className="text-slate-800 dark:text-slate-200 font-mono text-[13px]">
                                  {record.date}
                                </strong>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase text-[9px] ${
                                record.status === 'present'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}>
                                {record.status === 'present' ? 'Đúng Giờ' : 'Đi Muộn'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Thời gian quét</span>
                                <span className="text-slate-700 dark:text-slate-300 font-bold font-mono text-[11px]">{record.time}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Thiết bị</span>
                                <span className="text-slate-500 text-[10px] leading-tight flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                                  Class-Cam AI
                                </span>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800/60">
                              ✏️ {record.notes || 'Điểm danh camera tự động'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'health' && selectedStudent && (() => {
                const ageInMonths = (() => {
                  if (!selectedStudent.dateOfBirth) return 0;
                  const dob = new Date(selectedStudent.dateOfBirth);
                  if (isNaN(dob.getTime())) return 0;
                  const now = new Date('2026-07-08');
                  const yearsDiff = now.getFullYear() - dob.getFullYear();
                  const monthsDiff = now.getMonth() - dob.getMonth();
                  const total = (yearsDiff * 12) + monthsDiff;
                  return total >= 0 ? total : 0;
                })();

                const latestRecord = childHealthRecords[0];

                const evaluateBMIParent = (bmi: number, recordAge: number) => {
                  if (recordAge < 60) {
                    return {
                      status: 'Dưới 60 tháng tuổi',
                      colorClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
                      textColor: 'text-slate-500 dark:text-slate-400',
                      bgColor: 'bg-slate-50 dark:bg-slate-850',
                      description: 'Hệ thống chỉ đánh giá chỉ số BMI tiêu chuẩn cho trẻ từ 60 tháng tuổi trở lên. Trẻ dưới 60 tháng tuổi được khuyến nghị theo dõi tăng trưởng theo biểu đồ chiều cao/cân nặng chuẩn WHO cho trẻ mầm non.'
                    };
                  }
                  if (bmi < 14) {
                    return {
                      status: 'Suy dinh dưỡng',
                      colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                      textColor: 'text-rose-600 dark:text-rose-400',
                      bgColor: 'bg-rose-50 dark:bg-rose-950/20',
                      description: 'Thể trạng của bé hiện đang thiếu cân hoặc còi cọc so với độ tuổi tiêu chuẩn. Nhà trường khuyến nghị bổ sung các bữa ăn giàu đạm, canxi và các vitamin cần thiết.'
                    };
                  } else if (bmi >= 14 && bmi < 18.5) {
                    return {
                      status: 'Bình thường',
                      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
                      textColor: 'text-emerald-600 dark:text-emerald-400',
                      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
                      description: 'Chỉ số thể chất tuyệt vời! Bé phát triển rất cân đối và khỏe mạnh. Ba mẹ hãy tiếp tục duy trì chế độ dinh dưỡng và vận động hiện tại cho bé nhé.'
                    };
                  } else if (bmi >= 18.5 && bmi < 23) {
                    return {
                      status: 'Dư cân',
                      colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                      textColor: 'text-amber-600 dark:text-amber-400',
                      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
                      description: 'Bé có xu hướng dư thừa cân nặng nhẹ so với độ tuổi tiêu chuẩn. Ba mẹ nên điều chỉnh giảm lượng tinh bột, đồ ngọt và khuyến khích bé tăng cường vận động ngoài trời.'
                    };
                  } else {
                    return {
                      status: 'Béo phì',
                      colorClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
                      textColor: 'text-red-600 dark:text-red-400',
                      bgColor: 'bg-red-50 dark:bg-red-950/20',
                      description: 'Chỉ số thể chất của bé đang ở mức báo động béo phì. Cần có chế độ dinh dưỡng nghiêm ngặt kết hợp tham vấn từ bác sĩ dinh dưỡng mầm non.'
                    };
                  }
                };

                const evaluation = latestRecord ? evaluateBMIParent(latestRecord.bmi || 0, ageInMonths) : null;

                return (
                  <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
                    
                    {/* Header bar */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Heart size={20} className="text-rose-500 fill-rose-500/10" />
                          Hồ Sơ Sức Khỏe & Thể Chất Của Bé
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Theo dõi chiều cao, cân nặng định kỳ và hồ sơ thể chất của bé {selectedStudent.fullName}.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                        <button
                          onClick={() => {
                            setMedList([
                              { id: 'med_item_' + Date.now() + '_0', name: '', dosage: '', timing: [], mealRelation: 'none' }
                            ]);
                            setIsQuickMedModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-extrabold shadow-sm hover:shadow-md cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] active:scale-95 shrink-0 border border-rose-400/10"
                          title="Tạo đơn gửi thuốc cho bé"
                        >
                          <Pill size={14} className="text-white" />
                          <span>Dặn thuốc 💊</span>
                        </button>

                        <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-rose-500/10 flex items-center gap-1.5 shrink-0">
                          <span>Độ tuổi hiện tại: <strong>{ageInMonths} tháng tuổi</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Sub tabs inside Sức khỏe */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm mb-2 shrink-0">
                      <button
                        onClick={() => setHealthSubTab('indicators')}
                        className={`pb-3 font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                          healthSubTab === 'indicators'
                            ? 'border-rose-500 text-rose-500 dark:text-rose-400'
                            : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350'
                        }`}
                      >
                        <Heart size={16} />
                        <span>Chỉ Số Thể Chất & Phát Triển</span>
                      </button>
                      <button
                        onClick={() => setHealthSubTab('medication')}
                        className={`pb-3 font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                          healthSubTab === 'medication'
                            ? 'border-rose-500 text-rose-500 dark:text-rose-400'
                            : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350'
                        }`}
                      >
                        <Pill size={16} />
                        <span>Lịch Sử Dặn Thuốc ({medicationRequests.length})</span>
                      </button>
                    </div>

                    {healthSubTab === 'indicators' ? (
                      <div className="space-y-6 animate-fade-in">
                        {/* Main Health Indicators Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* Height Card */}
                          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs text-center space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chiều Cao</span>
                            {latestRecord ? (
                              <div className="space-y-1">
                                <span className="text-3xl font-black text-slate-850 dark:text-white font-mono">{latestRecord.height}</span>
                                <span className="text-xs font-bold text-slate-400 block">cm</span>
                              </div>
                            ) : (
                              <div className="py-4 text-slate-300 dark:text-slate-700 italic text-xs">Chưa có số đo</div>
                            )}
                          </div>

                          {/* Weight Card */}
                          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs text-center space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cân Nặng</span>
                            {latestRecord ? (
                              <div className="space-y-1">
                                <span className="text-3xl font-black text-slate-850 dark:text-white font-mono">{latestRecord.weight}</span>
                                <span className="text-xs font-bold text-slate-400 block">kg</span>
                              </div>
                            ) : (
                              <div className="py-4 text-slate-300 dark:text-slate-700 italic text-xs">Chưa có số đo</div>
                            )}
                          </div>

                          {/* BMI Card */}
                          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs text-center space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chỉ số khối (BMI)</span>
                            {latestRecord && latestRecord.bmi ? (
                              <div className="space-y-1">
                                <span className="text-3xl font-black text-slate-850 dark:text-white font-mono">{latestRecord.bmi}</span>
                                <span className="text-xs font-bold text-slate-400 block">kg/m²</span>
                              </div>
                            ) : latestRecord ? (
                              <div className="space-y-1">
                                <span className="text-lg font-bold text-slate-400 block py-1.5">N/A</span>
                                <span className="text-[10px] text-slate-400 block">Dưới 60 tháng tuổi</span>
                              </div>
                            ) : (
                              <div className="py-4 text-slate-300 dark:text-slate-700 italic text-xs">Chưa có số đo</div>
                            )}
                          </div>

                        </div>

                        {/* Diagnostic Summary & Educational Advice */}
                        {latestRecord && evaluation && (
                          <div className={`p-5 rounded-2xl ${evaluation.bgColor} border border-slate-200/40 dark:border-slate-800 space-y-3`}>
                            <div className="flex items-center justify-between gap-4">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Đánh giá thể trạng mầm non</h4>
                              <span className={`px-3 py-1 rounded-md font-extrabold text-[10px] uppercase ${evaluation.colorClass}`}>
                                {evaluation.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                              {evaluation.description}
                            </p>
                            {latestRecord.notes && (
                              <div className="pt-2.5 border-t border-slate-200/40 dark:border-slate-800/60 text-xs text-slate-500 flex items-start gap-1.5">
                                <span className="font-bold shrink-0">Lời khuyên giáo viên:</span>
                                <span>"{latestRecord.notes}"</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Historical Timeline of measurements */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-xs">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                            <FileText size={14} className="text-slate-400" />
                            Lịch sử đo đạc thể chất
                          </h4>

                          {childHealthRecords.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs font-medium italic">
                              Chưa ghi nhận số liệu sức khỏe nào cho bé từ trước đến nay.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="pb-3">Ngày đo</th>
                                    <th className="pb-3 text-center">Chiều cao</th>
                                    <th className="pb-3 text-center">Cân nặng</th>
                                    <th className="pb-3 text-center">BMI</th>
                                    <th className="pb-3">Trạng thái</th>
                                    <th className="pb-3">Ghi chú từ lớp học</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-600 dark:text-slate-300">
                                  {childHealthRecords.map((record) => {
                                    const recordAge = (() => {
                                      if (!selectedStudent.dateOfBirth) return 0;
                                      const dob = new Date(selectedStudent.dateOfBirth);
                                      if (isNaN(dob.getTime())) return 0;
                                      const rDate = new Date(record.date);
                                      const yearsDiff = rDate.getFullYear() - dob.getFullYear();
                                      const monthsDiff = rDate.getMonth() - dob.getMonth();
                                      const total = (yearsDiff * 12) + monthsDiff;
                                      return total >= 0 ? total : 0;
                                    })();
                                    
                                    const recordEval = evaluateBMIParent(record.bmi || 0, recordAge);

                                    return (
                                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                                        <td className="py-3 font-mono font-bold">{record.date}</td>
                                        <td className="py-3 text-center font-mono font-bold text-slate-800 dark:text-white">{record.height} cm</td>
                                        <td className="py-3 text-center font-mono font-bold text-slate-800 dark:text-white">{record.weight} kg</td>
                                        <td className="py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                                          {record.bmi ? record.bmi : 'N/A'}
                                        </td>
                                        <td className="py-3">
                                          <span className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase ${recordEval.colorClass}`}>
                                            {recordEval.status}
                                          </span>
                                        </td>
                                        <td className="py-3 text-slate-400 italic max-w-xs truncate" title={record.notes}>
                                          {record.notes || '--'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-fade-in">
                        {/* Medication log list */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                            <div>
                              <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wide flex items-center gap-2">
                                <FileText size={18} className="text-rose-500" />
                                Lịch sử dặn thuốc mầm non của bé ({medicationRequests.length})
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">Theo dõi chi tiết các loại thuốc phụ huynh đã dặn và trạng thái xác nhận uống thuốc từ giáo viên.</p>
                            </div>
                            <button
                              onClick={() => {
                                setMedList([
                                  { id: 'med_item_' + Date.now() + '_0', name: '', dosage: '', timing: [], mealRelation: 'none' }
                                ]);
                                setIsQuickMedModalOpen(true);
                              }}
                              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs self-start sm:self-center duration-250 active:scale-95 border border-rose-400/10"
                            >
                              <Plus size={14} /> Gửi thuốc mới 💊
                            </button>
                          </div>

                          {medicationRequests.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-medium italic bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                              Chưa có lịch sử dặn thuốc nào cho bé trong hệ thống.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {medicationRequests.map((req) => (
                                <div
                                  key={req.id}
                                  className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4 hover:border-slate-250 dark:hover:border-slate-700 transition"
                                >
                                  <div className="space-y-2.5 flex-1 text-xs">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="px-2.5 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                        🏥 {req.diagnosis}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono font-semibold">
                                        Thời gian gửi: {req.createdAt}
                                      </span>
                                    </div>

                                    {req.medicines && req.medicines.length > 0 ? (
                                      <div className="space-y-2 mt-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chi tiết đơn thuốc gửi cô ({req.medicines.length} loại):</p>
                                        <div className="grid grid-cols-1 gap-2">
                                          {req.medicines.map((item, mIdx) => (
                                            <div key={item.id || mIdx} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                              <div className="space-y-0.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-xs font-extrabold text-slate-850 dark:text-white">💊 {item.name}</span>
                                                  <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-md font-bold text-[9px] uppercase">Liều: {item.dosage}</span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                {item.timing && item.timing.map(t => (
                                                  <span key={t} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-bold text-[9px]">{t === 'Khi sốt' ? '🌡️' : '☀️'} {t}</span>
                                                ))}
                                                {item.mealRelation && item.mealRelation !== 'none' && (
                                                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md font-bold text-[9px] uppercase">
                                                    {item.mealRelation === 'before' ? 'Trước ăn 🍽️' : 'Sau ăn 🥣'}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <p className="text-xs font-black text-slate-800 dark:text-white">
                                          Tên thuốc: <span className="text-rose-600 dark:text-rose-400 font-extrabold">{req.medicineName}</span>
                                        </p>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                          <strong className="text-slate-700 dark:text-slate-200 block mb-1 text-[10px] uppercase tracking-wider">Liều dùng & Dặn dò:</strong>
                                          {req.dosage}
                                        </div>
                                      </div>
                                    )}

                                    {req.specialNotes && (
                                      <div className="p-3 bg-amber-500/[0.04] dark:bg-amber-500/[0.02] border border-amber-500/15 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-semibold space-y-1 mt-2">
                                        <p className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                                          Lưu ý đặc biệt từ phụ huynh:
                                        </p>
                                        <p className="text-slate-700 dark:text-slate-300 font-medium pl-3.5 leading-relaxed">{req.specialNotes}</p>
                                      </div>
                                    )}

                                    {/* Confirmation logs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold pt-1">
                                      <div className="p-2 bg-emerald-500/5 text-emerald-600 rounded-xl flex items-center gap-1.5 border border-emerald-500/10">
                                        <CheckCircle2 size={12} />
                                        <span>Phụ huynh xác nhận: ĐỒNG Ý GỬI</span>
                                      </div>

                                      {(() => {
                                        const currentStatus = req.status || (req.teacherConfirmed ? 'taken' : 'pending');
                                        if (currentStatus === 'rejected') {
                                          return (
                                            <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl flex flex-col justify-center gap-0.5 border border-rose-500/20">
                                              <div className="flex items-center gap-1.5 font-black text-rose-700 dark:text-rose-450">
                                                <span>❌ Xác nhận GV: ĐÃ TỪ CHỐI NHẬN</span>
                                              </div>
                                              {req.rejectReason && (
                                                <span className="text-[9px] text-rose-500 dark:text-rose-400 font-semibold pl-1 block">
                                                  Lý do: {req.rejectReason}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        } else if (currentStatus === 'taken' || req.teacherConfirmed) {
                                          return (
                                            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl flex flex-col justify-center gap-0.5 border border-emerald-500/20">
                                              <div className="flex items-center gap-1.5">
                                                <ShieldCheck size={12} className="text-emerald-500" />
                                                <span>Xác nhận GV: ĐÃ CHO UỐNG THUỐC ✅</span>
                                              </div>
                                              <span className="text-[8px] text-slate-400 font-medium block pl-3.5">
                                                Xác nhận bởi: {req.teacherConfirmedBy || 'Giáo viên chủ nhiệm'} lúc {req.teacherConfirmedAt || req.createdAt}
                                              </span>
                                            </div>
                                          );
                                        } else if (currentStatus === 'received') {
                                          return (
                                            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl flex items-center gap-1.5 border border-blue-500/20">
                                              <CheckCircle2 size={12} className="text-blue-500" />
                                              <span>Xác nhận GV: ĐÃ NHẬN THUỐC ĐỦ 📥</span>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl flex items-center gap-1.5 border border-amber-500/20">
                                              <Clock size={12} className="text-amber-500" />
                                              <span>Giáo viên: CHỜ XÁC NHẬN ⏳</span>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  </div>

                                  <div className="flex md:flex-col items-center justify-between md:justify-start gap-4 md:items-end shrink-0">
                                    {/* Prescription Photo view */}
                                    {req.prescriptionPhoto ? (
                                      <div
                                        onClick={() => setSelectedPhotoModal(req.prescriptionPhoto || null)}
                                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer shadow-xs hover:scale-105 transition shrink-0"
                                      >
                                        <img src={req.prescriptionPhoto} alt="Prescription" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[9px] font-bold uppercase opacity-0 hover:opacity-100 transition-opacity">
                                          Xem ảnh
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-16 h-16 rounded-xl border border-slate-200/50 dark:border-slate-800/60 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-300 text-[8px] font-bold shrink-0">
                                        <span>Không có</span>
                                        <span>hình ảnh</span>
                                      </div>
                                    )}

                                    {/* Delete request if not confirmed */}
                                    {!req.teacherConfirmed && req.status !== 'rejected' && req.status !== 'taken' && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMedRequest(req.id)}
                                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 p-2 rounded-xl text-[10px] font-extrabold uppercase transition cursor-pointer flex items-center gap-1 border border-rose-500/10 active:scale-95 text-center justify-center w-full"
                                      >
                                        <Trash2 size={12} />
                                        <span>Hủy dặn thuốc</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeTab === 'medication' && selectedStudent && (() => {
                return (
                  <div className="space-y-6 animate-fade-in">
                        
                        {/* Send medication form */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs space-y-6">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-rose-500/10 rounded-2xl">
                                <Pill size={22} className="text-rose-600" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">Tạo Đơn Gửi Thuốc Cho Bé 💊</h4>
                                <p className="text-xs text-slate-400">Dặn dò cô giáo cho bé uống thuốc đúng giờ, đúng liều lượng chỉ định.</p>
                              </div>
                            </div>

                            {/* Presets for quick test */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => applyPresetMed('siro')}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                              >
                                🧪 Toa Siro ho mẫu
                              </button>
                              <button
                                type="button"
                                onClick={() => applyPresetMed('cream')}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                              >
                                🧴 Toa Kem bôi mẫu
                              </button>
                            </div>
                          </div>

                          <form onSubmit={handleSendMedication} className="space-y-4 text-xs">
                            {medError && (
                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-2 font-semibold">
                                <AlertCircle size={16} />
                                <span>{medError}</span>
                              </div>
                            )}

                            {medSuccess && (
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2 font-extrabold">
                                <CheckCircle2 size={16} />
                                <span>Gửi đơn dặn thuốc thành công! Thông báo đã được gửi đến cô giáo lớp {selectedStudent.className || selectedClass?.name}. 🎉</span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Readonly Child info */}
                              <div className="space-y-1.5">
                                <label className="font-extrabold text-slate-400 uppercase tracking-wider block">Học và tên bé</label>
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                                  <span>{selectedStudent.fullName}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">({selectedStudent.studentCode})</span>
                                </div>
                              </div>

                              {/* Diagnosis */}
                              <div className="space-y-1.5">
                                <label className="font-extrabold text-slate-400 uppercase tracking-wider block">Định bệnh / Triệu chứng bệnh của bé</label>
                                <input
                                  type="text"
                                  value={medDiagnosis}
                                  onChange={(e) => setMedDiagnosis(e.target.value)}
                                  placeholder="Ví dụ: Cảm sốt nhẹ, ho đờm, sổ mũi..."
                                  className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                                />
                              </div>
                            </div>

                            {/* DYNAMIC MULTIPLE MEDICINES INPUTS FOR INLINE FORM */}
                            <div className="space-y-4 border-t border-b border-slate-100 dark:border-slate-800 py-4">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                  Danh sách loại thuốc cần uống ({medList.length}) 💊
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMedList([...medList, { id: 'med_item_' + Date.now() + '_' + medList.length, name: '', dosage: '', timing: [], mealRelation: 'none' }]);
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                                >
                                  <Plus size={12} /> Thêm thuốc khác ➕
                                </button>
                              </div>

                              <div className="space-y-4">
                                {medList.map((med, idx) => (
                                  <div key={med.id} className="p-4 bg-slate-50/70 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5 relative">
                                    {medList.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMedList(medList.filter(m => m.id !== med.id));
                                        }}
                                        className="absolute top-3.5 right-3.5 text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                        title="Xóa loại thuốc này"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}

                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-block px-2.5 py-0.5 bg-rose-500 text-white font-black text-[9px] rounded-md uppercase tracking-wider">
                                        Loại thuốc #{idx + 1}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên thuốc dặn uống <span className="text-rose-500">*</span></label>
                                        <input
                                          type="text"
                                          value={med.name}
                                          onChange={(e) => {
                                            const newList = [...medList];
                                            newList[idx].name = e.target.value;
                                            setMedList(newList);
                                          }}
                                          placeholder="Ví dụ: Viên sủi MyVita / Thuốc hạ sốt..."
                                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-rose-500 transition font-medium"
                                          required
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Liều lượng (Số viên / Số ml) <span className="text-rose-500">*</span></label>
                                        <input
                                          type="text"
                                          value={med.dosage}
                                          onChange={(e) => {
                                            const newList = [...medList];
                                            newList[idx].dosage = e.target.value;
                                            setMedList(newList);
                                          }}
                                          placeholder="Ví dụ: 1 viên, 5ml, bôi mỏng..."
                                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-rose-500 transition font-medium"
                                          required
                                        />
                                      </div>
                                    </div>

                                    {/* Timing Choices (Sáng, Trưa, Chiều, Tối) */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Thời điểm uống thuốc trong ngày (Chọn ít nhất một) <span className="text-rose-500">*</span></label>
                                      <div className="flex flex-wrap gap-1.5">
                                        {['Sáng', 'Trưa', 'Chiều', 'Tối', 'Khi sốt'].map(time => {
                                          const isChecked = med.timing.includes(time);
                                          return (
                                            <button
                                              key={time}
                                              type="button"
                                              onClick={() => {
                                                const newList = [...medList];
                                                if (isChecked) {
                                                  newList[idx].timing = med.timing.filter(t => t !== time);
                                                } else {
                                                  newList[idx].timing = [...med.timing, time];
                                                }
                                                setMedList(newList);
                                              }}
                                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1 ${
                                                isChecked
                                                  ? 'bg-rose-500 border-rose-500 text-white shadow-3xs scale-95'
                                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                              }`}
                                            >
                                              {isChecked ? '✓' : time === 'Khi sốt' ? '🌡️' : '•'} {time}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Meal Relation Choice */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Mối quan hệ với bữa ăn</label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { val: 'none', label: 'Không yêu cầu' },
                                          { val: 'before', label: 'Trước khi ăn 🍽️' },
                                          { val: 'after', label: 'Sau khi ăn 🥣' }
                                        ].map(opt => {
                                          const isSelected = med.mealRelation === opt.val;
                                          return (
                                            <button
                                              key={opt.val}
                                              type="button"
                                              onClick={() => {
                                                const newList = [...medList];
                                                newList[idx].mealRelation = opt.val as any;
                                                setMedList(newList);
                                              }}
                                              className={`py-2 rounded-xl text-[10px] font-extrabold transition-all border text-center cursor-pointer ${
                                                isSelected
                                                  ? 'bg-amber-500/15 border-amber-400 text-amber-600 dark:text-amber-400 shadow-3xs'
                                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                              }`}
                                            >
                                              {opt.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Photo upload and prescription preview */}
                            <div className="space-y-1.5">
                              <label className="font-extrabold text-slate-400 uppercase tracking-wider block">Chụp hình hoặc tải hình đơn thuốc/Toa thuốc</label>
                              <div className="flex gap-3">
                                <div className="relative flex-1">
                                  <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition cursor-pointer text-slate-500 bg-slate-50/40 dark:bg-slate-950/20">
                                    <div className="flex items-center gap-2">
                                      <Upload size={14} className="text-slate-400" />
                                      <span className="font-bold text-[11px] text-slate-600 dark:text-slate-300">Nhấn tải lên hoặc kéo thả hình ảnh</span>
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = (ev) => {
                                            setMedPhoto(ev.target?.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                                
                                {medPhoto && (
                                  <div className="relative w-11 h-11 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shrink-0 group">
                                    <img src={medPhoto} alt="Prescription preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <button
                                      type="button"
                                      onClick={() => setMedPhoto(null)}
                                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Confirmation toggle */}
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 flex items-start gap-3">
                              <input
                                type="checkbox"
                                id="medParentConfirmed"
                                checked={medParentConfirmed}
                                onChange={(e) => setMedParentConfirmed(e.target.checked)}
                                className="mt-0.5 w-4.5 h-4.5 rounded text-rose-500 border-slate-300 focus:ring-rose-400 cursor-pointer"
                              />
                              <label htmlFor="medParentConfirmed" className="text-slate-600 dark:text-slate-400 leading-relaxed font-bold select-none cursor-pointer">
                                XÁC NHẬN PHỤ HUYNH GỬI THUỐC ✍️
                                <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                                  Tôi đồng ý ủy quyền cho giáo viên tại lớp hỗ trợ bé uống thuốc theo liều lượng chỉ định và chịu trách nhiệm hướng dẫn dặn dò trên.
                                </span>
                              </label>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={isSendingMedication}
                                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-extrabold uppercase tracking-widest rounded-xl transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                              >
                                {isSendingMedication ? (
                                  <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang xử lý dặn thuốc...</span>
                                  </>
                                ) : (
                                  <>
                                    <ClipboardCheck size={16} />
                                    <span>Xác nhận phụ huynh gửi thuốc 💊</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* Medication log list */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-xs">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                            <FileText size={15} className="text-slate-400" />
                            Lịch sử dặn thuốc mầm non của bé ({medicationRequests.length})
                          </h4>

                          {medicationRequests.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-xs font-medium italic">
                              Chưa có lịch sử dặn thuốc nào cho bé trong hệ thống.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {medicationRequests.map((req) => (
                                <div
                                  key={req.id}
                                  className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4"
                                >
                                  <div className="space-y-2.5 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="px-2 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                        🏥 {req.diagnosis}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono font-semibold">
                                        Thời gian: {req.createdAt}
                                      </span>
                                    </div>

                                    {req.medicines && req.medicines.length > 0 ? (
                                      <div className="space-y-2 mt-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chi tiết đơn thuốc gửi cô ({req.medicines.length} loại):</p>
                                        <div className="grid grid-cols-1 gap-2">
                                          {req.medicines.map((item, mIdx) => (
                                            <div key={item.id || mIdx} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                              <div className="space-y-0.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-xs font-extrabold text-slate-800 dark:text-white">💊 {item.name}</span>
                                                  <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-md font-bold text-[9px] uppercase">Liều: {item.dosage}</span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                {item.timing && item.timing.map(t => (
                                                  <span key={t} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-bold text-[9px]">{t === 'Khi sốt' ? '🌡️' : '☀️'} {t}</span>
                                                ))}
                                                {item.mealRelation && item.mealRelation !== 'none' && (
                                                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md font-bold text-[9px] uppercase">
                                                    {item.mealRelation === 'before' ? 'Trước ăn 🍽️' : 'Sau ăn 🥣'}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <p className="text-xs font-black text-slate-800 dark:text-white">
                                          Tên thuốc: <span className="text-rose-600 dark:text-rose-400 font-extrabold">{req.medicineName}</span>
                                        </p>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                          <strong className="text-slate-700 dark:text-slate-200 block mb-1 text-[10px] uppercase tracking-wider">Liều dùng & Dặn dò:</strong>
                                          {req.dosage}
                                        </div>
                                      </div>
                                    )}

                                    {/* Confirmation logs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold">
                                      <div className="p-2 bg-emerald-500/5 text-emerald-600 rounded-xl flex items-center gap-1.5 border border-emerald-500/10">
                                        <CheckCircle2 size={12} />
                                        <span>Phụ huynh xác nhận: ĐỒNG Ý GỬI</span>
                                      </div>

                                      {(() => {
                                        const currentStatus = req.status || (req.teacherConfirmed ? 'taken' : 'pending');
                                        if (currentStatus === 'rejected') {
                                          return (
                                            <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl flex flex-col justify-center gap-0.5 border border-rose-500/20">
                                              <div className="flex items-center gap-1.5 font-black text-rose-700 dark:text-rose-400">
                                                <span>❌ Xác nhận GV: ĐÃ TỪ CHỐI NHẬN</span>
                                              </div>
                                              {req.rejectReason && (
                                                <span className="text-[9px] text-rose-500 dark:text-rose-450 font-semibold pl-1 block">
                                                  Lý do: {req.rejectReason}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        } else if (currentStatus === 'taken' || req.teacherConfirmed) {
                                          return (
                                            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl flex flex-col justify-center gap-0.5 border border-emerald-500/20">
                                              <div className="flex items-center gap-1.5">
                                                <ShieldCheck size={12} className="text-emerald-500" />
                                                <span>Xác nhận GV: ĐÃ CHO UỐNG THUỐC ✅</span>
                                              </div>
                                              <span className="text-[8px] text-slate-400 font-medium block pl-3.5">
                                                Xác nhận bởi: {req.teacherConfirmedBy || 'Giáo viên chủ nhiệm'} lúc {req.teacherConfirmedAt || req.createdAt}
                                              </span>
                                            </div>
                                          );
                                        } else if (currentStatus === 'received') {
                                          return (
                                            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl flex items-center gap-1.5 border border-blue-500/20">
                                              <CheckCircle2 size={12} className="text-blue-500" />
                                              <span>Xác nhận GV: ĐÃ NHẬN THUỐC ĐỦ 📥</span>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl flex items-center gap-1.5 border border-amber-500/20">
                                              <Clock size={12} className="text-amber-500" />
                                              <span>Giáo viên: CHỜ XÁC NHẬN ⏳</span>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  </div>

                                  <div className="flex md:flex-col items-center justify-between md:justify-start gap-4 md:items-end shrink-0">
                                    {/* Prescription Photo view */}
                                    {req.prescriptionPhoto ? (
                                      <div
                                        onClick={() => setSelectedPhotoModal(req.prescriptionPhoto || null)}
                                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer shadow-xs hover:scale-105 transition"
                                      >
                                        <img src={req.prescriptionPhoto} alt="Prescription" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[9px] font-bold uppercase opacity-0 hover:opacity-100 transition-opacity">
                                          Xem ảnh
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-16 h-16 rounded-xl border border-slate-200/50 dark:border-slate-800/60 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-300 text-[8px] font-bold">
                                        <span>Không có</span>
                                        <span>hình ảnh</span>
                                      </div>
                                    )}

                                    {/* Delete request if not confirmed */}
                                    {!req.teacherConfirmed && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMedRequest(req.id)}
                                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 p-2 rounded-xl text-[10px] font-extrabold uppercase transition cursor-pointer flex items-center gap-1 border border-rose-500/10 active:scale-95 text-center justify-center w-full"
                                      >
                                        <Trash2 size={12} />
                                        <span>Hủy dặn thuốc</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                );
              })()}

              {activeTab === 'assessment' && selectedStudent && (() => {
                const [year, month] = assessmentMonth.split('-');
                const filtered = dailyAssessments.filter(a => {
                  if (a.studentId !== selectedStudent.id) return false;
                  const aDate = new Date(a.date);
                  return aDate.getFullYear() === parseInt(year) && (aDate.getMonth() + 1) === parseInt(month);
                }).sort((a, b) => b.date.localeCompare(a.date));

                return (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Smile size={20} className="text-emerald-500" />
                          Đánh Giá Tình Trạng Trẻ Hằng Ngày
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Xem chi tiết nhận xét về sức khỏe, ăn uống, ngủ trưa, tham gia hoạt động và vệ sinh của bé {selectedStudent.fullName}.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="month"
                          value={assessmentMonth}
                          onChange={(e) => setAssessmentMonth(e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                        />
                      </div>
                    </div>

                    {filtered.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-12 text-center text-slate-400 text-xs italic">
                        Chưa có dữ liệu đánh giá hằng ngày nào của bé trong tháng {month}/{year}.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {filtered.map((assessment) => (
                          <div key={assessment.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-xs hover:shadow-sm transition-all duration-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4 gap-2">
                              <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                                <Calendar size={14} className="text-slate-400" />
                                {(() => {
                                  const parts = assessment.date.split('-');
                                  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : assessment.date;
                                })()}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Cập nhật lúc: {new Date(assessment.createdAt || assessment.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center">
                                <span className="text-base mb-1">🏃</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sức khỏe</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.healthStatus}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center">
                                <span className="text-base mb-1">🍲</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ăn uống</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.diningStatus}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center">
                                <span className="text-base mb-1">💤</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ngủ trưa</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.sleepStatus}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center">
                                <span className="text-base mb-1">🌟</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hoạt động</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.activityStatus}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center col-span-2 sm:col-span-1">
                                <span className="text-base mb-1">🚽</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vệ sinh</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.hygieneStatus}</span>
                              </div>
                            </div>

                            {assessment.notes && (
                              <div className="p-4 bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-xl">
                                <h5 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-1 flex items-center gap-1">
                                  <span>✍️</span> Nhận xét chi tiết từ giáo viên chủ nhiệm
                                </h5>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic leading-relaxed">
                                  "{assessment.notes}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeTab === 'activities' && selectedStudent && selectedClass && (() => {
                const handlePrevDay = () => {
                  const d = new Date(selectedActivityDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedActivityDate(d.toISOString().split('T')[0]);
                };

                const handleNextDay = () => {
                  const d = new Date(selectedActivityDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedActivityDate(d.toISOString().split('T')[0]);
                };

                const formattedDateStr = (() => {
                  const parts = selectedActivityDate.split('-');
                  if (parts.length === 3) {
                    return `Ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
                  }
                  return selectedActivityDate;
                })();

                return (
                  <div className="space-y-6 animate-fade-in">
                                          {currentClassActivities.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
                          <span className="text-3xl">⏰</span>
                          <p className="text-xs font-semibold">Chưa có hoạt động nào được giáo viên cập nhật cho ngày này.</p>
                        </div>
                      ) : (
                        <div className="relative border-l border-slate-150 pl-5 ml-4 space-y-6">
                          {currentClassActivities.map((act) => (
                            <div key={act.id} className="relative group">
                              {/* Timeline indicator node */}
                              <div className={`absolute -left-[27.5px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                                act.completed 
                                  ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-950 scale-110 shadow-sm shadow-emerald-500/20' 
                                  : 'bg-slate-200 border-white dark:border-slate-800 group-hover:bg-slate-300'
                              }`} />

                              <div className="bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-250">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider font-mono whitespace-nowrap shrink-0">
                                      ⏱️ {act.time}
                                    </span>
                                    {act.completed ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full whitespace-nowrap shrink-0">
                                        đang thực hiện / đã hoàn thành
                                      </span>
                                    ) : isPastActivity(selectedActivityDate, act.time) ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 rounded-full whitespace-nowrap shrink-0">
                                        Đã diễn ra
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full whitespace-nowrap shrink-0">
                                        Sắp diễn ra
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {act.title}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center">
                                  <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                    act.completed
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                                      : isPastActivity(selectedActivityDate, act.time)
                                      ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/30'
                                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                  }`}>
                                    {act.completed ? '✔ Đã hoàn thành' : isPastActivity(selectedActivityDate, act.time) ? '⏳ Đã diễn ra' : '⏳ Sắp diễn ra'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                );
              })()}

              {activeTab === 'fcm' && selectedStudent && (() => {
                const parentLogs = fcmLogs.filter(log => log.recipientPhone === session.parentPhone);

                const handleRegisterDevice = async () => {
                  setIsRegisteringFCM(true);
                  try {
                    const token = await registerParentFCMToken(session.parentPhone, session.parentName || 'Phụ huynh');
                    if (token) {
                      setFcmToken(token);
                      setFcmLogs(getLocalFCMLogs());
                      alert(`Đăng ký thiết bị nhận thông báo thành công!\nToken: ${token.substring(0, 16)}...`);
                    } else {
                      alert("Không thể khởi tạo token thiết bị.");
                    }
                  } catch (err) {
                    alert("Đã xảy ra lỗi trong quá trình kích hoạt.");
                  } finally {
                    setIsRegisteringFCM(false);
                  }
                };

                const handleCopyToken = () => {
                  if (fcmToken) {
                    navigator.clipboard.writeText(fcmToken);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  }
                };

                const handleSendTestPush = async (e: React.FormEvent) => {
                  e.preventDefault();
                  if (!fcmTestTitle || !fcmTestBody) {
                    alert("Vui lòng điền đầy đủ Tiêu đề và Nội dung tin nhắn!");
                    return;
                  }

                  try {
                    await sendFCMNotification(
                      fcmTestTitle,
                      fcmTestBody,
                      fcmTestType,
                      session.parentPhone,
                      selectedStudent.fullName
                    );
                    setFcmLogs(getLocalFCMLogs());
                    alert("Đã kích hoạt lệnh gửi thông báo đẩy đến điện thoại của bạn thành công!");
                  } catch (err) {
                    console.error("Gửi thử nghiệm thất bại:", err);
                  }
                };

                const getFCMIcon = (type: string) => {
                  switch (type) {
                    case 'attendance_absent':
                      return <span className="p-2 bg-rose-100 text-rose-600 rounded-lg text-sm shrink-0">🚨</span>;
                    case 'attendance_late':
                      return <span className="p-2 bg-amber-100 text-amber-600 rounded-lg text-sm shrink-0">⏳</span>;
                    case 'school_news':
                      return <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg text-sm shrink-0">📢</span>;
                    default:
                      return <span className="p-2 bg-blue-100 text-blue-600 rounded-lg text-sm shrink-0">💬</span>;
                  }
                };

                const getFCMTypeLabel = (type: string) => {
                  switch (type) {
                    case 'attendance_absent': return 'Nghỉ học';
                    case 'attendance_late': return 'Đi trễ';
                    case 'school_news': return 'Tin tức trường';
                    default: return 'Tin nhắn từ lớp';
                  }
                };

                return (
                  <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
                    {/* Header Intro Banner */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2.5 bg-rose-500/10 text-rose-600 rounded-2xl">
                            <BellRing size={22} className="animate-pulse" />
                          </span>
                          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">
                            Hệ Thống Thông Báo Đẩy Thời Gian Thực (FCM Push)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                          Nhận thông báo đẩy (Push Notifications) ngay lập tức trên điện thoại hoặc máy tính khi giáo viên ghi nhận bé vắng mặt, đi học muộn, hoặc khi có cập nhật khẩn cấp từ ban giám hiệu nhà trường.
                        </p>
                      </div>

                      {/* Device Token Registration Badge */}
                      <div className="shrink-0">
                        {fcmToken ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-xl border border-emerald-500/10 shadow-xs">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            THIẾT BỊ ĐÃ KÍCH HOẠT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black rounded-xl border border-amber-500/10 shadow-xs animate-pulse">
                            <span className="w-2 h-2 bg-amber-500 rounded-full" />
                            CHỜ KÍCH HOẠT THIẾT BỊ
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      {/* Left Block: Setup & Live Test Console */}
                      <div className="lg:col-span-7 space-y-6">
                        {/* 1. Device activation settings */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs space-y-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span>🛠️</span> Cấu hình Thiết bị nhận thông báo
                          </h4>

                          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-3">
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  Trạng thái quyền trình duyệt:
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {typeof window !== 'undefined' && 'Notification' in window 
                                    ? Notification.permission === 'granted'
                                      ? '✅ Đã cho phép gửi thông báo hệ thống'
                                      : Notification.permission === 'denied'
                                        ? '❌ Bị từ chối (Vui lòng mở cài đặt trình duyệt để cấp quyền lại)'
                                        : '⏳ Chưa xác định (Cần cấp quyền khi đăng ký)'
                                    : '⚠️ Trình duyệt của bạn không hỗ trợ đẩy thông báo native'}
                                </p>
                              </div>
                            </div>

                            {fcmToken ? (
                              <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3 space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã Token Thiết Bị FCM Hoạt Động:</p>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg font-mono font-bold select-all truncate flex-1 text-slate-600 dark:text-slate-350">
                                    {fcmToken}
                                  </code>
                                  <button
                                    onClick={handleCopyToken}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                                    title="Sao chép Token"
                                  >
                                    {copyFeedback ? '✔' : <span className="text-[11px] font-bold">Copy</span>}
                                  </button>
                                </div>
                                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold italic">
                                  * Gợi ý: Khi giáo viên thực hiện điểm danh ở trang quản trị, hệ thống sẽ sử dụng token này để gửi trực tiếp thông báo đến thiết bị này.
                                </p>
                              </div>
                            ) : (
                              <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-[10px] text-slate-400 max-w-sm font-medium leading-relaxed">
                                  Để nhận thông báo đẩy tức thì trên trình duyệt hoặc điện thoại giả lập này, vui lòng nhấp vào kích hoạt. Trình duyệt sẽ đề nghị bạn cấp quyền "Màn hình thông báo".
                                </p>
                                <button
                                  onClick={handleRegisterDevice}
                                  disabled={isRegisteringFCM}
                                  className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                                >
                                  {isRegisteringFCM ? 'Đang kết nối...' : 'Kích hoạt ngay'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. Push Notification Testing Console */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs space-y-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span>🚀</span> Console Thử Nghiệm Gửi Thông Báo Đẩy (FCM)
                          </h4>

                          <form onSubmit={handleSendTestPush} className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Loại thông báo mẫu</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { id: 'attendance_absent', label: '🚨 Vắng học' },
                                  { id: 'attendance_late', label: '⏳ Đi trễ' },
                                  { id: 'school_news', label: '📢 Tin tức' },
                                  { id: 'general', label: '💬 Nhận xét' }
                                ].map(type => (
                                  <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFcmTestType(type.id as any)}
                                    className={`py-2 px-2.5 rounded-xl border text-[10px] font-bold text-center transition cursor-pointer ${
                                      fcmTestType === type.id
                                        ? 'border-rose-500 bg-rose-500/5 text-rose-600 dark:text-rose-400'
                                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
                                    }`}
                                  >
                                    {type.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Tiêu đề thông báo đẩy</label>
                                <input
                                  type="text"
                                  value={fcmTestTitle}
                                  onChange={(e) => setFcmTestTitle(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500 font-semibold"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Nội dung đẩy hiển thị trên màn hình khóa</label>
                                <textarea
                                  rows={2}
                                  value={fcmTestBody}
                                  onChange={(e) => setFcmTestBody(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500 leading-relaxed resize-none"
                                  required
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/10 hover:shadow-lg hover:shadow-rose-600/15 transition cursor-pointer"
                            >
                              <Send size={12} />
                              <span>Gửi thông báo đẩy thử nghiệm</span>
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Right Block: FCM Delivery Logs */}
                      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-4">
                        <div className="space-y-4 flex-1">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span>📜</span> Nhật ký Truyền Tin Nhận Được ({parentLogs.length})
                          </h4>

                          {parentLogs.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                              Chưa nhận được thông báo đẩy nào gửi tới số điện thoại này.
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                              {parentLogs.map((log) => {
                                const isInspected = fcmLogInspectId === log.id;
                                return (
                                  <div
                                    key={log.id}
                                    className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2.5 ${
                                      isInspected
                                        ? 'border-indigo-400 bg-indigo-500/[0.02] dark:border-indigo-800'
                                        : 'border-slate-150 dark:border-slate-850 hover:border-slate-250 dark:hover:border-slate-750 bg-slate-50/60 dark:bg-slate-950/40'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {getFCMIcon(log.type)}
                                        <div>
                                          <p className="font-extrabold text-slate-850 dark:text-white leading-normal truncate max-w-[120px]">
                                            {getFCMTypeLabel(log.type)}
                                          </p>
                                          <p className="text-[9px] text-slate-400 font-semibold font-mono">
                                            {new Date(log.sentAt).toLocaleTimeString('vi-VN')}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded-md border border-emerald-500/5">
                                          Delivered
                                        </span>
                                        <button
                                          onClick={() => {
                                            setFcmLogInspectId(isInspected ? null : log.id);
                                            setSelectedFcmLogPayload(isInspected ? null : log.payload);
                                          }}
                                          className="p-1 bg-white hover:bg-slate-150 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer"
                                          title="Xem raw JSON payload"
                                        >
                                          🔍
                                        </button>
                                      </div>
                                    </div>

                                    <div>
                                      <h5 className="font-bold text-slate-800 dark:text-slate-150 leading-tight">
                                        {log.title}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1 font-medium">
                                        {log.body}
                                      </p>
                                    </div>

                                    {/* Inspected JSON block */}
                                    {isInspected && log.payload && (
                                      <div className="pt-2 border-t border-dashed border-slate-250/50 dark:border-slate-800/60 space-y-1.5">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                          <span>Raw GCM Payload (JSON Protocol)</span>
                                          <span className="text-indigo-500 lowercase font-bold">Standard format</span>
                                        </p>
                                        <pre className="p-2.5 bg-slate-900 dark:bg-slate-950 text-emerald-400 font-mono text-[9px] rounded-lg overflow-x-auto leading-normal whitespace-pre">
                                          {log.payload}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center font-medium leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
                          🛎️ Hệ thống liên kết giao diện API Firestore trực tuyến để cập nhật trạng thái phân phối tin nhắn theo giao thức Google Cloud Messaging.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        )}
      </main>
    </div>

      {/* 5. ABSENCE REPORT MODAL */}
      {isAbsenceModalOpen && selectedStudent && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsAbsenceModalOpen(false)} />
          
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setIsAbsenceModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3.5">
              <Calendar size={24} />
              <h2 className="text-base font-extrabold">Đơn Xin Nghỉ Học Trực Tuyến</h2>
            </div>

            <p className="text-[11px] text-slate-400 mb-4 leading-normal">
              Vui lòng điền thông tin xin phép nghỉ học cho bé <strong className="text-slate-700 dark:text-slate-200">{selectedStudent.fullName}</strong> lớp <strong className="text-slate-700 dark:text-slate-200">{selectedClass.name}</strong>. Đơn sẽ gửi trực tiếp đến BGH nhà trường.
            </p>

            {formError && (
              <div className="mb-3.5 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-3.5 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <Check size={14} className="shrink-0" />
                <span className="font-medium">{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAbsenceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Nghỉ từ ngày</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Đến hết ngày</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Lý do nghỉ học</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Cháu bị sốt nhẹ đi khám bác sĩ, xin cho cháu nghỉ ở nhà chăm sóc..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAbsenceModalOpen(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
                >
                  Gửi đơn xin nghỉ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. REAL-TIME ATTENDANCE PHOTO LIGHTBOX */}
      {selectedAttendancePhoto && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs animate-fade-in" onClick={() => setSelectedAttendancePhoto(null)} />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 z-[170] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button 
              onClick={() => setSelectedAttendancePhoto(null)} 
              className="absolute top-5 right-5 z-20 p-2 bg-slate-900/60 hover:bg-slate-950 text-white rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="rounded-2xl overflow-hidden aspect-video bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-850">
              <img 
                src={selectedAttendancePhoto} 
                className="max-h-[75vh] w-full object-contain animate-fade-in" 
                alt="Attendance Camera Snapshot Full" 
              />
            </div>
            
            <div className="p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Camera size={16} className="text-emerald-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300 animate-pulse">Ảnh ghi nhận thực tế từ hệ thống CameraAI Class-Cam</span>
              </div>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-mono font-bold text-slate-400">
                Chụp lúc: Điểm danh tự động
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. DYNAMIC TALENT REGISTRATION PAYMENT MODAL */}
      {isPaymentModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsPaymentModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-scale-in text-slate-800 dark:text-slate-100 z-10">
            {/* Sticky Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 relative shrink-0">
              <div className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                <CreditCard size={20} className="animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight truncate">
                  Thanh Toán Học Phí Năng Khiếu
                </h3>
                <span className="text-[10px] text-slate-400 font-bold block">Tháng {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]}</span>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 ml-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {/* Student details summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Học sinh:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedStudent.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Môn học đăng ký:</span>
                  <div className="text-right font-bold text-slate-700 dark:text-slate-300">
                    {paymentSubjects.length > 0 ? (
                      paymentSubjects.map((s, index) => (
                        <span key={s.id} className="block">
                          • {s.name} ({s.fee.toLocaleString('vi-VN')} đ)
                        </span>
                      ))
                    ) : (
                      <span className="italic text-slate-400">Không có môn nào</span>
                    )}
                  </div>
                </div>
                {StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth) > 0 && (
                  <div className="flex justify-between items-start text-slate-500 font-medium border-t border-dashed border-slate-200 dark:border-slate-800 pt-2.5">
                    <span>Khoản phí khác:</span>
                    <div className="text-right font-bold text-rose-600 dark:text-rose-400">
                      <span className="block font-extrabold">{StorageService.getStudentOtherFeeForMonth(selectedStudent, simulatedMonth).toLocaleString('vi-VN')} đ</span>
                      {StorageService.getStudentOtherFeesListForMonth(selectedStudent, simulatedMonth) && StorageService.getStudentOtherFeesListForMonth(selectedStudent, simulatedMonth).length > 0 ? (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal space-y-0.5 mt-1">
                          {StorageService.getStudentOtherFeesListForMonth(selectedStudent, simulatedMonth).map((f, idx) => (
                            <span key={f.id || idx} className="block">• {f.name} ({f.amount.toLocaleString('vi-VN')} đ)</span>
                          ))}
                        </div>
                      ) : (
                        StorageService.getStudentOtherFeeDescriptionForMonth(selectedStudent, simulatedMonth) && (
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal italic">({StorageService.getStudentOtherFeeDescriptionForMonth(selectedStudent, simulatedMonth)})</span>
                        )
                      )}
                    </div>
                  </div>
                )}
                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-2.5 flex justify-between items-center font-extrabold text-slate-900 dark:text-white">
                  <span className="text-xs uppercase">Tổng số tiền / tháng:</span>
                  <span className="text-base text-amber-600 dark:text-amber-400 font-mono">
                    {paymentAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Select payment method tabs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-850 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'qr'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <QrCode size={14} />
                  <span>Chuyển khoản QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Coins size={14} />
                  <span>Tiền mặt</span>
                </button>
              </div>

              {/* Payment method content */}
              {(() => {
                const payBank = selectedClass?.paymentBank || 'Vietcombank (VCB)';
                const payAccountNo = selectedClass?.paymentAccountNo || '1023456789';
                const payAccountName = selectedClass?.paymentAccountName || 'TRUONG MAM NON BAN MAI';
                const paymentContentText = `HP NK ${selectedStudent.studentCode || 'HS'} ${selectedStudent.fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase()} T${simulatedMonth.split('-')[1]}`;

                const getVietQRBankCode = (bankName: string) => {
                  const upper = bankName.toUpperCase();
                  if (upper.includes('VIETCOMBANK') || upper.includes('VCB')) return 'VCB';
                  if (upper.includes('TECHCOMBANK') || upper.includes('TCB')) return 'TCB';
                  if (upper.includes('VIETINBANK') || upper.includes('CTG')) return 'ICB';
                  if (upper.includes('BIDV')) return 'BIDV';
                  if (upper.includes('MBBANK') || upper.includes('MB')) return 'MB';
                  if (upper.includes('AGRIBANK') || upper.includes('VBA')) return 'VBA';
                  if (upper.includes('ACB')) return 'ACB';
                  if (upper.includes('TPBANK') || upper.includes('TPB')) return 'TPB';
                  if (upper.includes('VPBANK') || upper.includes('VPB')) return 'VPB';
                  if (upper.includes('SACOMBANK') || upper.includes('STB')) return 'STB';
                  if (upper.includes('HDBANK') || upper.includes('HDB')) return 'HDB';
                  if (upper.includes('SHB')) return 'SHB';
                  if (upper.includes('VIB')) return 'VIB';
                  return upper.replace(/[^A-Z0-9]/g, '');
                };

                const bankCode = getVietQRBankCode(payBank);

                return (
                  <div className="space-y-4">
                    {paymentMethod === 'qr' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="space-y-2 text-xs">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mb-2 font-medium">
                            {selectedClass?.paymentBank ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">🌟 Học phí này sẽ đóng trực tiếp cho tài khoản của Giáo viên lớp ({selectedClass.name}).</span>
                            ) : (
                              <span>💡 Vui lòng mở ứng dụng Ngân hàng di động (Mobile Banking) để quét mã QR thanh toán nhanh hoặc thực hiện chuyển khoản thủ công theo thông tin dưới đây:</span>
                            )}
                          </p>
                          
                          <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-150 dark:border-slate-800/60 space-y-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Ngân hàng</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">{payBank}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Số tài khoản</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{payAccountNo}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(payAccountNo);
                                    alert('Đã sao chép số tài khoản!');
                                  }}
                                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
                                >
                                  [Sao chép]
                                </button>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Tên người thụ hưởng</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{payAccountName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Nội dung chuyển khoản</span>
                              <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 font-mono font-bold flex justify-between items-center mt-1">
                                <span className="select-all">{paymentContentText}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentContentText);
                                    alert('Đã sao chép nội dung chuyển khoản!');
                                  }}
                                  className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer ml-1 shrink-0"
                                >
                                  [Copy]
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800">
                          <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center">
                            <img
                              src={`https://img.vietqr.io/image/${bankCode}-${payAccountNo}-compact2.png?amount=${paymentAmount}&addInfo=${encodeURIComponent(paymentContentText)}&accountName=${encodeURIComponent(payAccountName)}`}
                              alt={`VietQR ${payBank}`}
                              className="w-40 h-40 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase mt-3 tracking-wider text-center">
                            Mã VietQR Tự Động Quét
                          </span>
                          <span className="text-[9px] text-slate-400 text-center mt-1">
                            Mở ứng dụng Ngân hàng của bạn để quét mã
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
                        <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-xl">
                          💵
                        </div>
                        <div className="space-y-1 max-w-sm mx-auto">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Hướng Dẫn Thanh Toán Tiền Mặt</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                            Phụ huynh vui lòng nộp tiền mặt trực tiếp tại <strong>Phòng Kế toán của nhà trường</strong> hoặc gửi trực tiếp cho <strong>Giáo viên chủ nhiệm lớp</strong> của con trước ngày <strong>10 hàng tháng</strong>.
                          </p>
                          <p className="text-[10px] text-slate-400 italic">
                            *Nhà trường hoặc Giáo viên lớp sẽ ghi nhận trạng thái đã đóng và gửi biên lai xác nhận ngay khi nhận được tiền mặt.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Sticky Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold leading-normal shrink-0">
              <span className="flex items-center gap-1">
                🛡️ Hệ thống thanh toán bảo mật mầm non
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPaymentSent}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl uppercase shadow-md transition text-xs cursor-pointer flex items-center gap-1"
                >
                  <span>Tôi đã chuyển khoản / đóng tiền</span>
                </button>
              </div>
            </div>
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

      {selectedEventDetails && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSelectedEventDetails(null)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-150 dark:border-slate-800 z-10 space-y-6 max-h-[90vh] overflow-y-auto animate-fade-in">
            
            {/* Header / Event Title */}
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-4">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest ${
                  selectedEventDetails.type === 'meeting' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                  selectedEventDetails.type === 'festival' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                  selectedEventDetails.type === 'holiday' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                  selectedEventDetails.type === 'health' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                }`}>
                  {
                    selectedEventDetails.type === 'meeting' ? 'Họp phụ huynh' :
                    selectedEventDetails.type === 'festival' ? 'Ngày hội sáng tạo' :
                    selectedEventDetails.type === 'holiday' ? 'Lịch nghỉ lễ' :
                    selectedEventDetails.type === 'health' ? 'Sức khỏe học đường' :
                    'Phát triển thể chất'
                  }
                </span>
                
                <button
                  type="button"
                  onClick={() => setSelectedEventDetails(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition"
                >
                  <X size={18} />
                </button>
              </div>
              
              <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                {selectedEventDetails.title}
              </h3>
            </div>

            {/* Time / Location / Calendar details list */}
            <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 font-medium text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Ngày diễn ra</span>
                  <strong className="text-slate-800 dark:text-slate-200">{new Date(selectedEventDetails.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </div>
              </div>

              {selectedEventDetails.time && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Thời gian chi tiết</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedEventDetails.time}</strong>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <MapPin size={16} />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Địa điểm</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedEventDetails.location}</strong>
                </div>
              </div>
            </div>

            {/* Event Description */}
            <div className="space-y-2">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Chi tiết nội dung sự kiện</span>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedEventDetails.description}
              </p>
            </div>

            {/* Important Notes */}
            {selectedEventDetails.note && (
              <div className="p-4 bg-rose-500/5 border border-rose-100 dark:border-rose-950/30 rounded-2xl flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div className="space-y-1">
                  <span className="text-rose-700 dark:text-rose-400 text-[10px] uppercase font-extrabold tracking-wider block">Lưu ý quan trọng cho phụ huynh</span>
                  <p className="text-xs text-rose-600 dark:text-rose-300 font-semibold leading-relaxed">
                    {selectedEventDetails.note}
                  </p>
                </div>
              </div>
            )}

            {/* RSVP status interactive footer inside modal */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="w-full sm:w-auto">
                {selectedEventDetails.type === 'holiday' ? (
                  <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-xl block text-center sm:text-left">
                    🏖️ Lịch nghỉ lễ chính thức của toàn trường
                  </span>
                ) : (
                  (() => {
                    const rsvpKey = `${selectedEventDetails.id}_${session.parentPhone || 'anonymous'}`;
                    const rsvpStatus = eventRsvps[rsvpKey] || 'not_set';
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400 font-bold block shrink-0 text-[10px] uppercase">Xác nhận:</span>
                        <button
                          type="button"
                          onClick={() => handleRsvpChange(selectedEventDetails.id, 'going')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            rsvpStatus === 'going'
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-slate-150 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Check size={12} /> Sẽ tham gia
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRsvpChange(selectedEventDetails.id, 'cant')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            rsvpStatus === 'cant'
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'bg-slate-150 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          <X size={12} /> Không tham gia
                        </button>
                      </div>
                    );
                  })()
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedEventDetails(null)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer text-center"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal to view larger photo of prescription */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-xl w-full border border-slate-200/60 dark:border-slate-800 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full text-slate-500 dark:text-slate-300 transition cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                📷 Ảnh đơn thuốc / Toa thuốc chi tiết
              </h3>
              <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-150 dark:border-slate-800 flex items-center justify-center max-h-[70vh]">
                <img
                  src={selectedPhotoModal}
                  alt="Prescription Large Preview"
                  className="max-h-[60vh] max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedPhotoModal(null)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition text-xs cursor-pointer"
                >
                  Đóng ảnh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. QUICK MEDICATION REQUEST MODAL */}
      {isQuickMedModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs no-print animate-fade-in text-slate-800 dark:text-slate-100">
          <div className="absolute inset-0" onClick={() => setIsQuickMedModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[92vh] animate-scale-in z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2.5 text-rose-500">
                <Pill size={22} className="animate-bounce text-rose-500" />
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    TẠO ĐƠN GỬI THUỐC CHO BÉ 💊
                  </h3>
                  <span className="text-[10px] text-slate-450 font-bold block mt-0.5">Dặn dò cô giáo cho bé uống thuốc đúng giờ, đúng liều lượng chỉ định.</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsQuickMedModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSendMedication} className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Prominent Child Name Card */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Học và tên bé</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                  <span className="uppercase">{selectedStudent.fullName}</span>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">({selectedStudent.studentCode})</span>
                </div>
              </div>

              {/* Quick Children Switcher inside Modal (if they have multiple kids) */}
              {students.length > 1 && (
                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Hoặc chọn bé khác dặn thuốc:</label>
                  <div className="flex flex-wrap gap-2">
                    {students.map(s => {
                      const isSelected = selectedStudent.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedStudent(s)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            isSelected 
                              ? 'bg-rose-500 border-rose-500 text-white shadow-3xs' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-450'
                          }`}
                        >
                          👶 {s.fullName} ({s.className})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Demo Presets section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-1.5">
                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Chọn mẫu dặn thuốc nhanh:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetMed('siro')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    🧪 Toa Siro ho mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetMed('cream')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    🧴 Toa Kem bôi mẫu
                  </button>
                </div>
              </div>

              {medError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{medError}</span>
                </div>
              )}

              {/* Inputs */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Định bệnh / Triệu chứng của bé
                  </label>
                  <input
                    type="text"
                    value={medDiagnosis}
                    onChange={(e) => setMedDiagnosis(e.target.value)}
                    placeholder="Ví dụ: Bé bị sốt nhẹ, ho có đờm, ho dị ứng thời tiết..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-rose-500 transition font-medium"
                    required
                  />
                </div>

                {/* DYNAMIC MULTIPLE MEDICINES INPUTS */}
                <div className="space-y-4 border-t border-b border-slate-100 dark:border-slate-800 py-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Danh sách loại thuốc cần uống ({medList.length}) 💊
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMedList([...medList, { id: 'med_item_' + Date.now() + '_' + medList.length, name: '', dosage: '', timing: [], mealRelation: 'none' }]);
                      }}
                      className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                    >
                      <Plus size={12} /> Thêm thuốc khác ➕
                    </button>
                  </div>

                  <div className="space-y-4">
                    {medList.map((med, idx) => (
                      <div key={med.id} className="p-4 bg-slate-50/70 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5 relative">
                        {medList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setMedList(medList.filter(m => m.id !== med.id));
                            }}
                            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                            title="Xóa loại thuốc này"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <div className="flex items-center gap-1.5">
                          <span className="inline-block px-2.5 py-0.5 bg-rose-500 text-white font-black text-[9px] rounded-md uppercase tracking-wider">
                            Loại thuốc #{idx + 1}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên thuốc dặn uống <span className="text-rose-500">*</span></label>
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => {
                                const newList = [...medList];
                                newList[idx].name = e.target.value;
                                setMedList(newList);
                              }}
                              placeholder="Ví dụ: Viên sủi MyVita / Thuốc hạ sốt..."
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-rose-500 transition font-medium"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Liều lượng (Số viên / Số ml) <span className="text-rose-500">*</span></label>
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) => {
                                const newList = [...medList];
                                newList[idx].dosage = e.target.value;
                                setMedList(newList);
                              }}
                              placeholder="Ví dụ: 1 viên, 5ml, bôi mỏng..."
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-rose-500 transition font-medium"
                              required
                            />
                          </div>
                        </div>

                        {/* Timing Choices (Sáng, Trưa, Chiều, Tối) */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Thời điểm uống thuốc trong ngày (Chọn ít nhất một) <span className="text-rose-500">*</span></label>
                          <div className="flex flex-wrap gap-1.5">
                            {['Sáng', 'Trưa', 'Chiều', 'Tối', 'Khi sốt'].map(time => {
                              const isChecked = med.timing.includes(time);
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => {
                                    const newList = [...medList];
                                    if (isChecked) {
                                      newList[idx].timing = med.timing.filter(t => t !== time);
                                    } else {
                                      newList[idx].timing = [...med.timing, time];
                                    }
                                    setMedList(newList);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1 ${
                                    isChecked
                                      ? 'bg-rose-500 border-rose-500 text-white shadow-3xs scale-95'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {isChecked ? '✓' : time === 'Khi sốt' ? '🌡️' : '•'} {time}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Meal Relation Choice */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Mối quan hệ với bữa ăn</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { val: 'none', label: 'Không yêu cầu' },
                              { val: 'before', label: 'Trước khi ăn 🍽️' },
                              { val: 'after', label: 'Sau khi ăn 🥣' }
                            ].map(opt => {
                              const isSelected = med.mealRelation === opt.val;
                              return (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => {
                                    const newList = [...medList];
                                    newList[idx].mealRelation = opt.val as any;
                                    setMedList(newList);
                                  }}
                                  className={`py-2 rounded-xl text-[10px] font-extrabold transition-all border text-center cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-500/15 border-amber-400 text-amber-600 dark:text-amber-400 shadow-3xs'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Notes / Parent Reminders */}
                <div className="p-4 bg-amber-500/[0.03] dark:bg-amber-500/[0.02] border border-amber-500/20 rounded-2xl space-y-2">
                  <label className="block text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                    Lưu ý đặc biệt cho cô giáo (Ví dụ: tiền sử dị ứng, dặn dò uống thêm nước...)
                  </label>
                  <textarea
                    value={medSpecialNotes}
                    onChange={(e) => setMedSpecialNotes(e.target.value)}
                    placeholder="Vui lòng nhập các lưu ý quan trọng để giáo viên nắm bắt ngay lập tức (Ví dụ: Bé dị ứng paracetamol, bé lười uống nước nhờ cô đút nước ấm sau uống, bé dễ ói...)"
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:border-amber-500 dark:focus:border-amber-600 transition font-medium text-xs leading-relaxed"
                  />
                  
                  {/* Quick suggestion tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      '⚠️ Bé dị ứng paracetamol',
                      '🥣 Nhờ cô nhắc uống nước ấm sau thuốc',
                      '⚠️ Bé dễ bị nôn trớ khi uống thuốc',
                      '💤 Nhờ cô cho uống trước giờ ngủ trưa',
                    ].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = medSpecialNotes.trim();
                          if (current.includes(tag)) return;
                          setMedSpecialNotes(current ? `${current}. ${tag}` : tag);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-amber-50 dark:bg-slate-900 dark:hover:bg-amber-950/20 border border-amber-500/10 text-slate-650 dark:text-slate-400 hover:text-amber-600 rounded-lg text-[9px] font-bold cursor-pointer transition active:scale-95"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prescription photo upload or drag-and-drop zone */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Ảnh chụp đơn thuốc hoặc vỉ thuốc
                  </label>
                  
                  {/* Real File Input for click/drag upload and camera capture */}
                  <input
                    type="file"
                    id="med-file-input"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleMedFileChange}
                  />

                  <div
                    onDragOver={handleMedDragOver}
                    onDragLeave={handleMedDragLeave}
                    onDrop={handleMedDrop}
                    onClick={() => document.getElementById('med-file-input')?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 select-none ${
                      isMedDragging 
                        ? 'border-rose-500 bg-rose-500/10 scale-[1.01]' 
                        : 'border-slate-200 hover:border-rose-400 dark:border-slate-800 dark:hover:border-rose-900/60 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-rose-500/[0.02]'
                    }`}
                  >
                    {medPhoto ? (
                      <div className="flex items-center gap-3 w-full text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-3xs shrink-0">
                          <img src={medPhoto} alt="Prescription Uploadeded" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">Đã tải ảnh thành công! 🎉</p>
                          <p className="text-[10px] text-slate-400 font-medium">Bấm vào ảnh hoặc gửi để giáo viên xem.</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedPhotoModal(medPhoto)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-650 dark:text-slate-300 font-black rounded-lg text-[10px]"
                          >
                            Xem 👁️
                          </button>
                          <button
                            type="button"
                            onClick={() => setMedPhoto(null)}
                            className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-black rounded-lg text-[10px]"
                          >
                            Xóa 🗑️
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-2.5 bg-rose-500/10 rounded-full text-rose-500">
                          <Camera size={20} className="animate-pulse" />
                        </div>
                        <div className="text-center space-y-0.5">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Nhấn để chụp ảnh hoặc tải đơn thuốc lên
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            Hỗ trợ kéo thả ảnh • Dung lượng tối đa 5MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Fallback URL input in case of presets or manual dán link */}
                  <div className="mt-2.5 space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Hoặc dán URL liên kết hình ảnh (Tùy chọn):</span>
                    <input
                      type="text"
                      value={medPhoto && !medPhoto.startsWith('data:') ? medPhoto : ''}
                      onChange={(e) => setMedPhoto(e.target.value || null)}
                      placeholder="Dán link ảnh thuốc..."
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-rose-500 transition font-mono text-[10px]"
                    />
                  </div>
                </div>

                {/* Parent consent confirmation */}
                <div className="p-3.5 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/15 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="quick-med-consent"
                    checked={medParentConfirmed}
                    onChange={(e) => setMedParentConfirmed(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 shrink-0 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="quick-med-consent" className="text-[11px] text-slate-650 dark:text-slate-350 leading-normal font-bold cursor-pointer select-none">
                    Tôi xác nhận tự nguyện gửi thuốc, cam kết thuốc có nguồn gốc rõ ràng, đã ghi đúng chỉ định của bác sĩ và tự chịu trách nhiệm về hướng dẫn sử dụng trên. ✍️
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2.5 shrink-0 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickMedModalOpen(false)}
                  className="flex-1 py-2.5 px-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSendingMedication}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white font-extrabold rounded-xl text-xs uppercase shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {isSendingMedication ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Pill size={14} />
                      Xác nhận phụ huynh gửi thuốc 💊
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PERSONAL QR BADGE MODAL FOR PARENTS */}
      {isQRModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsQRModalOpen(false)} />
          
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-[160] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button 
              onClick={() => setIsQRModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer z-10 bg-white/80 dark:bg-slate-800/80 p-1.5 rounded-full shadow-3xs"
            >
              <X size={16} />
            </button>

            {/* Colorful friendly header banner */}
            <div className="bg-gradient-to-tr from-rose-600 to-amber-500 p-6 text-white text-center space-y-1 relative">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
              <p className="text-[10px] tracking-widest uppercase font-extrabold opacity-75">Mã QR Điểm Danh Cá Nhân</p>
              <h3 className="text-lg font-extrabold">{settings?.schoolName || 'TRƯỜNG MẦM NON 3'}</h3>
              <p className="text-[10px] opacity-90 font-medium">🧸 Check-in nhanh không cần quét khuôn mặt</p>
            </div>

            {/* Badge Content */}
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border-2 border-rose-100 dark:border-slate-850 shadow-md">
                <img
                  src={selectedStudent.avatar}
                  alt={selectedStudent.fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">{selectedStudent.fullName}</h4>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Mã Học Sinh: {selectedStudent.studentCode}</p>
                <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold uppercase">
                  Lớp: {selectedStudent.className || 'Chưa xếp lớp'}
                </span>
              </div>

              {/* QR Code container */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col items-center shadow-inner relative group">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('MN3_QR_' + selectedStudent.studentCode)}`}
                  alt="QR Code"
                  className="w-40 h-40 object-contain mix-blend-multiply dark:mix-blend-normal dark:bg-white dark:p-2 dark:rounded-lg"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest font-mono mt-2.5">
                  MN3_QR_{selectedStudent.studentCode}
                </span>
              </div>
            </div>

            {/* Print or Close Options */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-850 flex gap-3">
              <button
                type="button"
                onClick={() => setIsQRModalOpen(false)}
                className="flex-1 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>In Thẻ QR Điểm Danh - ${selectedStudent.fullName}</title>
                          <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                            body {
                              font-family: 'Inter', sans-serif;
                              display: flex;
                              justify-content: center;
                              align-items: center;
                              height: 100vh;
                              margin: 0;
                              background: #f8fafc;
                            }
                            .card {
                              width: 300px;
                              border: 1px solid #e2e8f0;
                              border-radius: 20px;
                              overflow: hidden;
                              background: white;
                              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                              text-align: center;
                            }
                            .header {
                              background: linear-gradient(135deg, #f43f5e, #f59e0b);
                              color: white;
                              padding: 20px;
                            }
                            .header p { margin: 0; font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; opacity: 0.8; }
                            .header h3 { margin: 5px 0 0; font-size: 16px; font-weight: 900; }
                            .content { padding: 25px; display: flex; flex-direction: column; align-items: center; gap: 15px; }
                            .avatar { width: 80px; height: 80px; border-radius: 15px; object-fit: cover; border: 2px solid #ddd; }
                            .name { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; }
                            .code { font-size: 12px; font-weight: bold; color: #64748b; margin: 2px 0 0; }
                            .class-badge { background: #fff1f2; color: #e11d48; padding: 4px 12px; border-radius: 100px; font-size: 10px; font-weight: 900; text-transform: uppercase; display: inline-block; }
                            .qr-container { padding: 10px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 15px; margin-top: 10px; }
                            .qr-code { width: 140px; height: 140px; }
                            .qr-text { font-size: 10px; font-family: monospace; font-weight: bold; color: #94a3b8; letter-spacing: 2px; margin-top: 8px; }
                          </style>
                        </head>
                        <body>
                          <div class="card">
                            <div class="header">
                              <p>Mã QR Điểm Danh Học Sinh</p>
                              <h3>${settings?.schoolName || 'TRƯỜNG MẦM NON 3'}</h3>
                            </div>
                            <div class="content">
                              <img class="avatar" src="${selectedStudent.avatar}" />
                              <div>
                                <p class="name">${selectedStudent.fullName}</p>
                                <p class="code">Mã HS: ${selectedStudent.studentCode}</p>
                                <span class="class-badge">Lớp: ${selectedStudent.className || 'Chưa xếp lớp'}</span>
                              </div>
                              <div class="qr-container">
                                <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('MN3_QR_' + selectedStudent.studentCode)}" />
                                <div class="qr-text">MN3_QR_${selectedStudent.studentCode}</div>
                              </div>
                            </div>
                          </div>
                          <script>
                            window.onload = function() {
                              window.print();
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase shadow-md hover:shadow-rose-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer size={14} />
                <span>In Thẻ QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING REAL-TIME PUSH NOTIFICATION TOAST OVERLAY */}
      {fcmToast && (
        <div className="fixed top-5 right-5 z-[200] max-w-sm w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-rose-500/40 p-4 animate-slide-in text-slate-850 dark:text-white flex gap-3.5 items-start">
          <div className="p-2 bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-xl text-lg shrink-0">
            {fcmToast.type === 'attendance_absent' ? '🚨' : fcmToast.type === 'attendance_late' ? '⏳' : '📢'}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-md">
                {fcmToast.type === 'attendance_absent' ? 'Cảnh báo Nghỉ học' : fcmToast.type === 'attendance_late' ? 'Thông báo Đi trễ' : 'Tin tức khẩn'}
              </span>
              <button onClick={() => setFcmToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <h4 className="text-xs font-black leading-tight text-slate-900 dark:text-white">{fcmToast.title}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{fcmToast.body}</p>
            <p className="text-[8px] text-slate-400 font-mono text-right pt-1">{new Date(fcmToast.sentAt).toLocaleTimeString('vi-VN')}</p>
          </div>
        </div>
      )}

    </div>
  );
}
