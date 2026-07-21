/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Classroom, Student, AttendanceRecord, SchoolSettings, UserSession, ParentAccount, WeeklyMenu, AbsenceReport, TeacherAccount, HealthRecord, DailyAssessment, TeacherNotification, SchoolEvent, ClassActivity, ParentNotification, MedicationRequest, NoonSupervisionShift, ParentReminderRule } from '../types';
import { generateMockEmbedding } from './faceSim';
import {
  saveSettingsToFirebase,
  saveClassroomsToFirebase,
  saveStudentsToFirebase,
  saveTeachersToFirebase,
  saveParentsToFirebase,
  saveWeeklyMenuToFirebase,
  saveAbsenceReportsToFirebase,
  saveAttendanceToFirebase
} from './firebaseSync';

function handleSyncCatch(err: unknown) {
  const errMsg = err instanceof Error ? err.message : String(err);
  if (errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("insufficient")) {
    console.warn("Firebase Sync Warning: Permissions blocked (Security rules mismatch).");
  } else {
    console.error("Firebase sync error:", err);
  }
}

const KEYS = {
  CLASSROOMS: 'sma_classrooms',
  STUDENTS: 'sma_students',
  ATTENDANCE: 'sma_attendance',
  SETTINGS: 'sma_settings',
  SESSION: 'sma_session',
  PARENTS: 'sma_parents',
  TEACHERS: 'sma_teachers',
  WEEKLY_MENU: 'sma_weekly_menu',
  ABSENCE_REPORTS: 'sma_absence_reports',
  HEALTH_RECORDS: 'sma_health_records',
  DAILY_ASSESSMENTS: 'sma_daily_assessments',
  DAILY_COMMENTS: 'sma_daily_comments',
  TEACHER_NOTIFICATIONS: 'sma_teacher_notifications',
  PARENT_NOTIFICATIONS: 'sma_parent_notifications',
  EVENTS: 'sma_school_events',
  MEDICATION_REQUESTS: 'sma_medication_requests',
  NOON_SUPERVISION_SHIFTS: 'sma_noon_supervision_shifts',
  PARENT_REMINDER_RULES: 'sma_parent_reminder_rules',
};

// Thực đơn tuần mầm non mặc định
const DEFAULT_WEEKLY_MENU: WeeklyMenu = {
  id: 'week_current',
  classroomId: 'all',
  menu: {
    monday: {
      breakfast: 'Súp gà ngô ngọt hạt sen dinh dưỡng',
      morningSnack: 'Sữa chua uống Proby lên men',
      lunch: 'Cơm gạo dẻo thơm, Cá quả kho tộ mềm, Canh rau dền đỏ thịt băm, Dưa hấu lòng đỏ',
      afternoonSnack: 'Bánh flan sữa tươi caramen ngọt ngào'
    },
    tuesday: {
      breakfast: 'Cháo sườn heo non hạt sen bùi ngậy',
      morningSnack: 'Nước ép cam sành nguyên chất',
      lunch: 'Cơm thịt heo bọc trứng cút sốt cà chua, Canh bí đỏ nấu mọc gà, Chuối ngự tiêu chín',
      afternoonSnack: 'Chè đậu xanh hạt sen thanh nhiệt'
    },
    wednesday: {
      breakfast: 'Nui xào thịt bò Úc sốt bơ tỏi',
      morningSnack: 'Sữa chua dẻo nếp cẩm hạt sen',
      lunch: 'Cơm trắng, Tôm sú rim thịt ba chỉ rim keo, Canh cải bó xôi thịt băm, Táo Gala',
      afternoonSnack: 'Bánh mì sandwich phết bơ phô mai ấm'
    },
    thursday: {
      breakfast: 'Phở gà ta xé phay bánh phở tươi',
      morningSnack: 'Sữa yến mạch hạt điều tự nấu hảo hạng',
      lunch: 'Cơm trắng mềm, Đùi gà rô ti nước dừa xiêm, Canh khoai tây cà rốt hầm sườn, Lê ngọt quả lê',
      afternoonSnack: 'Bánh bông lan trứng muối tươi mềm mại'
    },
    friday: {
      breakfast: 'Cháo cá hồi Na Uy bông cải xanh',
      morningSnack: 'Nước sinh tố xoài cát Hòa Lộc',
      lunch: 'Cơm chiên Dương Châu màu sắc, Thịt bò xào bông thiên lý, Canh cải cúc tôm nõn, Thạch rau câu dừa',
      afternoonSnack: 'Trái cây thập cẩm xắt hạt lựu dầm sữa tươi'
    }
  }
};

// Cài đặt mặc định
const DEFAULT_SETTINGS: SchoolSettings = {
  startTime: '07:30',
  lateTime: '07:45',
  schoolName: 'TRƯỜNG MẦM NON 3 - PHƯỜNG BÀN CỜ TP.HỒ CHÍ MINH',
  themeColor: 'rose',
  darkMode: false,
  welcomeTitle: 'Chào mừng quý thầy cô đến với cổng quản trị',
  welcomeSubtitle: 'Chúc cô và các bé mầm non một ngày học tập, vui chơi thật nhiều niềm vui!',
  welcomeTag: 'Bé Ngoan Xuất Sắc 🌟',
};

// Dữ liệu lớp học ban đầu (Seed Data)
const INITIAL_CLASSROOMS: Classroom[] = [
  { 
    id: 'c1', 
    name: 'Lớp 12A1', 
    description: 'Niên khóa 2023 - 2026 | Khối tự nhiên chuyên Toán', 
    talentFee: 500000,
    talentSubjects: [
      { id: 't1_1', name: 'Mỹ thuật', fee: 300000, schedule: 'Thứ Hai, Thứ Tư', timeSlot: '16:30 - 17:30' },
      { id: 't1_2', name: 'Đàn Piano', fee: 200000, schedule: 'Thứ Ba, Thứ Năm', timeSlot: '17:00 - 18:00' }
    ],
    createdBy: 'admin'
  },
  { 
    id: 'c2', 
    name: 'Lớp 12A2', 
    description: 'Niên khóa 2023 - 2026 | Khối tự nhiên chuyên Lý', 
    talentFee: 450000,
    talentSubjects: [
      { id: 't2_1', name: 'Múa bale', fee: 250000, schedule: 'Thứ Hai, Thứ Sáu', timeSlot: '16:15 - 17:15' },
      { id: 't2_2', name: 'Võ thuật', fee: 200000, schedule: 'Thứ Tư, Thứ Bảy', timeSlot: '15:30 - 16:30' }
    ],
    createdBy: '0911111111' // Cô Mai
  },
  { 
    id: 'c3', 
    name: 'Lớp 11B1', 
    description: 'Niên khóa 2024 - 2027 | Khối xã hội chuyên Anh', 
    talentFee: 600000,
    talentSubjects: [
      { id: 't3_1', name: 'Cờ vua', fee: 300000, schedule: 'Thứ Năm, Thứ Sáu', timeSlot: '16:30 - 17:30' },
      { id: 't3_2', name: 'Bóng rổ', fee: 300000, schedule: 'Thứ Tư, Chủ Nhật', timeSlot: '08:00 - 09:30' }
    ],
    createdBy: '0922222222' // Cô Lan
  },
  { 
    id: 'c4', 
    name: 'Lớp 10C1', 
    description: 'Niên khóa 2025 - 2028 | Khối chuyên Tin học', 
    talentFee: 550000,
    talentSubjects: [
      { id: 't4_1', name: 'Lập trình Scratch', fee: 350000, schedule: 'Thứ Bảy, Chủ Nhật', timeSlot: '14:00 - 15:30' },
      { id: 't4_2', name: 'Kỹ năng mềm', fee: 200000, schedule: 'Thứ Ba, Thứ Năm', timeSlot: '16:30 - 17:30' }
    ],
    createdBy: 'admin'
  },
];

