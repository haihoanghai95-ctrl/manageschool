/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Heart,
  Search,
  Filter,
  Plus,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Scale,
  Activity,
  Check,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  FileText,
  Printer,
  Pill,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Download
} from 'lucide-react';
import { Student, Classroom, SchoolSettings, HealthRecord, ParentNotification } from '../types';
import { StorageService } from '../utils/storage';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface HealthProps {
  students: Student[];
  classrooms: Classroom[];
  settings: SchoolSettings;
  initialActiveTab?: 'indicators' | 'medication';
  onSaveStudents?: (newStudents: Student[]) => void;
}

export default function Health({ students, classrooms, settings, initialActiveTab, onSaveStudents }: HealthProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // State for Quick Notes feature
  const [editingNoteStudent, setEditingNoteStudent] = useState<Student | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');

  const handleOpenQuickNoteModal = (student: Student) => {
    setEditingNoteStudent(student);
    setQuickNoteText(student.quickNotes || '');
  };

  const handleSaveQuickNote = () => {
    if (!editingNoteStudent) return;
    
    const updatedStudents = students.map(s => {
      if (s.id === editingNoteStudent.id) {
        return {
          ...s,
          quickNotes: quickNoteText.trim()
        };
      }
      return s;
    });

    if (onSaveStudents) {
      onSaveStudents(updatedStudents);
    } else {
      StorageService.saveStudents(updatedStudents);
    }

    setEditingNoteStudent(null);
    setQuickNoteText('');
  };

  // Load health records from storage
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>(() => 
    StorageService.getHealthRecords()
  );

  const [healthActiveTab, setHealthActiveTab] = useState<'indicators' | 'medication'>(initialActiveTab || 'indicators');

  React.useEffect(() => {
    if (initialActiveTab) {
      setHealthActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);
  const [medicationRequests, setMedicationRequests] = useState<any[]>(() =>
    StorageService.getMedicationRequests()
  );
  const [monthFilter, setMonthFilter] = useState('all');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const recentMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = d.toISOString().substring(0, 7); // e.g. "2026-07"
      const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
      months.push({ value, label });
    }
    return months;
  }, []);

  const handleExportMedicationRequests = () => {
    const exportData = medicationRequests.filter(req => {
      if (classFilter !== 'all' && req.classId !== classFilter) return false;
      if (monthFilter !== 'all') {
        const reqMonth = req.createdAt.substring(0, 7);
        if (reqMonth !== monthFilter) return false;
      }
      return true;
    });

    if (exportData.length === 0) {
      alert('Không có dữ liệu đơn dặn thuốc nào khớp với bộ lọc để xuất!');
      return;
    }

    const headers = [
      'Ngày gửi',
      'Lớp',
      'Tên học sinh',
      'Chẩn đoán/Triệu chứng',
      'Tên thuốc',
      'Liều dùng & Dặn dò',
      'Phụ huynh dặn',
      'Số điện thoại phụ huynh',
      'Trạng thái',
      'Người xác nhận (Cô giáo)',
      'Thời gian xác nhận'
    ];

    const rows = exportData.map(req => {
      let statusLabel = 'Chờ xác nhận';
      if (req.status === 'taken' || req.teacherConfirmed) {
        statusLabel = 'Đã cho uống thuốc';
      } else if (req.status === 'received') {
        statusLabel = 'Đã nhận thuốc';
      }

      let medicineStr = req.medicineName || '';
      if (req.medicines && req.medicines.length > 0) {
        medicineStr = req.medicines.map((m: any) => `${m.name} (${m.dosage}, ${m.mealRelation === 'before' ? 'Trước ăn' : m.mealRelation === 'after' ? 'Sau ăn' : 'Không yêu cầu'})`).join('; ');
      }

      return [
        req.createdAt,
        req.className || 'Chưa rõ',
        req.studentName,
        req.diagnosis || 'Không có',
        medicineStr,
        req.dosage || 'Không có',
        req.parentName || 'Phụ huynh',
        req.parentPhone || '',
        statusLabel,
        req.teacherConfirmedBy || '',
        req.teacherConfirmedAt || ''
      ].map(val => `"${(val || '').replace(/"/g, '""')}"`);
    });

    const rowStrings = rows.map(r => r.join(','));
    const csvContent = '\uFEFF' + [headers.join(','), ...rowStrings].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const classLabel = classFilter === 'all' ? 'TatCaLop' : classrooms.find(c => c.id === classFilter)?.name.replace(/[^a-zA-Z0-9]/g, '') || 'Lop';
    const monthLabel = monthFilter === 'all' ? 'AllTime' : monthFilter;
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCao_DonThuoc_${classLabel}_${monthLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMonthlyReportPDF = () => {
    setIsPrintPreviewOpen(true);
  };

  const handlePerformPrint = () => {
    try {
      const schoolNameText = settings?.schoolName || 'Trường Mầm Non';
      
      // Determine selected month and class text
      const selectedMonthLabel = monthFilter === 'all' 
        ? 'TẤT CẢ CÁC THÁNG' 
        : (recentMonths || []).find(m => m.value === monthFilter)?.label.toUpperCase() || monthFilter;
        
      const selectedClassLabel = classFilter === 'all'
        ? 'TẤT CẢ CÁC LỚP'
        : (classrooms || []).find(c => c.id === classFilter)?.name.toUpperCase() || 'LỚP';

      // 1. Filter Medication Requests
      const filteredMedRequests = (medicationRequests || []).filter(req => {
        if (classFilter !== 'all' && req.classId !== classFilter) return false;
        if (monthFilter !== 'all') {
          if (!req.createdAt || typeof req.createdAt !== 'string') return false;
          const reqMonth = req.createdAt.substring(0, 7);
          if (reqMonth !== monthFilter) return false;
        }
        return true;
      });

      // 2. Filter Health Records
      const filteredHRecords = (healthRecords || []).filter(record => {
        if (classFilter !== 'all' && record.classId !== classFilter) return false;
        if (monthFilter !== 'all' && record.date) {
          if (typeof record.date !== 'string') return false;
          const recMonth = record.date.substring(0, 7);
          if (recMonth !== monthFilter) return false;
        }
        return true;
      });

      // Format date helper
      const formatDateStr = (dStr?: string) => {
        if (!dStr || typeof dStr !== 'string') return 'N/A';
        const datePart = dStr.split(' ')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dStr;
      };

      // HTML rows for Health Records
      const healthRowsHtml = filteredHRecords.map((r, idx) => {
        const bmiVal = r.bmi ? r.bmi.toFixed(1) : 'N/A';
        const assessmentStatus = r.status || 'Bình thường';
        let statusBadgeColor = '#16a34a'; // green
        if (assessmentStatus.includes('Dư cân') || assessmentStatus.includes('Béo phì')) {
          statusBadgeColor = '#ca8a04'; // orange
        } else if (assessmentStatus.includes('Suy dinh dưỡng')) {
          statusBadgeColor = '#dc2626'; // red
        }

        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-weight: bold; color: #0f172a;">${r.studentName}</td>
            <td style="text-align: center; font-weight: bold;">${r.className || 'Chưa rõ'}</td>
            <td style="text-align: center;">${formatDateStr(r.date)}</td>
            <td style="text-align: center; font-weight: 600;">${r.height} cm</td>
            <td style="text-align: center; font-weight: 600;">${r.weight} kg</td>
            <td style="text-align: center;">
              <span style="font-weight: bold; font-family: monospace;">${bmiVal}</span>
              <br/>
              <span style="font-size: 8px; font-weight: bold; color: ${statusBadgeColor};">${assessmentStatus}</span>
            </td>
            <td style="color: #334155; font-size: 9px; max-width: 180px; word-wrap: break-word;">${r.notes || 'Sức khỏe tốt, phát triển bình thường'}</td>
          </tr>
        `;
      }).join('');

      // HTML rows for Medication Requests
      const medRowsHtml = filteredMedRequests.map((req, idx) => {
        // Build medicines list string
        let medicineDetailsHtml = '';
        if (req.medicines && req.medicines.length > 0) {
          medicineDetailsHtml = `
            <div style="margin-top: 4px;">
              ${req.medicines.map((m: any) => `
                <div style="padding: 3px 0; border-bottom: 1px dashed #e2e8f0; font-size: 9px;">
                  <strong>💊 ${m.name || 'N/A'}</strong> - Liều: <span style="color: #dc2626; font-weight: bold;">${m.dosage || 'N/A'}</span>
                  ${m.timing && m.timing.length > 0 ? ` - <span style="background: #f1f5f9; padding: 1px 4px; border-radius: 3px;">⏰ ${m.timing.join(', ')}</span>` : ''}
                  ${m.mealRelation && m.mealRelation !== 'none' ? ` - <span style="color: #d97706; font-weight: 600;">${m.mealRelation === 'before' ? 'Trước ăn' : 'Sau ăn'}</span>` : ''}
                </div>
              `).join('')}
            </div>
          `;
        } else {
          medicineDetailsHtml = `
            <div style="font-size: 9px;">
              <strong>💊 ${req.medicineName || 'N/A'}</strong>
              <div style="margin-top: 3px; color: #475569; font-style: italic;">Liều dùng: ${req.dosage || 'Theo hướng dẫn'}</div>
            </div>
          `;
        }

        // Status styling
        let statusLabel = 'Chờ xác nhận';
        let statusColor = '#d97706'; // amber
        const currentStatus = req.status || (req.teacherConfirmed ? 'taken' : 'pending');
        if (currentStatus === 'taken' || req.teacherConfirmed) {
          statusLabel = 'Đã uống thuốc ✅';
          statusColor = '#16a34a'; // green
        } else if (currentStatus === 'received') {
          statusLabel = 'Đã nhận thuốc 📥';
          statusColor = '#2563eb'; // blue
        } else if (currentStatus === 'rejected') {
          statusLabel = 'Bị từ chối ❌';
          statusColor = '#dc2626'; // red
        }

        const specialNotesHtml = req.specialNotes 
          ? `<div style="margin-top: 6px; padding: 5px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 9px; color: #b45309;">
               <strong>⚠️ Lưu ý đặc biệt:</strong> ${req.specialNotes}
             </div>`
          : '';

        const teacherConfirmedAtStr = req.teacherConfirmedAt ? String(req.teacherConfirmedAt) : '';

        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-weight: bold; color: #0f172a;">${req.studentName}</td>
            <td style="text-align: center; font-weight: bold;">${req.className || 'Chưa rõ'}</td>
            <td style="text-align: center; font-size: 8px; font-family: monospace;">${req.createdAt || 'N/A'}</td>
            <td style="font-weight: 600; color: #dc2626;">${req.diagnosis || 'Cần uống thuốc'}</td>
            <td>
              ${medicineDetailsHtml}
              ${specialNotesHtml}
            </td>
            <td style="font-size: 9px; line-height: 1.3;">
              <strong>${req.parentName || 'Phụ huynh'}</strong><br/>
              <span style="font-family: monospace; color: #475569;">${req.parentPhone || 'N/A'}</span>
            </td>
            <td style="text-align: center; font-weight: bold; color: ${statusColor}; font-size: 9px;">
              ${statusLabel}
              ${(currentStatus === 'taken' || req.teacherConfirmed) && teacherConfirmedAtStr ? `
                <div style="font-size: 8px; font-weight: normal; color: #64748b; margin-top: 2px;">
                  Cô ${req.teacherConfirmedBy || 'phụ trách'} lúc ${teacherConfirmedAtStr.split(' ')[1] || ''}
                </div>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');

      // Build table components
      const healthTableHtml = filteredHRecords.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 5%;">STT</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: left; width: 22%;">Họ và Tên Bé</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 10%;">Lớp</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 12%;">Ngày Đo</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 11%;">Chiều Cao</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 11%;">Cân Nặng</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 14%;">Chỉ số BMI & Đánh giá WHO</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: left; width: 15%;">Ghi chú sức khỏe</th>
            </tr>
          </thead>
          <tbody>
            ${healthRowsHtml}
          </tbody>
        </table>
      ` : '<div class="no-data" style="text-align: center; padding: 20px; color: #64748b; font-style: italic; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 10px; margin-bottom: 20px;">Không có dữ liệu đo chiều cao cân nặng trong tháng này.</div>';

      const medTableHtml = filteredMedRequests.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 4%;">STT</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: left; width: 18%;">Họ và Tên Bé</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 8%;">Lớp</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 11%;">Thời Gian Gửi</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: left; width: 14%;">Chẩn Đoán / Triệu Chứng</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: left; width: 25%;">Chi Tiết Đơn Thuốc & Lưu Ý Phụ Huynh</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: left; width: 12%;">Người Gửi</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f8fafc; font-weight: bold; text-align: center; width: 8%;">Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            ${medRowsHtml}
          </tbody>
        </table>
      ` : '<div class="no-data" style="text-align: center; padding: 20px; color: #64748b; font-style: italic; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 10px; margin-bottom: 20px;">Không có dữ liệu dặn thuốc nào của phụ huynh trong tháng này.</div>';

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Báo Cáo Sức Khỏe & Đơn Thuốc Tháng - ${selectedMonthLabel} - ${selectedClassLabel}</title>
              <style>
                body {
                  font-family: "Segoe UI", "Arial", sans-serif;
                  color: #1e293b;
                  margin: 0;
                  padding: 40px;
                  line-height: 1.4;
                  background-color: white;
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 25px;
                  border-bottom: 2px solid #cbd5e1;
                  padding-bottom: 12px;
                }
                .school-info {
                  font-size: 14px;
                  font-weight: bold;
                  color: #0f172a;
                  text-transform: uppercase;
                  line-height: 1.3;
                }
                .title-area {
                  text-align: center;
                  margin-bottom: 35px;
                }
                .title-area h1 {
                  margin: 0;
                  font-size: 20px;
                  color: #1e3a8a;
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .title-area p {
                  margin: 6px 0 0 0;
                  font-size: 12px;
                  color: #475569;
                  font-weight: bold;
                }
                .section-title {
                  font-size: 13px;
                  font-weight: 800;
                  color: #0f172a;
                  text-transform: uppercase;
                  margin: 30px 0 12px 0;
                  border-left: 4px solid #4f46e5;
                  padding-left: 10px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                }
                .section-count {
                  font-size: 10px;
                  background-color: #f1f5f9;
                  color: #475569;
                  padding: 3px 10px;
                  border-radius: 9999px;
                  font-weight: bold;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 10px;
                  margin-bottom: 20px;
                }
                th, td {
                  border: 1px solid #cbd5e1;
                  padding: 8px 10px;
                  text-align: left;
                  vertical-align: top;
                }
                th {
                  background-color: #f8fafc;
                  color: #0f172a;
                  font-weight: bold;
                  text-transform: uppercase;
                  font-size: 9px;
                  text-align: center;
                }
                tr:nth-child(even) {
                  background-color: #f8fafc;
                }
                .no-data {
                  text-align: center;
                  padding: 30px;
                  color: #64748b;
                  font-style: italic;
                  background-color: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  font-size: 11px;
                }
                .footer-signatures {
                  margin-top: 55px;
                  display: flex;
                  justify-content: space-between;
                  page-break-inside: avoid;
                }
                .signature-box {
                  text-align: center;
                  width: 240px;
                }
                .signature-title {
                  font-size: 12px;
                  font-weight: bold;
                  color: #1e293b;
                  margin-bottom: 80px;
                }
                .signature-name {
                  font-size: 12px;
                  font-weight: bold;
                  color: #334155;
                }
                @media print {
                  body {
                    padding: 0;
                    margin: 0;
                  }
                  th {
                    background-color: #f1f5f9 !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  tr:nth-child(even) {
                    background-color: #f8fafc !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="school-info">
                  ${schoolNameText}<br/>
                  <span style="font-size: 9px; font-weight: normal; text-transform: none; color: #475569;">Hệ thống Quản lý Mầm Non</span>
                </div>
                <div style="font-size: 10px; text-align: right; color: #475569;">
                  Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}<br/>
                  Thời gian: ${new Date().toLocaleTimeString('vi-VN')}
                </div>
              </div>

              <div class="title-area">
                <h1>BÁO CÁO TỔNG HỢP SỨC KHỎE & ĐƠN THUỐC</h1>
                <p>THÁNG ĐO: ${selectedMonthLabel} — LỚP HỌC: ${selectedClassLabel}</p>
              </div>

              <!-- SECTION 1: HEALTH RECORDS -->
              <div class="section-title">
                <span>I. CHỈ SỐ THỂ CHẤT & PHÁT TRIỂN CỦA BÉ</span>
                <span class="section-count">${filteredHRecords.length} lượt đo</span>
              </div>
              ${healthTableHtml}

              <!-- SECTION 2: MEDICATION REQUESTS -->
              <div class="section-title" style="margin-top: 30px;">
                <span>II. LỊCH SỬ DẶN THUỐC CỦA PHỤ HUYNH</span>
                <span class="section-count">${filteredMedRequests.length} đơn dặn thuốc</span>
              </div>
              ${medTableHtml}

              <div class="footer-signatures">
                <div class="signature-box">
                  <div class="signature-title">Người Lập Báo Cáo</div>
                  <div style="font-style: italic; font-size: 10px; color: #475569; margin-bottom: 50px;">(Ký, ghi rõ họ tên)</div>
                  <div class="signature-name">Giáo viên phụ trách lớp</div>
                </div>
                <div class="signature-box">
                  <div class="signature-title">Hiệu Trưởng Xác Nhận</div>
                  <div style="font-style: italic; font-size: 10px; color: #475569; margin-bottom: 50px;">(Ký tên, đóng dấu)</div>
                  <div class="signature-name">Ban Giám Hiệu nhà trường</div>
                </div>
              </div>

              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 400);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        alert('Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép bật lên hoặc sử dụng nút trên giao diện.');
      }
    } catch (e) {
      console.error(e);
      alert('Không thể mở cửa sổ in. Chi tiết lỗi: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [customRejectReason, setCustomRejectReason] = useState('');

  const handleTeacherConfirmMedication = (id: string) => {
    const updated = medicationRequests.map(req => {
      if (req.id === id) {
        return {
          ...req,
          status: 'taken',
          teacherConfirmed: true,
          teacherConfirmedBy: 'Cô giáo chủ nhiệm',
          teacherConfirmedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
      }
      return req;
    });
    setMedicationRequests(updated);
    StorageService.saveMedicationRequests(updated);
  };

  const handleUpdateMedicationStatus = (id: string, newStatus: 'pending' | 'received' | 'taken' | 'rejected', rejectReason?: string) => {
    const updated = medicationRequests.map(req => {
      if (req.id === id) {
        return {
          ...req,
          status: newStatus,
          rejectReason: newStatus === 'rejected' ? rejectReason : (newStatus === 'pending' ? undefined : req.rejectReason),
          teacherConfirmed: newStatus === 'taken',
          teacherConfirmedBy: (newStatus === 'taken' || newStatus === 'rejected') ? 'Cô giáo chủ nhiệm' : (newStatus === 'pending' ? undefined : req.teacherConfirmedBy),
          teacherConfirmedAt: (newStatus === 'taken' || newStatus === 'rejected')
            ? new Date().toISOString().replace('T', ' ').substring(0, 16)
            : (newStatus === 'pending' ? undefined : req.teacherConfirmedAt)
        };
      }
      return req;
    });
    setMedicationRequests(updated);
    StorageService.saveMedicationRequests(updated);

    if (newStatus === 'rejected') {
      const requestToReject = medicationRequests.find(r => r.id === id);
      if (requestToReject) {
        const parentNotifs = StorageService.getParentNotifications();
        const newParentNotif: ParentNotification = {
          id: `pnotif_${Date.now()}`,
          classId: requestToReject.classId,
          className: requestToReject.className || 'Lớp mầm non',
          type: 'medication_reject',
          title: `❌ Từ chối đơn dặn thuốc của bé ${requestToReject.studentName}`,
          content: `Giáo viên đã từ chối đơn dặn thuốc của bé ${requestToReject.studentName}. Lý do: ${rejectReason || 'Không phù hợp quy định hoặc thiếu thông tin'}`,
          createdAt: new Date().toISOString(),
          isRead: false
        };
        StorageService.saveParentNotifications([newParentNotif, ...parentNotifs]);
      }
    }
  };

  const getMedStatus = (req: any): 'pending' | 'received' | 'taken' | 'rejected' => {
    if (req.status === 'rejected') return 'rejected';
    if (req.teacherConfirmed || req.status === 'taken') return 'taken';
    if (req.status === 'received') return 'received';
    return 'pending';
  };

  // Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form Fields
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Calculate age in months helper
  const calculateMonthsOfAge = (dobString: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 0;
    
    // Use current local time or 2026-07-08 from system metadata to match scenario timeline
    const now = new Date('2026-07-08');
    const yearsDiff = now.getFullYear() - dob.getFullYear();
    const monthsDiff = now.getMonth() - dob.getMonth();
    const totalMonths = (yearsDiff * 12) + monthsDiff;
    return totalMonths >= 0 ? totalMonths : 0;
  };

  // BMI status assessment helper
  const evaluateBMI = (bmi: number, ageInMonths: number) => {
    if (ageInMonths < 60) {
      return {
        status: 'Trẻ dưới 60 tháng tuổi',
        colorClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
        textColor: 'text-slate-500 dark:text-slate-400',
        bgColor: 'bg-slate-50 dark:bg-slate-850',
        description: 'Đang theo dõi tăng trưởng theo biểu đồ chuẩn mầm non của WHO (không xếp loại BMI).'
      };
    }

    if (bmi < 14) {
      return {
        status: 'Suy dinh dưỡng',
        colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        textColor: 'text-rose-600 dark:text-rose-400',
        bgColor: 'bg-rose-50 dark:bg-rose-950/20',
        description: 'Thể trạng thiếu cân, còi cọc. Cần bổ sung thêm dưỡng chất và bữa phụ.'
      };
    } else if (bmi >= 14 && bmi < 18.5) {
      return {
        status: 'Bình thường',
        colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
        description: 'Chỉ số thể chất tuyệt vời! Bé phát triển cân đối và khỏe mạnh.'
      };
    } else if (bmi >= 18.5 && bmi < 23) {
      return {
        status: 'Dư cân',
        colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        textColor: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/20',
        description: 'Có xu hướng dư cân nhẹ. Nên điều chỉnh chế độ ăn uống và tăng vận động.'
      };
    } else {
      return {
        status: 'Béo phì',
        colorClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
        textColor: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        description: 'Chỉ số BMI ở mức báo động béo phì. Cần tư vấn y tế dinh dưỡng và kiểm soát tinh bột.'
      };
    }
  };

  // Map students to their latest health records
  const studentHealthList = useMemo(() => {
    return students.map(student => {
      // Find latest record for this student
      const studentRecords = healthRecords
        .filter(r => r.studentId === student.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const latestRecord = studentRecords[0];
      const ageInMonths = calculateMonthsOfAge(student.dateOfBirth);

      return {
        student,
        ageInMonths,
        latestRecord,
        history: studentRecords
      };
    });
  }, [students, healthRecords]);

  // Filters & Search
  const filteredList = useMemo(() => {
    return studentHealthList.filter(item => {
      const matchSearch = item.student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.student.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = classFilter === 'all' || item.student.classId === classFilter;
      return matchSearch && matchClass;
    });
  }, [studentHealthList, searchTerm, classFilter]);

  // Statistics
  const stats = useMemo(() => {
    let measuredCount = 0;
    let normal = 0;
    let malnourished = 0;
    let overweight = 0;
    let obese = 0;
    let under60Months = 0;

    studentHealthList.forEach(item => {
      if (item.latestRecord) {
        measuredCount++;
        if (item.ageInMonths < 60) {
          under60Months++;
        } else {
          const bmi = item.latestRecord.bmi || 0;
          const evaluation = evaluateBMI(bmi, item.ageInMonths);
          if (evaluation.status === 'Bình thường') normal++;
          else if (evaluation.status === 'Suy dinh dưỡng') malnourished++;
          else if (evaluation.status === 'Dư cân') overweight++;
          else if (evaluation.status === 'Béo phì') obese++;
        }
      }
    });

    return {
      total: studentHealthList.length,
      measured: measuredCount,
      unmeasured: studentHealthList.length - measuredCount,
      normal,
      malnourished,
      overweight,
      obese,
      under60Months
    };
  }, [studentHealthList]);

  // Calculate average height and weight per month for selected classroom (or all)
  const chartData = useMemo(() => {
    const filteredRecords = healthRecords.filter(record => {
      if (classFilter !== 'all' && record.classId !== classFilter) {
        return false;
      }
      return true;
    });

    const monthlyGroups: { [key: string]: { totalHeight: number; totalWeight: number; count: number } } = {};

    filteredRecords.forEach(r => {
      const dateStr = r.date;
      if (!dateStr) return;
      const monthKey = dateStr.substring(0, 7); // e.g., "2026-06"
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { totalHeight: 0, totalWeight: 0, count: 0 };
      }
      monthlyGroups[monthKey].totalHeight += r.height;
      monthlyGroups[monthKey].totalWeight += r.weight;
      monthlyGroups[monthKey].count += 1;
    });

    return Object.entries(monthlyGroups)
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        return {
          monthKey,
          name: `Tháng ${month}/${year}`,
          'Chiều cao (cm)': Math.round((data.totalHeight / data.count) * 10) / 10,
          'Cân nặng (kg)': Math.round((data.totalWeight / data.count) * 10) / 10,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [healthRecords, classFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  const handleOpenUpdateModal = (student: Student, latestRecord?: HealthRecord) => {
    setSelectedStudent(student);
    if (latestRecord) {
      setHeight(latestRecord.height.toString());
      setWeight(latestRecord.weight.toString());
      setNotes(latestRecord.notes || '');
      setDate(latestRecord.date);
    } else {
      setHeight('');
      setWeight('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setFormError('');
    setFormSuccess('');
    setIsUpdateModalOpen(true);
  };

  const handleSaveHealthRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const hVal = parseFloat(height);
    const wVal = parseFloat(weight);

    if (isNaN(hVal) || hVal <= 0) {
      setFormError('Vui lòng nhập chiều cao hợp lệ (cm).');
      return;
    }
    if (isNaN(wVal) || wVal <= 0) {
      setFormError('Vui lòng nhập cân nặng hợp lệ (kg).');
      return;
    }
    if (!date) {
      setFormError('Vui lòng chọn ngày đo.');
      return;
    }

    const ageInMonths = calculateMonthsOfAge(selectedStudent.dateOfBirth);
    const heightInMeters = hVal / 100;
    const bmiVal = Math.round((wVal / (heightInMeters * heightInMeters)) * 100) / 100;
    const evaluation = evaluateBMI(bmiVal, ageInMonths);

    // Create new health record
    const newRecord: HealthRecord = {
      id: `hr_${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      classId: selectedStudent.classId,
      date,
      height: hVal,
      weight: wVal,
      bmi: ageInMonths >= 60 ? bmiVal : undefined,
      status: evaluation.status,
      notes: notes.trim()
    };

    // Filter out previous record of same date to avoid duplicates on same day, then insert new
    const cleanRecords = healthRecords.filter(r => !(r.studentId === selectedStudent.id && r.date === date));
    const updatedRecords = [newRecord, ...cleanRecords];

    setHealthRecords(updatedRecords);
    StorageService.saveHealthRecords(updatedRecords);

    setFormSuccess(`Đã lưu chỉ số sức khỏe thành công cho bé ${selectedStudent.fullName}!`);
    setTimeout(() => {
      setIsUpdateModalOpen(false);
      setSelectedStudent(null);
    }, 1200);
  };

  // Real-time BMI calculation in modal for user preview
  const livePreview = useMemo(() => {
    if (!selectedStudent) return null;
    const hVal = parseFloat(height);
    const wVal = parseFloat(weight);
    if (isNaN(hVal) || hVal <= 0 || isNaN(wVal) || wVal <= 0) return null;

    const ageInMonths = calculateMonthsOfAge(selectedStudent.dateOfBirth);
    const hMeters = hVal / 100;
    const bmiVal = Math.round((wVal / (hMeters * hMeters)) * 100) / 100;
    const evalResult = evaluateBMI(bmiVal, ageInMonths);

    return {
      bmi: bmiVal,
      ageInMonths,
      ...evalResult
    };
  }, [selectedStudent, height, weight]);

  // Color theme logic mapping
  const getThemeAccentColor = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'emerald';
      case 'violet': return 'violet';
      case 'rose': return 'rose';
      case 'amber': return 'amber';
      default: return 'blue';
    }
  };

  const accentColor = getThemeAccentColor();

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="flex-1 min-w-[280px] md:min-w-[400px]">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Quản Lý Sức Khỏe Học Sinh <Heart size={24} className={`text-${accentColor}-500 fill-${accentColor}-500/10 shrink-0`} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Theo dõi, cập nhật định kỳ chiều cao, cân nặng và tự động tính toán chỉ số khối cơ thể (BMI) của học sinh để đánh giá tình trạng thể chất theo tiêu chuẩn của WHO.
          </p>
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
          <button
            type="button"
            onClick={handleExportMonthlyReportPDF}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <FileText size={15} />
            <span>Xuất báo cáo tháng (PDF)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Printer size={15} />
            <span>In báo cáo</span>
          </button>

          {/* Informative helper badge */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs text-slate-500 shrink-0">
            <Info size={15} className={`text-${accentColor}-500`} />
            <span>BMI đánh giá cho bé <strong>đủ 60 tháng tuổi trở lên</strong></span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 no-print">
        <button
          type="button"
          onClick={() => setHealthActiveTab('indicators')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            healthActiveTab === 'indicators'
              ? `border-${accentColor}-500 text-${accentColor}-600 dark:text-${accentColor}-400 font-extrabold`
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          📐 Quản lý chỉ số thể chất
        </button>
        <button
          type="button"
          onClick={() => setHealthActiveTab('medication')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            healthActiveTab === 'medication'
              ? `border-${accentColor}-500 text-${accentColor}-600 dark:text-${accentColor}-400 font-extrabold`
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          💊 Đơn dặn thuốc từ phụ huynh
          {medicationRequests.filter(r => !r.teacherConfirmed).length > 0 && (
            <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
              {medicationRequests.filter(r => !r.teacherConfirmed).length}
            </span>
          )}
        </button>
      </div>

      {healthActiveTab === 'indicators' ? (
        <div className="space-y-6">

          {/* STATS BENTO TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total measured */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xs flex items-center gap-4.5 col-span-2">
          <div className={`w-12 h-12 rounded-xl bg-${accentColor}-500/10 flex items-center justify-center text-${accentColor}-600 dark:text-${accentColor}-400 shrink-0`}>
            <Scale size={24} className="stroke-1.5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đã đo chỉ số</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">{stats.measured}</span>
              <span className="text-[10px] font-medium text-slate-400">/ {stats.total} học sinh</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className={`bg-${accentColor}-500 h-1.5 rounded-full`} 
                style={{ width: `${(stats.measured / (stats.total || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Normal */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xs">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bình thường</span>
          <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.normal}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">Tỷ lệ: {stats.measured > 0 ? Math.round((stats.normal / stats.measured) * 100) : 0}%</span>
        </div>

        {/* Malnourished */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xs">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-rose-500">Suy dinh dưỡng</span>
          <span className="block text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.malnourished}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">Cần bổ sung chất</span>
        </div>

        {/* Overweight & Obese */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xs">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-amber-500">Dư cân / Béo phì</span>
          <span className="block text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.overweight + stats.obese}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">({stats.overweight} dư cân, {stats.obese} béo phì)</span>
        </div>

        {/* Under 60 Months */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xs">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dưới 60 tháng</span>
          <span className="block text-2xl font-black text-slate-500 dark:text-slate-400 mt-1">{stats.under60Months}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">Đo biểu đồ WHO</span>
        </div>
      </div>

      {/* HEALTH TRENDS CHART */}
      <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Activity size={18} className={`text-${accentColor}-500`} />
            Xu Hướng Phát Triển Chiều Cao & Cân Nặng Trung Bình Theo Tháng
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {classFilter === 'all' 
              ? 'Thống kê trung bình của tất cả học sinh trong trường qua từng đợt kiểm tra sức khỏe.'
              : `Thống kê trung bình của học sinh thuộc lớp đang chọn.`}
          </p>
        </div>

        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-250 dark:border-slate-800">
            <Activity size={32} className="text-slate-300 animate-pulse mb-2" />
            <p className="text-xs font-bold text-slate-500">Chưa có dữ liệu biểu đồ</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Vui lòng cập nhật chỉ số đo cho học sinh trước.</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: '#f43f5e', fontSize: 10, fontWeight: 500 }}
                  label={{ value: 'Chiều cao (cm)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' } }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  axisLine={{ stroke: '#fda4af' }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#3b82f6', fontSize: 10, fontWeight: 500 }}
                  label={{ value: 'Cân nặng (kg)', angle: 90, position: 'insideRight', offset: 10, style: { textAnchor: 'middle', fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' } }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  axisLine={{ stroke: '#93c5fd' }}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#f8fafc',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                  labelStyle={{ fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="Chiều cao (cm)" 
                  fill="#f43f5e" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
                <Bar 
                  yAxisId="right" 
                  dataKey="Cân nặng (kg)" 
                  fill="#3b82f6" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 📋 THEO DÕI ĐƠN GỬI THUỐC HÀNG NGÀY CHO GIÁO VIÊN */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <Pill size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                Theo Dõi Đơn Gửi Thuốc Từ Phụ Huynh 💊
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Danh sách đơn gửi thuốc hiện có — Giáo viên cập nhật trạng thái thuốc nhanh cho bé</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
              ⏳ Chờ: {medicationRequests.filter(r => getMedStatus(r) === 'pending').length}
            </span>
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
              📥 Đã nhận: {medicationRequests.filter(r => getMedStatus(r) === 'received').length}
            </span>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
              ✔️ Đã uống: {medicationRequests.filter(r => getMedStatus(r) === 'taken').length}
            </span>
          </div>
        </div>

        {medicationRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-medium italic bg-slate-50/50 dark:bg-slate-850/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/85">
            Chưa có đơn dặn thuốc nào được gửi từ phụ huynh học sinh hôm nay.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-850/50 text-slate-400 font-extrabold border-b border-slate-200/65 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-extrabold">Tên bé</th>
                  <th className="px-4 py-3 font-extrabold">Tên thuốc & Chỉ định</th>
                  <th className="px-4 py-3 font-extrabold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-extrabold">Cập nhật nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium text-slate-750 dark:text-slate-300">
                {medicationRequests.map(req => {
                  const status = getMedStatus(req);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>👶 {req.studentName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md text-[9px] font-bold">
                            Lớp {req.className || 'Mầm Non'}
                          </span>
                        </div>
                        <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">Triệu chứng: {req.diagnosis}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <span>💊 {req.medicineName}</span>
                          {req.prescriptionPhoto && (
                            <button
                              type="button"
                              onClick={() => setSelectedPhotoModal(req.prescriptionPhoto)}
                              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 text-[9px] font-bold underline ml-1.5 cursor-pointer flex items-center gap-0.5"
                            >
                              [Ảnh 📸]
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[280px] mt-0.5" title={req.dosage}>
                          HD: {req.dosage}
                        </div>
                        {req.status === 'rejected' && req.rejectReason && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-450 font-bold bg-rose-50 dark:bg-rose-950/20 p-1 rounded mt-1 inline-block border border-rose-200/40">
                            Lý do: {req.rejectReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {status === 'taken' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Đã uống
                          </span>
                        ) : status === 'received' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            Đã nhận
                          </span>
                        ) : status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                            Từ chối ❌
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            Chờ xác nhận
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateMedicationStatus(req.id, 'pending')}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer ${
                              status === 'pending'
                                ? 'bg-amber-500/15 border-amber-300 text-amber-600 dark:text-amber-400 shadow-3xs'
                                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Chờ xác nhận ⏳
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateMedicationStatus(req.id, 'received')}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer ${
                              status === 'received'
                                ? 'bg-blue-500/15 border-blue-300 text-blue-600 dark:text-blue-400 shadow-3xs'
                                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Đã nhận 📥
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateMedicationStatus(req.id, 'taken')}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer ${
                              status === 'taken'
                                ? 'bg-emerald-500/15 border-emerald-300 text-emerald-600 dark:text-emerald-400 shadow-3xs'
                                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Đã uống 💊
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingRequestId(req.id);
                              setCustomRejectReason('');
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer ${
                              status === 'rejected'
                                ? 'bg-rose-500/15 border-rose-300 text-rose-600 dark:text-rose-450 shadow-3xs'
                                : 'bg-white dark:bg-slate-900 hover:bg-rose-50 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-300'
                            }`}
                          >
                            Từ chối ❌
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã học sinh hoặc tên..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs border border-transparent focus:border-slate-200 dark:focus:border-slate-800 outline-hidden transition"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <div className="relative flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs">
            <Filter size={14} className="text-slate-400" />
            <span className="text-slate-500">Lớp:</span>
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900">Tất cả lớp</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900">{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* STUDENTS HEALTH TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Mã HS / Họ & Tên</th>
                <th className="px-6 py-4">Lớp</th>
                <th className="px-6 py-4">Tháng Tuổi</th>
                <th className="px-6 py-4 text-center">Chiều Cao</th>
                <th className="px-6 py-4 text-center">Cân Nặng</th>
                <th className="px-6 py-4 text-center">BMI</th>
                <th className="px-6 py-4">Trạng Thái Thể Chất</th>
                <th className="px-6 py-4">Ngày Đo Gần Nhất</th>
                <th className="px-6 py-4 text-right no-print">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 space-y-2">
                    <Activity size={32} className="mx-auto text-slate-300 stroke-1" />
                    <p className="font-bold text-slate-500">Không tìm thấy học sinh nào</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc lớp học của bạn.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedList.map(({ student, ageInMonths, latestRecord }) => {
                  const hasRecord = !!latestRecord;
                  const evaluation = hasRecord ? evaluateBMI(latestRecord.bmi || 0, ageInMonths) : null;

                  return (
                    <tr 
                      key={student.id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all duration-150"
                    >
                      {/* Full name and code */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={student.avatar} 
                            alt={student.fullName} 
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <strong className="text-slate-850 dark:text-slate-150 block">{student.fullName}</strong>
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">{student.studentCode}</span>
                            {student.quickNotes && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/30 max-w-[200px] hover:max-w-none transition-all duration-300" title={student.quickNotes}>
                                <AlertTriangle size={10} className="shrink-0 text-rose-500 animate-pulse" />
                                <span className="font-semibold truncate hover:whitespace-normal">{student.quickNotes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Classroom */}
                      <td className="px-6 py-4 text-slate-500 font-bold">
                        {student.className}
                      </td>

                      {/* Age in Months */}
                      <td className="px-6 py-4 text-slate-500">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{ageInMonths}</span> tháng
                        <span className="block text-[10px] text-slate-400">({student.dateOfBirth})</span>
                      </td>

                      {/* Height */}
                      <td className="px-6 py-4 text-center font-mono">
                        {hasRecord ? (
                          <span className="text-slate-800 dark:text-slate-200 font-bold">{latestRecord.height} <span className="text-[10px] text-slate-400">cm</span></span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 italic font-medium">Chưa đo</span>
                        )}
                      </td>

                      {/* Weight */}
                      <td className="px-6 py-4 text-center font-mono">
                        {hasRecord ? (
                          <span className="text-slate-800 dark:text-slate-200 font-bold">{latestRecord.weight} <span className="text-[10px] text-slate-400">kg</span></span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 italic font-medium">Chưa đo</span>
                        )}
                      </td>

                      {/* BMI */}
                      <td className="px-6 py-4 text-center font-mono">
                        {hasRecord && latestRecord.bmi ? (
                          <span className="text-slate-900 dark:text-white font-extrabold text-sm">{latestRecord.bmi}</span>
                        ) : hasRecord ? (
                          <span className="text-slate-400 text-[10px]" title="Không tính BMI cho trẻ dưới 60 tháng">N/A</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 italic font-medium">Chưa đo</span>
                        )}
                      </td>

                      {/* BMI Status badge */}
                      <td className="px-6 py-4">
                        {hasRecord && evaluation ? (
                          <span className={`px-2.5 py-1 rounded-md font-extrabold text-[10px] uppercase ${evaluation.colorClass}`}>
                            {evaluation.status}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-medium text-[11px]">Chưa cập nhật chỉ số</span>
                        )}
                      </td>

                      {/* Date of record */}
                      <td className="px-6 py-4 text-slate-400 font-medium font-mono text-[11px]">
                        {hasRecord ? latestRecord.date : '--'}
                      </td>

                      {/* Action trigger */}
                      <td className="px-6 py-4 text-right no-print">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickNoteModal(student)}
                            className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer text-[11px]"
                            title="Ghi chú nhanh tình trạng bé (dị ứng, theo dõi đặc biệt...)"
                          >
                            <AlertTriangle size={12} className="text-rose-500" />
                            <span>Ghi chú nhanh</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenUpdateModal(student, latestRecord)}
                            className={`px-2.5 py-1.5 bg-${accentColor}-500/10 hover:bg-${accentColor}-500/20 text-${accentColor}-600 dark:text-${accentColor}-400 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer text-[11px]`}
                          >
                            <Edit size={12} />
                            <span>{hasRecord ? 'Cập nhật' : 'Nhập số đo'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION ZONE */}
        {totalPages > 1 && (
          <div className="no-print p-4 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Đang hiển thị {paginatedList.length} trên tổng số {filteredList.length} học sinh
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer transition ${
                    currentPage === idx + 1
                      ? `bg-${accentColor}-600 text-white`
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-850 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          
          {/* Medication search and filters */}
          <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm đơn dặn thuốc theo tên học sinh, tên thuốc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs border border-transparent focus:border-slate-200 dark:focus:border-slate-800 outline-hidden transition"
              />
            </div>

            <div className="flex flex-wrap gap-2 shrink-0 items-center">
              {/* Lớp filter */}
              <div className="relative flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs">
                <Filter size={14} className="text-slate-400" />
                <span className="text-slate-500">Lớp:</span>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-hidden cursor-pointer"
                >
                  <option value="all" className="bg-white dark:bg-slate-900">Tất cả lớp</option>
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900">{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Tháng filter */}
              <div className="relative flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-slate-500">Tháng:</span>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-hidden cursor-pointer"
                >
                  <option value="all" className="bg-white dark:bg-slate-900">Tất cả các tháng</option>
                  {recentMonths.map(m => (
                    <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900">{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Xuất file Excel/CSV */}
              <button
                type="button"
                onClick={handleExportMedicationRequests}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-extrabold transition cursor-pointer select-none"
                title="Xuất file danh sách dặn thuốc (CSV)"
              >
                <Download size={14} />
                <span>Xuất file đơn thuốc 📥</span>
              </button>

              {/* Xuất báo cáo tháng PDF */}
              <button
                type="button"
                onClick={handleExportMonthlyReportPDF}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer select-none shadow-xs"
                title="Xuất báo cáo tổng hợp sức khỏe & đơn thuốc (PDF)"
              >
                <FileText size={14} />
                <span>Xuất báo cáo tháng (PDF) 📄</span>
              </button>
            </div>
          </div>

          {/* Quick Medication Tracking Control Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-rose-500" />
                  Bảng Điều Khiển Theo Dõi Trạng Thái Thuốc Nhanh
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Giáo viên theo dõi trạng thái thuốc phụ huynh gửi và cập nhật nhanh các trạng thái.</p>
              </div>
              <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-lg self-start sm:self-center">
                Thời gian thực
              </span>
            </div>

            {(() => {
              const filteredMeds = medicationRequests.filter(req => {
                if (classFilter !== 'all' && req.classId !== classFilter) return false;
                if (monthFilter !== 'all') {
                  const reqMonth = req.createdAt.substring(0, 7);
                  if (reqMonth !== monthFilter) return false;
                }
                if (searchTerm.trim()) {
                  const term = searchTerm.toLowerCase();
                  return (
                    req.studentName.toLowerCase().includes(term) ||
                    req.medicineName.toLowerCase().includes(term) ||
                    req.diagnosis.toLowerCase().includes(term)
                  );
                }
                return true;
              }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

              if (filteredMeds.length === 0) {
                return (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium italic bg-slate-50/50 dark:bg-slate-850/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/85">
                    Không có đơn thuốc nào phù hợp với bộ lọc hiển thị.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 dark:bg-slate-850/50 text-slate-400 font-extrabold border-b border-slate-200/65 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                        <th className="px-4 py-3 font-extrabold">Tên bé</th>
                        <th className="px-4 py-3 font-extrabold">Tên thuốc</th>
                        <th className="px-4 py-3 font-extrabold">Trạng thái</th>
                        <th className="px-4 py-3 text-right font-extrabold">Cập nhật nhanh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium text-slate-750 dark:text-slate-300">
                      {filteredMeds.map(req => {
                        const status = getMedStatus(req);
                        return (
                          <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition">
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                              {req.studentName}
                              <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">Lớp {req.className || 'Mầm Non'}</span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">
                              <div>{req.medicineName}</div>
                              {req.status === 'rejected' && req.rejectReason && (
                                <div className="text-[10px] text-rose-600 dark:text-rose-450 font-bold bg-rose-50 dark:bg-rose-950/20 p-1 rounded mt-1 inline-block border border-rose-200/40">
                                  Lý do: {req.rejectReason}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {status === 'taken' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg text-[10px] font-black">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                  Đã uống
                                </span>
                              ) : status === 'received' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg text-[10px] font-black">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                  Đã nhận
                                </span>
                              ) : status === 'rejected' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg text-[10px] font-black">
                                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                                  Từ chối ❌
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg text-[10px] font-black">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                  Chờ xác nhận
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end items-center gap-1.5">
                                {status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMedicationStatus(req.id, 'received')}
                                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase rounded-xl transition cursor-pointer shadow-xs active:scale-95"
                                    >
                                      📥 Đã nhận
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMedicationStatus(req.id, 'taken')}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl transition cursor-pointer shadow-xs active:scale-95"
                                    >
                                      💊 Đã uống
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectingRequestId(req.id);
                                        setCustomRejectReason('');
                                      }}
                                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase rounded-xl transition cursor-pointer shadow-xs active:scale-95"
                                    >
                                      ❌ Từ chối
                                    </button>
                                  </>
                                )}
                                {status === 'received' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMedicationStatus(req.id, 'taken')}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl transition cursor-pointer shadow-xs active:scale-95"
                                    >
                                      💊 Đã uống
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectingRequestId(req.id);
                                        setCustomRejectReason('');
                                      }}
                                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase rounded-xl transition cursor-pointer shadow-xs active:scale-95"
                                    >
                                      ❌ Từ chối
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMedicationStatus(req.id, 'pending')}
                                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-550 dark:text-slate-400 rounded-xl transition cursor-pointer"
                                      title="Đặt lại về Chờ xác nhận"
                                    >
                                      🔄 Trả về chờ
                                    </button>
                                  </>
                                )}
                                {status === 'taken' && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">✔️ Hoàn thành</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMedicationStatus(req.id, 'received')}
                                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-550 dark:text-slate-400 rounded-xl transition cursor-pointer"
                                      title="Quay lại trạng thái Đã nhận"
                                    >
                                      🔄 Đã nhận
                                    </button>
                                  </div>
                                )}
                                {status === 'rejected' && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold text-rose-650 bg-rose-500/10 px-2 py-1 rounded-lg">❌ Từ chối</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMedicationStatus(req.id, 'pending')}
                                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-550 dark:text-slate-400 rounded-xl transition cursor-pointer"
                                      title="Đặt lại về Chờ xác nhận"
                                    >
                                      🔄 Chờ duyệt
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Teacher's Medication Board */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Pill size={18} className="text-rose-500" />
              Danh Sách Đơn Dặn Thuốc Y Tế Từ Phụ Huynh ({medicationRequests.length})
            </h3>
            <p className="text-xs text-slate-450 font-medium">Giáo viên xem dặn dò chi tiết, kiểm tra đơn thuốc/toa thuốc đính kèm và xác nhận sau khi cho bé uống thuốc thành công.</p>

            {(() => {
              const filteredMeds = medicationRequests.filter(req => {
                if (classFilter !== 'all' && req.classId !== classFilter) return false;
                if (monthFilter !== 'all') {
                  const reqMonth = req.createdAt.substring(0, 7);
                  if (reqMonth !== monthFilter) return false;
                }
                if (searchTerm.trim()) {
                  const term = searchTerm.toLowerCase();
                  return (
                    req.studentName.toLowerCase().includes(term) ||
                    req.medicineName.toLowerCase().includes(term) ||
                    req.diagnosis.toLowerCase().includes(term)
                  );
                }
                return true;
              }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

              if (filteredMeds.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium italic bg-slate-50 dark:bg-slate-850/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80">
                    Chưa nhận được đơn dặn thuốc nào trùng khớp với bộ lọc.
                  </div>
                );
              }

              return (
                <div className="space-y-4 text-xs">
                  {filteredMeds.map(req => {
                    const currentStatus = getMedStatus(req);
                    return (
                      <div
                        key={req.id}
                        className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4 hover:border-slate-200 dark:hover:border-slate-750 transition animate-fade-in"
                      >
                        <div className="space-y-2.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg text-[10px] font-black uppercase tracking-wider">
                              👶 {req.studentName} - Lớp {req.className || 'Mầm Non'}
                            </span>
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 rounded-md text-[9px] font-bold">
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
                                {req.medicines.map((item: any, mIdx: number) => (
                                  <div key={item.id || mIdx} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-extrabold text-slate-800 dark:text-white">💊 {item.name}</span>
                                        <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-md font-bold text-[9px] uppercase">Liều: {item.dosage}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {item.timing && item.timing.map((t: string) => (
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
                              <p className="text-xs font-black text-slate-850 dark:text-white">
                                Tên thuốc: <span className="text-rose-600 dark:text-rose-400 font-extrabold">{req.medicineName}</span>
                              </p>
                              <div className="text-xs text-slate-500 dark:text-slate-450 font-medium leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                <strong className="text-slate-700 dark:text-slate-200 block mb-1 text-[10px] uppercase">Hướng dẫn của phụ huynh:</strong>
                                {req.dosage}
                              </div>
                            </div>
                          )}

                          {/* Confirmation status cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold">
                            <div className="p-2 bg-emerald-500/5 text-emerald-600 rounded-xl flex items-center gap-1.5 border border-emerald-500/10">
                              <CheckCircle2 size={12} />
                              <span>Phụ huynh xác nhận: ĐÃ KÝ ĐỒNG Ý GỬI THUỐC ✍️</span>
                            </div>

                            {(() => {
                              if (currentStatus === 'taken') {
                                return (
                                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl flex flex-col justify-center gap-0.5 border border-emerald-500/20">
                                    <div className="flex items-center gap-1.5">
                                      <ShieldCheck size={12} className="text-emerald-500" />
                                      <span>Xác nhận giáo viên: ĐÃ CHO UỐNG THUỐC ✅</span>
                                    </div>
                                    <span className="text-[8px] text-slate-400 font-medium pl-3.5 block">
                                      Xác nhận bởi: {req.teacherConfirmedBy || 'Cô giáo chủ nhiệm'} lúc {req.teacherConfirmedAt || req.createdAt}
                                    </span>
                                  </div>
                                );
                              } else if (currentStatus === 'received') {
                                return (
                                  <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl flex items-center gap-1.5 border border-blue-500/20">
                                    <CheckCircle2 size={12} className="text-blue-500" />
                                    <span>Xác nhận giáo viên: ĐÃ NHẬN THUỐC ĐỦ 📥</span>
                                  </div>
                                );
                              } else if (currentStatus === 'rejected') {
                                return (
                                  <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl flex flex-col justify-center gap-0.5 border border-rose-500/20">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-rose-500 font-extrabold">❌</span>
                                      <span>Xác nhận giáo viên: ĐÃ TỪ CHỐI NHẬN THUỐC</span>
                                    </div>
                                    {req.rejectReason && (
                                      <span className="text-[9px] text-rose-500 dark:text-rose-450 font-semibold pl-3.5 block">
                                        Lý do: {req.rejectReason}
                                      </span>
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="p-2 bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-xl flex items-center gap-1.5 border border-amber-500/20 animate-pulse">
                                    <Clock size={12} className="text-amber-500" />
                                    <span>Giáo viên: CHỜ XÁC NHẬN NHẬN THUỐC ⏳</span>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>

                        <div className="flex md:flex-col items-center justify-between md:justify-start gap-4 md:items-end shrink-0">
                          {/* Prescription image */}
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

                          {/* Quick action buttons on card */}
                          <div className="flex flex-col gap-1.5 w-full">
                            {currentStatus === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMedicationStatus(req.id, 'received')}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-wider rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center gap-1 w-full text-center justify-center"
                                >
                                  📥 Đã nhận thuốc
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMedicationStatus(req.id, 'taken')}
                                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-wider rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center gap-1 w-full text-center justify-center"
                                >
                                  💊 Đã cho uống
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingRequestId(req.id);
                                    setCustomRejectReason('');
                                  }}
                                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-[10px] tracking-wider rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center gap-1 w-full text-center justify-center"
                                >
                                  ❌ Từ chối nhận thuốc
                                </button>
                              </>
                            )}
                             {currentStatus === 'received' && (
                               <>
                                 <button
                                   type="button"
                                   onClick={() => handleUpdateMedicationStatus(req.id, 'taken')}
                                   className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-wider rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center gap-1 w-full text-center justify-center"
                                 >
                                   💊 Đã cho uống
                                 </button>
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setRejectingRequestId(req.id);
                                     setCustomRejectReason('');
                                   }}
                                   className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-[10px] tracking-wider rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center gap-1 w-full text-center justify-center"
                                 >
                                   ❌ Từ chối nhận thuốc
                                 </button>
                                 <button
                                   type="button"
                                   onClick={() => handleUpdateMedicationStatus(req.id, 'pending')}
                                   className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-550 dark:text-slate-400 rounded-xl transition cursor-pointer text-center"
                                 >
                                   🔄 Trả về chờ
                                 </button>
                               </>
                             )}
                            {currentStatus === 'taken' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateMedicationStatus(req.id, 'received')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-550 rounded-lg text-[10px] font-bold transition cursor-pointer text-center"
                              >
                                🔄 Đặt về Đã nhận
                              </button>
                            )}
                            {currentStatus === 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateMedicationStatus(req.id, 'pending')}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-wider rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center gap-1 w-full text-center justify-center"
                              >
                                🔄 Khôi phục về chờ
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* UPDATE MODAL DIALOG */}
      {isUpdateModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" 
            onClick={() => setIsUpdateModalOpen(false)} 
          />
          
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl overflow-hidden animate-scale-in text-slate-800 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className={`p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/30 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-${accentColor}-500/10 flex items-center justify-center text-${accentColor}-600 dark:text-${accentColor}-400 shrink-0`}>
                  <Scale size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white">Cập Nhật Chỉ Số Sức Khỏe</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Bé: <strong>{selectedStudent.fullName}</strong> • Lớp: {selectedStudent.className}</span>
                </div>
              </div>
              
              <button 
                onClick={() => setIsUpdateModalOpen(false)} 
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveHealthRecord} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <Check size={14} className="shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Grid 2-column input */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Height input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Chiều Cao (cm) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ví dụ: 105.5"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs font-bold text-black border border-slate-200/60 dark:border-slate-800 outline-hidden focus:border-slate-300 dark:focus:border-slate-700 transition"
                  />
                </div>

                {/* Weight input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Cân Nặng (kg) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ví dụ: 18.2"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs font-bold text-black border border-slate-200/60 dark:border-slate-800 outline-hidden focus:border-slate-300 dark:focus:border-slate-700 transition"
                  />
                </div>

              </div>

              {/* Date & Note input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Ngày Đo <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs font-bold text-black border border-slate-200/60 dark:border-slate-800 outline-hidden focus:border-slate-300 dark:focus:border-slate-700 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Ghi Chú</label>
                  <input
                    type="text"
                    placeholder="Ghi nhận thêm sức khỏe..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs font-bold text-black border border-slate-200/60 dark:border-slate-800 outline-hidden focus:border-slate-300 dark:focus:border-slate-700 transition"
                  />
                </div>
              </div>

              {/* LIVE BMI COMPUTATION PREVIEW */}
              {livePreview ? (
                <div className={`p-4 rounded-2xl ${livePreview.bgColor} border border-slate-150 dark:border-slate-800 text-xs space-y-2.5 animate-fade-in`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Ước tính BMI</span>
                      <strong className={`text-base font-black ${livePreview.textColor} font-mono`}>
                        {livePreview.bmi}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase text-right">Phân loại thể chất</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md font-extrabold text-[10px] uppercase mt-0.5 ${livePreview.colorClass}`}>
                        {livePreview.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {livePreview.description}
                  </p>

                  <div className="flex gap-1.5 items-center bg-white dark:bg-slate-900/60 px-3 py-2 rounded-xl text-[10px] text-slate-400">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Học sinh hiện tại: <strong>{livePreview.ageInMonths} tháng tuổi</strong> (Được xếp loại BMI từ đủ 60 tháng tuổi)</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 font-medium py-6">
                  Hãy nhập Chiều Cao & Cân Nặng để xem trước tính toán BMI tức thời của bé.
                </div>
              )}

              {/* Submit / Action Zone */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={`py-2.5 px-5 bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm`}
                >
                  <Check size={14} />
                  <span>Lưu chỉ số</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Zoomable Prescription Photo Dialog */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-[200] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full text-slate-500 dark:text-slate-300 transition cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 font-sans">
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

      {/* Custom Medication Rejection Dialog */}
      {rejectingRequestId && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-[200] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => {
                setRejectingRequestId(null);
                setCustomRejectReason('');
              }}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full text-slate-500 dark:text-slate-300 transition cursor-pointer flex items-center justify-center w-8 h-8"
            >
              <X size={16} />
            </button>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-rose-600 dark:text-rose-450 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 font-sans">
                ❌ Từ chối nhận & Cho uống thuốc
              </h3>
              
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Vui lòng nhập lý do từ chối để thông báo ngược lại cho phụ huynh biết:
              </div>

              {/* Preset reasons helper */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 block">
                  💡 Gợi ý nhanh lý do từ chối:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Thuốc không rõ nguồn gốc, thiếu nhãn mác",
                    "Thiếu ảnh chụp toa thuốc chỉ định của bác sĩ",
                    "Sai liều lượng quy định hoặc giờ uống không hợp lý",
                    "Học sinh có dấu hiệu dị ứng, cần phụ huynh làm rõ",
                    "Thông tin dặn thuốc chưa đầy đủ, rõ ràng"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomRejectReason(preset)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-300/40 font-semibold"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 block">
                  Nội dung phản hồi chi tiết:
                </label>
                <textarea
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="Nhập nội dung phản hồi cụ thể hoặc chọn gợi ý ở trên..."
                  className="w-full h-24 p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-rose-500 text-xs text-slate-800 dark:text-slate-100 font-sans"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setRejectingRequestId(null);
                    setCustomRejectReason('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    const finalReason = customRejectReason.trim() || 'Không phù hợp quy định trường học hoặc thiếu thông tin cần thiết';
                    handleUpdateMedicationStatus(rejectingRequestId, 'rejected', finalReason);
                    setRejectingRequestId(null);
                    setCustomRejectReason('');
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition text-xs cursor-pointer shadow-md shadow-rose-600/10"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-[200] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-5xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative animate-scale-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-850 dark:text-white uppercase tracking-wider font-sans">
                    Bản Xem Trước Báo Cáo Sức Khỏe & Đơn Thuốc
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Kiểm tra nội dung trước khi xuất hoặc in ra file PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintPreviewOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full text-slate-500 dark:text-slate-300 transition cursor-pointer flex items-center justify-center w-8 h-8"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Preview Container */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950/40">
              {/* Informative message */}
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl flex items-start gap-2.5">
                <span className="text-amber-500 text-sm">💡</span>
                <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Nhấp vào nút <strong className="font-extrabold">"Mở Trang In & Lưu PDF"</strong> bên dưới. Trình duyệt sẽ mở một tab mới và tự động kích hoạt hộp thoại in. Bạn có thể chọn <strong className="font-extrabold">"Lưu dưới dạng PDF"</strong> (Save as PDF) tại đó để tải báo cáo về máy!
                </div>
              </div>

              {/* Printable Area Mockup */}
              <div className="bg-white text-slate-850 p-8 shadow-md rounded-2xl border border-slate-150 mx-auto max-w-[800px] font-sans text-[11px] leading-relaxed select-none">
                {/* School Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-200 pb-3 mb-6">
                  <div className="uppercase font-bold text-[12px] text-slate-900">
                    {settings?.schoolName || 'TRƯỜNG MẦM NON'}<br/>
                    <span className="text-[9px] font-normal text-slate-500 lowercase">Hệ thống Quản lý Mầm Non</span>
                  </div>
                  <div className="text-right text-slate-500 text-[10px]">
                    Ngày lập: {new Date().toLocaleDateString('vi-VN')}<br/>
                    Giờ: {new Date().toLocaleTimeString('vi-VN')}
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                  <h1 className="text-slate-900 font-extrabold text-lg uppercase tracking-wide">
                    BÁO CÁO TỔNG HỢP SỨC KHỎE & ĐƠN THUỐC
                  </h1>
                  <p className="text-[11px] font-bold text-slate-600 mt-1">
                    THÁNG ĐO: {monthFilter === 'all' ? 'TẤT CẢ CÁC THÁNG' : (recentMonths || []).find(m => m.value === monthFilter)?.label.toUpperCase() || monthFilter} — LỚP HỌC: {classFilter === 'all' ? 'TẤT CẢ CÁC LỚP' : (classrooms || []).find(c => c.id === classFilter)?.name.toUpperCase() || 'LỚP'}
                  </p>
                </div>

                {/* Section 1: Health Records */}
                <div className="mb-6">
                  <div className="font-extrabold text-slate-900 border-l-4 border-indigo-600 pl-2 mb-3 uppercase text-[12px] flex justify-between items-center">
                    <span>I. Chỉ số thể chất & phát triển của bé</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                      {(healthRecords || []).filter(r => {
                        if (classFilter !== 'all' && r.classId !== classFilter) return false;
                        if (monthFilter !== 'all' && r.date) {
                          if (typeof r.date !== 'string') return false;
                          const recMonth = r.date.substring(0, 7);
                          if (recMonth !== monthFilter) return false;
                        }
                        return true;
                      }).length} lượt đo
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse m-0 text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-750 uppercase font-bold text-[9px] border-b border-slate-200 text-center">
                          <th className="p-2 border-r border-slate-200 w-[5%]">STT</th>
                          <th className="p-2 border-r border-slate-200 text-left w-[25%]">Họ và Tên Bé</th>
                          <th className="p-2 border-r border-slate-200 w-[10%]">Lớp</th>
                          <th className="p-2 border-r border-slate-200 w-[13%]">Ngày Đo</th>
                          <th className="p-2 border-r border-slate-200 w-[11%]">Chiều Cao</th>
                          <th className="p-2 border-r border-slate-200 w-[11%]">Cân Nặng</th>
                          <th className="p-2 border-r border-slate-200 w-[25%]">BMI & Đánh Giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const records = (healthRecords || []).filter(r => {
                            if (classFilter !== 'all' && r.classId !== classFilter) return false;
                            if (monthFilter !== 'all' && r.date) {
                              if (typeof r.date !== 'string') return false;
                              const recMonth = r.date.substring(0, 7);
                              if (recMonth !== monthFilter) return false;
                            }
                            return true;
                          });

                          if (records.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                                  Không có dữ liệu đo sức khỏe trong tháng này.
                                </td>
                              </tr>
                            );
                          }

                          return records.map((r, idx) => {
                            const bmiVal = r.bmi ? r.bmi.toFixed(1) : 'N/A';
                            const assessmentStatus = r.status || 'Bình thường';
                            let statusBadgeColor = 'text-green-600';
                            if (assessmentStatus.includes('Dư cân') || assessmentStatus.includes('Béo phì')) {
                              statusBadgeColor = 'text-amber-600';
                            } else if (assessmentStatus.includes('Suy dinh dưỡng')) {
                              statusBadgeColor = 'text-red-600';
                            }

                            return (
                              <tr key={r.id || idx} className="border-b border-slate-200 text-center">
                                <td className="p-2 border-r border-slate-200">{idx + 1}</td>
                                <td className="p-2 border-r border-slate-200 text-left font-bold text-slate-900">{r.studentName}</td>
                                <td className="p-2 border-r border-slate-200 font-semibold">{r.className || 'Chưa rõ'}</td>
                                <td className="p-2 border-r border-slate-200">
                                  {(() => {
                                    if (!r.date || typeof r.date !== 'string') return 'N/A';
                                    const parts = r.date.split(' ')[0].split('-');
                                    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : r.date;
                                  })()}
                                </td>
                                <td className="p-2 border-r border-slate-200 font-semibold">{r.height} cm</td>
                                <td className="p-2 border-r border-slate-200 font-semibold">{r.weight} kg</td>
                                <td className="p-2 text-left">
                                  <div className="font-bold font-mono text-center">{bmiVal}</div>
                                  <div className={`text-[8px] font-bold text-center ${statusBadgeColor}`}>{assessmentStatus}</div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Medication Requests */}
                <div className="mb-6">
                  <div className="font-extrabold text-slate-900 border-l-4 border-indigo-600 pl-2 mb-3 uppercase text-[12px] flex justify-between items-center">
                    <span>II. Lịch sử dặn thuốc của phụ huynh</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                      {(medicationRequests || []).filter(req => {
                        if (classFilter !== 'all' && req.classId !== classFilter) return false;
                        if (monthFilter !== 'all') {
                          if (!req.createdAt || typeof req.createdAt !== 'string') return false;
                          const reqMonth = req.createdAt.substring(0, 7);
                          if (reqMonth !== monthFilter) return false;
                        }
                        return true;
                      }).length} đơn dặn thuốc
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse m-0 text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-750 uppercase font-bold text-[9px] border-b border-slate-200 text-center">
                          <th className="p-2 border-r border-slate-200 w-[5%]">STT</th>
                          <th className="p-2 border-r border-slate-200 text-left w-[20%]">Họ và Tên Bé</th>
                          <th className="p-2 border-r border-slate-200 w-[10%]">Lớp</th>
                          <th className="p-2 border-r border-slate-200 w-[15%]">Ngày Gửi</th>
                          <th className="p-2 border-r border-slate-200 text-left w-[40%]">Nội Dung Dặn Thuốc</th>
                          <th className="p-2 w-[10%]">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const requests = (medicationRequests || []).filter(req => {
                            if (classFilter !== 'all' && req.classId !== classFilter) return false;
                            if (monthFilter !== 'all') {
                              if (!req.createdAt || typeof req.createdAt !== 'string') return false;
                              const reqMonth = req.createdAt.substring(0, 7);
                              if (reqMonth !== monthFilter) return false;
                            }
                            return true;
                          });

                          if (requests.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                                  Không có dữ liệu đơn dặn thuốc trong tháng này.
                                </td>
                              </tr>
                            );
                          }

                          return requests.map((req, idx) => {
                            let statusLabel = 'Chờ xác nhận';
                            let statusClass = 'text-amber-600';
                            const currentStatus = req.status || (req.teacherConfirmed ? 'taken' : 'pending');
                            if (currentStatus === 'taken' || req.teacherConfirmed) {
                              statusLabel = 'Đã uống';
                              statusClass = 'text-green-600 font-bold';
                            } else if (currentStatus === 'received') {
                              statusLabel = 'Đã nhận';
                              statusClass = 'text-blue-600 font-bold';
                            } else if (currentStatus === 'rejected') {
                              statusLabel = 'Từ chối';
                              statusClass = 'text-red-600 font-bold';
                            }

                            return (
                              <tr key={req.id || idx} className="border-b border-slate-200 text-center">
                                <td className="p-2 border-r border-slate-200">{idx + 1}</td>
                                <td className="p-2 border-r border-slate-200 text-left font-bold text-slate-900">{req.studentName}</td>
                                <td className="p-2 border-r border-slate-200 font-semibold">{req.className || 'Chưa rõ'}</td>
                                <td className="p-2 border-r border-slate-200 text-[9px] font-mono">{req.createdAt || 'N/A'}</td>
                                <td className="p-2 border-r border-slate-200 text-left">
                                  <div className="font-semibold text-rose-600">{req.diagnosis || 'Cần uống thuốc'}</div>
                                  <div className="mt-1 space-y-1">
                                    {req.medicines && req.medicines.length > 0 ? (
                                      req.medicines.map((m: any, mIdx: number) => (
                                        <div key={mIdx} className="text-[10px] text-slate-600 border-b border-dashed border-slate-100 pb-1">
                                          💊 <strong className="text-slate-800">{m.name}</strong> - Liều: <span className="font-semibold text-slate-800">{m.dosage}</span>
                                          {m.timing && m.timing.length > 0 && ` | ⏰ ${m.timing.join(', ')}`}
                                          {m.mealRelation && m.mealRelation !== 'none' && ` | 🍽️ ${m.mealRelation === 'before' ? 'Trước ăn' : 'Sau ăn'}`}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-[10px] text-slate-600">
                                        💊 <strong className="text-slate-800">{req.medicineName || 'N/A'}</strong> - Liều: {req.dosage || 'Theo hướng dẫn'}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className={`p-2 text-[10px] ${statusClass}`}>{statusLabel}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="flex justify-between mt-12">
                  <div className="text-center w-[200px]">
                    <div className="font-bold text-slate-800">Người Lập Báo Cáo</div>
                    <div className="text-[9px] italic text-slate-450 mb-12">(Ký, ghi rõ họ tên)</div>
                    <div className="font-bold text-slate-700">Giáo viên phụ trách lớp</div>
                  </div>
                  <div className="text-center w-[200px]">
                    <div className="font-bold text-slate-800">Hiệu Trưởng Xác Nhận</div>
                    <div className="text-[9px] italic text-slate-450 mb-12">(Ký tên, đóng dấu)</div>
                    <div className="font-bold text-slate-700">Ban Giám Hiệu nhà trường</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950">
              <button
                onClick={() => setIsPrintPreviewOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
              >
                Đóng bản xem trước
              </button>
              <button
                onClick={handlePerformPrint}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition text-xs cursor-pointer shadow-md flex items-center gap-1.5 shadow-indigo-600/10"
              >
                <span>Mở trang in & Lưu PDF 📄</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Note Modal */}
      {editingNoteStudent && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-[200] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => {
                setEditingNoteStudent(null);
                setQuickNoteText('');
              }}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full text-slate-500 dark:text-slate-300 transition cursor-pointer flex items-center justify-center w-8 h-8"
            >
              <X size={16} />
            </button>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-rose-600 dark:text-rose-450 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 font-sans">
                <AlertTriangle size={18} className="text-rose-500 animate-pulse" />
                <span>Ghi chú nhanh sức khỏe học sinh</span>
              </h3>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/80">
                <img
                  src={editingNoteStudent.avatar}
                  alt={editingNoteStudent.fullName}
                  className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{editingNoteStudent.fullName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Mã HS: {editingNoteStudent.studentCode} | Lớp: {editingNoteStudent.className}</p>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Nhập các thông tin đặc biệt cần chú ý như dị ứng thực phẩm, bệnh lý nền hoặc yêu cầu theo dõi đặc biệt đối với bé:
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 block">
                  💡 Gợi ý nhanh:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Dị ứng thực phẩm (Hải sản) 🦐",
                    "Dị ứng đậu phộng/lạc 🥜",
                    "Cần theo dõi đặc biệt ⚠️",
                    "Dị ứng sữa / Lactose 🥛",
                    "Bệnh hen suyễn 🫁",
                    "Sốt nhẹ / Nhớ uống nước ấm 🤒",
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuickNoteText(preset)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-300/40 font-semibold"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 block">
                  Nội dung ghi chú:
                </label>
                <textarea
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  placeholder="Nhập ghi chú chi tiết hoặc chọn gợi ý phía trên..."
                  className="w-full h-24 p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-rose-500 text-xs text-slate-800 dark:text-slate-100 font-sans"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setEditingNoteStudent(null);
                    setQuickNoteText('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveQuickNote}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition text-xs cursor-pointer shadow-md shadow-rose-600/10"
                >
                  Lưu ghi chú
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
