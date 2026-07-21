/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Grid, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  X, 
  Check, 
  AlertCircle, 
  Sparkles,
  Award,
  BookOpen,
  Users,
  Smile,
  Heart,
  Flag,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { TeacherAccount, SchoolSettings, Gender, Classroom } from '../types';

interface TeachersProps {
  teachers: TeacherAccount[];
  saveTeachers: (teachers: TeacherAccount[]) => void;
  settings: SchoolSettings;
  classrooms?: Classroom[];
  saveClassrooms?: (classrooms: Classroom[]) => void;
}

export default function Teachers({ 
  teachers, 
  saveTeachers, 
  settings,
  classrooms,
  saveClassrooms
}: TeachersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Filters State
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterParty, setFilterParty] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingPhone, setEditingPhone] = useState<string | null>(null);

  // Custom confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherAccount | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('54321'); // Default password for new teachers
  const [formDob, setFormDob] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formHometown, setFormHometown] = useState('');
  const [formGender, setFormGender] = useState<Gender>('Nam');
  const [formCccd, setFormCccd] = useState('');
  const [formPosition, setFormPosition] = useState('Giáo viên chủ nhiệm');
  const [formIsPartyMember, setFormIsPartyMember] = useState(false);
  const [formError, setFormError] = useState('');

  // Excel / CSV Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [excelPreview, setExcelPreview] = useState<TeacherAccount[]>([]);
  const [importMethod, setImportMethod] = useState<'excel' | 'text'>('excel');
  const [importText, setImportText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extract unique positions for filter dropdown
  const availablePositions = useMemo(() => {
    const positions = new Set<string>();
    teachers.forEach(t => {
      if (t.position) positions.add(t.position);
    });
    return Array.from(positions);
  }, [teachers]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = teachers.length;
    const partyMembers = teachers.filter(t => t.isPartyMember).length;
    const males = teachers.filter(t => t.gender === 'Nam').length;
    const females = teachers.filter(t => t.gender === 'Nữ').length;
    return { total, partyMembers, males, females };
  }, [teachers]);

  // Search & Filters processing
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.phone.includes(searchTerm) ||
        (t.cccd && t.cccd.includes(searchTerm)) ||
        (t.hometown && t.hometown.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.position && t.position.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesGender = filterGender === 'all' || t.gender === filterGender;
      const matchesParty = filterParty === 'all' || 
        (filterParty === 'yes' && t.isPartyMember === true) || 
        (filterParty === 'no' && !t.isPartyMember);
      const matchesPosition = filterPosition === 'all' || t.position === filterPosition;

      return matchesSearch && matchesGender && matchesParty && matchesPosition;
    });
  }, [teachers, searchTerm, filterGender, filterParty, filterPosition]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage) || 1;
  const paginatedTeachers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTeachers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTeachers, currentPage]);

  // Helper theme classes mapping
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
      case 'emerald': return 'focus:ring-emerald-500 focus:border-emerald-500 focus:ring-opacity-40';
      case 'violet': return 'focus:ring-violet-500 focus:border-violet-500 focus:ring-opacity-40';
      case 'rose': return 'focus:ring-rose-500 focus:border-rose-500 focus:ring-opacity-40';
      case 'amber': return 'focus:ring-amber-500 focus:border-amber-500 focus:ring-opacity-40';
      default: return 'focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-40';
    }
  };

  const getThemeBadgeClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30';
      case 'violet': return 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300 border border-violet-100 dark:border-violet-900/30';
      case 'rose': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30';
      case 'amber': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30';
      default: return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30';
    }
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setDialogMode('add');
    setFormName('');
    setFormPhone('');
    setFormPassword('54321');
    setFormDob('');
    setFormAddress('');
    setFormHometown('');
    setFormGender('Nam');
    setFormCccd('');
    setFormPosition('Giáo viên chủ nhiệm');
    setFormIsPartyMember(false);
    setFormError('');
    setEditingPhone(null);
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (teacher: TeacherAccount) => {
    setDialogMode('edit');
    setEditingPhone(teacher.phone);
    setFormName(teacher.name);
    setFormPhone(teacher.phone);
    setFormPassword(teacher.password || '54321');
    setFormDob(teacher.dob || '');
    setFormAddress(teacher.address || '');
    setFormHometown(teacher.hometown || '');
    setFormGender(teacher.gender || 'Nam');
    setFormCccd(teacher.cccd || '');
    setFormPosition(teacher.position || 'Giáo viên chủ nhiệm');
    setFormIsPartyMember(teacher.isPartyMember || false);
    setFormError('');
    setIsDialogOpen(true);
  };

  // Handle Save
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validations & Sanitizations
    const trimmedName = formName.trim();
    const trimmedDob = formDob.trim();
    const trimmedAddress = formAddress.trim();
    const trimmedHometown = formHometown.trim();
    const trimmedPosition = formPosition.trim();

    // Sanitize Phone (remove spaces, dots, dashes, and handle +84)
    let cleanPhone = formPhone.trim().replace(/[^\d+]/g, '');
    if (cleanPhone.startsWith('+84')) {
      cleanPhone = '0' + cleanPhone.substring(3);
    } else if (cleanPhone.startsWith('84')) {
      cleanPhone = '0' + cleanPhone.substring(2);
    }
    cleanPhone = cleanPhone.replace(/\D/g, ''); // strip any remaining non-digits

    // Sanitize CCCD
    const cleanCccd = formCccd.trim().replace(/\D/g, '');

    if (!trimmedName || !cleanPhone) {
      setFormError('Họ tên và số điện thoại là thông tin bắt buộc.');
      return;
    }

    if (!/^\d{9,11}$/.test(cleanPhone)) {
      setFormError('Số điện thoại không hợp lệ (phải gồm 9-11 chữ số).');
      return;
    }

    if (cleanCccd && !/^\d{9}$|^\d{12}$/.test(cleanCccd)) {
      setFormError('Số CCCD không hợp lệ (phải gồm 9 hoặc 12 chữ số).');
      return;
    }

    // Check duplicate phone
    if (dialogMode === 'add') {
      const exists = teachers.some(t => t.phone === cleanPhone);
      if (exists) {
        setFormError('Số điện thoại này đã được sử dụng cho một giáo viên khác.');
        return;
      }
    } else if (dialogMode === 'edit' && editingPhone !== cleanPhone) {
      const exists = teachers.some(t => t.phone === cleanPhone);
      if (exists) {
        setFormError('Số điện thoại mới này đã trùng với một giáo viên khác.');
        return;
      }
    }

    // Prepare teacher object
    const newTeacher: TeacherAccount = {
      phone: cleanPhone,
      name: trimmedName,
      password: formPassword.trim() || '54321',
      dob: trimmedDob || undefined,
      address: trimmedAddress || undefined,
      hometown: trimmedHometown || undefined,
      gender: formGender,
      cccd: cleanCccd || undefined,
      position: trimmedPosition || undefined,
      isPartyMember: formIsPartyMember
    };

    let updatedTeachers: TeacherAccount[];
    if (dialogMode === 'add') {
      updatedTeachers = [...teachers, newTeacher];
    } else {
      updatedTeachers = teachers.map(t => t.phone === editingPhone ? newTeacher : t);

      // If phone number changed, update linked classrooms' creator phone as well
      if (editingPhone && editingPhone !== cleanPhone && classrooms && saveClassrooms) {
        const updatedClassrooms = classrooms.map(c => {
          if (c.createdBy === editingPhone) {
            return { ...c, createdBy: cleanPhone };
          }
          return c;
        });
        saveClassrooms(updatedClassrooms);
      }
    }

    saveTeachers(updatedTeachers);
    setIsDialogOpen(false);
  };

  // Delete flow
  const handleOpenDelete = (teacher: TeacherAccount) => {
    setTeacherToDelete(teacher);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (teacherToDelete) {
      const updated = teachers.filter(t => t.phone !== teacherToDelete.phone);
      saveTeachers(updated);
      setDeleteConfirmOpen(false);
      setTeacherToDelete(null);
    }
  };

  // Export teachers list to Excel/CSV
  const handleExportCSV = () => {
    try {
      const exportData = [
        [
          'Số Điện Thoại (Tài Khoản)',
          'Họ và Tên',
          'Mật Khẩu',
          'Ngày Sinh (YYYY-MM-DD)',
          'Địa Chỉ',
          'Quê Quán',
          'Giới Tính',
          'Số CCCD',
          'Chức Vụ',
          'Đảng Viên (Có/Không)'
        ],
        ...teachers.map(t => [
          t.phone,
          t.name,
          t.password || '54321',
          t.dob || '',
          t.address || '',
          t.hometown || '',
          t.gender || 'Nam',
          t.cccd || '',
          t.position || 'Giáo viên chủ nhiệm',
          t.isPartyMember ? 'Có' : 'Không'
        ])
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(exportData);

      ws['!cols'] = [
        { wch: 25 }, // Số Điện Thoại
        { wch: 25 }, // Họ và Tên
        { wch: 15 }, // Mật Khẩu
        { wch: 22 }, // Ngày Sinh
        { wch: 35 }, // Địa Chỉ
        { wch: 25 }, // Quê Quán
        { wch: 12 }, // Giới Tính
        { wch: 20 }, // Số CCCD
        { wch: 25 }, // Chức Vụ
        { wch: 22 }, // Đảng Viên
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Danh Sach Giao Vien");
      XLSX.writeFile(wb, "danh_sach_giao_vien.xlsx");
    } catch (e) {
      console.error(e);
      alert('Xuất file thất bại.');
    }
  };

  // Download standard XLSX template for teachers
  const handleDownloadTemplateXLSX = () => {
    try {
      const templateData = [
        [
          'Số Điện Thoại',
          'Họ và Tên',
          'Mật Khẩu',
          'Ngày Sinh (YYYY-MM-DD)',
          'Địa Chỉ',
          'Quê Quán',
          'Giới Tính',
          'Số CCCD',
          'Chức Vụ',
          'Đảng Viên (Có/Không)'
        ],
        [
          '0912345678',
          'Nguyễn Văn A',
          '123',
          '1985-04-12',
          '79 Lê Duẩn - Hà Nội',
          'Hà Nội',
          'Nam',
          '012345678901',
          'Giáo viên chủ nhiệm',
          'Có'
        ],
        [
          '0987654321',
          'Trần Thị B',
          '123',
          '1990-08-30',
          '42 Chùa Láng - Hà Nội',
          'Hà Nam',
          'Nữ',
          '012345678902',
          'Giáo viên bộ môn',
          'Không'
        ]
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);

      ws['!cols'] = [
        { wch: 20 }, // Số Điện Thoại
        { wch: 25 }, // Họ và Tên
        { wch: 15 }, // Mật Khẩu
        { wch: 22 }, // Ngày Sinh
        { wch: 35 }, // Địa Chỉ
        { wch: 25 }, // Quê Quán
        { wch: 12 }, // Giới Tính
        { wch: 20 }, // Số CCCD
        { wch: 25 }, // Chức Vụ
        { wch: 22 }, // Đảng Viên
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Danh Sach Mau");
      XLSX.writeFile(wb, "mau_dang_ky_giao_vien.xlsx");
    } catch (e) {
      console.error(e);
      alert('Tạo file mẫu thất bại.');
    }
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseExcelFile(file);
  };

  const parseExcelFile = (file: File) => {
    setImportError('');
    setExcelPreview([]);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (rows.length <= 1) {
          setImportError('Tập tin Excel rỗng hoặc chỉ có tiêu đề.');
          return;
        }
        
        // Find column indexes based on header names (case insensitive, substring match)
        const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
        
        const findIndex = (keywords: string[]) => {
          return headers.findIndex(h => keywords.some(k => h.includes(k)));
        };
        
        const phoneIdx = findIndex(['số điện thoại', 'sđt', 'phone', 'tài khoản', 'liên hệ', 'điện thoại']);
        const nameIdx = findIndex(['họ và tên', 'ho va ten', 'họ tên', 'tên giáo viên', 'tên', 'name']);
        const passwordIdx = findIndex(['mật khẩu', 'mat khau', 'password', 'pass']);
        const dobIdx = findIndex(['ngày sinh', 'ngay sinh', 'birth', 'dob']);
        const addrIdx = findIndex(['địa chỉ', 'dia chi', 'address']);
        const hometownIdx = findIndex(['quê quán', 'que quan', 'hometown', 'quê']);
        const genderIdx = findIndex(['giới tính', 'gioi tinh', 'gender']);
        const cccdIdx = findIndex(['cccd', 'số cccd', 'cmnd', 'identity']);
        const positionIdx = findIndex(['chức vụ', 'chuc vu', 'vị trí', 'position']);
        const partyIdx = findIndex(['đảng viên', 'dang vien', 'đảng', 'party']);
        
        const importedTeachers: TeacherAccount[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          // Must have name & phone
          const tName = nameIdx !== -1 && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';
          let rawPhone = phoneIdx !== -1 && row[phoneIdx] !== undefined ? String(row[phoneIdx]).trim() : '';
          
          if (!tName) continue;
          
          // Sanitize phone number (same logic as teacher manual form)
          let cleanPhone = rawPhone.replace(/[^\d+]/g, '');
          if (cleanPhone.startsWith('+84')) {
            cleanPhone = '0' + cleanPhone.substring(3);
          } else if (cleanPhone.startsWith('84')) {
            cleanPhone = '0' + cleanPhone.substring(2);
          }
          cleanPhone = cleanPhone.replace(/\D/g, ''); // strip non-digits

          if (!cleanPhone) {
            // If phone is missing, auto-generate a valid 10-digit number for preview/validation
            cleanPhone = `09${Math.floor(Math.random() * 90000000 + 10000000)}`;
          }
          
          const tPassword = passwordIdx !== -1 && row[passwordIdx] !== undefined ? String(row[passwordIdx]).trim() : '54321';
          
          const rawGender = genderIdx !== -1 && row[genderIdx] !== undefined ? String(row[genderIdx]).trim().toLowerCase() : '';
          const tGender: Gender = (rawGender.includes('nữ') || rawGender.includes('female') || rawGender === 'nu') ? 'Nữ' : 'Nam';
          
          let tDob = undefined;
          if (dobIdx !== -1 && row[dobIdx] !== undefined) {
            const rawDob = row[dobIdx];
            if (typeof rawDob === 'number') {
              try {
                const dateObj = XLSX.SSF.parse_date_code(rawDob);
                const pad = (n: number) => String(n).padStart(2, '0');
                tDob = `${dateObj.y}-${pad(dateObj.m)}-${pad(dateObj.d)}`;
              } catch (err) {
                tDob = undefined;
              }
            } else {
              const strDob = String(rawDob).trim();
              if (strDob.includes('/')) {
                const parts = strDob.split('/');
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  tDob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
              } else if (strDob.includes('-')) {
                tDob = strDob;
              }
            }
          }
          
          const tAddr = addrIdx !== -1 && row[addrIdx] !== undefined ? String(row[addrIdx]).trim() : undefined;
          const tHometown = hometownIdx !== -1 && row[hometownIdx] !== undefined ? String(row[hometownIdx]).trim() : undefined;
          
          // Sanitize CCCD
          let cleanCccd = undefined;
          if (cccdIdx !== -1 && row[cccdIdx] !== undefined) {
            cleanCccd = String(row[cccdIdx]).trim().replace(/\D/g, '');
            if (!cleanCccd) cleanCccd = undefined;
          }
          
          const tPosition = positionIdx !== -1 && row[positionIdx] !== undefined ? String(row[positionIdx]).trim() : 'Giáo viên chủ nhiệm';
          
          const rawParty = partyIdx !== -1 && row[partyIdx] !== undefined ? String(row[partyIdx]).trim().toLowerCase() : '';
          const tIsPartyMember = (rawParty.includes('có') || rawParty.includes('yes') || rawParty === 'co' || rawParty.includes('đúng') || rawParty === 'true' || rawParty === '1');
          
          importedTeachers.push({
            phone: cleanPhone,
            name: tName,
            password: tPassword,
            dob: tDob,
            address: tAddr,
            hometown: tHometown,
            gender: tGender,
            cccd: cleanCccd,
            position: tPosition,
            isPartyMember: tIsPartyMember,
          });
        }
        
        if (importedTeachers.length === 0) {
          setImportError('Không tìm thấy giáo viên hợp lệ nào từ tệp tin Excel.');
          return;
        }
        
        setExcelPreview(importedTeachers);
      } catch (err: any) {
        setImportError(`Đọc file Excel lỗi: ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (importMethod === 'text') {
      handleImportCSV();
      return;
    }

    if (excelPreview.length === 0) {
      setImportError('Không có dữ liệu giáo viên để import. Vui lòng chọn một file Excel trước.');
      return;
    }

    // Filter duplicates
    const nonDuplicate = excelPreview.filter(
      newT => !teachers.some(oldT => oldT.phone === newT.phone)
    );

    saveTeachers([...teachers, ...nonDuplicate]);
    alert(`Đã nhập thành công ${nonDuplicate.length} giáo viên mới! (Bỏ qua ${excelPreview.length - nonDuplicate.length} số điện thoại trùng lặp)`);
    setIsImportOpen(false);
    setExcelPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportCSV = () => {
    setImportError('');
    if (!importText.trim()) {
      setImportError('Vui lòng dán dữ liệu CSV/Văn bản.');
      return;
    }

    try {
      const lines = importText.split('\n');
      if (lines.length <= 1) {
        setImportError('Dữ liệu rỗng hoặc thiếu tiêu đề.');
        return;
      }

      // First line is header
      const headers = lines[0].split(/[,\t;]/).map(h => h.trim().toLowerCase());
      const findIndex = (keywords: string[]) => {
        return headers.findIndex(h => keywords.some(k => h.includes(k)));
      };

      const phoneIdx = findIndex(['số điện thoại', 'sđt', 'phone', 'tài khoản', 'liên hệ', 'điện thoại']);
      const nameIdx = findIndex(['họ và tên', 'ho va ten', 'họ tên', 'tên giáo viên', 'tên', 'name']);
      const passwordIdx = findIndex(['mật khẩu', 'mat khau', 'password', 'pass']);
      const dobIdx = findIndex(['ngày sinh', 'ngay sinh', 'birth', 'dob']);
      const addrIdx = findIndex(['địa chỉ', 'dia chi', 'address']);
      const hometownIdx = findIndex(['quê quán', 'que quan', 'hometown', 'quê']);
      const genderIdx = findIndex(['giới tính', 'gioi tinh', 'gender']);
      const cccdIdx = findIndex(['cccd', 'số cccd', 'cmnd', 'identity']);
      const positionIdx = findIndex(['chức vụ', 'chuc vu', 'vị trí', 'position']);
      const partyIdx = findIndex(['đảng viên', 'dang vien', 'đảng', 'party']);

      const parsedTeachers: TeacherAccount[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma or semicolon, handling possible CSV quoting or simple split
        const columns = line.split(/[,\t;]/).map(c => c.trim());
        if (columns.length === 0) continue;

        const tName = nameIdx !== -1 && columns[nameIdx] ? columns[nameIdx] : '';
        if (!tName) continue;

        const rawPhone = phoneIdx !== -1 && columns[phoneIdx] ? columns[phoneIdx] : '';
        let cleanPhone = rawPhone.replace(/[^\d+]/g, '');
        if (cleanPhone.startsWith('+84')) {
          cleanPhone = '0' + cleanPhone.substring(3);
        } else if (cleanPhone.startsWith('84')) {
          cleanPhone = '0' + cleanPhone.substring(2);
        }
        cleanPhone = cleanPhone.replace(/\D/g, ''); // strip non-digits

        if (!cleanPhone) {
          cleanPhone = `09${Math.floor(Math.random() * 90000000 + 10000000)}`;
        }

        const tPassword = passwordIdx !== -1 && columns[passwordIdx] ? columns[passwordIdx] : '54321';

        const rawGender = genderIdx !== -1 && columns[genderIdx] ? columns[genderIdx].toLowerCase() : '';
        const tGender: Gender = (rawGender.includes('nữ') || rawGender.includes('female') || rawGender === 'nu') ? 'Nữ' : 'Nam';

        let tDob = undefined;
        if (dobIdx !== -1 && columns[dobIdx]) {
          const strDob = columns[dobIdx];
          if (strDob.includes('/')) {
            const parts = strDob.split('/');
            if (parts.length === 3) {
              const [d, m, y] = parts;
              tDob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
          } else if (strDob.includes('-')) {
            tDob = strDob;
          }
        }

        const tAddr = addrIdx !== -1 && columns[addrIdx] ? columns[addrIdx] : undefined;
        const tHometown = hometownIdx !== -1 && columns[hometownIdx] ? columns[hometownIdx] : undefined;

        let cleanCccd = undefined;
        if (cccdIdx !== -1 && columns[cccdIdx]) {
          cleanCccd = columns[cccdIdx].replace(/\D/g, '');
          if (!cleanCccd) cleanCccd = undefined;
        }

        const tPosition = positionIdx !== -1 && columns[positionIdx] ? columns[positionIdx] : 'Giáo viên chủ nhiệm';

        const rawParty = partyIdx !== -1 && columns[partyIdx] ? columns[partyIdx].toLowerCase() : '';
        const tIsPartyMember = (rawParty.includes('có') || rawParty.includes('yes') || rawParty === 'co' || rawParty.includes('đúng') || rawParty === 'true' || rawParty === '1');

        parsedTeachers.push({
          phone: cleanPhone,
          name: tName,
          password: tPassword,
          dob: tDob,
          address: tAddr,
          hometown: tHometown,
          gender: tGender,
          cccd: cleanCccd,
          position: tPosition,
          isPartyMember: tIsPartyMember,
        });
      }

      if (parsedTeachers.length === 0) {
        setImportError('Không tìm thấy giáo viên hợp lệ nào trong dữ liệu dán.');
        return;
      }

      // Filter duplicates
      const nonDuplicate = parsedTeachers.filter(
        newT => !teachers.some(oldT => oldT.phone === newT.phone)
      );

      saveTeachers([...teachers, ...nonDuplicate]);
      alert(`Đã nhập thành công ${nonDuplicate.length} giáo viên mới! (Bỏ qua ${parsedTeachers.length - nonDuplicate.length} số điện thoại trùng lặp)`);
      setIsImportOpen(false);
      setImportText('');
    } catch (err: any) {
      setImportError(`Đọc dữ liệu dán lỗi: ${err.message || err}`);
    }
  };

  // Auto populate import template
  const loadImportTemplate = () => {
    const templateHeader = 'Số Điện Thoại,Họ và Tên,Mật Khẩu,Ngày Sinh (YYYY-MM-DD),Địa Chỉ,Quê Quán,Giới Tính,Số CCCD,Chức Vụ,Đảng Viên (Có/Không)\\n';
    const sampleRows = `0911223344,Phạm Quốc Anh,123,1988-05-15,Số 10 Trịnh Văn Bô,Hải Phòng,Nam,030088012345,Giáo viên chủ nhiệm,Có\\n0966778899,Lê Thanh Hương,123,1992-11-20,Ngõ 85 Láng Hạ,Nam Định,Nữ,035092004567,Giáo viên bộ môn,Không`;
    setImportText(templateHeader + sampleRows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="flex-1 min-w-[280px] md:min-w-[400px]">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Quản Lý Giáo Viên <Award className={getThemeTextClass()} size={24} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý hồ sơ, thông tin liên lạc và chức vụ của đội ngũ cán bộ, giáo viên trong nhà trường.
          </p>
        </div>
        {/* Buttons */}
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => { setIsImportOpen(true); setExcelPreview([]); setImportError(''); }}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer"
          >
            <Upload size={14} />
            <span>Nhập từ Excel/CSV</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer"
          >
            <Download size={14} />
            <span>Xuất file Excel/CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition transform hover:-translate-y-0.5 cursor-pointer shadow-lg ${getThemeBgClass()}`}
          >
            <Plus size={16} />
            <span>Thêm Giáo Viên</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Teachers */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold dark:text-slate-500 uppercase tracking-wide">Tổng giáo viên</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
        </div>

        {/* Party Members */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400">
            <Flag size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold dark:text-slate-500 uppercase tracking-wide">Đảng viên</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.partyMembers}</p>
          </div>
        </div>

        {/* Female count */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-500 dark:text-violet-400">
            <Smile size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold dark:text-slate-500 uppercase tracking-wide">Giáo viên nữ</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.females}</p>
          </div>
        </div>

        {/* Male count */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold dark:text-slate-500 uppercase tracking-wide">Giáo viên nam</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.males}</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search and Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Tìm theo tên, SĐT, CCCD, chức vụ, quê quán..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Gender Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Filter size={12} /> Giới tính
            </span>
            <select
              value={filterGender}
              onChange={(e) => { setFilterGender(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          {/* Party Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Đảng viên</span>
            <select
              value={filterParty}
              onChange={(e) => { setFilterParty(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="yes">Là Đảng viên</option>
              <option value="no">Chưa kết nạp</option>
            </select>
          </div>

          {/* Position Filter */}
          {availablePositions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Chức vụ</span>
              <select
                value={filterPosition}
                onChange={(e) => { setFilterPosition(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">Tất cả</option>
                {availablePositions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          )}

          {/* Layout Mode Toggles */}
          <div className="h-7 w-[1px] bg-slate-100 dark:bg-slate-800 mx-1 hidden sm:block" />
          <div className="flex bg-slate-50 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5 border border-slate-100 dark:border-slate-750">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Dạng bảng"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Dạng lưới"
            >
              <Grid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / Grid Content */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-12 px-4 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
            <User size={28} />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Không tìm thấy giáo viên nào</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1">
            Vui lòng thay đổi từ khóa tìm kiếm hoặc sử dụng các bộ lọc để có kết quả chính xác hơn.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW MODE */
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-850/30 border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-5">Họ và Tên / Chức vụ</th>
                  <th className="py-4 px-4">Số Điện Thoại</th>
                  <th className="py-4 px-4">CCCD</th>
                  <th className="py-4 px-4">Giới tính / NS</th>
                  <th className="py-4 px-4">Hồ sơ Quê quán</th>
                  <th className="py-4 px-4 text-center">Đảng viên</th>
                  <th className="py-4 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-sm">
                {paginatedTeachers.map((teacher) => (
                  <tr key={teacher.phone} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    {/* Name & Position */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full font-black text-sm text-white flex items-center justify-center shrink-0 ${
                          teacher.gender === 'Nữ' 
                            ? 'bg-rose-500 dark:bg-rose-600' 
                            : teacher.gender === 'Khác'
                            ? 'bg-amber-500 dark:bg-amber-600'
                            : 'bg-indigo-500 dark:bg-indigo-600'
                        }`}>
                          {teacher.name.split(' ').pop()?.[0] || 'G'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{teacher.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-100/30">
                              {teacher.position || 'Giáo viên'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-4 font-mono font-medium text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
                        <span>{teacher.phone}</span>
                      </div>
                    </td>

                    {/* CCCD */}
                    <td className="py-4 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {teacher.cccd || <span className="text-slate-300 dark:text-slate-700">-</span>}
                    </td>

                    {/* Gender / DOB */}
                    <td className="py-4 px-4">
                      <div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          teacher.gender === 'Nữ' 
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' 
                            : teacher.gender === 'Nam'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {teacher.gender || 'Chưa rõ'}
                        </span>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                          {teacher.dob ? new Date(teacher.dob).toLocaleDateString('vi-VN') : 'Chưa nhập'}
                        </p>
                      </div>
                    </td>

                    {/* Address & Hometown */}
                    <td className="py-4 px-4">
                      <div className="max-w-[180px] space-y-0.5">
                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate" title={teacher.address}>
                          {teacher.address || <span className="text-slate-300 dark:text-slate-700">-</span>}
                        </p>
                        {teacher.hometown && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                            <MapPin size={9} />
                            <span className="truncate">{teacher.hometown}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Party Member status */}
                    <td className="py-4 px-4 text-center">
                      {teacher.isPartyMember ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 px-2 py-1 rounded-full border border-rose-100 dark:border-rose-900/30">
                          <Check size={12} className="stroke-[3px]" />
                          Đảng viên
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-700 font-medium">Chưa</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(teacher)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(teacher)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-lg transition"
                          title="Xóa giáo viên"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW MODE */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {paginatedTeachers.map((teacher) => (
            <div 
              key={teacher.phone} 
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden group"
            >
              {/* Subtle background flag badge for party member */}
              {teacher.isPartyMember && (
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                  <div className="bg-rose-500 text-white font-extrabold text-[8px] uppercase tracking-wider py-1 px-4 text-center rotate-45 translate-x-5 translate-y-3 shadow-sm flex items-center justify-center gap-0.5">
                    Đảng viên
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl font-black text-lg text-white flex items-center justify-center shrink-0 shadow-sm ${
                    teacher.gender === 'Nữ' 
                      ? 'bg-rose-500 dark:bg-rose-600' 
                      : teacher.gender === 'Khác'
                      ? 'bg-amber-500 dark:bg-amber-600'
                      : 'bg-indigo-500 dark:bg-indigo-600'
                  }`}>
                    {teacher.name.split(' ').pop()?.[0] || 'G'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-extrabold text-slate-900 dark:text-white truncate" title={teacher.name}>
                      {teacher.name}
                    </p>
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                      {teacher.position || 'Giáo viên'}
                    </p>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-2 text-xs pt-1 border-t border-slate-50 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span className="font-mono font-medium">{teacher.phone}</span>
                  </div>

                  {teacher.cccd && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <AlertCircle size={13} className="text-slate-400 shrink-0" />
                      <span className="font-mono">CCCD: {teacher.cccd}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Calendar size={13} className="text-slate-400 shrink-0" />
                    <span>
                      {teacher.dob ? new Date(teacher.dob).toLocaleDateString('vi-VN') : 'Sinh nhật: Chưa cập nhật'}
                    </span>
                  </div>

                  {teacher.address && (
                    <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed" title={teacher.address}>
                        {teacher.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 mt-4 pt-3.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  teacher.gender === 'Nữ' 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' 
                    : teacher.gender === 'Nam'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                }`}>
                  {teacher.gender || 'Giới tính: -'}
                </span>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleOpenEdit(teacher)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(teacher)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-lg transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Hiển thị <span className="font-bold text-slate-600 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-slate-600 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredTeachers.length)}</span> trên <span className="font-bold text-slate-600 dark:text-slate-300">{filteredTeachers.length}</span> giáo viên
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-40 disabled:hover:bg-transparent transition shrink-0 cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  currentPage === i + 1
                    ? getThemeBadgeClass()
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-40 disabled:hover:bg-transparent transition shrink-0 cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT TEACHER DIALOG --- */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="teacher-dialog">
          {/* Background Overlay */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={() => setIsDialogOpen(false)} />

          {/* Centered dialog box */}
          <div 
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl text-left overflow-hidden shadow-2xl relative z-10 border border-slate-100 dark:border-slate-800 animate-scale-in text-slate-800 dark:text-slate-100"
            role="dialog" 
            aria-modal="true"
          >
              {/* Dialog Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/20 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={18} className={getThemeTextClass()} />
                    {dialogMode === 'add' ? 'Thêm Giáo Viên Mới' : 'Cập Nhật Thông Tin Giáo Viên'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Nhập đầy đủ thông tin chi tiết của giáo viên.</p>
                </div>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveSubmit}>
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  {formError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-200 text-xs font-medium rounded-xl flex items-start gap-2.5">
                      <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Họ và tên */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                        Họ và tên giáo viên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none transition ${getThemeFocusClass()}`}
                        required
                      />
                    </div>

                    {/* Số điện thoại */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="Ví dụ: 0911111111"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none transition ${getThemeFocusClass()}`}
                        required
                      />
                      {dialogMode === 'edit' && (
                        <p className="text-[10px] text-amber-500 font-medium mt-1 ml-0.5">
                          Thay đổi số điện thoại sẽ cập nhật cả tài khoản đăng nhập và liên kết lớp của giáo viên này.
                        </p>
                      )}
                    </div>

                    {/* Mật khẩu */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                        Mật khẩu tài khoản
                      </label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Mật khẩu đăng nhập cổng giáo viên"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none transition ${getThemeFocusClass()}`}
                      />
                      <p className="text-[10px] text-slate-400 mt-1 ml-0.5">Mật khẩu để giáo viên tự đăng nhập hệ thống. Mặc định là: 54321</p>
                    </div>

                    {/* CCCD */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                        Số Căn cước công dân (CCCD)
                      </label>
                      <input
                        type="text"
                        value={formCccd}
                        onChange={(e) => setFormCccd(e.target.value)}
                        placeholder="Ví dụ: 079190012345"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none transition ${getThemeFocusClass()}`}
                      />
                    </div>

                    {/* Ngày sinh */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                        Ngày tháng năm sinh
                      </label>
                      <input
                        type="date"
                        value={formDob}
                        onChange={(e) => setFormDob(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm outline-none transition cursor-pointer ${getThemeFocusClass()}`}
                      />
                    </div>

                    {/* Giới tính */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                        Giới tính
                      </label>
                      <select
                        value={formGender}
                        onChange={(e) => setFormGender(e.target.value as Gender)}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm outline-none transition cursor-pointer ${getThemeFocusClass()}`}
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>

                    {/* Chức vụ */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                        Chức vụ giáo viên
                      </label>
                      <input
                        type="text"
                        value={formPosition}
                        onChange={(e) => setFormPosition(e.target.value)}
                        placeholder="Ví dụ: Giáo viên chủ nhiệm, Tổ trưởng bộ môn..."
                        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none transition ${getThemeFocusClass()}`}
                      />
                    </div>

                    {/* Quê quán */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                        Quê quán
                      </label>
                      <input
                        type="text"
                        value={formHometown}
                        onChange={(e) => setFormHometown(e.target.value)}
                        placeholder="Ví dụ: Hà Nam, Hải Phòng, Bến Tre..."
                        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none transition ${getThemeFocusClass()}`}
                      />
                    </div>
                  </div>

                  {/* Địa chỉ hiện tại */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                      Địa chỉ thường trú / hiện tại
                    </label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Ví dụ: Số 123 Đường Trần Hưng Đạo, Quận 5, TP.HCM"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none transition ${getThemeFocusClass()}`}
                    />
                  </div>

                  {/* Đảng viên toggle checkbox */}
                  <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex items-center justify-between">
                    <div className="space-y-0.5 pr-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Flag size={15} className="text-rose-500" />
                        Đồng chí là Đảng viên Đảng Cộng sản Việt Nam
                      </p>
                      <p className="text-xs text-slate-400">Tích chọn nếu giáo viên này đã được đứng trong hàng ngũ của Đảng.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsPartyMember}
                        onChange={(e) => setFormIsPartyMember(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-650 peer-checked:bg-rose-500"></div>
                    </label>
                  </div>
                </div>

                {/* Dialog Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/10 flex items-center justify-end gap-3 rounded-b-3xl">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-semibold text-xs transition active:scale-98 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-white font-semibold text-xs transition shadow-sm hover:shadow active:scale-98 flex items-center gap-1.5 cursor-pointer ${getThemeBgClass()}`}
                  >
                    <Check size={14} className="stroke-[3px]" />
                    <span>Lưu Giáo Viên</span>
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRM DELETE DIALOG --- */}
      {deleteConfirmOpen && teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="delete-dialog">
          {/* Background Overlay */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={() => setDeleteConfirmOpen(false)} />
          
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl text-left overflow-hidden shadow-xl relative z-10 border border-slate-100 dark:border-slate-800 p-6 animate-scale-in"
            role="dialog" 
            aria-modal="true"
          >
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-950 dark:text-white">Xác Nhận Xóa Giáo Viên?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Bạn có chắc chắn muốn xóa hồ sơ giáo viên <strong className="text-slate-900 dark:text-white">{teacherToDelete.name}</strong> (SĐT: {teacherToDelete.phone})?
                  </p>
                  <p className="text-[11px] text-rose-500 font-bold mt-2 bg-rose-50/50 dark:bg-rose-950/10 p-2 rounded-lg border border-rose-100/40">
                    Cảnh báo: Hành động này không thể hoàn tác và giáo viên này sẽ không thể đăng nhập vào hệ thống quản lý nữa!
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition shadow-sm hover:shadow active:scale-98 cursor-pointer"
                >
                  Đồng ý Xóa
                </button>
              </div>
          </div>
        </div>
      )}
      
      {/* 3. EXCEL/CSV IMPORT MODAL FOR TEACHERS */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsImportOpen(false)} />
          
          <div className={`w-full ${excelPreview.length > 0 ? 'max-w-3xl' : 'max-w-xl'} bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl transition-all duration-350 text-slate-800 dark:text-slate-100 max-h-[90vh] flex flex-col`}>
            <button onClick={() => setIsImportOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="mb-4">
              <h2 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <FileSpreadsheet className="text-emerald-500" size={22} />
                Nhập Giáo Viên Hàng Loạt Bằng Excel/CSV
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tải lên tập tin Excel (.xlsx, .xls) hoặc dán dữ liệu văn bản để nhanh chóng cập nhật danh sách giáo viên, cán bộ nhà trường.
              </p>
            </div>

            {/* Import Method Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800/80 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setImportMethod('excel'); setImportError(''); }}
                className={`px-4 py-2 border-b-2 transition-all ${
                  importMethod === 'excel'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Nhập từ tệp Excel (.xlsx, .xls)
              </button>
              <button
                type="button"
                onClick={() => { setImportMethod('text'); setImportError(''); }}
                className={`px-4 py-2 border-b-2 transition-all ${
                  importMethod === 'text'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Dán dữ liệu CSV/Văn bản
              </button>
            </div>

            {importError && (
              <div className="mb-3.5 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {importMethod === 'excel' ? (
                <div className="space-y-4">
                  {/* Excel Upload Area */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Drag and Drop Zone */}
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all flex flex-col items-center justify-center min-h-[140px] relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx, .xls, .csv"
                        onChange={handleExcelFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <FileSpreadsheet className="text-slate-400 mb-2 stroke-1" size={32} />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nhấp để chọn hoặc kéo thả file Excel vào đây</p>
                      <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ các định dạng .xlsx, .xls, .csv</p>
                    </div>

                    {/* Template Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tải Excel mẫu chuẩn</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                          Hãy tải file Excel mẫu chuẩn của chúng tôi để chuẩn bị dữ liệu đúng định dạng một cách dễ dàng nhất.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadTemplateXLSX}
                        className="w-full mt-3 py-2 px-3 border border-emerald-500 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Tải Excel Mẫu (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  {/* Excel Preview Table */}
                  {excelPreview.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          Xem trước dữ liệu ({excelPreview.length} giáo viên)
                        </span>
                        <button
                          type="button"
                          onClick={() => { setExcelPreview([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Xóa bản xem trước
                        </button>
                      </div>

                      <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto shadow-inner bg-slate-50/50 dark:bg-slate-900/50">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 select-none text-[10px] uppercase">
                              <th className="px-3 py-2 font-bold">Số điện thoại</th>
                              <th className="px-3 py-2 font-bold">Họ & Tên</th>
                              <th className="px-3 py-2 font-bold">Chức vụ</th>
                              <th className="px-3 py-2 font-bold">Giới tính</th>
                              <th className="px-3 py-2 font-bold">Ngày sinh</th>
                              <th className="px-3 py-2 font-bold">Đảng viên</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                            {excelPreview.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">{item.phone}</td>
                                <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-bold">{item.name}</td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{item.position}</td>
                                <td className="px-3 py-2 text-slate-500 text-[10px]">{item.gender}</td>
                                <td className="px-3 py-2 text-slate-500 text-[10px] font-mono">{item.dob || 'Chưa cập nhật'}</td>
                                <td className="px-3 py-2">
                                  {item.isPartyMember ? (
                                    <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                                      Đảng viên
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 text-[10px]">Chưa kết nạp</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Dữ liệu dán CSV</span>
                    <button
                      type="button"
                      onClick={loadImportTemplate}
                      className="text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles size={11} className="text-amber-500" /> Tải mẫu thử nghiệm
                    </button>
                  </div>
                  
                  <textarea
                    id="csv-import-textarea"
                    rows={7}
                    placeholder="Số Điện Thoại,Họ và Tên,Mật Khẩu,Ngày Sinh (YYYY-MM-DD),Địa Chỉ,Quê Quán,Giới Tính,Số CCCD,Chức Vụ,Đảng Viên (Có/Không)&#10;0912345678,Nguyễn Văn A,123,1985-04-12,79 Lê Duẩn - Hà Nội,Hà Nội,Nam,012345678901,Giáo viên chủ nhiệm,Có"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="import-csv-submit"
                type="button"
                onClick={handleConfirmImport}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
              >
                Xác nhận Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
