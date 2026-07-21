/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Utensils, 
  Save, 
  Sparkles, 
  Check, 
  FileText, 
  RotateCcw, 
  AlertCircle,
  Copy,
  Plus,
  Upload,
  Trash2,
  Image as ImageIcon,
  FileSpreadsheet,
  Download,
  Eye,
  X
} from 'lucide-react';
import { WeeklyMenu, MenuItem, SchoolSettings } from '../types';

interface MenuPostingProps {
  weeklyMenu: WeeklyMenu;
  onSaveMenu: (menu: WeeklyMenu) => void;
  settings: SchoolSettings;
}

const MENU_TEMPLATES = [
  {
    name: "Thực đơn Dinh dưỡng Mùa hè",
    description: "Các món ăn thanh mát, giải nhiệt và dễ tiêu hóa cho bé vào mùa nắng nóng.",
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
  },
  {
    name: "Thực đơn Tăng Đề Kháng & Giàu Kẽm",
    description: "Tăng cường vi chất dinh dưỡng tốt cho hệ miễn dịch từ hải sản, thịt bò, rau củ quả mọng.",
    menu: {
      monday: {
        breakfast: 'Cháo thịt bò băm nhỏ cà rốt hữu cơ',
        morningSnack: 'Sữa tươi tiệt trùng Vinamilk ít đường',
        lunch: 'Cơm tẻ dẻo, Tôm tẩm bột chiên xù, Canh cải ngọt nấu thịt mọc, Đu đủ chín ngọt',
        afternoonSnack: 'Sữa hạt sen macca béo ngậy tự làm'
      },
      tuesday: {
        breakfast: 'Mì Quảng nhân tôm thịt xắt nhỏ mềm',
        morningSnack: 'Nước ép dứa mật ngọt thanh',
        lunch: 'Cơm trắng mềm, Thịt kho trứng cút cốt dừa, Canh mồng tơi mướp nấu riêu cua, Hồng xiêm chín bùi',
        afternoonSnack: 'Sữa chua men sống Yakult Nhật Bản'
      },
      wednesday: {
        breakfast: 'Súp cua biển nấm tuyết bồi bổ sức khỏe',
        morningSnack: 'Nước ép dưa hấu mát lạnh',
        lunch: 'Cơm tẻ dẻo, Cá lóc fillet kho thơm, Canh bầu nấu tôm tươi, Quýt ngọt bóc vỏ',
        afternoonSnack: 'Bánh su kem vani vỏ giòn xốp mềm'
      },
      thursday: {
        breakfast: 'Phở bò chín tái nước dùng xương hầm 12h',
        morningSnack: 'Sữa hạnh nhân óc chó hạt chia dinh dưỡng',
        lunch: 'Cơm trắng mềm, Sườn non rim chua ngọt tốn cơm, Canh rau cải thảo đậu phụ non mọc, Dâu tây Đà Lạt',
        afternoonSnack: 'Bánh bông lan cuộn kem dứa béo ngọt'
      },
      friday: {
        breakfast: 'Cháo lươn đồng Nghệ An thơm nồng gừng tỏi',
        morningSnack: 'Sinh tố bơ sáp Đắk Lắk béo ngậy',
        lunch: 'Cơm chiên hoàng bào hấp dẫn, Mực xào thơm cà chua hành tây, Canh rau ngót nấu giò sống, Thạch phô mai mát rượi',
        afternoonSnack: 'Chè đậu đỏ nước cốt dừa may mắn'
      }
    }
  }
];

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export default function MenuPosting({ weeklyMenu, onSaveMenu, settings }: MenuPostingProps) {
  // Local state for the menu being edited
  const [editedMenu, setEditedMenu] = useState<WeeklyMenu>(JSON.parse(JSON.stringify(weeklyMenu)));
  const [selectedDay, setSelectedDay] = useState<DayKey>('monday');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedDay, setCopiedDay] = useState<MenuItem | null>(null);
  
  // Lightbox for full image preview
  const [showLightbox, setShowLightbox] = useState(false);

  // File Input Refs
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Map theme colors
  const getThemeBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-white';
      default: return 'bg-indigo-600 hover:bg-indigo-500 text-white';
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

  const getThemePillClass = (day: DayKey) => {
    const isActive = selectedDay === day;
    if (isActive) {
      switch (settings.themeColor) {
        case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400';
        case 'violet': return 'bg-violet-50 text-violet-700 border-violet-500 dark:bg-violet-950/30 dark:text-violet-400';
        case 'rose': return 'bg-rose-50 text-rose-700 border-rose-500 dark:bg-rose-950/30 dark:text-rose-400';
        case 'amber': return 'bg-amber-50 text-amber-700 border-amber-500 dark:bg-amber-950/30 dark:text-amber-400';
        default: return 'bg-indigo-50 text-indigo-700 border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-400';
      }
    }
    return 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800';
  };

  const handleFieldChange = (day: DayKey, field: keyof MenuItem, value: string) => {
    setEditedMenu(prev => {
      const updated = { ...prev };
      updated.menu[day] = {
        ...updated.menu[day],
        [field]: value
      };
      return updated;
    });
  };

  const handleApplyTemplate = (templateMenu: WeeklyMenu['menu']) => {
    setEditedMenu(prev => ({
      ...prev,
      menu: JSON.parse(JSON.stringify(templateMenu))
    }));
  };

  const handleSave = () => {
    onSaveMenu(editedMenu);
    setSaveSuccess(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu thực đơn về dữ liệu lưu gần nhất? Các chỉnh sửa chưa lưu sẽ bị hủy.')) {
      setEditedMenu(JSON.parse(JSON.stringify(weeklyMenu)));
    }
  };

  // Copy current day's menu to clipboard state
  const handleCopyDay = () => {
    setCopiedDay({ ...editedMenu.menu[selectedDay] });
  };

  // Paste copied day menu to current selected day
  const handlePasteDay = () => {
    if (copiedDay) {
      setEditedMenu(prev => {
        const updated = { ...prev };
        updated.menu[selectedDay] = { ...copiedDay };
        return updated;
      });
    }
  };

  // Excel template generator for teachers
  const handleDownloadTemplate = () => {
    try {
      const data = [
        ["Thứ (Day - Giữ nguyên cột này)", "Bữa Sáng (Breakfast - Bắt buộc)", "Phụ Sáng (Morning Snack - Không bắt buộc)", "Bữa Trưa (Lunch - Bắt buộc)", "Bữa Xế (Afternoon Snack - Bắt buộc)"],
        ["Thứ Hai", "Súp gà ngô ngọt hạt sen", "Sữa chua uống Proby", "Cơm tẻ dẻo, Cá quả kho tộ, Canh rau dền thịt băm, Dưa hấu", "Bánh flan sữa tươi caramen"],
        ["Thứ Ba", "Cháo sườn heo non hạt sen", "Nước ép cam sành nguyên chất", "Cơm thịt heo bọc trứng cút sốt cà chua, Canh bí đỏ, Chuối chín", "Chè đậu xanh nha đam thanh nhiệt"],
        ["Thứ Tư", "Nui xào thịt bò Úc sốt bơ tỏi", "Sữa chua dẻo nếp cẩm", "Cơm trắng dẻo, Tôm rim thịt ba chỉ, Canh cải bó xôi, Táo Gala", "Bánh mì sandwich phết bơ phô mai"],
        ["Thứ Năm", "Phở gà ta xé phay bánh phở tươi", "Sữa yến mạch hạt điều tự nấu", "Cơm trắng mềm, Đùi gà rô ti nước dừa, Canh sườn hầm củ quả, Lê ngọt", "Bánh bông lan trứng muối tươi"],
        ["Thứ Sáu", "Cháo cá hồi Na Uy bông cải xanh", "Sinh tố xoài cát Hòa Lộc", "Cơm chiên Dương Châu lấp lánh, Canh cải cúc tôm nõn, Thạch rau câu", "Trái cây thập cẩm xắt nhỏ dầm sữa tươi"]
      ];
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Beautiful column width styling
      ws['!cols'] = [
        { wch: 28 }, // Thứ
        { wch: 30 }, // Bữa sáng
        { wch: 30 }, // Phụ sáng
        { wch: 55 }, // Bữa trưa
        { wch: 32 }  // Bữa xế
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "Thuc_Don_Tuan_Mau");
      XLSX.writeFile(wb, "Mau_Thuc_Don_Mầm_Non.xlsx");
    } catch (err) {
      console.error(err);
      alert('Tạo file mẫu Excel thất bại.');
    }
  };

  // Parser for Excel file uploads
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (parsedData.length < 2) {
          alert("File Excel rỗng hoặc không đúng định dạng. Vui lòng tải file mẫu Excel từ hệ thống để xem cấu trúc chuẩn.");
          return;
        }

        const updatedMenu = { ...editedMenu };
        const dayMapping: Record<string, DayKey> = {
          'thứ hai': 'monday', 'thu hai': 'monday', 'hai': 'monday', 't2': 'monday', 'mon': 'monday',
          'thứ ba': 'tuesday', 'thu ba': 'tuesday', 'ba': 'tuesday', 't3': 'tuesday', 'tue': 'tuesday',
          'thứ tư': 'wednesday', 'thu tu': 'wednesday', 'tư': 'wednesday', 't4': 'wednesday', 'wed': 'wednesday',
          'thứ năm': 'thursday', 'thu nam': 'thursday', 'năm': 'thursday', 't5': 'thursday', 'thu': 'thursday',
          'thứ sáu': 'friday', 'thu sau': 'friday', 'sáu': 'friday', 't6': 'friday', 'fri': 'friday',
        };

        for (let r = 1; r < parsedData.length; r++) {
          const row = parsedData[r];
          if (!row || row.length === 0) continue;

          const rawDay = String(row[0] || '').toLowerCase().trim();
          let dayKey: DayKey | null = null;
          
          for (const [key, val] of Object.entries(dayMapping)) {
            if (rawDay.includes(key)) {
              dayKey = val;
              break;
            }
          }

          // Fallback based on row index if headers fit the Mon-Fri sequence
          if (!dayKey && r >= 1 && r <= 5) {
            const fallbackKeys: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            dayKey = fallbackKeys[r - 1];
          }

          if (dayKey) {
            updatedMenu.menu[dayKey] = {
              breakfast: String(row[1] || '').trim(),
              morningSnack: String(row[2] || '').trim(),
              lunch: String(row[3] || '').trim(),
              afternoonSnack: String(row[4] || '').trim()
            };
          }
        }

        setEditedMenu(updatedMenu);
        alert("🎉 Nhập dữ liệu thực đơn từ file Excel thành công! Bạn hãy kiểm tra lại bảng trực quan bên dưới rồi nhấn 'Lưu & Đăng Thực Đơn' để chính thức công bố.");
      } catch (err) {
        console.error(err);
        alert("Không thể đọc được file Excel này. Vui lòng sử dụng file mẫu Excel tải từ ứng dụng.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // reset element
  };

  // Image Upload handler (Base64 conversion)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert("Kích thước ảnh quá lớn (vui lòng chọn ảnh < 2.5MB để đảm bảo hệ thống lưu trữ đồng bộ mượt mà).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditedMenu(prev => ({
        ...prev,
        menuImage: dataUrl
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  const handleRemoveImage = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa ảnh chụp thực đơn tuần này?")) {
      setEditedMenu(prev => {
        const updated = { ...prev };
        delete updated.menuImage;
        return updated;
      });
    }
  };

  const dayLabels: Record<DayKey, { title: string; subtitle: string }> = {
    monday: { title: 'Thứ Hai', subtitle: 'Khởi đầu năng lượng' },
    tuesday: { title: 'Thứ Ba', subtitle: 'Dinh dưỡng đầy đủ' },
    wednesday: { title: 'Thứ Tư', subtitle: 'Bữa ăn cân bằng' },
    thursday: { title: 'Thứ Năm', subtitle: 'Tăng cường vi chất' },
    friday: { title: 'Thứ Sáu', subtitle: 'Kết tuần vui khỏe' }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="menu-posting-container">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Utensils size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                Đăng Thực Đơn Dinh Dưỡng Tuần
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Cập nhật và đăng tải thực đơn tuần bằng cách điền form tay, import file Excel hoặc tải ảnh chụp thực đơn giấy của trường.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200/50 dark:border-slate-700 transition"
          >
            <RotateCcw size={14} />
            Hủy Thay Đổi
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer ${getThemeBgClass()}`}
          >
            {saveSuccess ? (
              <>
                <Check size={14} className="animate-bounce" />
                Đã Lưu & Đăng Thành Công!
              </>
            ) : (
              <>
                <Save size={14} />
                Lưu & Đăng Thực Đơn
              </>
            )}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-xs animate-scale-in">
          <Check size={16} className="bg-emerald-500 text-white p-0.5 rounded-full" />
          <span>Thực đơn tuần mới đã được đăng thành công và đồng bộ tức thời đến tài khoản của toàn bộ phụ huynh học sinh!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Excel & Image Quick Import Tools */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* EXCEL IMPORT CARD */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileSpreadsheet size={14} className="text-emerald-500" /> Nhập Thực Đơn Bằng Excel
            </h2>
            <p className="text-[11px] text-slate-400 leading-normal">
              Tiết kiệm thời gian bằng cách tải file mẫu Excel, điền thông tin thực đơn của cả tuần rồi tải ngược lại lên phần mềm.
            </p>

            <div className="space-y-2.5">
              {/* Download template */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
              >
                <Download size={13} />
                Tải file mẫu Excel (.xlsx)
              </button>

              {/* Upload file triggers */}
              <input
                type="file"
                ref={excelInputRef}
                onChange={handleExcelUpload}
                accept=".xlsx, .xls"
                className="hidden"
                id="excel-file-uploader"
              />
              <button
                type="button"
                onClick={() => excelInputRef.current?.click()}
                className="w-full py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
              >
                <Upload size={13} />
                Tải lên file Excel thực đơn
              </button>
            </div>
          </div>

          {/* IMAGE ATTACHMENT CARD */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-blue-500" /> Đăng Ảnh Chụp Thực Đơn Gốc
            </h2>
            <p className="text-[11px] text-slate-400 leading-normal">
              Bên cạnh việc nhập văn bản, nhà trường có thể đính kèm ảnh chụp bảng tin thực đơn gốc hoặc poster trang trí để phụ huynh tiện theo dõi trực quan hơn.
            </p>

            <div className="space-y-3">
              {editedMenu.menuImage ? (
                /* Thumb Preview of Uploaded Image */
                <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 group">
                  <img 
                    src={editedMenu.menuImage} 
                    alt="Weekly Menu Attached Poster" 
                    className="w-full h-40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowLightbox(true)}
                      className="p-2 bg-white/20 hover:bg-white/35 text-white rounded-full transition"
                      title="Xem toàn màn hình"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-full transition"
                      title="Xóa ảnh"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                    Đã đính kèm ảnh thực đơn
                  </span>
                </div>
              ) : (
                /* Empty Upload state */
                <div>
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                    id="image-file-uploader"
                  />
                  <div 
                    onClick={() => imageInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-5 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-850/10 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                      <ImageIcon size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-350">Chọn ảnh thực đơn tuần</span>
                      <span className="block text-[10px] text-slate-400">Hỗ trợ JPG, PNG, WEBP (Tối đa 2.5MB)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TEMPLATE QUICK SELECT */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" /> Chọn Mẫu Thực Đơn Nhanh
            </h2>
            <div className="space-y-3 pt-1">
              {MENU_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl.menu)}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-150 hover:border-amber-500 dark:border-slate-800 dark:hover:border-amber-500 bg-slate-50/50 dark:bg-slate-850/20 hover:bg-amber-50/10 dark:hover:bg-amber-500/5 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                      {tpl.name}
                    </span>
                    <Plus size={12} className="text-slate-400 group-hover:text-amber-500 transition shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {tpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Standards tips */}
          <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-slate-200 dark:border-slate-850/60 p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertCircle size={14} /> Tiêu chuẩn dinh dưỡng mầm non
            </h3>
            <ul className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400 list-disc pl-4 leading-relaxed">
              <li>Cần đảm bảo đủ 4 nhóm chất chính: bột đường, chất đạm, chất béo, vitamin và khoáng chất.</li>
              <li>Thức ăn mầm non phải được chế biến mềm, cắt nhỏ, nhạt vị tốt cho sự phát triển toàn diện của bé.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Main Interactive Form & Preview Area */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-xs space-y-6">
          {/* Day Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 select-none">
            {(Object.keys(dayLabels) as DayKey[]).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex-1 min-w-[90px] px-3 py-2 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${getThemePillClass(day)}`}
              >
                <div>{dayLabels[day].title}</div>
                <div className="text-[9px] font-normal opacity-70 mt-0.5 hidden sm:block">
                  {dayLabels[day].subtitle}
                </div>
              </button>
            ))}
          </div>

          {/* Editor Header for selected Day */}
          <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850/40 px-4 py-3 rounded-xl border border-slate-150 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Đang chỉnh sửa cho</span>
              <h3 className={`text-sm font-extrabold ${getThemeTextClass()}`}>
                {dayLabels[selectedDay].title} — {dayLabels[selectedDay].subtitle}
              </h3>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyDay}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="Sao chép thực đơn ngày này"
              >
                <Copy size={11} /> Sao chép
              </button>
              <button
                type="button"
                onClick={handlePasteDay}
                disabled={!copiedDay}
                className={`px-2.5 py-1.5 bg-white dark:bg-slate-900 border text-[10px] font-bold flex items-center gap-1 transition rounded-lg ${
                  copiedDay 
                    ? 'hover:bg-slate-50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer' 
                    : 'border-slate-100 dark:border-slate-800/60 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                }`}
                title={copiedDay ? "Dán thực đơn đã sao chép" : "Sao chép một ngày trước để dán"}
              >
                <Check size={11} /> Dán thực đơn
              </button>
            </div>
          </div>

          {/* Form Fields for the Day */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Breakfast Field */}
            <div className="space-y-1.5">
              <label htmlFor="breakfast-input" className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                🌅 Bữa Sáng (07H30) <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                id="breakfast-input"
                rows={3}
                value={editedMenu.menu[selectedDay].breakfast}
                onChange={(e) => handleFieldChange(selectedDay, 'breakfast', e.target.value)}
                placeholder="Nhập món chính bữa sáng... Ví dụ: Súp gà ngô ngọt bồi bổ ấm nóng"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none leading-relaxed shadow-inner"
              />
            </div>

            {/* Morning Snack Field */}
            <div className="space-y-1.5">
              <label htmlFor="morningsnack-input" className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                🍼 Phụ Sáng (09H00)
              </label>
              <textarea
                id="morningsnack-input"
                rows={3}
                value={editedMenu.menu[selectedDay].morningSnack || ''}
                onChange={(e) => handleFieldChange(selectedDay, 'morningSnack', e.target.value)}
                placeholder="Nhập nước ép, trái cây hay sữa chua... (Không bắt buộc)"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none leading-relaxed shadow-inner"
              />
            </div>

            {/* Lunch Field */}
            <div className="space-y-1.5">
              <label htmlFor="lunch-input" className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                ☀️ Bữa Trưa (11H00) <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                id="lunch-input"
                rows={3}
                value={editedMenu.menu[selectedDay].lunch}
                onChange={(e) => handleFieldChange(selectedDay, 'lunch', e.target.value)}
                placeholder="Nhập món cơm tẻ, món kho, món xào, món canh và tráng miệng..."
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none leading-relaxed shadow-inner"
              />
            </div>

            {/* Afternoon Snack Field */}
            <div className="space-y-1.5">
              <label htmlFor="afternoonsnack-input" className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                🍰 Bữa Xế (14H30) <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                id="afternoonsnack-input"
                rows={3}
                value={editedMenu.menu[selectedDay].afternoonSnack}
                onChange={(e) => handleFieldChange(selectedDay, 'afternoonSnack', e.target.value)}
                placeholder="Nhập sữa chua, bánh flan, chè bùi mát lạnh ngon lành..."
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none leading-relaxed shadow-inner"
              />
            </div>
          </div>

          {/* Real-time Preview Area */}
          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/20 dark:bg-slate-950/20 space-y-3 select-none">
            <h4 className="text-xs font-extrabold text-slate-400 flex items-center gap-1">
              <FileText size={13} /> GIAO DIỆN PHỤ HUYNH NHÌN THẤY (MÔ PHỎNG)
            </h4>
            
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/85 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-bold text-xs text-slate-850 dark:text-slate-100">{dayLabels[selectedDay].title}</span>
                <span className="text-[9px] text-emerald-500 bg-emerald-50 dark:bg-emerald-950/10 px-2 py-0.5 rounded font-extrabold">Đạt Chuẩn Dinh Dưỡng</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 mb-0.5">🌅 Bữa Sáng</span>
                  <p className="text-slate-700 dark:text-slate-300 font-bold">{editedMenu.menu[selectedDay].breakfast || 'Chưa nhập thông tin'}</p>
                </div>
                {editedMenu.menu[selectedDay].morningSnack && (
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 mb-0.5">🍼 Phụ Sáng (9H)</span>
                    <p className="text-slate-600 dark:text-slate-400 font-semibold">{editedMenu.menu[selectedDay].morningSnack}</p>
                  </div>
                )}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 mb-0.5">☀️ Bữa Trưa (11H)</span>
                  <p className="text-slate-700 dark:text-slate-300 font-bold">{editedMenu.menu[selectedDay].lunch || 'Chưa nhập thông tin'}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 mb-0.5">🍰 Bữa Xế (14H30)</span>
                  <p className="text-slate-600 dark:text-slate-400 font-semibold">{editedMenu.menu[selectedDay].afternoonSnack || 'Chưa nhập thông tin'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Fullscreen Image Viewing */}
      {showLightbox && editedMenu.menuImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </div>
          <div className="max-w-4xl max-h-[80vh] w-full flex items-center justify-center overflow-hidden">
            <img 
              src={editedMenu.menuImage} 
              alt="Bản gốc thực đơn tuần mầm non" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl animate-scale-in"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="mt-4 text-center">
            <h4 className="text-white text-sm font-bold">Thực Đơn Tuần Của Trường</h4>
            <p className="text-slate-400 text-xs mt-1">Ảnh chụp bản tin thực đơn giấy đăng bởi Ban Giám Hiệu</p>
          </div>
        </div>
      )}
    </div>
  );
}