const INITIAL_TEACHERS: TeacherAccount[] = [
  {
    phone: '0911111111',
    name: 'Cô Mai',
    password: '54321',
    dob: '1990-05-15',
    address: '123 Đường Lê Lợi, Quận 1, TP. HCM',
    hometown: 'Bến Tre',
    gender: 'Nữ',
    cccd: '079190012345',
    position: 'Giáo viên chủ nhiệm',
    isPartyMember: true
  },
  {
    phone: '0922222222',
    name: 'Cô Lan',
    password: '54321',
    dob: '1992-11-20',
    address: '456 Đường Nguyễn Trãi, Quận 5, TP. HCM',
    hometown: 'Đồng Tháp',
    gender: 'Nữ',
    cccd: '080192009876',
    position: 'Giáo viên bộ môn',
    isPartyMember: false
  },
];

// Tạo ảnh đại diện mô phỏng bằng canvas SVG hoặc CSS gradients
function generateAvatar(name: string, bgIndex: number): string {
  const colors = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
    'linear-gradient(135deg, #10b981, #047857)', // Emerald
    'linear-gradient(135deg, #8b5cf6, #5b21b6)', // Violet
    'linear-gradient(135deg, #ec4899, #be185d)', // Rose
    'linear-gradient(135deg, #f59e0b, #b45309)', // Amber
  ];
  const color = colors[bgIndex % colors.length];
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  // Tạo chuỗi SVG mã hóa Base64
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="grad${bgIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${bgIndex === 0 ? '#3b82f6' : bgIndex === 1 ? '#10b981' : bgIndex === 2 ? '#8b5cf6' : bgIndex === 3 ? '#ec4899' : '#f59e0b'}" />
        <stop offset="100%" style="stop-color:${bgIndex === 0 ? '#1d4ed8' : bgIndex === 1 ? '#047857' : bgIndex === 2 ? '#5b21b6' : bgIndex === 3 ? '#be185d' : '#b45309'}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#grad${bgIndex})" />
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#ffffff">${initials}</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// Dữ liệu học sinh ban đầu (Seed Data)
const INITIAL_STUDENTS = (classrooms: Classroom[]): Student[] => [
  {
    id: 's1',
    studentCode: 'HS230101',
    fullName: 'Nguyễn Hoàng Nam',
    gender: 'Nam',
    dateOfBirth: '2008-05-14',
    address: '15 Tạ Quang Bửu, Hai Bà Trưng, Hà Nội',
    parentPhone: '0912345678',
    email: 'nam.nh230101@school.edu.vn',
    classId: 'c1',
    avatar: generateAvatar('Nguyễn Hoàng Nam', 0),
    faceImage: generateAvatar('Nguyễn Hoàng Nam', 0),
    faceEmbedding: generateMockEmbedding('Nguyễn Hoàng Nam'),
    registeredTalentSubjects: ['t1_1'],
    talentFee: 300000,
    talentFeePaid: false,
    talentFeeDueDate: '2026-07-10' // Hạn ngày 10 hàng tháng
  },
  {
    id: 's2',
    studentCode: 'HS230102',
    fullName: 'Trần Thị Mai Anh',
    gender: 'Nữ',
    dateOfBirth: '2008-11-23',
    address: '88 Láng Hạ, Đống Đa, Hà Nội',
    parentPhone: '0987654321',
    email: 'anh.ttm230102@school.edu.vn',
    classId: 'c1',
    avatar: generateAvatar('Trần Thị Mai Anh', 1),
    faceImage: generateAvatar('Trần Thị Mai Anh', 1),
    faceEmbedding: generateMockEmbedding('Trần Thị Mai Anh'),
    registeredTalentSubjects: ['t1_2'],
    talentFee: 200000,
    talentFeePaid: true,
    talentFeeDueDate: '2026-07-10'
  },
  {
    id: 's3',
    studentCode: 'HS230103',
    fullName: 'Lê Minh Đức',
    gender: 'Nam',
    dateOfBirth: '2008-02-05',
    address: '124 Hoàng Hoa Thám, Ba Đình, Hà Nội',
    parentPhone: '0903334445',
    email: 'duc.lm230103@school.edu.vn',
    classId: 'c1',
    avatar: generateAvatar('Lê Minh Đức', 2),
    faceImage: generateAvatar('Lê Minh Đức', 2),
    faceEmbedding: generateMockEmbedding('Lê Minh Đức'),
  },
  {
    id: 's4',
    studentCode: 'HS230201',
    fullName: 'Phạm Hồng Minh',
    gender: 'Nam',
    dateOfBirth: '2008-07-19',
    address: '56 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    parentPhone: '0945556667',
    email: 'minh.ph230201@school.edu.vn',
    classId: 'c2',
    avatar: generateAvatar('Phạm Hồng Minh', 3),
    faceImage: generateAvatar('Phạm Hồng Minh', 3),
    faceEmbedding: generateMockEmbedding('Phạm Hồng Minh'),
    registeredTalentSubjects: ['t2_1'],
    talentFee: 250000,
    talentFeePaid: false,
    talentFeeDueDate: '2026-07-02' // Quá hạn hơn 3 ngày so với 2026-07-08
  },
  {
    id: 's5',
    studentCode: 'HS230202',
    fullName: 'Vũ Thùy Linh',
    gender: 'Nữ',
    dateOfBirth: '2008-09-30',
    address: '210 Cầu Giấy, Cầu Giấy, Hà Nội',
    parentPhone: '0911223344',
    email: 'linh.vt230202@school.edu.vn',
    classId: 'c2',
    avatar: generateAvatar('Vũ Thùy Linh', 4),
    faceImage: generateAvatar('Vũ Thùy Linh', 4),
    faceEmbedding: generateMockEmbedding('Vũ Thùy Linh'),
  },
  {
    id: 's6',
    studentCode: 'HS240101',
    fullName: 'Hoàng Bảo Trân',
    gender: 'Nữ',
    dateOfBirth: '2009-03-12',
    address: '45 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    parentPhone: '0977889900',
    email: 'tran.hb240101@school.edu.vn',
    classId: 'c3',
    avatar: generateAvatar('Hoàng Bảo Trân', 0),
    faceImage: generateAvatar('Hoàng Bảo Trân', 0),
    faceEmbedding: generateMockEmbedding('Hoàng Bảo Trân'),
  },
  {
    id: 's7',
    studentCode: 'HS240102',
    fullName: 'Đỗ Anh Tuấn',
    gender: 'Nam',
    dateOfBirth: '2009-10-08',
    address: '320 Mỹ Đình, Nam Từ Liêm, Hà Nội',
    parentPhone: '0966554433',
    email: 'tuan.da240102@school.edu.vn',
    classId: 'c3',
    avatar: generateAvatar('Đỗ Anh Tuấn', 1),
    faceImage: generateAvatar('Đỗ Anh Tuấn', 1),
    faceEmbedding: generateMockEmbedding('Đỗ Anh Tuấn'),
  },
];

