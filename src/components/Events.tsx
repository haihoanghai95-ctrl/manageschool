/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Edit,
  Trash2,
  X,
  PieChart as PieIcon,
  Info,
  AlertTriangle,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell } from 'recharts';
import { Student, SchoolEvent, SchoolSettings } from '../types';
import { StorageService } from '../utils/storage';
import { sendFCMNotification } from '../lib/fcmService';

interface EventsProps {
  students: Student[];
  settings: SchoolSettings;
}

const isPastEvent = (dateStr: string) => {
  if (!dateStr) return true;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return true;
  const yr = parseInt(parts[0], 10);
  const mt = parseInt(parts[1], 10);
  const dy = parseInt(parts[2], 10);
  if (isNaN(yr) || isNaN(mt) || isNaN(dy)) return true;
  const evtDate = new Date(yr, mt - 1, dy);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return evtDate.getTime() < today.getTime();
};

export default function Events({ students, settings }: EventsProps) {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [hidePastEvents, setHidePastEvents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activeExportEventId, setActiveExportEventId] = useState<string | null>(null);
  
  const [eventForm, setEventForm] = useState<Partial<SchoolEvent>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00 - 11:00',
    description: '',
    location: '',
    type: 'meeting',
    note: ''
  });

  useEffect(() => {
    setEvents(StorageService.getSchoolEvents());
  }, []);

  const getThemeColorClass = (type: 'text' | 'bg' | 'border' | 'accent' | 'ring') => {
    switch (settings.themeColor) {
      case 'emerald':
        if (type === 'text') return 'text-emerald-600 dark:text-emerald-400';
        if (type === 'bg') return 'bg-emerald-600 hover:bg-emerald-700';
        if (type === 'border') return 'border-emerald-200 dark:border-emerald-800/60';
        if (type === 'ring') return 'focus:ring-emerald-500/25 focus:border-emerald-500';
        return 'emerald';
      case 'violet':
        if (type === 'text') return 'text-violet-600 dark:text-violet-400';
        if (type === 'bg') return 'bg-violet-600 hover:bg-violet-700';
        if (type === 'border') return 'border-violet-200 dark:border-violet-800/60';
        if (type === 'ring') return 'focus:ring-violet-500/25 focus:border-violet-500';
        return 'violet';
      case 'rose':
        if (type === 'text') return 'text-rose-600 dark:text-rose-400';
        if (type === 'bg') return 'bg-rose-600 hover:bg-rose-700';
        if (type === 'border') return 'border-rose-200 dark:border-rose-800/60';
        if (type === 'ring') return 'focus:ring-rose-500/25 focus:border-rose-500';
        return 'rose';
      case 'amber':
        if (type === 'text') return 'text-amber-600 dark:text-amber-400';
        if (type === 'bg') return 'bg-amber-600 hover:bg-amber-700';
        if (type === 'border') return 'border-amber-200 dark:border-amber-800/60';
        if (type === 'ring') return 'focus:ring-amber-500/25 focus:border-amber-500';
        return 'amber';
      default:
        if (type === 'text') return 'text-indigo-600 dark:text-indigo-400';
        if (type === 'bg') return 'bg-indigo-600 hover:bg-indigo-700';
        if (type === 'border') return 'border-indigo-200 dark:border-indigo-800/60';
        if (type === 'ring') return 'focus:ring-indigo-500/25 focus:border-indigo-500';
        return 'indigo';
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Hide past check
      if (hidePastEvents && isPastEvent(evt.date)) return false;

      // Type filter
      if (selectedType !== 'all' && evt.type !== selectedType) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = (evt.title || '').toLowerCase().includes(query);
        const matchesDesc = (evt.description || '').toLowerCase().includes(query);
        const matchesLoc = (evt.location || '').toLowerCase().includes(query);
        return matchesTitle || matchesDesc || matchesLoc;
      }

      return true;
    });
  }, [events, hidePastEvents, selectedType, searchQuery]);

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
    let isNew = false;
    let createdEvent: SchoolEvent | null = null;
    if (editingEvent) {
      updatedEvents = events.map(evt => evt.id === editingEvent.id ? { ...evt, ...eventForm } as SchoolEvent : evt);
    } else {
      isNew = true;
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
      createdEvent = newEvent;
      updatedEvents = [...events, newEvent];
    }

    setEvents(updatedEvents);
    StorageService.saveSchoolEvents(updatedEvents);
    setIsEventModalOpen(false);
    setEditingEvent(null);

    // Phát thông báo đẩy FCM đến toàn bộ phụ huynh nếu là sự kiện mới đăng
    if (isNew && createdEvent) {
      const uniquePhones = Array.from(new Set(students.map(s => s.parentPhone).filter(Boolean)));
      const eventTitle = createdEvent.title;
      const eventDateFormatted = formatDate(createdEvent.date);
      const eventLocation = createdEvent.location;
      
      uniquePhones.forEach((phone) => {
        sendFCMNotification(
          `Thông báo học đường: ${eventTitle}`,
          `Nhà trường vừa cập nhật tin tức mới: "${eventTitle}" tổ chức vào ngày ${eventDateFormatted} tại ${eventLocation}. Kính mời ba mẹ theo dõi.`,
          'school_news',
          phone
        ).catch(err => console.warn('[FCM] Error sending event push notification to:', phone, err));
      });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleExportExcel = (event: SchoolEvent, goingStudents: Student[]) => {
    try {
      const dataRows = [
        ['TRƯỜNG MẦM NON:', settings.schoolName || 'Trường Mầm Non'],
        ['HỆ THỐNG:', 'Hệ thống Quản lý Mầm Non'],
        ['NGÀY XUẤT FILE:', new Date().toLocaleDateString('vi-VN')],
        [],
        ['DANH SÁCH PHỤ HUYNH VÀ BÉ XÁC NHẬN THAM GIA SỰ KIỆN'],
        ['Sự kiện:', event.title.toUpperCase()],
        ['Thời gian:', `${event.time || 'Cả ngày'} - Ngày ${formatDate(event.date)}`],
        ['Địa điểm:', event.location],
        [],
        [
          'STT',
          'Mã Học Sinh',
          'Họ và Tên Bé',
          'Lớp học',
          'Giới tính',
          'Ngày sinh',
          'Số điện thoại liên hệ',
          'Thông tin phụ huynh'
        ]
      ];

      goingStudents.forEach((s, idx) => {
        const parentPhones = [
          s.parentPhone ? `SĐT chính: ${s.parentPhone}` : '',
          s.fatherPhone ? `Ba: ${s.fatherPhone}` : '',
          s.motherPhone ? `Mẹ: ${s.motherPhone}` : '',
          s.guardianPhone ? `Người nuôi dưỡng: ${s.guardianPhone}` : ''
        ].filter(Boolean).join(' | ');

        const contactPhone = s.parentPhone || s.fatherPhone || s.motherPhone || s.guardianPhone || 'Chưa cập nhật';

        dataRows.push([
          (idx + 1).toString(),
          s.studentCode || 'N/A',
          s.fullName,
          s.className || 'Trường',
          s.gender || 'Chưa rõ',
          s.dateOfBirth ? formatDate(s.dateOfBirth) : 'Chưa rõ',
          contactPhone,
          parentPhones
        ]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(dataRows);

      ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 15 }, // Mã Học Sinh
        { wch: 25 }, // Họ và Tên Bé
        { wch: 15 }, // Lớp học
        { wch: 10 }, // Giới tính
        { wch: 15 }, // Ngày sinh
        { wch: 20 }, // Số điện thoại liên hệ
        { wch: 45 }  // Thông tin phụ huynh
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Danh Sach Tham Gia");
      
      const fileName = `Danh_Sach_Tham_Gia_${event.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setActiveExportEventId(null);
    } catch (e) {
      console.error(e);
      alert('Xuất file Excel thất bại. Vui lòng thử lại.');
    }
  };

  const handleExportPDF = (event: SchoolEvent, goingStudents: Student[]) => {
    try {
      const schoolNameText = settings.schoolName || 'Trường Mầm Non';
      const eventDateText = formatDate(event.date);

      const rowsHtml = goingStudents.map((s, idx) => {
        const contactPhone = s.parentPhone || s.fatherPhone || s.motherPhone || s.guardianPhone || 'Chưa cập nhật';
        
        let parentDetails = '';
        if (s.fatherPhone || s.motherPhone) {
          const details: string[] = [];
          if (s.fatherPhone) details.push(`Ba: ${s.fatherPhone}`);
          if (s.motherPhone) details.push(`Mẹ: ${s.motherPhone}`);
          parentDetails = details.join(', ');
        } else {
          parentDetails = 'Phụ huynh';
        }

        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-weight: bold; text-align: center;">${s.studentCode || 'N/A'}</td>
            <td style="font-weight: bold;">${s.fullName}</td>
            <td style="text-align: center; font-weight: bold;">${s.className || 'Trường'}</td>
            <td style="text-align: center;">${s.gender || 'Chưa rõ'}</td>
            <td style="text-align: center;">${s.dateOfBirth ? formatDate(s.dateOfBirth) : 'Chưa rõ'}</td>
            <td style="text-align: center; font-family: monospace;">${contactPhone}</td>
            <td style="font-size: 9px; color: #475569;">${parentDetails}</td>
            <td style="width: 15%; text-align: center; color: #94a3b8; font-style: italic;">....................</td>
          </tr>
        `;
      }).join('');

      const printWindowContent = `
        <html>
          <head>
            <title>Danh Sách Tham Gia Sự Kiện</title>
            <style>
              body {
                font-family: "Segoe UI", "Arial", sans-serif;
                color: #1e293b;
                margin: 0;
                padding: 20px;
                line-height: 1.4;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
                border-bottom: 2px solid #cbd5e1;
                padding-bottom: 12px;
              }
              .school-info {
                font-size: 13px;
                font-weight: bold;
                color: #0f172a;
                text-transform: uppercase;
              }
              .title-area {
                text-align: center;
                margin-bottom: 20px;
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
                margin: 4px 0 0 0;
                font-size: 12px;
                color: #475569;
                font-weight: bold;
              }
              .event-meta {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 12px 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                font-size: 11px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px 20px;
              }
              .meta-item strong {
                color: #0f172a;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin-bottom: 25px;
              }
              th, td {
                border: 1px solid #94a3b8;
                padding: 6px 5px;
                text-align: left;
              }
              th {
                background-color: #f1f5f9;
                color: #0f172a;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 9px;
                text-align: center;
              }
              tr:nth-child(even) {
                background-color: #f8fafc;
              }
              .footer-signatures {
                margin-top: 30px;
                display: flex;
                justify-content: space-between;
                page-break-inside: avoid;
              }
              .signature-box {
                text-align: center;
                width: 200px;
              }
              .signature-title {
                font-size: 11px;
                font-weight: bold;
                color: #1e293b;
                margin-bottom: 50px;
              }
              .signature-name {
                font-size: 11px;
                font-weight: bold;
                color: #334155;
              }
              @media print {
                body {
                  padding: 0;
                  color: #000;
                }
                .event-meta {
                  background-color: #fff !important;
                  border: 1px solid #94a3b8 !important;
                }
                th {
                  background-color: #e2e8f0 !important;
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
                Ngày lập: ${new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>

            <div class="title-area">
              <h1>DANH SÁCH THAM GIA SỰ KIỆN</h1>
              <p>${event.title.toUpperCase()}</p>
            </div>

            <div class="event-meta">
              <div class="meta-item"><strong>Thời gian:</strong> ${event.time || 'Cả ngày'} - Ngày ${eventDateText}</div>
              <div class="meta-item"><strong>Địa điểm:</strong> ${event.location}</div>
              <div class="meta-item" style="grid-column: span 2;"><strong>Nội dung:</strong> ${event.description}</div>
              ${event.note ? `<div class="meta-item" style="grid-column: span 2; color: #b91c1c;"><strong>Lưu ý:</strong> ${event.note}</div>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 4%;">STT</th>
                  <th style="width: 10%;">Mã HS</th>
                  <th style="width: 18%;">Họ và Tên Bé</th>
                  <th style="width: 8%;">Lớp</th>
                  <th style="width: 8%;">Giới tính</th>
                  <th style="width: 12%;">Ngày sinh</th>
                  <th style="width: 13%;">SĐT Liên Hệ</th>
                  <th style="width: 12%;">Thông tin thêm</th>
                  <th style="width: 15%;">Ký tên / Điểm danh</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 25px; color: #475569; font-style: italic;">Chưa có phụ huynh nào xác nhận tham gia sự kiện này.</td></tr>'}
              </tbody>
            </table>

            <div class="footer-signatures">
              <div class="signature-box">
                <div class="signature-title">Người Lập Bảng</div>
                <div style="font-style: italic; font-size: 10px; color: #475569; margin-bottom: 40px;">(Ký, ghi rõ họ tên)</div>
                <div class="signature-name">Giáo viên phụ trách</div>
              </div>
              <div class="signature-box">
                <div class="signature-title">Hiệu Trưởng</div>
                <div style="font-style: italic; font-size: 10px; color: #475569; margin-bottom: 40px;">(Ký tên, đóng dấu)</div>
                <div class="signature-name">Ban Giám Hiệu</div>
              </div>
            </div>

            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `;

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
        doc.write(printWindowContent);
        doc.close();

        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 3000);
      } else {
        alert('Không khởi tạo được bộ in. Vui lòng kiểm tra lại trình duyệt.');
      }
      setActiveExportEventId(null);
    } catch (e) {
      console.error(e);
      alert('Xuất danh sách PDF thất bại.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header section with a clean card style */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-150 dark:border-slate-800 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 ${getThemeColorClass('text')}`}>
                <Calendar size={20} />
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                Sự kiện & Ngày lễ trường
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed font-medium">
              Quản lý danh sách các ngày nghỉ lễ, cuộc họp phụ huynh, hoạt động dã ngoại và ngày hội của trường mầm non.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddEvent}
            className={`px-4 py-2.5 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer ${getThemeColorClass('bg')}`}
          >
            <Plus size={16} />
            <span>Thêm sự kiện mới</span>
          </button>
        </div>
      </div>

      {/* Filter and search bar controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-150 dark:border-slate-800 flex flex-col md:flex-row gap-3.5 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện, địa điểm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-900 transition-all focus:ring-1 focus:ring-indigo-500/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter size={12} className="text-slate-400" />
            <span>Loại:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500/25"
            >
              <option value="all">Tất cả thể loại</option>
              <option value="meeting">Họp phụ huynh</option>
              <option value="festival">Ngày hội / Dã ngoại</option>
              <option value="holiday">Nghỉ lễ</option>
              <option value="health">Sức khỏe</option>
              <option value="sports">Thể chất</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none bg-slate-50 dark:bg-slate-850/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-3xs whitespace-nowrap">
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

      {/* Main Events list */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3 border border-slate-150 dark:border-slate-800 shadow-3xs">
          <span className="text-4xl">📅</span>
          <p className="font-semibold text-slate-600 dark:text-slate-400 text-sm">Không tìm thấy sự kiện nào</p>
          <p className="text-slate-400 max-w-sm mt-0.5 leading-relaxed">
            Chưa có sự kiện nào được cấu hình hoặc danh sách tìm kiếm/bộ lọc không mang lại kết quả phù hợp. Hãy tạo một sự kiện mới để bắt đầu.
          </p>
          <button
            type="button"
            onClick={handleOpenAddEvent}
            className={`mt-2 px-3.5 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer ${getThemeColorClass('bg')}`}
          >
            <Plus size={14} />
            <span>Tạo sự kiện đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((event) => {
            const { going, cant } = (() => {
              let rsvps: Record<string, string> = {};
              try {
                rsvps = JSON.parse(localStorage.getItem('sma_parent_event_rsvps') || '{}');
              } catch {
                rsvps = {};
              }

              const realGoing: Student[] = [];
              const realCant: Student[] = [];
              students.forEach(student => {
                const phones = [
                  student.parentPhone,
                  student.fatherPhone,
                  student.motherPhone,
                  student.guardianPhone
                ].filter(Boolean);

                let status: string | null = null;
                for (const p of phones) {
                  if (rsvps[`${event.id}_${p}`]) {
                    status = rsvps[`${event.id}_${p}`];
                    break;
                  }
                }
                if (status === 'going') realGoing.push(student);
                else if (status === 'cant') realCant.push(student);
              });

              return { going: realGoing, cant: realCant };
            })();

            let badgeBg = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
            let badgeText = 'Sự kiện';
            let headerBg = 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20';

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

            // Split date safely
            const dateParts = (event.date || '').split('-');
            const monthLabel = dateParts[1] ? `Thg ${dateParts[1]}` : 'Thg --';
            const dayLabel = dateParts[2] || '--';

            // Calculate days remaining safely
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
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-150 dark:border-slate-800 shadow-3xs flex flex-col justify-between"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Left: Date block */}
                  <div className="flex sm:flex-col items-center justify-center sm:w-16 h-16 sm:h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 text-center shadow-3xs">
                    <div className={`w-full sm:h-7 px-3 sm:px-0 flex items-center justify-center font-bold text-[10px] uppercase tracking-wider ${headerBg}`}>
                      {monthLabel}
                    </div>
                    <div className="flex-1 px-3 sm:px-0 flex items-center justify-center font-extrabold text-lg sm:text-xl text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-850 w-full">
                      {dayLabel}
                    </div>
                  </div>

                  {/* Right: Details block */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${badgeBg}`}>
                        {badgeText}
                      </span>
                      {diffLabel && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${
                          diffDays === 0 || diffDays === 1
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold animate-pulse'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {diffLabel}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-850 dark:text-slate-100 uppercase tracking-tight">
                      {event.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-3 text-[10px] text-slate-450 dark:text-slate-500 mt-2.5 border-t border-slate-100 dark:border-slate-850/60 pt-2.5 font-semibold">
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-indigo-500 shrink-0" />
                        <span className="truncate">Giờ: <strong className="text-slate-750 dark:text-slate-300 font-bold">{event.time || 'Cả ngày'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-amber-500 shrink-0" />
                        <span className="truncate">Nơi: <strong className="text-slate-750 dark:text-slate-300 font-bold">{event.location}</strong></span>
                      </div>
                      {event.note && (
                        <div className="col-span-full flex items-center gap-1 mt-0.5">
                          <span className="text-rose-500 dark:text-rose-400 font-extrabold">⚠️ Lưu ý:</span>
                          <span className="text-slate-500 dark:text-slate-400 italic truncate font-medium">{event.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Parent RSVP display if not holiday */}
                {event.type !== 'holiday' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850/60 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Phản hồi từ phụ huynh</span>
                      <span className="text-slate-500 font-mono text-[10px] normal-case bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        Tổng cộng: {going.length + cant.length} phản hồi
                      </span>
                    </div>

                    {/* Donut chart & stats */}
                    <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-slate-850/20 p-2.5 rounded-xl border border-slate-100/60 dark:border-slate-800/40">
                      <div className="relative w-[70px] h-[70px] shrink-0 flex items-center justify-center select-none">
                        <PieChart width={70} height={70}>
                          <Pie
                            data={[
                              { name: 'Tham gia', value: going.length, color: '#10b981' },
                              { name: 'Bận', value: cant.length, color: '#f43f5e' },
                              { name: 'Chưa phản hồi', value: Math.max(0, students.length - (going.length + cant.length)), color: '#94a3b8' }
                            ].filter(item => item.value > 0)}
                            cx="35"
                            cy="35"
                            innerRadius={20}
                            outerRadius={32}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {[
                              { name: 'Tham gia', value: going.length, color: '#10b981' },
                              { name: 'Bận', value: cant.length, color: '#f43f5e' },
                              { name: 'Chưa phản hồi', value: Math.max(0, students.length - (going.length + cant.length)), color: '#94a3b8' }
                            ].filter(item => item.value > 0).map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 leading-none">
                            {Math.round((going.length / (students.length || 1)) * 100)}%
                          </span>
                          <span className="text-[7px] text-slate-450 font-bold tracking-tighter uppercase -mt-0.5">Đi</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-1 text-[11px] font-bold">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-450 text-[10px]">Tỉ lệ tham gia:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/15 px-1.5 py-0.5 rounded text-[10px]">
                            {going.length}/{students.length} trẻ
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[9px] text-center">
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 py-1 rounded border border-emerald-500/5">
                            <div>{going.length}</div>
                            <div className="text-[7px] text-slate-400 font-medium scale-90">Sẽ đi</div>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 py-1 rounded border border-rose-500/5">
                            <div>{cant.length}</div>
                            <div className="text-[7px] text-slate-400 font-medium scale-90">Bận</div>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 py-1 rounded border border-slate-200/5">
                            <div>{Math.max(0, students.length - (going.length + cant.length))}</div>
                            <div className="text-[7px] text-slate-450 font-medium scale-90">Chưa trả lời</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Participant names */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/10 space-y-1">
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Tham gia ({going.length})
                        </div>
                        {going.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic font-medium">Chưa có ai đăng ký</p>
                        ) : (
                          <div className="max-h-[80px] overflow-y-auto space-y-1 pr-1 font-semibold text-slate-650 dark:text-slate-300">
                            {going.map(s => (
                              <div key={s.id} className="flex items-center justify-between gap-1 bg-white dark:bg-slate-850 px-1.5 py-0.5 rounded border border-emerald-500/5">
                                <span className="truncate">{s.fullName}</span>
                                <span className="text-[8px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-1 rounded shrink-0">{s.className || 'Trường'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-rose-500/5 dark:bg-rose-500/10 p-2 rounded-xl border border-rose-500/10 space-y-1">
                        <div className="font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                          Báo bận ({cant.length})
                        </div>
                        {cant.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic font-medium">Chưa có ai báo bận</p>
                        ) : (
                          <div className="max-h-[80px] overflow-y-auto space-y-1 pr-1 font-semibold text-slate-650 dark:text-slate-300">
                            {cant.map(s => (
                              <div key={s.id} className="flex items-center justify-between gap-1 bg-white dark:bg-slate-850 px-1.5 py-0.5 rounded border border-rose-500/5">
                                <span className="truncate">{s.fullName}</span>
                                <span className="text-[8px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 px-1 rounded shrink-0">{s.className || 'Trường'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons at the bottom */}
                <div className="flex items-center justify-end gap-2 pt-3 mt-4 border-t border-slate-100 dark:border-slate-850/60">
                  {event.type !== 'holiday' && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveExportEventId(activeExportEventId === event.id ? null : event.id);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl transition border border-transparent cursor-pointer text-[10px] flex items-center gap-1.5 font-bold"
                      >
                        <Download size={11} />
                        <span>Xuất danh sách</span>
                        <ChevronDown size={10} className={`transition-transform duration-200 ${activeExportEventId === event.id ? 'rotate-180' : ''}`} />
                      </button>

                      {activeExportEventId === event.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveExportEventId(null)} 
                          />
                          <div className="absolute right-0 bottom-full mb-2 z-20 w-44 bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xl overflow-hidden">
                            <div className="p-1.5 space-y-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportExcel(event, going);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl transition cursor-pointer text-left"
                              >
                                <FileSpreadsheet size={12} className="text-emerald-500" />
                                <span>Xuất Excel (.xlsx)</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportPDF(event, going);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl transition cursor-pointer text-left"
                              >
                                <Printer size={12} className="text-rose-500" />
                                <span>In danh sách (PDF)</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEditEvent(event)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer text-[10px] flex items-center gap-1 font-bold shadow-3xs"
                  >
                    <Edit size={11} />
                    <span>Sửa sự kiện</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl transition border border-transparent cursor-pointer text-[10px] flex items-center gap-1 font-bold"
                  >
                    <Trash2 size={11} />
                    <span>Xóa sự kiện</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event creation/edit modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden border border-slate-150 dark:border-slate-800 shadow-xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 ${getThemeColorClass('text')}`}>
                  <Calendar size={16} />
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  {editingEvent ? 'Cập Nhật Sự Kiện' : 'Thêm Sự Kiện Mới'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Event Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                  Tên sự kiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trung Thu Ấm Áp 2026, Họp Phụ Huynh Đầu Năm..."
                  value={eventForm.title || ''}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/25"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Event Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                    Thể loại sự kiện
                  </label>
                  <select
                    value={eventForm.type || 'meeting'}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="meeting">Họp phụ huynh</option>
                    <option value="festival">Ngày hội / Dã ngoại</option>
                    <option value="holiday">Nghỉ lễ</option>
                    <option value="health">Sức khỏe</option>
                    <option value="sports">Thể chất</option>
                  </select>
                </div>

                {/* Event Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                    Ngày tổ chức <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={eventForm.date || ''}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Event Time */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                    Thời gian diễn ra
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 08:00 - 11:30"
                    value={eventForm.time || ''}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                    Địa điểm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Sân trường, Phòng họp tầng 2..."
                    value={eventForm.location || ''}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                  Nội dung chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả tóm tắt hoạt động hoặc thông tin cần phụ huynh lưu ý..."
                  value={eventForm.description || ''}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                  Ghi chú quan trọng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phụ huynh chuẩn bị nước uống riêng cho bé..."
                  value={eventForm.note || ''}
                  onChange={(e) => setEventForm({ ...eventForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action buttons inside form */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-3xs ${getThemeColorClass('bg')}`}
                >
                  {editingEvent ? 'Lưu thay đổi' : 'Tạo sự kiện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
