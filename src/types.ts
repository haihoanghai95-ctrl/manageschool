/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TalentSubject {
  id: string;
  name: string;
  fee: number;
  schedule?: string;  // Lịch học (ví dụ: "Thứ Hai, Thứ Tư")
  timeSlot?: string;  // Giờ học (ví dụ: "16:30 - 17:30")
  isMandatory?: boolean; // Môn học bắt buộc học
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  studentCount?: number;
  talentFee?: number;     // Tổng học phí năng khiếu
  talentSubjects?: TalentSubject[]; // Danh sách các môn học năng khiếu
  createdBy?: string;    // Số điện thoại giáo viên tạo hoặc 'admin'
  coTeachers?: string[]; // Danh sách số điện thoại đồng giáo viên cùng quản lý lớp
  paymentBank?: string;       // Ngân hàng thanh toán (ví dụ: Vietcombank)
  paymentAccountNo?: string;  // Số tài khoản thanh toán của GV
  paymentAccountName?: string; // Tên chủ tài khoản thanh toán của GV
}

export type Gender = 'Nam' | 'Nữ' | 'Khác';

export interface Student {
  id: string;
  studentCode: string; // Mã học sinh
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  address: string;
  parentPhone: string;
  fatherPhone?: string; // Số điện thoại ba
  motherPhone?: string; // Số điện thoại mẹ
  guardianPhone?: string; // Số điện thoại người nuôi dưỡng
  email: string;
  classId: string; // ID của lớp học
  className?: string; // Tên của lớp học (để hiển thị nhanh)
  avatar?: string; // Data URL của ảnh đại diện
  faceEmbedding?: number[]; // Lưu trữ tọa độ mốc hoặc vector đặc trưng mô phỏng
  faceImage?: string; // Ảnh khuôn mặt đã đăng ký (Data URL)
  talentFee?: number; // Học phí năng khiếu riêng biệt (nếu có)
  otherFee?: number; // Phí khác nếu có trong tháng
  otherFeeDescription?: string; // Mô tả các khoản phí khác
  otherFeesList?: { id: string; name: string; amount: number; paid?: boolean }[]; // Chi tiết các khoản phí khác
  otherFeeMonth?: string; // Tháng áp dụng các khoản phí khác (YYYY-MM)
  registeredTalentSubjects?: string[]; // ID các môn học năng khiếu học sinh đăng ký
  talentFeePaid?: boolean; // Trạng thái đóng học phí năng khiếu (true: đã đóng, false/undefined: chưa đóng)
  paymentMethod?: string; // Hình thức thanh toán (Chuyển khoản, Tiền mặt)
  talentFeeDueDate?: string; // Hạn đóng học phí năng khiếu (YYYY-MM-DD)
  quickNotes?: string; // Ghi chú nhanh tình hình bé trong ngày
  talentLastRegisteredMonth?: string; // Tháng cuối đăng ký/cập nhật môn năng khiếu (YYYY-MM)
  paidMonths?: string[]; // Danh sách các tháng đã đóng học phí (YYYY-MM)
  paymentMethodsByMonth?: Record<string, string>; // Hình thức thanh toán theo tháng (tháng -> hình thức)
  registeredTalentsByMonth?: Record<string, string[]>; // Danh sách môn học đăng ký theo từng tháng (tháng -> mảng ID môn học)
}

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  status: AttendanceStatus;
  notes?: string;
  photoCaptured?: string; // Ảnh chụp khi điểm danh thực tế
}

export interface SchoolSettings {
  startTime: string; // Giờ bắt đầu học (ví dụ "07:30")
  lateTime: string; // Giờ bắt đầu tính đi muộn (ví dụ "07:45")
  schoolName: string; // Tên trường
  schoolLogo?: string; // Logo trường (Data URL hoặc URL mặc định)
  themeColor: 'blue' | 'emerald' | 'violet' | 'rose' | 'amber';
  darkMode: boolean;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  welcomeTag?: string;
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
}

export interface UserSession {
  isAdmin: boolean;
  isParent?: boolean;
  parentPhone?: string;
  parentName?: string;
  isTeacher?: boolean;
  teacherPhone?: string;
  teacherName?: string;
  email: string;
}

export interface ParentAccount {
  phone: string;
  name: string;
  password?: string;
}

export interface TeacherAccount {
  phone: string;
  name: string;
  password?: string;
  dob?: string;          // Ngày tháng năm sinh (YYYY-MM-DD)
  address?: string;      // Địa chỉ
  hometown?: string;     // Quê quán
  gender?: Gender;       // Giới tính
  cccd?: string;         // Số CCCD
  position?: string;     // Chức vụ
  isPartyMember?: boolean; // Đảng viên (true/false)
}

export interface MenuItem {
  breakfast: string;     // Bữa sáng
  morningSnack?: string; // Bữa phụ sáng
  lunch: string;         // Bữa trưa
  afternoonSnack: string; // Bữa xế
}