// Tạo lịch sử điểm danh mẫu (Seed Attendance) cho 5 ngày qua
const INITIAL_ATTENDANCE = (students: Student[], classrooms: Classroom[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  // Tạo lịch sử trong 5 ngày gần đây (loại trừ hôm nay để người dùng tự điểm danh)
  for (let i = 4; i >= 1; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    
    // Bỏ qua Thứ Bảy, Chủ Nhật
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    const dateString = d.toISOString().split('T')[0];
    
    students.forEach((student) => {
      const cls = classrooms.find(c => c.id === student.classId);
      if (!cls) return;
      
      // Ngẫu nhiên trạng thái: 80% đúng giờ, 12% đi muộn, 8% vắng mặt
      const rand = Math.random();
      let status: 'present' | 'late' | 'absent' = 'present';
      let timeString = '07:15:24';
      
      if (rand < 0.08) {
        status = 'absent';
        timeString = '--:--:--';
      } else if (rand < 0.20) {
        status = 'late';
        // Giờ đi học muộn ngẫu nhiên từ 07:46 đến 08:15
        const mm = Math.floor(Math.random() * 30) + 46;
        const ss = Math.floor(Math.random() * 60);
        timeString = `07:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
      } else {
        status = 'present';
        // Giờ đi học đúng giờ ngẫu nhiên từ 07:00 đến 07:35
        const mm = Math.floor(Math.random() * 35);
        const ss = Math.floor(Math.random() * 60);
        timeString = `07:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
      }
      
      records.push({
        id: `att_${student.id}_${dateString}`,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        classId: student.classId,
        className: cls.name,
        date: dateString,
        time: timeString,
        status,
        notes: status === 'late' ? 'Đi xe buýt muộn' : status === 'absent' ? 'Nghỉ ốm có phép' : 'Đúng giờ',
      });
    });
  }
  
  return records;
};

// Dữ liệu phụ huynh ban đầu (Seed Parents)
const INITIAL_PARENTS: ParentAccount[] = [
  { phone: '0912345678', name: 'Nguyễn Hoàng Hùng', password: '123' },
  { phone: '0987654321', name: 'Trần Quốc Anh', password: '123' },
  { phone: '0903334445', name: 'Lê Minh Hưng', password: '123' },
];

// Dữ liệu xin nghỉ học ban đầu (Seed Absence Reports)
const INITIAL_ABSENCE_REPORTS: AbsenceReport[] = [
  {
    id: 'abs_rep_1',
    studentId: 's1',
    studentName: 'Nguyễn Hoàng Nam',
    classId: 'c1',
    className: 'Lớp 12A1',
    startDate: '2026-07-01',
    endDate: '2026-07-02',
    reason: 'Cháu bị sốt nhẹ mọc răng, gia đình xin phép cho nghỉ học 2 ngày ở nhà theo dõi.',
    status: 'approved',
    createdAt: '2026-06-30T13:30:00Z',
    parentPhone: '0912345678',
  },
  {
    id: 'abs_rep_2',
    studentId: 's2',
    studentName: 'Trần Thị Mai Anh',
    classId: 'c1',
    className: 'Lớp 12A1',
    startDate: '2026-07-08',
    endDate: '2026-07-08',
    reason: 'Gia đình bận đưa bé về quê nội ăn giỗ.',
    status: 'pending',
    createdAt: '2026-07-07T02:15:00Z',
    parentPhone: '0987654321',
  }
];

const INITIAL_HEALTH_RECORDS: HealthRecord[] = [
  // --- THÁNG 03/2026 ---
  {
    id: 'hr_m3_1',
    studentId: 's1',
    studentName: 'Nguyễn Hoàng Nam',
    classId: 'c1',
    date: '2026-03-15',
    height: 170,
    weight: 59,
    bmi: 20.42,
    status: 'Bình thường',
    notes: 'Bé khoẻ mạnh, ăn uống tốt.'
  },
  {
    id: 'hr_m3_2',
    studentId: 's2',
    studentName: 'Trần Thị Mai Anh',
    classId: 'c1',
    date: '2026-03-15',
    height: 158,
    weight: 43,
    bmi: 17.22,
    status: 'Bình thường',
    notes: 'Thể trạng tốt.'
  },
  {
    id: 'hr_m3_3',
    studentId: 's3',
    studentName: 'Lê Minh Đức',
    classId: 'c1',
    date: '2026-03-15',
    height: 173,
    weight: 49,
    bmi: 16.37,
    status: 'Bình thường',
    notes: 'Thể chất bình thường, cần ăn thêm rau.'
  },
  {
    id: 'hr_m3_4',
    studentId: 's4',
    studentName: 'Phạm Hồng Minh',
    classId: 'c2',
    date: '2026-03-15',
    height: 163,
    weight: 65,
    bmi: 24.46,
    status: 'Dư cân',
    notes: 'Hơi có xu hướng dư cân nhẹ.'
  },

  // --- THÁNG 04/2026 ---
  {
    id: 'hr_m4_1',
    studentId: 's1',
    studentName: 'Nguyễn Hoàng Nam',
    classId: 'c1',
    date: '2026-04-15',
    height: 170.5,
    weight: 60,
    bmi: 20.64,
    status: 'Bình thường',
    notes: 'Phát triển ổn định.'
  },
  {
    id: 'hr_m4_2',
    studentId: 's2',
    studentName: 'Trần Thị Mai Anh',
    classId: 'c1',
    date: '2026-04-15',
    height: 158.5,
    weight: 43.5,
    bmi: 17.31,
    status: 'Bình thường'
  },
  {
    id: 'hr_m4_3',
    studentId: 's3',
    studentName: 'Lê Minh Đức',
    classId: 'c1',
    date: '2026-04-15',
    height: 173.5,
    weight: 50,
    bmi: 16.61,
    status: 'Bình thường'
  },
  {
    id: 'hr_m4_4',
    studentId: 's4',
    studentName: 'Phạm Hồng Minh',
    classId: 'c2',
    date: '2026-04-15',
    height: 163.6,
    weight: 65.8,
    bmi: 24.58,
    status: 'Dư cân'
  },

  // --- THÁNG 05/2026 ---
  {
    id: 'hr_m5_1',
    studentId: 's1',
    studentName: 'Nguyễn Hoàng Nam',
    classId: 'c1',
    date: '2026-05-15',
    height: 171.2,
    weight: 61,
    bmi: 20.81,
    status: 'Bình thường'
  },
  {
    id: 'hr_m5_2',
    studentId: 's2',
    studentName: 'Trần Thị Mai Anh',
    classId: 'c1',
    date: '2026-05-15',
    height: 159.2,
    weight: 44.2,
    bmi: 17.44,
    status: 'Bình thường'
  },
  {
    id: 'hr_m5_3',
    studentId: 's3',
    studentName: 'Lê Minh Đức',
    classId: 'c1',
    date: '2026-05-15',
    height: 174.2,
    weight: 51,
    bmi: 16.81,
    status: 'Bình thường'
  },
  {
    id: 'hr_m5_4',
    studentId: 's4',
    studentName: 'Phạm Hồng Minh',
    classId: 'c2',
    date: '2026-05-15',
    height: 164.2,
    weight: 66.7,
    bmi: 24.74,
    status: 'Dư cân'
  },

  // --- THÁNG 06/2026 ---
  {
    id: 'hr_1',
    studentId: 's1',
    studentName: 'Nguyễn Hoàng Nam',
    classId: 'c1',
    date: '2026-06-15',
    height: 172,
    weight: 62,
    bmi: 20.96,
    status: 'Bình thường',
    notes: 'Bé phát triển cân đối, sức khỏe tốt.'
  },
  {
    id: 'hr_2',
    studentId: 's2',
    studentName: 'Trần Thị Mai Anh',
    classId: 'c1',
    date: '2026-06-15',
    height: 160,
    weight: 45,
    bmi: 17.58,
    status: 'Bình thường',
    notes: 'Thể trạng tốt, cần duy trì dinh dưỡng.'
  },
  {
    id: 'hr_3',
    studentId: 's3',
    studentName: 'Lê Minh Đức',
    classId: 'c1',
    date: '2026-06-15',
    height: 175,
    weight: 52,
    bmi: 16.98,
    status: 'Suy dinh dưỡng',
    notes: 'Bé hơi nhẹ cân, gia đình nên bổ sung thêm bữa phụ cho bé.'
  },
  {
    id: 'hr_4',
    studentId: 's4',
    studentName: 'Phạm Hồng Minh',
    classId: 'c2',
    date: '2026-06-15',
    height: 165,
    weight: 68,
    bmi: 24.98,
    status: 'Dư cân',
    notes: 'Hơi có xu hướng dư cân nhẹ. Nên hạn chế đồ ăn nhanh, tinh bột.'
  },

  // --- THÁNG 07/2026 ---
  {
    id: 'hr_m7_1',
    studentId: 's1',
    studentName: 'Nguyễn Hoàng Nam',
    classId: 'c1',
    date: '2026-07-05',
    height: 172.5,
    weight: 62.5,
    bmi: 20.97,
    status: 'Bình thường'
  },
  {
    id: 'hr_m7_2',
    studentId: 's2',
    studentName: 'Trần Thị Mai Anh',
    classId: 'c1',
    date: '2026-07-05',
    height: 160.4,
    weight: 45.5,
    bmi: 17.68,
    status: 'Bình thường'
  },
  {
    id: 'hr_m7_3',
    studentId: 's3',
    studentName: 'Lê Minh Đức',
    classId: 'c1',
    date: '2026-07-05',
    height: 175.5,
    weight: 53,
    bmi: 17.21,
    status: 'Bình thường'
  },
  {
    id: 'hr_m7_4',
    studentId: 's4',
    studentName: 'Phạm Hồng Minh',
    classId: 'c2',
    date: '2026-07-05',
    height: 165.5,
    weight: 68.5,
    bmi: 25.01,
    status: 'Béo phì'
  }
];

const INITIAL_DAILY_ASSESSMENTS: DailyAssessment[] = [
  {
    id: 'da_1',
    studentId: 's1',
    studentName: 'Nguyễn Hoàng Nam',
    classId: 'c1',
    date: '2026-07-10',
    healthStatus: 'Khỏe mạnh',
    diningStatus: 'Ăn ngoan/hết suất',
    sleepStatus: 'Ngủ ngon/đủ giấc',
    activityStatus: 'Năng nổ',
    hygieneStatus: 'Bình thường',
    notes: 'Hôm nay con học rất ngoan, ăn hết suất nhanh và biết nhường đồ chơi cho các bạn khác.',
    createdAt: '2026-07-10T08:00:00.000Z'
  },
  {
    id: 'da_2',
    studentId: 's2',
    studentName: 'Trần Thị Mai Anh',
    classId: 'c1',
    date: '2026-07-10',
    healthStatus: 'Mệt mỏi',
    diningStatus: 'Ăn một nửa',
    sleepStatus: 'Khó ngủ',
    activityStatus: 'Bình thường',
    hygieneStatus: 'Bình thường',
    notes: 'Hôm nay con có vẻ hơi mệt, ăn ít hơn mọi ngày và khó vào giấc ngủ trưa. Cô đã theo dõi nhiệt độ thấy bình thường.',
    createdAt: '2026-07-10T08:05:00.000Z'
  },
  {
    id: 'da_3',
    studentId: 's3',
    studentName: 'Lê Minh Đức',
    classId: 'c1',
    date: '2026-07-10',
    healthStatus: 'Khỏe mạnh',
    diningStatus: 'Ăn ngoan/hết suất',
    sleepStatus: 'Ngủ ngon/đủ giấc',
    activityStatus: 'Năng nổ',
    hygieneStatus: 'Bình thường',
    notes: 'Con tham gia tích cực hoạt động múa hát và vẽ tranh đất nặn cùng cả lớp.',
    createdAt: '2026-07-10T08:10:00.000Z'
  },
  {
    id: 'da_4',
    studentId: 's1',
    studentName: 'Nguyễn Hoàng Nam',
    classId: 'c1',
    date: '2026-07-09',
    healthStatus: 'Khỏe mạnh',
    diningStatus: 'Ăn ngoan/hết suất',
    sleepStatus: 'Ngủ ngon/đủ giấc',
    activityStatus: 'Bình thường',
    hygieneStatus: 'Bình thường',
    notes: 'Nam chơi hòa đồng với các bạn trong lớp, chiều ăn xế bánh sữa rất ngoan.',
    createdAt: '2026-07-09T08:00:00.000Z'
  }
];

export class StorageService {
  public static initialize() {
    // 1. Cài đặt
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    } else {
      try {
        const current = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
        if (current && (current.themeColor !== 'rose' || current.darkMode !== false)) {
          current.themeColor = 'rose';
          current.darkMode = false;
          localStorage.setItem(KEYS.SETTINGS, JSON.stringify(current));
        }
      } catch (e) {
        // ignore
      }
    }
    
    // 2. Lớp học
    if (!localStorage.getItem(KEYS.CLASSROOMS)) {
      localStorage.setItem(KEYS.CLASSROOMS, JSON.stringify(INITIAL_CLASSROOMS));
    }
    
    // 3. Học sinh
    if (!localStorage.getItem(KEYS.STUDENTS)) {
      const cls = JSON.parse(localStorage.getItem(KEYS.CLASSROOMS) || '[]');
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS(cls)));
    }
    
    // 4. Điểm danh
    if (!localStorage.getItem(KEYS.ATTENDANCE)) {
      const studs = JSON.parse(localStorage.getItem(KEYS.STUDENTS) || '[]');
      const cls = JSON.parse(localStorage.getItem(KEYS.CLASSROOMS) || '[]');
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE(studs, cls)));
    }

    // 5. Khởi tạo session ban đầu (đã đăng nhập để trải nghiệm dễ dàng, nhưng có thể logout)
    if (!localStorage.getItem(KEYS.SESSION) && localStorage.getItem('sma_logged_out') !== 'true') {
      localStorage.setItem(KEYS.SESSION, JSON.stringify({ isAdmin: true, email: 'admin@school.edu.vn' }));
    }

    // 6. Khởi tạo tài khoản Phụ huynh
    if (!localStorage.getItem(KEYS.PARENTS)) {
      localStorage.setItem(KEYS.PARENTS, JSON.stringify(INITIAL_PARENTS));
    }

    // 6b. Khởi tạo tài khoản Giáo viên
    if (!localStorage.getItem(KEYS.TEACHERS)) {
      localStorage.setItem(KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
    }

    // 7. Khởi tạo Thực đơn Tuần
    if (!localStorage.getItem(KEYS.WEEKLY_MENU)) {
      localStorage.setItem(KEYS.WEEKLY_MENU, JSON.stringify(DEFAULT_WEEKLY_MENU));
    }

    // 8. Khởi tạo Đăng ký Báo vắng
    if (!localStorage.getItem(KEYS.ABSENCE_REPORTS)) {
      localStorage.setItem(KEYS.ABSENCE_REPORTS, JSON.stringify(INITIAL_ABSENCE_REPORTS));
    }

    // 9. Khởi tạo Sức khỏe
    if (!localStorage.getItem(KEYS.HEALTH_RECORDS)) {
      localStorage.setItem(KEYS.HEALTH_RECORDS, JSON.stringify(INITIAL_HEALTH_RECORDS));
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem(KEYS.HEALTH_RECORDS) || '[]');
        if (existing.length <= 4) {
          localStorage.setItem(KEYS.HEALTH_RECORDS, JSON.stringify(INITIAL_HEALTH_RECORDS));
        }
      } catch (e) {
        // ignore
      }
    }

    // 10. Khởi tạo Đánh giá hằng ngày
    if (!localStorage.getItem(KEYS.DAILY_ASSESSMENTS)) {
      localStorage.setItem(KEYS.DAILY_ASSESSMENTS, JSON.stringify(INITIAL_DAILY_ASSESSMENTS));
    }
  }

  // --- TEACHERS ---
  public static getTeachers(): TeacherAccount[] {
    this.initialize();
    try {
      const list = JSON.parse(localStorage.getItem(KEYS.TEACHERS) || '[]');
      let changed = false;
      const migrated = list.map((t: TeacherAccount) => {
        if (!t.password || t.password === '123') {
          changed = true;
          return { ...t, password: '54321' };
        }
        return t;
      });
      if (changed) {
        localStorage.setItem(KEYS.TEACHERS, JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      return [];
    }
  }

  public static saveTeachers(teachers: TeacherAccount[]) {
    localStorage.setItem(KEYS.TEACHERS, JSON.stringify(teachers));
    saveTeachersToFirebase(teachers).catch(handleSyncCatch);
  }

  // --- SETTINGS ---
  public static getSettings(): SchoolSettings {
    this.initialize();
    try {
      return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: SchoolSettings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    // Apply dark mode class to HTML element
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveSettingsToFirebase(settings).catch(handleSyncCatch);
  }

  // --- CLASSROOMS ---
  public static getClassrooms(): Classroom[] {
    this.initialize();
    try {
      const cls = JSON.parse(localStorage.getItem(KEYS.CLASSROOMS) || '[]');
      const studs = this.getStudents();
      // Tính toán động số lượng học sinh của từng lớp
      return cls.map((c: Classroom) => ({
        ...c,
        studentCount: studs.filter(s => s.classId === c.id).length,
      }));
    } catch {
      return [];
    }
  }

  public static saveClassrooms(classrooms: Classroom[]) {
    localStorage.setItem(KEYS.CLASSROOMS, JSON.stringify(classrooms));
    saveClassroomsToFirebase(classrooms).catch(handleSyncCatch);
  }

  // --- STUDENTS ---
  public static getStudents(): Student[] {
    this.initialize();
    try {
      const studs = JSON.parse(localStorage.getItem(KEYS.STUDENTS) || '[]');
      const cls = JSON.parse(localStorage.getItem(KEYS.CLASSROOMS) || '[]');
      return studs.map((s: Student) => {
        const matchingClass = cls.find((c: Classroom) => c.id === s.classId);
        return {
          ...s,
          className: matchingClass ? matchingClass.name : 'Chưa xếp lớp',
        };
      });
    } catch {
      return [];
    }
  }

  public static saveStudents(students: Student[]) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
    saveStudentsToFirebase(students).catch(handleSyncCatch);
  }

  public static getStudentOtherFeeForMonth(student: Student, month: string): number {
    const feeMonth = student.otherFeeMonth || '2026-07';
    if (feeMonth === month) {
      return student.otherFee || 0;
    }
    return 0;
  }

  public static getStudentOtherFeeDescriptionForMonth(student: Student, month: string): string {
    const feeMonth = student.otherFeeMonth || '2026-07';
    if (feeMonth === month) {
      return student.otherFeeDescription || '';
    }
    return '';
  }

  public static getStudentOtherFeesListForMonth(student: Student, month: string): { id: string; name: string; amount: number }[] {
    const feeMonth = student.otherFeeMonth || '2026-07';
    if (feeMonth === month) {
      return student.otherFeesList || [];
    }
    return [];
  }

  public static isStudentPaidForMonth(student: Student, month: string): boolean {
    if (student.paidMonths && student.paidMonths.includes(month)) {
      return true;
    }
    // Backward compatibility for initial mock data:
    if (student.talentFeePaid) {
      const defaultPaidMonth = student.talentFeeDueDate ? student.talentFeeDueDate.substring(0, 7) : '2026-07';
      if (defaultPaidMonth === month) {
        return true;
      }
    }
    return false;
  }

  public static getStudentPaymentMethodForMonth(student: Student, month: string): string {
    if (student.paymentMethodsByMonth && student.paymentMethodsByMonth[month]) {
      return student.paymentMethodsByMonth[month];
    }
    if (student.talentFeePaid && student.paymentMethod) {
      const defaultPaidMonth = student.talentFeeDueDate ? student.talentFeeDueDate.substring(0, 7) : '2026-07';
      if (defaultPaidMonth === month) {
        return student.paymentMethod;
      }
    }
    return '';
  }

  public static getStudentRegisteredTalentsForMonth(student: Student, month: string): string[] {
    if (student.registeredTalentsByMonth && student.registeredTalentsByMonth[month]) {
      return student.registeredTalentsByMonth[month];
    }
    // Propagate previous months
    if (student.registeredTalentsByMonth) {
      const months = Object.keys(student.registeredTalentsByMonth).sort();
      const pastMonths = months.filter(m => m <= month);
      if (pastMonths.length > 0) {
        const latestMonth = pastMonths[pastMonths.length - 1];
        return student.registeredTalentsByMonth[latestMonth];
      }
    }
    // Fallback to legacy
    return student.registeredTalentSubjects || [];
  }

  // --- ATTENDANCE ---
  public static getAttendance(): AttendanceRecord[] {
    this.initialize();
    try {
      return JSON.parse(localStorage.getItem(KEYS.ATTENDANCE) || '[]');
    } catch {
      return [];
    }
  }

  public static saveAttendance(attendance: AttendanceRecord[]) {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attendance));
    
    const trySync = async () => {
      if (!navigator.onLine) {
        localStorage.setItem('sma_attendance_needs_sync', 'true');
        console.warn('[StorageService] Device is offline. Attendance saved to local cache, marked for later sync.');
        window.dispatchEvent(new CustomEvent('attendance-offline-saved'));
        return;
      }
      
      try {
        await saveAttendanceToFirebase(attendance);
        localStorage.removeItem('sma_attendance_needs_sync');
        console.log('[StorageService] Attendance synced to Firebase successfully.');
        window.dispatchEvent(new CustomEvent('attendance-synced-online'));
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isPermissionError = errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("insufficient");
        
        if (isPermissionError) {
          console.warn('[StorageService] Firebase sync blocked by security rules.');
        } else {
          localStorage.setItem('sma_attendance_needs_sync', 'true');
          console.warn('[StorageService] Firebase sync failed due to network error. Marked as needs sync.', err);
          window.dispatchEvent(new CustomEvent('attendance-offline-saved'));
        }
      }
    };
    
    trySync();
  }

  public static clearOldAttendanceRecords(days: number = 30): { clearedCount: number; remainingCount: number } {
    try {
      const records = this.getAttendance();
      const now = new Date();
      const limitDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const limitString = limitDate.toISOString().split('T')[0];
      
      const filtered = records.filter(record => record.date >= limitString);
      const clearedCount = records.length - filtered.length;
      
      this.saveAttendance(filtered);
      return { clearedCount, remainingCount: filtered.length };
    } catch (e) {
      console.error('Error clearing old attendance records:', e);
      return { clearedCount: 0, remainingCount: 0 };
    }
  }

  public static async syncUnsyncedAttendance(): Promise<boolean> {
    const needsSync = localStorage.getItem('sma_attendance_needs_sync') === 'true';
    if (!needsSync) return false;
    
    if (!navigator.onLine) {
      console.log('[StorageService] Cannot sync: Device is still offline.');
      return false;
    }
    
    console.log('[StorageService] Online again! Syncing local attendance to Firebase...');
    try {
      const localAttendance = this.getAttendance();
      await saveAttendanceToFirebase(localAttendance);
      localStorage.removeItem('sma_attendance_needs_sync');
      console.log('[StorageService] Unsynced attendance synced to Firebase successfully on recovery.');
      window.dispatchEvent(new CustomEvent('attendance-synced-online', { detail: { isRecovery: true } }));
      return true;
    } catch (err) {
      console.error('[StorageService] Failed to sync unsynced attendance on recovery:', err);
      return false;
    }
  }

  // --- ADMIN PASSWORD ---
  public static getAdminPassword(): string {
    return localStorage.getItem('sma_admin_password') || 'admin123';
  }

  public static saveAdminPassword(password: string) {
    localStorage.setItem('sma_admin_password', password);
  }

  // --- SESSION ---
  public static getSession(): UserSession | null {
    try {
      const session = localStorage.getItem(KEYS.SESSION);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  }

  public static saveSession(session: UserSession | null) {
    if (session) {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
      localStorage.removeItem('sma_logged_out');
    } else {
      localStorage.removeItem(KEYS.SESSION);
      localStorage.setItem('sma_logged_out', 'true');
    }
  }

  // Helper sinh avatar mới
  public static getNewAvatar(name: string, bgIndex: number): string {
    return generateAvatar(name, bgIndex);
  }

  // --- PARENTS ---
  public static getParents(): ParentAccount[] {
    this.initialize();
    try {
      return JSON.parse(localStorage.getItem(KEYS.PARENTS) || '[]');
    } catch {
      return [];
    }
  }

  public static saveParents(parents: ParentAccount[]) {
    localStorage.setItem(KEYS.PARENTS, JSON.stringify(parents));
    saveParentsToFirebase(parents).catch(handleSyncCatch);
  }

  // --- WEEKLY MENU ---
  public static getWeeklyMenu(): WeeklyMenu {
    this.initialize();
    try {
      return JSON.parse(localStorage.getItem(KEYS.WEEKLY_MENU) || 'null') || DEFAULT_WEEKLY_MENU;
    } catch {
      return DEFAULT_WEEKLY_MENU;
    }
  }

  public static saveWeeklyMenu(weeklyMenu: WeeklyMenu) {
    localStorage.setItem(KEYS.WEEKLY_MENU, JSON.stringify(weeklyMenu));
    saveWeeklyMenuToFirebase(weeklyMenu).catch(handleSyncCatch);
  }

  // --- ABSENCE REPORTS ---
  public static getAbsenceReports(): AbsenceReport[] {
    this.initialize();
    try {
      return JSON.parse(localStorage.getItem(KEYS.ABSENCE_REPORTS) || '[]');
    } catch {
      return [];
    }
  }

  public static saveAbsenceReports(reports: AbsenceReport[]) {
    localStorage.setItem(KEYS.ABSENCE_REPORTS, JSON.stringify(reports));
    saveAbsenceReportsToFirebase(reports).catch(handleSyncCatch);
  }

  // --- HEALTH RECORDS ---
  public static getHealthRecords(): HealthRecord[] {
    this.initialize();
    try {
      const records = JSON.parse(localStorage.getItem(KEYS.HEALTH_RECORDS) || '[]');
      const students = this.getStudents();
      return records.map((r: HealthRecord) => {
        const student = students.find(s => s.id === r.studentId);
        return {
          ...r,
          studentName: student ? student.fullName : r.studentName,
          className: student ? student.className : r.className,
        };
      });
    } catch {
      return [];
    }
  }

  public static saveHealthRecords(records: HealthRecord[]) {
    localStorage.setItem(KEYS.HEALTH_RECORDS, JSON.stringify(records));
  }

  // --- DAILY ASSESSMENTS ---
  public static getDailyAssessments(): DailyAssessment[] {
    this.initialize();
    try {
      const records = JSON.parse(localStorage.getItem(KEYS.DAILY_ASSESSMENTS) || '[]');
      const students = this.getStudents();
      return records.map((r: DailyAssessment) => {
        const student = students.find(s => s.id === r.studentId);
        return {
          ...r,
          studentName: student ? student.fullName : r.studentName,
          className: student ? student.className : r.className,
        };
      });
    } catch {
      return [];
    }
  }

  public static saveDailyAssessments(records: DailyAssessment[]) {
    localStorage.setItem(KEYS.DAILY_ASSESSMENTS, JSON.stringify(records));
  }

  // --- TEACHER NOTIFICATIONS ---
  public static getTeacherNotifications(): TeacherNotification[] {
    this.initialize();
    try {
      return JSON.parse(localStorage.getItem(KEYS.TEACHER_NOTIFICATIONS) || '[]');
    } catch {
      return [];
    }
  }

  public static saveTeacherNotifications(notifications: TeacherNotification[]) {
    localStorage.setItem(KEYS.TEACHER_NOTIFICATIONS, JSON.stringify(notifications));
  }

  // --- DAILY COMMENTS / REVIEWS ---
  public static getDailyComments(): Record<string, { rating: number; text: string }> {
    this.initialize();
    try {
      const data = localStorage.getItem(KEYS.DAILY_COMMENTS);
      if (!data) {
        return {
          'std_1': { rating: 5, text: 'Học tập hăng say, ăn hết suất ăn trưa nhanh nhẹn.' },
          'std_2': { rating: 4, text: 'Ngoan ngoãn nghe lời cô, hơi buồn ngủ vào đầu buổi xế.' },
          'std_3': { rating: 5, text: 'Năng nổ tham gia hoạt động múa hát thể thao cùng các bạn.' }
        };
      }
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  public static saveDailyComments(comments: Record<string, { rating: number; text: string }>) {
    localStorage.setItem(KEYS.DAILY_COMMENTS, JSON.stringify(comments));
  }

  // --- SCHOOL EVENTS & HOLIDAYS ---
  public static getSchoolEvents(): SchoolEvent[] {
    this.initialize();
    try {
      const data = localStorage.getItem(KEYS.EVENTS);
      if (!data) {
        const fallback: SchoolEvent[] = [
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
            note: 'Các con nghỉ học và sinh hoạt tại gia dịch. Thứ Ba ngày 28/7 trường đón các con đi học bình thường.'
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
        localStorage.setItem(KEYS.EVENTS, JSON.stringify(fallback));
        return fallback;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveSchoolEvents(events: SchoolEvent[]) {
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  }

  // --- CLASSROOM DYNAMIC ACTIVITIES ---
  public static getClassActivities(): ClassActivity[] {
    this.initialize();
    try {
      const data = localStorage.getItem('sma_class_activities');
      if (!data) {
        const fallback: ClassActivity[] = [
          // Activities for Class c1 (12A1) on 2026-07-11
          { id: 'act_1_1', classId: 'c1', date: '2026-07-11', time: '07:30 - 08:15', title: 'Đón trẻ & Tập thể dục buổi sáng ☀️', completed: true },
          { id: 'act_1_2', classId: 'c1', date: '2026-07-11', time: '08:15 - 09:30', title: 'Hoạt động học tập mầm non (Vẽ tranh đất nặn) 🎨', completed: true },
          { id: 'act_1_3', classId: 'c1', date: '2026-07-11', time: '09:30 - 10:30', title: 'Vui chơi ngoài trời, khám phá thiên nhiên 🌿', completed: true },
          { id: 'act_1_4', classId: 'c1', date: '2026-07-11', time: '10:30 - 11:30', title: 'Vệ sinh cá nhân & Bữa trưa ngon miệng 🍲', completed: false },
          { id: 'act_1_5', classId: 'c1', date: '2026-07-11', time: '11:30 - 14:00', title: 'Giấc ngủ trưa yên lành của bé 💤', completed: false },
          { id: 'act_1_6', classId: 'c1', date: '2026-07-11', time: '14:15 - 15:00', title: 'Ăn xế dinh dưỡng (Uống sữa, bánh ngọt) 🥛', completed: false },
          { id: 'act_1_7', classId: 'c1', date: '2026-07-11', time: '15:00 - 16:30', title: 'Sinh hoạt tự do, kể chuyện cổ tích & Trả trẻ 🎒', completed: false },

          // Activities for Class c2 (12A2) on 2026-07-11
          { id: 'act_2_1', classId: 'c2', date: '2026-07-11', time: '07:30 - 08:15', title: 'Đón học sinh & Khởi động ngày mới 🏃‍♂️', completed: true },
          { id: 'act_2_2', classId: 'c2', date: '2026-07-11', time: '08:15 - 09:30', title: 'Nhận diện hình khối & Tô màu sáng tạo ✏️', completed: true },
          { id: 'act_2_3', classId: 'c2', date: '2026-07-11', time: '09:30 - 10:30', title: 'Trò chơi dân gian nhảy bao bố ngoài sân 🪵', completed: true },
          { id: 'act_2_4', classId: 'c2', date: '2026-07-11', time: '10:30 - 11:30', title: 'Rửa tay xà phòng & Ăn trưa bán trú 🍱', completed: true },
          { id: 'act_2_5', classId: 'c2', date: '2026-07-11', time: '11:30 - 14:00', title: 'Giấc ngủ trưa ngon giấc 😴', completed: false },
          { id: 'act_2_6', classId: 'c2', date: '2026-07-11', time: '14:15 - 15:00', title: 'Ăn xế chiều (Sữa chua nếp cẩm) 🥛', completed: false },
          { id: 'act_2_7', classId: 'c2', date: '2026-07-11', time: '15:00 - 16:30', title: 'Xem phim hoạt hình giáo dục & Trả trẻ 🎬', completed: false }
        ];
        localStorage.setItem('sma_class_activities', JSON.stringify(fallback));
        return fallback;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveClassActivities(activities: ClassActivity[]) {
    localStorage.setItem('sma_class_activities', JSON.stringify(activities));
  }

  // --- PARENT NOTIFICATIONS ---
  public static getParentNotifications(): ParentNotification[] {
    this.initialize();
    try {
      const data = localStorage.getItem(KEYS.PARENT_NOTIFICATIONS);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveParentNotifications(notifications: ParentNotification[]) {
    localStorage.setItem(KEYS.PARENT_NOTIFICATIONS, JSON.stringify(notifications));
  }

  // --- MEDICATION REQUESTS ---
  public static getMedicationRequests(): MedicationRequest[] {
    this.initialize();
    try {
      const data = localStorage.getItem(KEYS.MEDICATION_REQUESTS);
      if (!data) {
        // Mock some initial data if none exists so there's rich visual state
        const mockRequests: MedicationRequest[] = [
          {
            id: 'med_1',
            studentId: 'std_1',
            studentName: 'Nguyễn Minh Quân',
            classId: 'c1',
            className: 'Lớp Lớn Măng Non (c1)',
            diagnosis: 'Cảm cúm nhẹ, ho khan',
            medicineName: 'Siro Ho Prospan 5ml & Decolgen 1/2 viên',
            dosage: 'Uống sau giờ ăn trưa lúc 11:45. Siro uống trực tiếp, Decolgen hòa tan với nước ấm dặn bé uống hết.',
            prescriptionPhoto: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=300&auto=format&fit=crop',
            parentConfirmed: true,
            parentPhone: '0901234567',
            parentName: 'Nguyễn Văn Hải (Ba)',
            teacherConfirmed: true,
            teacherConfirmedBy: 'Cô Trúc',
            teacherConfirmedAt: '2026-07-13 11:50:00',
            createdAt: '2026-07-13 07:45:00'
          },
          {
            id: 'med_2',
            studentId: 'std_2',
            studentName: 'Lê Mai Anh',
            classId: 'c1',
            className: 'Lớp Lớn Măng Non (c1)',
            diagnosis: 'Phát ban nhẹ dị ứng thời tiết',
            medicineName: 'Kem bôi ngoài da Hidem Cream',
            dosage: 'Bôi một lớp mỏng lên vùng da mẩn đỏ ở hai cánh tay sau khi tắm trưa xong (khoảng 14:30)',
            prescriptionPhoto: 'https://images.unsplash.com/photo-1550572017-edd951b55104?q=80&w=300&auto=format&fit=crop',
            parentConfirmed: true,
            parentPhone: '0912345678',
            parentName: 'Lê Thị Mai (Mẹ)',
            teacherConfirmed: false,
            createdAt: '2026-07-13 08:15:00'
          }
        ];
        localStorage.setItem(KEYS.MEDICATION_REQUESTS, JSON.stringify(mockRequests));
        return mockRequests;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveMedicationRequests(requests: MedicationRequest[]) {
    localStorage.setItem(KEYS.MEDICATION_REQUESTS, JSON.stringify(requests));
  }

  public static addMedicationRequest(req: MedicationRequest) {
    const requests = this.getMedicationRequests();
    requests.unshift(req);
    this.saveMedicationRequests(requests);
  }

  public static updateMedicationRequest(updated: MedicationRequest) {
    const requests = this.getMedicationRequests();
    const index = requests.findIndex(r => r.id === updated.id);
    if (index !== -1) {
      requests[index] = updated;
      this.saveMedicationRequests(requests);
    }
  }

  // --- NOON SUPERVISION SHIFTS ---
  public static getNoonSupervisionShifts(): NoonSupervisionShift[] {
    this.initialize();
    try {
      const data = localStorage.getItem(KEYS.NOON_SUPERVISION_SHIFTS);
      if (!data) {
        // Seed some initial noon supervision shifts if empty
        const initialShifts: NoonSupervisionShift[] = [
          {
            id: 'sh_1',
            date: '2026-07-13',
            shiftName: 'Ca trực trưa 1',
            teachers: ['Nguyễn Thị Mai', 'Trần Thị Lan', 'Lê Văn Tám'],
            notes: 'Tình hình lớp ngủ ngoan, không có bé nào quấy khóc hay sốt.',
            createdAt: '2026-07-13 13:00:00'
          },
          {
            id: 'sh_2',
            date: '2026-07-14',
            shiftName: 'Ca trực trưa 2',
            teachers: ['Hoàng Thị Hồng', 'Phạm Văn Nam'],
            notes: 'Lớp ngủ đúng giờ, bé Gia Bảo ho nhẹ nhưng đã uống thuốc phụ huynh gửi.',
            createdAt: '2026-07-14 13:10:00'
          }
        ];
        localStorage.setItem(KEYS.NOON_SUPERVISION_SHIFTS, JSON.stringify(initialShifts));
        return initialShifts;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveNoonSupervisionShifts(shifts: NoonSupervisionShift[]) {
    localStorage.setItem(KEYS.NOON_SUPERVISION_SHIFTS, JSON.stringify(shifts));
  }

  // --- PARENT REMINDER RULES ---
  public static getParentReminderRules(): ParentReminderRule[] {
    this.initialize();
    try {
      const data = localStorage.getItem(KEYS.PARENT_REMINDER_RULES);
      if (!data) {
        const defaultRules: ParentReminderRule[] = [
          {
            id: 'rule_1',
            type: 'vaccination',
            title: '💉 Nhắc nhở: Lịch tiêm ngừa vắc-xin ho gà - uốn ván cho bé',
            contentTemplate: 'Kính gửi quý phụ huynh bé {{studentName}}, nhà trường xin thông báo lịch tiêm chủng mở rộng (Ho gà - Uốn ván - Bại liệt) diễn ra vào ngày thứ Sáu tới tại Phòng Y tế. Kính mong phụ huynh mang theo sổ tiêm ngừa của bé.',
            daysBefore: 3,
            isActive: true,
            targetAudience: 'all'
          },
          {
            id: 'rule_2',
            type: 'tuition',
            title: '💰 Thông báo: Nhắc đóng học phí & phí bán trú tháng {{month}}',
            contentTemplate: 'Kính gửi quý phụ huynh bé {{studentName}} lớp {{className}}, nhà trường xin nhắc lịch hoàn tất học phí tháng {{month}}. Hạn cuối đóng phí là ngày 10 hàng tháng. Cảm ơn sự đồng hành của quý phụ huynh!',
            daysBefore: 5,
            isActive: true,
            targetAudience: 'all'
          },
          {
            id: 'rule_3',
            type: 'event',
            title: '📅 Nhắc nhở: Buổi họp phụ huynh định kỳ đầu học kỳ',
            contentTemplate: 'Kính gửi bố mẹ bé {{studentName}}, giáo viên chủ nhiệm lớp {{className}} trân trọng kính mời quý phụ huynh tham gia họp mặt phụ huynh định kỳ vào lúc 08:30 sáng thứ Bảy này tại phòng học của lớp để thảo luận chương trình chăm sóc bé.',
            daysBefore: 2,
            isActive: true,
            targetAudience: 'all'
          },
          {
            id: 'rule_4',
            type: 'holiday_rsvp',
            title: '🎏 Đăng ký tham dự: Lễ hội Trăng Rằm & Hội chợ ẩm thực quê hương',
            contentTemplate: 'Chào phụ huynh bé {{studentName}}, nhà trường sẽ tổ chức Lễ hội Trăng Rằm vào tuần tới. Kính mời phụ huynh đăng ký số lượng thành viên tham gia hội chợ ẩm thực và đăng ký tiết mục văn nghệ cùng bé.',
            daysBefore: 7,
            isActive: false,
            targetAudience: 'all'
          }
        ];
        localStorage.setItem(KEYS.PARENT_REMINDER_RULES, JSON.stringify(defaultRules));
        return defaultRules;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveParentReminderRules(rules: ParentReminderRule[]) {
    localStorage.setItem(KEYS.PARENT_REMINDER_RULES, JSON.stringify(rules));
  }
}