export interface WeeklyMenu {
  id: string; // "week_1", "week_2", etc.
  classroomId?: string; // can be for a specific class or general school menu (e.g. "all")
  menu: {
    monday: MenuItem;
    tuesday: MenuItem;
    wednesday: MenuItem;
    thursday: MenuItem;
    friday: MenuItem;
  };
  menuImage?: string; // Data URL of the uploaded menu photo
}

export interface AbsenceReport {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  parentPhone: string;
}

export interface HealthRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className?: string;
  date: string; // YYYY-MM-DD
  height: number; // in cm
  weight: number; // in kg
  bmi?: number;
  status?: string; // 'Dư cân' | 'Béo phì' | 'Suy dinh dưỡng' | 'Bình thường' | 'Trẻ dưới 60 tháng tuổi'
  notes?: string;
}

export interface DailyAssessment {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className?: string;
  date: string; // YYYY-MM-DD
  healthStatus: 'Khỏe mạnh' | 'Mệt mỏi' | 'Sốt' | 'Ho' | 'Bình thường';
  diningStatus: 'Ăn ngoan/hết suất' | 'Ăn một nửa' | 'Ăn ít/biếng ăn' | 'Bình thường';
  sleepStatus: 'Ngủ ngon/đủ giấc' | 'Khó ngủ' | 'Không ngủ' | 'Bình thường';
  activityStatus: 'Năng nổ' | 'Bình thường' | 'Mất tập trung';
  hygieneStatus: 'Bình thường' | 'Táo bón' | 'Tiêu chảy';
  notes: string;
  createdAt: string;
}

export interface TeacherNotification {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  parentPhone: string;
  parentName: string;
  type: 'talent_register' | 'talent_change' | 'absence_request' | 'fee_payment' | 'event_rsvp' | 'medication_request';
  content: string;
  createdAt: string;
  read?: boolean;
  isRead?: boolean;
  message?: string;
  timestamp?: string;
  month?: string;
}

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

export interface ClassActivity {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "07:30 - 08:15"
  title: string;
  completed: boolean;
}

export interface ParentNotification {
  id: string;
  classId: string;
  className: string;
  type: 'activity_create' | 'activity_update' | 'activity_delete' | 'medication_reject' | 'attendance_scan' | 'reminder_payment' | 'reminder_vaccine' | 'reminder_event' | 'reminder_holiday';
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  photo?: string;
}

export interface ParentReminderRule {
  id: string;
  type: 'vaccination' | 'event' | 'tuition' | 'holiday_rsvp';
  title: string;
  contentTemplate: string;
  daysBefore: number;
  isActive: boolean;
  targetAudience: 'all' | 'by_class';
  targetClassId?: string;
  lastTriggered?: string;
}

export interface MedicineItem {
  id: string;
  name: string;      // Tên thuốc, ví dụ: "Viên thuốc A"
  dosage: string;    // Liều dùng: "1 viên", "5ml"
  timing: string[];  // Thời điểm: Sáng, Trưa, Chiều, Tối (e.g. ['morning', 'noon', 'afternoon', 'evening'])
  mealRelation: 'before' | 'after' | 'none'; // Trước ăn, Sau ăn, Không yêu cầu
}

export interface MedicationRequest {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  diagnosis: string; // Định bệnh
  medicineName: string; // Tên thuốc (for backward-compatibility, e.g. list of names combined)
  dosage: string; // Liều dùng / hướng dẫn sử dụng (for backward-compatibility, e.g. combined instructions)
  prescriptionPhoto?: string; // Ảnh đơn thuốc hoặc hình chụp thuốc (Data URL)
  parentConfirmed: boolean; // Xác nhận phụ huynh gửi thuốc
  parentPhone: string;
  parentName: string;
  teacherConfirmed: boolean; // Xác nhận của giáo viên
  teacherConfirmedBy?: string; // Tên giáo viên xác nhận
  teacherConfirmedAt?: string; // Thời gian giáo viên xác nhận (YYYY-MM-DD HH:MM:SS)
  createdAt: string; // Ngày gửi thuốc (YYYY-MM-DD HH:MM:SS)
  medicines?: MedicineItem[]; // Danh sách các loại thuốc chi tiết (Thêm mới)
  status?: 'pending' | 'received' | 'taken' | 'rejected';
  rejectReason?: string;
  specialNotes?: string; // Ghi chú đặc biệt từ phụ huynh
}

export interface NoonSupervisionShift {
  id: string;
  date: string; // Định dạng YYYY-MM-DD
  shiftName: string; // Ca trực (ví dụ: "Ca trưa", "Ca chính", "Ca phụ")
  teachers: string[]; // Tên hoặc ID của 2-3 giáo viên trực
  notes?: string; // Tình hình ca trực
  createdAt: string; // YYYY-MM-DD HH:MM:SS
  classId?: string; // ID lớp học được trực
  className?: string; // Tên lớp học được trực
}






