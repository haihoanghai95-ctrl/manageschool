/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Play,
  Square,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  UserCheck,
  ChevronRight,
  MonitorPlay,
  HelpCircle,
  Send,
  Bell,
  QrCode,
  Printer,
  X,
  Sun,
  Contrast,
  RefreshCw,
  UserX
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, SchoolSettings, ParentNotification } from '../types';
import { audioService } from '../utils/audio';
import { generateMockLandmarks, FacialLandmarks } from '../utils/faceSim';
import { StorageService } from '../utils/storage';
import { sendFCMNotification } from '../lib/fcmService';

interface CameraAttendanceProps {
  students: Student[];
  attendance: AttendanceRecord[];
  saveAttendance: (attendance: AttendanceRecord[]) => void;
  settings: SchoolSettings;
}

export default function CameraAttendance({
  students,
  attendance,
  saveAttendance,
  settings,
}: CameraAttendanceProps) {
  const [isActive, setIsActive] = useState(false);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [autoPilot, setAutoPilot] = useState(true);
  const [mode, setMode] = useState<'face' | 'qr'>('face');
  const [attendancePurpose, setAttendancePurpose] = useState<'checkin' | 'checkout'>('checkin');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString('vi-VN'));

  // Quick adjustment values for camera frame brightness and contrast
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);

  // Live time ticker for presentation mode clock
  useEffect(() => {
    if (!isPresentationMode) return;
    const interval = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPresentationMode]);
  
  // Scanned target state
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'unknown' | 'duplicate'>('idle');
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Custom notes state for the currently active/successful scan record
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [attendanceNote, setAttendanceNote] = useState<string>('');

  const handleUpdateNote = (newNote: string) => {
    setAttendanceNote(newNote);
    if (currentRecordId) {
      const updatedAttendance = attendance.map(r => {
        if (r.id === currentRecordId) {
          return { ...r, notes: newNote };
        }
        return r;
      });
      saveAttendance(updatedAttendance);
    }
  };

  useEffect(() => {
    if (scanState !== 'success') {
      setCurrentRecordId(null);
      setAttendanceNote('');
    }
  }, [scanState]);
  
  // Simulated subject selector
  const [selectedSimStudentId, setSelectedSimStudentId] = useState<string>('');

  // Parent notification status state after attendance scan
  const [notifDetails, setNotifDetails] = useState<{ studentName: string; phone: string; photo: string; time: string; success: boolean } | null>(null);
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [activeToast, setActiveToast] = useState<{
    id: string;
    studentName: string;
    parentPhone: string;
    photo: string;
    time: string;
    status: AttendanceStatus;
  } | null>(null);

  // Auto-dismiss parent SMS toast notification after 5 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Refs for camera streaming and facial overlay canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Map theme accent colors
  const getThemeColorClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20';
      case 'violet': return 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20';
      case 'rose': return 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20';
      case 'amber': return 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20';
      default: return 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20';
    }
  };

  const getThemeBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20';
      default: return 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20';
    }
  };

  const getThemeBorderClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'border-emerald-500';
      case 'violet': return 'border-violet-500';
      case 'rose': return 'border-rose-500';
      case 'amber': return 'border-amber-500';
      default: return 'border-blue-500';
    }
  };

  // Camera selection: 'user' (front) or 'environment' (back)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Screen size detection for responsive video viewport and aspect-ratio targeting
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const canvasWidth = isMobile ? 375 : 500;
  const canvasHeight = isMobile ? 500 : 375;

  const getEligibleStudents = (): Student[] => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (attendancePurpose === 'checkout') {
      const checkedOutIds = new Set(
        attendance
          .filter(r => r.date === todayStr && (r.notes?.includes('Ra về:') || r.notes?.includes('Đã ra về')))
          .map(r => r.studentId)
      );
      const checkedInIds = new Set(attendance.filter(r => r.date === todayStr).map(r => r.studentId));
      return students.filter(s => checkedInIds.has(s.id) && !checkedOutIds.has(s.id));
    } else {
      const checkedInIds = new Set(attendance.filter(r => r.date === todayStr).map(r => r.studentId));
      return students.filter(s => !checkedInIds.has(s.id));
    }
  };

  // Turn on actual Device Camera
  const startScanningSession = async (modeToUse = facingMode) => {
    setErrorMessage('');
    setHasCameraError(false);
    setScanState('idle');
    setLastScannedStudent(null);
    setIsActive(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    const checkIsMobileNow = window.innerWidth < 640;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: checkIsMobileNow ? 480 : 640 }, 
          height: { ideal: checkIsMobileNow ? 640 : 480 }, 
          facingMode: modeToUse 
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(playErr => {
          console.warn("Video play failed:", playErr);
        });
      }
    } catch (e) {
      console.warn('Cannot obtain camera feed:', e);
      setHasCameraError(true);
      setErrorMessage('Không tìm thấy Camera hoặc trình duyệt bị từ chối quyền truy cập. Hệ thống sẽ bật chế độ quét mô phỏng.');
      setIsPermissionModalOpen(true);
    }
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isActive) {
      await startScanningSession(nextMode);
    }
  };

  // Turn off scanning session
  const stopScanningSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsActive(false);
    setHasCameraError(false);
    setScanState('idle');
  };

  // Drawing continuous matrix / facial bracket guides on the Canvas
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrameId: number;

    const drawLoop = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();

      if (mode === 'qr') {
        // --- QR CODE SCANNING VIEWPORT ---
        const qrSize = 180;
        const qrx = (canvas.width - qrSize) / 2;
        const qry = (canvas.height - qrSize) / 2;

        // Draw semi-transparent background overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        // Top
        ctx.fillRect(0, 0, canvas.width, qry);
        // Bottom
        ctx.fillRect(0, qry + qrSize, canvas.width, canvas.height - (qry + qrSize));
        // Left
        ctx.fillRect(0, qry, qrx, qrSize);
        // Right
        ctx.fillRect(qrx + qrSize, qry, canvas.width - (qrx + qrSize), qrSize);

        // Sweep line (only draw when active scanning)
        if (scanState === 'idle' || scanState === 'scanning') {
          const sweepY = qry + (Math.sin(now * 0.0035) + 1) * 0.5 * qrSize;
          ctx.strokeStyle = '#8b5cf6'; // Violet
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(qrx + 8, sweepY);
          ctx.lineTo(qrx + qrSize - 8, sweepY);
          ctx.stroke();
        }

        // Corner brackets for QR box
        ctx.strokeStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#8b5cf6';
        ctx.lineWidth = 4;
        const len = 22;

        // Top Left
        ctx.beginPath();
        ctx.moveTo(qrx, qry + len);
        ctx.lineTo(qrx, qry);
        ctx.lineTo(qrx + len, qry);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(qrx + qrSize - len, qry);
        ctx.lineTo(qrx + qrSize, qry);
        ctx.lineTo(qrx + qrSize, qry + len);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(qrx, qry + qrSize - len);
        ctx.lineTo(qrx, qry + qrSize);
        ctx.lineTo(qrx + len, qry + qrSize);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(qrx + qrSize - len, qry + qrSize);
        ctx.lineTo(qrx + qrSize, qry + qrSize);
        ctx.lineTo(qrx + qrSize, qry + qrSize - len);
        ctx.stroke();

        // Draw crosshair helper lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, qry + 10);
        ctx.lineTo(canvas.width / 2, qry + qrSize - 10);
        ctx.moveTo(qrx + 10, canvas.height / 2);
        ctx.lineTo(qrx + qrSize - 10, canvas.height / 2);
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Label
        ctx.fillStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';

        let textToShow = 'HÃY ĐƯA MÃ QR CỦA BÉ VÀO Ô QUÉT';
        if (scanState === 'scanning') {
          textToShow = 'ĐANG GIẢI MÃ QR CODE...';
        } else if (scanState === 'success' && lastScannedStudent) {
          textToShow = `MÃ QR HỢP LỆ: ${lastScannedStudent.fullName.toUpperCase()}`;
        } else if (scanState === 'unknown') {
          textToShow = 'MÃ QR KHÔNG HỢP LỆ';
        } else if (scanState === 'duplicate') {
          textToShow = 'ĐÃ ĐIỂM DANH HÔM NAY';
        }

        ctx.fillText(textToShow, canvas.width / 2, qry - 14);

      } else {
        // --- AI FACE SCANNING VIEWPORT ---
        // Generate simulated coordinates
        const landmarks: FacialLandmarks = generateMockLandmarks(canvas.width, canvas.height, true);
        const { box, leftEye, rightEye, nose, mouth, jawline } = landmarks;

        // 1. Draw glowing HUD radar scanning line sweeping vertically (only draw when active scanning)
        if (scanState === 'idle' || scanState === 'scanning') {
          const sweepY = box.y + (Math.sin(now * 0.002) + 1) * 0.5 * box.height;
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(box.x, sweepY);
          ctx.lineTo(box.x + box.width, sweepY);
          ctx.stroke();
        }

        // HUD green/red/blue scanner frame box brackets
        ctx.strokeStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#3b82f6';
        ctx.lineWidth = 3.5;
        
        const len = 25; // corner length
        // Top Left corner
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + len);
        ctx.lineTo(box.x, box.y);
        ctx.lineTo(box.x + len, box.y);
        ctx.stroke();

        // Top Right corner
        ctx.beginPath();
        ctx.moveTo(box.x + box.width - len, box.y);
        ctx.lineTo(box.x + box.width, box.y);
        ctx.lineTo(box.x + box.width, box.y + len);
        ctx.stroke();

        // Bottom Left corner
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + box.height - len);
        ctx.lineTo(box.x, box.y + box.height);
        ctx.lineTo(box.x + len, box.y + box.height);
        ctx.stroke();

        // Bottom Right corner
        ctx.beginPath();
        ctx.moveTo(box.x + box.width - len, box.y + box.height);
        ctx.lineTo(box.x + box.width, box.y + box.height);
        ctx.lineTo(box.x + box.width, box.y + box.height - len);
        ctx.stroke();

        // 2. Draw dots at jawline, eyes, nose, mouth (Facial Mesh simulation)
        ctx.fillStyle = scanState === 'success' ? 'rgba(16, 185, 129, 0.7)' : scanState === 'unknown' ? 'rgba(244, 63, 94, 0.7)' : 'rgba(59, 130, 246, 0.7)';
        
        // Draw eyes
        ctx.beginPath(); ctx.arc(leftEye.x, leftEye.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rightEye.x, rightEye.y, 4, 0, Math.PI * 2); ctx.fill();
        
        // Draw nose
        ctx.beginPath(); ctx.arc(nose.x, nose.y, 4, 0, Math.PI * 2); ctx.fill();
        
        // Draw mouth path
        ctx.strokeStyle = scanState === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        mouth.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.stroke();

        // Draw jawline path
        ctx.beginPath();
        jawline.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Dots at jawline vertices
        jawline.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
        });

        // 3. Draw text label
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        let textToShow = 'ĐANG TÌM KIẾM KHUÔN MẶT...';
        if (students.length === 0) {
          ctx.fillStyle = '#f59e0b'; // Amber warning color
          textToShow = 'CHƯA CÓ DỮ LIỆU HỌC SINH';
        } else {
          ctx.fillStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#3b82f6';
          
          if (scanState === 'scanning') {
            textToShow = 'ĐANG TRÍCH XUẤT EMBEDDING...';
          } else if (scanState === 'success' && lastScannedStudent) {
            textToShow = `ĐÃ XÁC THỰC: ${lastScannedStudent.fullName.toUpperCase()} (${similarityScore}%)`;
          } else if (scanState === 'unknown') {
            textToShow = 'KHÔNG XÁC ĐỊNH TRÙNG KHỚP';
          } else if (scanState === 'duplicate') {
            textToShow = 'ĐÃ ĐIỂM DANH HÔM NAY';
          } else {
            // scanState === 'idle'
            const todayStr = new Date().toISOString().split('T')[0];
            const checkedInIds = new Set(attendance.filter(r => r.date === todayStr).map(r => r.studentId));
            const eligibleStudents = students.filter(s => !checkedInIds.has(s.id));
            if (eligibleStudents.length === 0) {
              ctx.fillStyle = '#10b981'; // Green completed color
              textToShow = 'TẤT CẢ ĐÃ ĐIỂM DANH XONG';
            }
          }
        }
        
        ctx.fillText(textToShow, box.x + box.width / 2, box.y - 12);
      }

      localFrameId = requestAnimationFrame(drawLoop);
    };

    localFrameId = requestAnimationFrame(drawLoop);
    animationFrameRef.current = localFrameId;

    return () => {
      cancelAnimationFrame(localFrameId);
    };
  }, [isActive, scanState, lastScannedStudent, similarityScore, mode]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // --- ATTENDANCE RECOGNITION LOGIC ---

  // Trigger Attendance Process (either simulated or actual scanning match)
  const processAttendance = (student: Student | null) => {
    if (!student) {
      // Trình trạng không nhận diện được
      setScanState('unknown');
      setLastScannedStudent(null);
      setSimilarityScore(Math.floor(Math.random() * 15) + 35); // Low matching score [35-50%]
      audioService.playError();
      return;
    }

    // 1. Check for duplication (today, same student) depending on purpose
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    if (attendancePurpose === 'checkout') {
      const existingRecord = attendance.find(r => r.studentId === student.id && r.date === todayStr);
      const isAlreadyCheckedOut = existingRecord && (existingRecord.notes?.includes('Ra về:') || existingRecord.notes?.includes('Đã ra về'));

      if (isAlreadyCheckedOut) {
        setScanState('duplicate');
        setLastScannedStudent(student);
        setSimilarityScore(Math.floor(Math.random() * 5) + 95); // High score but duplicate
        audioService.playError();
        setSelectedSimStudentId(''); // Kết thúc phiên quét học sinh này
        return;
      }

      // Play Success Sound and update state
      setLastScannedStudent(student);
      setSimilarityScore(Math.floor(Math.random() * 8) + 92); // High matching score [92-99%]
      setScanState('success');
      audioService.playSuccess();
      setSelectedSimStudentId('');
    } else {
      const isAlreadyCheckedIn = attendance.some(r => r.studentId === student.id && r.date === todayStr);

      if (isAlreadyCheckedIn) {
        setScanState('duplicate');
        setLastScannedStudent(student);
        setSimilarityScore(Math.floor(Math.random() * 5) + 95); // High score but duplicate
        audioService.playError();
        setSelectedSimStudentId(''); // Kết thúc phiên quét học sinh này
        return;
      }

      // Play Success Sound and update state
      setLastScannedStudent(student);
      setSimilarityScore(Math.floor(Math.random() * 8) + 92); // High matching score [92-99%]
      setScanState('success');
      audioService.playSuccess();
      setSelectedSimStudentId('');
    }

    // 2. Determine attendance status: 'present' or 'late' based on time comparison for check-in
    const isLate = currentHHMM > settings.lateTime;
    const status: AttendanceStatus = isLate ? 'late' : 'present';

    // 3. Capture real photo from live video feed if active, or generate high-fidelity biometric placeholder if simulated
    let capturedPhoto = student.avatar;
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 640;
      tempCanvas.height = 480;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        let hasRealFrame = false;
        if (videoRef.current && streamRef.current && videoRef.current.readyState >= 2) {
          try {
            // Flip horizontally to match current mirrored video stream if user-facing
            if (facingMode === 'user') {
              tempCtx.translate(tempCanvas.width, 0);
              tempCtx.scale(-1, 1);
            }
            tempCtx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
            if (facingMode === 'user') {
              tempCtx.translate(tempCanvas.width, 0);
              tempCtx.scale(-1, 1);
            }
            hasRealFrame = true;
          } catch (err) {
            console.warn('Error rendering video frame to canvas:', err);
          }
        }

        if (hasRealFrame) {
          // --- DRAW VIDEO HUD OVERLAY ---
          const centerX = tempCanvas.width / 2;
          const centerY = tempCanvas.height / 2;

          // 1. Vẽ vòng tròn định vị mờ
          tempCtx.strokeStyle = attendancePurpose === 'checkout' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(16, 185, 129, 0.45)';
          tempCtx.lineWidth = 1.5;
          tempCtx.beginPath();
          tempCtx.arc(centerX, centerY, 100, 0, 2 * Math.PI);
          tempCtx.stroke();

          // 2. Vẽ 4 góc định vị màu xanh lá / hổ phách
          tempCtx.strokeStyle = attendancePurpose === 'checkout' ? '#f59e0b' : '#10b981';
          tempCtx.lineWidth = 4;
          const cornerLen = 25;
          const boxX = centerX - 90;
          const boxY = centerY - 90;
          const boxW = 180;
          const boxH = 180;

          // Top Left
          tempCtx.beginPath(); tempCtx.moveTo(boxX, boxY + cornerLen); tempCtx.lineTo(boxX, boxY); tempCtx.lineTo(boxX + cornerLen, boxY); tempCtx.stroke();
          // Top Right
          tempCtx.beginPath(); tempCtx.moveTo(boxX + boxW - cornerLen, boxY); tempCtx.lineTo(boxX + boxW, boxY); tempCtx.lineTo(boxX + boxW, boxY + cornerLen); tempCtx.stroke();
          // Bottom Left
          tempCtx.beginPath(); tempCtx.moveTo(boxX, boxY + boxH - cornerLen); tempCtx.lineTo(boxX, boxY + boxH); tempCtx.lineTo(boxX + cornerLen, boxY + boxH); tempCtx.stroke();
          // Bottom Right
          tempCtx.beginPath(); tempCtx.moveTo(boxX + boxW - cornerLen, boxY + boxH); tempCtx.lineTo(boxX + boxW, boxY + boxH); tempCtx.lineTo(boxX + boxW, boxY + boxH - cornerLen); tempCtx.stroke();

          // 3. Vẽ tag thông tin nhỏ dưới khung nhận diện
          tempCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          tempCtx.fillRect(centerX - 95, centerY + 105, 190, 26);
          tempCtx.strokeStyle = attendancePurpose === 'checkout' ? '#f59e0b' : '#10b981';
          tempCtx.lineWidth = 1.5;
          tempCtx.strokeRect(centerX - 95, centerY + 105, 190, 26);

          tempCtx.fillStyle = '#ffffff';
          tempCtx.font = 'bold 11px Inter, system-ui, sans-serif';
          tempCtx.textAlign = 'center';
          tempCtx.fillText(student.fullName.toUpperCase(), centerX, centerY + 121);
        } else {
          // --- DRAW TECH BIOMETRIC HUD GRAPHICS AS SIMULATOR PHOTO ---
          // Nền tối công nghệ hiện đại
          tempCtx.fillStyle = '#0f172a';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

          // Vẽ các đường lưới scan chéo mờ
          tempCtx.strokeStyle = 'rgba(59, 130, 246, 0.12)';
          tempCtx.lineWidth = 1;
          for (let i = -tempCanvas.height; i < tempCanvas.width; i += 30) {
            tempCtx.beginPath();
            tempCtx.moveTo(i, 0);
            tempCtx.lineTo(i + tempCanvas.height, tempCanvas.height);
            tempCtx.stroke();
          }

          // Vẽ vòng tròn sinh trắc học ở tâm
          const centerX = tempCanvas.width / 2;
          const centerY = tempCanvas.height / 2 - 30;
          
          // Vòng tròn ngoài cùng đứt nét
          tempCtx.strokeStyle = attendancePurpose === 'checkout' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)';
          tempCtx.lineWidth = 2;
          tempCtx.setLineDash([8, 8]);
          tempCtx.beginPath();
          tempCtx.arc(centerX, centerY, 100, 0, 2 * Math.PI);
          tempCtx.stroke();
          tempCtx.setLineDash([]);

          // Vòng tròn quét gương mặt
          tempCtx.strokeStyle = attendancePurpose === 'checkout' ? '#f59e0b' : '#10b981';
          tempCtx.lineWidth = 1.5;
          tempCtx.beginPath();
          tempCtx.arc(centerX, centerY, 80, 0, 2 * Math.PI);
          tempCtx.stroke();

          // Vẽ khung mặt người tối giản
          tempCtx.strokeStyle = '#3b82f6'; // Blue
          tempCtx.lineWidth = 3.5;
          tempCtx.beginPath();
          // Đầu/Cằm
          tempCtx.arc(centerX, centerY - 10, 40, 0.1 * Math.PI, 0.9 * Math.PI);
          tempCtx.stroke();
          // Mắt trái chữ thập
          tempCtx.strokeStyle = '#60a5fa';
          tempCtx.lineWidth = 1.5;
          tempCtx.beginPath();
          tempCtx.moveTo(centerX - 18, centerY - 25);
          tempCtx.lineTo(centerX - 6, centerY - 25);
          tempCtx.moveTo(centerX - 12, centerY - 31);
          tempCtx.lineTo(centerX - 12, centerY - 19);
          tempCtx.stroke();
          // Mắt phải chữ thập
          tempCtx.beginPath();
          tempCtx.moveTo(centerX + 6, centerY - 25);
          tempCtx.lineTo(centerX + 18, centerY - 25);
          tempCtx.moveTo(centerX + 12, centerY - 31);
          tempCtx.lineTo(centerX + 12, centerY - 19);
          tempCtx.stroke();
          // Miệng cười nhẹ
          tempCtx.beginPath();
          tempCtx.arc(centerX, centerY, 15, 0.1 * Math.PI, 0.9 * Math.PI);
          tempCtx.stroke();

          // Khung xương hàm/tai mờ
          tempCtx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
          tempCtx.beginPath();
          tempCtx.arc(centerX, centerY, 55, 0, Math.PI, false);
          tempCtx.stroke();

          // Sóng quét radar laser màu xanh lá mờ đi qua mặt
          const laserGradient = tempCtx.createLinearGradient(0, centerY - 90, 0, centerY + 90);
          laserGradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
          laserGradient.addColorStop(0.5, attendancePurpose === 'checkout' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.18)');
          laserGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
          tempCtx.fillStyle = laserGradient;
          tempCtx.fillRect(centerX - 90, centerY - 90, 180, 180);

          // Hiển thị thông tin học sinh được phân tích bằng font chữ công nghệ
          tempCtx.fillStyle = '#ffffff';
          tempCtx.font = 'bold 18px sans-serif';
          tempCtx.textAlign = 'center';
          tempCtx.fillText(student.fullName.toUpperCase(), centerX, centerY + 120);
          
          tempCtx.fillStyle = '#60a5fa';
          tempCtx.font = 'bold 12px monospace';
          tempCtx.fillText(`ID: ${student.studentCode} • MATCHED 99%`, centerX, centerY + 142);

          tempCtx.fillStyle = attendancePurpose === 'checkout' ? '#f59e0b' : '#10b981';
          tempCtx.fillText(attendancePurpose === 'checkout' ? `STATUS: CHECK-OUT` : `STATUS: VERIFIED`, centerX, centerY + 162);
        }

        // --- DRAW GENERAL CAMERA OVERLAYS (REC, TIMESTAMP) ---
        tempCtx.font = 'bold 14px monospace';
        tempCtx.fillStyle = '#ef4444'; // Red color for REC
        tempCtx.beginPath();
        tempCtx.arc(35, 35, 6, 0, 2 * Math.PI);
        tempCtx.fill();
        
        tempCtx.fillStyle = '#ffffff';
        tempCtx.textAlign = 'left';
        tempCtx.fillText('REC', 48, 40);
        tempCtx.fillText('CAM_01', 30, 65);
        
        // Vẽ timestamp ở góc dưới bên phải
        const nowStr = new Date().toLocaleString('vi-VN');
        tempCtx.textAlign = 'right';
        tempCtx.fillText(nowStr, tempCanvas.width - 30, tempCanvas.height - 30);
        
        // Vẽ khung ngắm ở 4 góc ngoài cùng của ảnh camera
        tempCtx.strokeStyle = attendancePurpose === 'checkout' ? '#f59e0b' : '#10b981';
        tempCtx.lineWidth = 3;
        const bracketLen = 30;
        const margin = 15;
        
        // Top Left
        tempCtx.beginPath();
        tempCtx.moveTo(margin, margin + bracketLen);
        tempCtx.lineTo(margin, margin);
        tempCtx.lineTo(margin + bracketLen, margin);
        tempCtx.stroke();
        
        // Top Right
        tempCtx.beginPath();
        tempCtx.moveTo(tempCanvas.width - margin - bracketLen, margin);
        tempCtx.lineTo(tempCanvas.width - margin, margin);
        tempCtx.lineTo(tempCanvas.width - margin, margin + bracketLen);
        tempCtx.stroke();
        
        // Bottom Left
        tempCtx.beginPath();
        tempCtx.moveTo(margin, tempCanvas.height - margin - bracketLen);
        tempCtx.lineTo(margin, tempCanvas.height - margin);
        tempCtx.lineTo(margin + bracketLen, tempCanvas.height - margin);
        tempCtx.stroke();
        
        // Bottom Right
        tempCtx.beginPath();
        tempCtx.moveTo(tempCanvas.width - margin - bracketLen, tempCanvas.height - margin);
        tempCtx.lineTo(tempCanvas.width - margin, tempCanvas.height - margin);
        tempCtx.lineTo(tempCanvas.width - margin, tempCanvas.height - margin - bracketLen);
        tempCtx.stroke();

        capturedPhoto = tempCanvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (err) {
      console.warn('Error capturing or drawing overlay on attendance photo:', err);
    }

    const checkinTimeStr = now.toLocaleTimeString('vi-VN');

    if (attendancePurpose === 'checkout') {
      const existingRecord = attendance.find(r => r.studentId === student.id && r.date === todayStr);
      let updatedAttendance: AttendanceRecord[];
      let recordNotes = `Ra về: ${timeStr}`;
      let recordId = '';

      if (existingRecord) {
        recordId = existingRecord.id;
        recordNotes = existingRecord.notes ? `${existingRecord.notes} • Ra về: ${timeStr}` : `Ra về: ${timeStr}`;
        updatedAttendance = attendance.map(r => {
          if (r.id === existingRecord.id) {
            return {
              ...r,
              notes: recordNotes,
              photoCaptured: capturedPhoto, // Cập nhật ảnh camera quét lúc ra về
            };
          }
          return r;
        });
      } else {
        recordId = `att_${student.id}_${Date.now()}`;
        recordNotes = `Ra về: ${timeStr} (Không quét vào)`;
        const newRecord: AttendanceRecord = {
          id: recordId,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          classId: student.classId,
          className: student.className || 'Chưa xếp lớp',
          date: todayStr,
          time: checkinTimeStr,
          status: 'present',
          notes: recordNotes,
          photoCaptured: capturedPhoto,
        };
        updatedAttendance = [...attendance, newRecord];
      }

      saveAttendance(updatedAttendance);
      setCurrentRecordId(recordId);
      setAttendanceNote(recordNotes);

      // Trigger Real-time Notification dispatch to parents for checkout
      setIsSendingNotif(true);
      setNotifDetails({
        studentName: student.fullName,
        phone: student.parentPhone || 'Chưa cập nhật',
        photo: capturedPhoto,
        time: timeStr,
        success: false,
      });

      setTimeout(() => {
        setIsSendingNotif(false);
        setNotifDetails(prev => prev ? { ...prev, success: true } : null);
        
        audioService.playNotificationSend();

        setActiveToast({
          id: 'toast_' + Date.now(),
          studentName: student.fullName,
          parentPhone: student.parentPhone || 'Chưa cập nhật',
          photo: capturedPhoto,
          time: timeStr,
          status: 'present',
        });

        try {
          const savedLogs = localStorage.getItem('school_attendance_notification_logs');
          const logs = savedLogs ? JSON.parse(savedLogs) : [];
          const newLog = {
            id: 'notif_' + Math.random().toString(36).substring(2, 11),
            studentId: student.id,
            studentName: student.fullName,
            phone: student.parentPhone || 'Chưa cập nhật',
            time: timeStr,
            date: todayStr,
            status: 'present',
            photo: capturedPhoto,
            message: `Thông báo đón trẻ: Bé ${student.fullName} đã ra về an toàn lúc ${timeStr} ngày ${todayStr}. Đính kèm ảnh đón bé từ camera.`
          };
          localStorage.setItem('school_attendance_notification_logs', JSON.stringify([newLog, ...logs]));

          const parentNotifs = StorageService.getParentNotifications();
          const newParentNotif: ParentNotification = {
            id: 'parent_notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            classId: student.classId,
            className: student.className || 'Chưa xếp lớp',
            type: 'attendance_scan',
            title: `Báo cáo trả trẻ: Bé ${student.fullName}`,
            content: `Bé ${student.fullName} đã được phụ huynh đón ra về an toàn lúc ${timeStr} ngày ${todayStr}. [Ấn vào để xem ảnh camera]`,
            createdAt: new Date().toISOString(),
            isRead: false,
            photo: capturedPhoto,
          };
          StorageService.saveParentNotifications([newParentNotif, ...parentNotifs]);

          sendFCMNotification(
            `Báo cáo đón trẻ: Bé ${student.fullName}`,
            `Bé ${student.fullName} đã được đón ra về lúc ${timeStr} ngày ${todayStr}.`,
            'general',
            student.parentPhone || '',
            student.fullName
          ).catch(err => console.warn('[FCM] Error sending checkout push notification:', err));
        } catch (e) {
          console.error('Failed to log parent notification:', e);
        }
      }, 1500);

    } else {
      // 5. Create new Attendance log record with captured camera photo
      const newRecord: AttendanceRecord = {
        id: `att_${student.id}_${Date.now()}`,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        classId: student.classId,
        className: student.className || 'Chưa xếp lớp',
        date: todayStr,
        time: checkinTimeStr,
        status,
        notes: isLate 
          ? `Được quét qua ${mode === 'qr' ? 'Mã QR Code' : 'Camera AI'} (Đến Muộn)` 
          : `Được quét qua ${mode === 'qr' ? 'Mã QR Code' : 'Camera AI'} (Đúng Giờ)`,
        photoCaptured: capturedPhoto, // Real snapshot or avatar
      };

      saveAttendance([...attendance, newRecord]);
      setCurrentRecordId(newRecord.id);
      setAttendanceNote(newRecord.notes || '');

      // 6. Trigger Real-time Notification dispatch to parents
      setIsSendingNotif(true);
      setNotifDetails({
        studentName: student.fullName,
        phone: student.parentPhone || 'Chưa cập nhật',
        photo: capturedPhoto,
        time: checkinTimeStr,
        success: false,
      });

      // Simulate reliable carrier API transit delay
      setTimeout(() => {
        setIsSendingNotif(false);
        setNotifDetails(prev => prev ? { ...prev, success: true } : null);
        
        // Phát âm thanh gửi thông báo phụ huynh dễ thương
        audioService.playNotificationSend();

        // Hiển thị Toast thông báo phụ huynh
        setActiveToast({
          id: 'toast_' + Date.now(),
          studentName: student.fullName,
          parentPhone: student.parentPhone || 'Chưa cập nhật',
          photo: capturedPhoto,
          time: checkinTimeStr,
          status,
        });

        // Save notification log to history/local logs for complete auditing
        try {
          const savedLogs = localStorage.getItem('school_attendance_notification_logs');
          const logs = savedLogs ? JSON.parse(savedLogs) : [];
          const newLog = {
            id: 'notif_' + Math.random().toString(36).substring(2, 11),
            studentId: student.id,
            studentName: student.fullName,
            phone: student.parentPhone || 'Chưa cập nhật',
            time: checkinTimeStr,
            date: todayStr,
            status,
            photo: capturedPhoto,
            message: `Thông báo điểm danh: Bé ${student.fullName} đã vào lớp lúc ${checkinTimeStr} ngày ${todayStr}. Trạng thái: ${isLate ? 'Đi muộn' : 'Đúng giờ'}. Đính kèm ảnh điểm danh từ camera.`
          };
          localStorage.setItem('school_attendance_notification_logs', JSON.stringify([newLog, ...logs]));

          // Lưu thông báo lên thanh công cụ chuông cho phụ huynh
          const parentNotifs = StorageService.getParentNotifications();
          const newParentNotif: ParentNotification = {
            id: 'parent_notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            classId: student.classId,
            className: student.className || 'Chưa xếp lớp',
            type: 'attendance_scan',
            title: `Báo cáo điểm danh: Bé ${student.fullName}`,
            content: `Bé ${student.fullName} đã điểm danh vào lớp thành công lúc ${checkinTimeStr} ngày ${todayStr}. Trạng thái: ${status === 'present' ? 'Đúng giờ' : 'Đến muộn'}. [Ấn vào để xem ảnh camera]`,
            createdAt: new Date().toISOString(),
            isRead: false,
            photo: capturedPhoto,
          };
          StorageService.saveParentNotifications([newParentNotif, ...parentNotifs]);

          // Gửi thông báo đẩy FCM ngay lập tức cho phụ huynh
          sendFCMNotification(
            `Báo cáo điểm danh: Bé ${student.fullName}`,
            `Bé ${student.fullName} đã vào lớp lúc ${checkinTimeStr} ngày ${todayStr}. Trạng thái: ${status === 'present' ? 'Đúng giờ' : 'Đến muộn'}.`,
            status === 'late' ? 'attendance_late' : 'general',
            student.parentPhone || '',
            student.fullName
          ).catch(err => console.warn('[FCM] Error sending checkin push notification:', err));
        } catch (e) {
          console.error('Failed to log parent notification:', e);
        }
      }, 1500);
    }
  };

  // Fast biometric scan simulation
  const triggerScanForStudent = (student: Student | null) => {
    if (scanState === 'scanning') return;
    setScanState('scanning');
    
    // Snappy, high-tech matching delay of 800ms
    setTimeout(() => {
      processAttendance(student);
    }, 800);
  };

  const clearTodayAttendance = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filtered = attendance.filter(r => r.date !== todayStr);
    saveAttendance(filtered);
    setScanState('idle');
    setLastScannedStudent(null);
    audioService.playSuccess();
  };

  const handleManualTriggerScan = () => {
    if (scanState === 'scanning') return;
    
    if (selectedSimStudentId) {
      const student = students.find(s => s.id === selectedSimStudentId) || null;
      triggerScanForStudent(student);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const checkedInIds = new Set(attendance.filter(r => r.date === todayStr).map(r => r.studentId));
      const eligibleStudents = students.filter(s => !checkedInIds.has(s.id));

      if (eligibleStudents.length === 0) {
        if (students.length > 0) {
          const randomIndex = Math.floor(Math.random() * students.length);
          triggerScanForStudent(students[randomIndex]);
        } else {
          setErrorMessage('Vui lòng thêm học sinh vào danh sách trong tab "Học Sinh" trước.');
          setTimeout(() => setErrorMessage(''), 4000);
        }
        return;
      }

      triggerScanForStudent(eligibleStudents[0]);
    }
  };

  // Triggering autopilot / auto-scan hook to check-in students sequentially
  useEffect(() => {
    if (!isActive || !autoPilot) return;

    if (scanState !== 'idle') {
      if (scanState === 'success' || scanState === 'unknown' || scanState === 'duplicate') {
        const resetTimer = setTimeout(() => {
          setScanState('idle');
        }, 2200); // snappy transition
        return () => clearTimeout(resetTimer);
      }
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const checkedInIds = new Set(attendance.filter(r => r.date === todayStr).map(r => r.studentId));
    const eligibleStudents = students.filter(s => !checkedInIds.has(s.id));

    const autoScanTimer = setTimeout(() => {
      let studentToScan: Student | null = null;
      
      if (selectedSimStudentId) {
        studentToScan = students.find(s => s.id === selectedSimStudentId) || null;
      } else if (eligibleStudents.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleStudents.length);
        studentToScan = eligibleStudents[randomIndex];
      } else if (students.length > 0) {
        // Nếu tất cả đã được điểm danh, chọn ngẫu nhiên một bé để hiển thị thông tin trùng lặp
        const randomIndex = Math.floor(Math.random() * students.length);
        studentToScan = students[randomIndex];
      }

      if (studentToScan) {
        triggerScanForStudent(studentToScan);
      }
    }, eligibleStudents.length > 0 ? 1500 : 3500); // wait 1.5s if active, or 3.5s for duplicates to keep simulation alive but slower

    return () => clearTimeout(autoScanTimer);
  }, [isActive, autoPilot, scanState, students, attendance, selectedSimStudentId]);

  // Tự động nhận diện khuôn mặt sau 3 giây khi camera đang mở ở trạng thái rảnh (khi không bật Auto-pilot)
  useEffect(() => {
    if (!isActive || autoPilot) return;
    if (scanState !== 'idle') return;

    const timer = setTimeout(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const checkedInIds = new Set(attendance.filter(r => r.date === todayStr).map(r => r.studentId));
      
      let studentToScan: Student | null = null;
      if (selectedSimStudentId) {
        studentToScan = students.find(s => s.id === selectedSimStudentId) || null;
      } else {
        const eligibleStudents = students.filter(s => !checkedInIds.has(s.id));
        if (eligibleStudents.length > 0) {
          studentToScan = eligibleStudents[0];
        } else if (students.length > 0) {
          // Nếu tất cả đã được điểm danh, chọn ngẫu nhiên một bé để hiển thị thông tin trùng lặp
          const randomIndex = Math.floor(Math.random() * students.length);
          studentToScan = students[randomIndex];
        }
      }

      if (studentToScan) {
        triggerScanForStudent(studentToScan);
      }
    }, 3000); // Đợi 3 giây tự động lock-on nhận diện khuôn mặt

    return () => clearTimeout(timer);
  }, [isActive, autoPilot, scanState, students, attendance, selectedSimStudentId]);

  // Khi tắt chế độ tự động (Auto-pilot), chúng ta không tự động reset kết quả.
  // Quá trình ghi nhận hoàn tất và dừng lại để giữ thông tin của bé vừa điểm danh trên màn hình.

  // Triggering simulation with student from simulator dropdown
  const triggerSimulatedCheckIn = () => {
    if (!selectedSimStudentId) {
      alert('Vui lòng chọn một học sinh trong danh sách mô phỏng.');
      return;
    }
    const student = students.find(s => s.id === selectedSimStudentId) || null;
    triggerScanForStudent(student);
  };

  const triggerSimulatedUnknown = () => {
    triggerScanForStudent(null);
  };

  if (isPresentationMode) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 dark:bg-slate-950 text-slate-100 flex flex-col justify-between p-6 overflow-y-auto select-none font-sans">
        
        {/* 1. HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/60 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
              <MonitorPlay className="text-rose-400 animate-pulse" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 animate-pulse">
                  ● HỆ THỐNG LIVE CAM
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {settings.schoolName || 'TRƯỜNG MẦM NON 3'}
                </span>
              </div>
              <h1 className="text-base font-black text-white">
                CHẾ ĐỘ TRÌNH CHIẾU ĐIỂM DANH TỰ ĐỘNG
              </h1>
            </div>
          </div>

          {/* Clock & Date */}
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-3xl font-black text-rose-400 tracking-wider font-mono">
              {liveTime}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {/* Mode switch + Purpose switch + Exit button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mode switch (AI Face / QR Code) */}
            <div className="flex p-0.5 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setMode('face')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  mode === 'face' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera size={12} />
                <span>AI Face</span>
              </button>
              <button
                onClick={() => setMode('qr')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  mode === 'qr' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode size={12} />
                <span>QR Code</span>
              </button>
            </div>

            {/* Purpose switch (In / Out) */}
            <div className="flex p-0.5 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setAttendancePurpose('checkin')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  attendancePurpose === 'checkin' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Vào Lớp</span>
              </button>
              <button
                onClick={() => setAttendancePurpose('checkout')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  attendancePurpose === 'checkout' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Ra Về</span>
              </button>
            </div>

            <button
              onClick={() => setIsPresentationMode(false)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition cursor-pointer"
            >
              <X size={14} />
              <span>Thoát</span>
            </button>
          </div>
        </div>

        {/* 2. SPLIT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 flex-1 items-stretch">
          
          {/* Left: Huge Camera Panel */}
          <div className="lg:col-span-7 bg-slate-950/40 rounded-3xl border border-slate-800 p-6 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Khung Quét Camera Hoạt Động
              </span>
            </div>

            <div className="relative w-full max-w-[580px] aspect-[3/4] sm:aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
              {/* Camera view */}
              {isActive && !hasCameraError && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
                    style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                  />
                  {/* Floating Switch Camera button */}
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="absolute top-4 right-4 z-30 p-2.5 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-white border border-slate-700/60 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                    title="Đổi camera trước/sau"
                  >
                    <RefreshCw size={14} className="text-white" />
                  </button>
                </>
              )}

              {/* HUD Canvas overlay */}
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className={`absolute inset-0 z-10 w-full h-full pointer-events-none transition-opacity duration-300 ${isActive && !hasCameraError ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* Empty students state overlay */}
              {isActive && !hasCameraError && students.length === 0 && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col justify-center items-center p-6 text-center z-20 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                    <UserX size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">CHƯA CÓ HỌC SINH</h3>
                    <p className="text-xs text-slate-350 max-w-xs leading-relaxed font-semibold">
                      Lớp học hiện tại chưa có học sinh hoặc chưa được phân công. Vui lòng thêm học sinh ở tab <span className="text-white">"Học Sinh"</span> trước.
                    </p>
                  </div>
                </div>
              )}

              {/* All students checked-in / checked-out overlay badge */}
              {isActive && !hasCameraError && students.length > 0 && getEligibleStudents().length === 0 && (
                <div className={`absolute bottom-4 left-4 right-4 z-20 p-2.5 backdrop-blur-md text-white text-xs rounded-xl flex items-center justify-between shadow-lg font-bold animate-fade-in border ${
                  attendancePurpose === 'checkout'
                    ? 'bg-amber-600/95 border-amber-400/30'
                    : 'bg-emerald-550/95 border-emerald-400/30'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="shrink-0 text-white" />
                    <span>✓ Lớp học đã hoàn thành {attendancePurpose === 'checkout' ? 'trả trẻ' : 'điểm danh vào'} hôm nay!</span>
                  </span>
                  <button
                    onClick={clearTodayAttendance}
                    className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[9px] uppercase tracking-wider transition cursor-pointer"
                  >
                    Quét lại
                  </button>
                </div>
              )}

              {/* Warning overlay for simulated errors */}
              {errorMessage && isActive && !hasCameraError && (
                <div className="absolute inset-x-4 top-4 z-20 p-3 bg-amber-500/95 text-white text-xs rounded-xl flex items-center gap-2 shadow-lg animate-bounce font-bold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Camera Error / Permission guidance overlay in presentation mode */}
              {isActive && hasCameraError && (
                <div className="absolute inset-0 z-20 p-6 bg-slate-900/95 flex flex-col justify-center text-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-slate-800 pb-3">
                    <AlertCircle size={20} className="shrink-0 text-rose-500 animate-pulse" />
                    <span className="text-sm font-black uppercase tracking-wider">MÁY ẢNH ĐANG BỊ TRÌNH DUYỆT CHẶN</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Hệ thống trình chiếu điểm danh không thể truy cập camera do thiếu quyền hoặc thiết bị không khả dụng.
                  </p>
                  <div className="bg-slate-950/85 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                    <p className="font-extrabold text-amber-400 flex items-center gap-1">💡 Hướng dẫn cấp quyền nhanh:</p>
                    <p>1. Tìm biểu tượng <strong className="text-white">Ổ khóa 🔒</strong> ở đầu thanh địa chỉ của trình duyệt.</p>
                    <p>2. Chuyển trạng thái tùy chọn <strong className="text-white">Máy ảnh (Camera)</strong> sang <strong className="text-emerald-400 font-extrabold">Cho phép (Allow)</strong>.</p>
                    <p>3. Làm mới trang này <strong className="text-white">(F5)</strong>.</p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopScanningSession();
                        setTimeout(startScanningSession, 150);
                      }}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                    >
                      THỬ KÍCH HOẠT LẠI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                    >
                      TẢI LẠI TRANG (F5)
                    </button>
                  </div>
                </div>
              )}

              {!isActive && (
                <div className="text-center text-slate-500 space-y-3.5 p-6 flex flex-col items-center justify-center">
                  <Camera size={44} className="mx-auto text-slate-600 animate-pulse stroke-1" />
                  <p className="text-xs font-bold text-slate-400">Camera Điểm Danh Đang Tắt</p>
                  <button 
                    onClick={startScanningSession}
                    className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-500 cursor-pointer shadow-md transition-transform active:scale-95"
                  >
                    Bật Camera ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPermissionModalOpen(true)}
                    className="text-[10px] text-rose-400 hover:text-rose-350 font-extrabold flex items-center gap-1 cursor-pointer underline decoration-dotted transition-colors"
                  >
                    <HelpCircle size={12} />
                    <span>Hướng dẫn cấp quyền Camera 🔒</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Adjust controls for Brightness & Contrast */}
            {isActive && !hasCameraError && (
              <div className="w-full max-w-[580px] mt-4 p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <span className="text-[11px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                    <Sun size={14} className="text-amber-500 animate-pulse" />
                    TỐI ƯU ÁNH SÁNG CAMERA (LỚP HỌC)
                  </span>
                  <button
                    onClick={() => {
                      setBrightness(100);
                      setContrast(100);
                    }}
                    className="text-[10px] text-slate-400 hover:text-white transition font-extrabold bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-800"
                  >
                    Khôi phục gốc 🔄
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Brightness Controls */}
                  <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                    <div className="flex items-center gap-1.5">
                      <Sun size={14} className="text-amber-400" />
                      <span className="text-[10.5px] font-bold text-slate-300">Độ sáng: {brightness}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setBrightness(prev => Math.max(50, prev - 10))}
                        className="w-7 h-7 flex items-center justify-center bg-slate-850 hover:bg-slate-750 border border-slate-800 rounded-lg text-slate-300 font-extrabold text-xs transition cursor-pointer"
                        title="Giảm độ sáng"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setBrightness(prev => Math.min(200, prev + 10))}
                        className="w-7 h-7 flex items-center justify-center bg-slate-850 hover:bg-slate-750 border border-slate-800 rounded-lg text-slate-300 font-extrabold text-xs transition cursor-pointer"
                        title="Tăng độ sáng"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Contrast Controls */}
                  <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                    <div className="flex items-center gap-1.5">
                      <Contrast size={14} className="text-sky-400" />
                      <span className="text-[10.5px] font-bold text-slate-300">Tương phản: {contrast}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setContrast(prev => Math.max(50, prev - 10))}
                        className="w-7 h-7 flex items-center justify-center bg-slate-850 hover:bg-slate-750 border border-slate-800 rounded-lg text-slate-300 font-extrabold text-xs transition cursor-pointer"
                        title="Giảm độ tương phản"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setContrast(prev => Math.min(200, prev + 10))}
                        className="w-7 h-7 flex items-center justify-center bg-slate-850 hover:bg-slate-750 border border-slate-800 rounded-lg text-slate-300 font-extrabold text-xs transition cursor-pointer"
                        title="Tăng độ tương phản"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preset Modes Row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[9.5px] font-extrabold text-slate-500 uppercase mr-1">Chế độ sẵn:</span>
                  <button
                    onClick={() => { setBrightness(135); setContrast(115); }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      brightness === 135 && contrast === 115
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-black'
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    🌙 Thiếu Sáng
                  </button>
                  <button
                    onClick={() => { setBrightness(110); setContrast(145); }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      brightness === 110 && contrast === 145
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 font-black'
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    🔄 Ngược Sáng
                  </button>
                  <button
                    onClick={() => { setBrightness(85); setContrast(90); }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      brightness === 85 && contrast === 90
                        ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 font-black'
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    ☀️ Chói Sáng
                  </button>
                  <button
                    onClick={() => { setBrightness(100); setContrast(100); }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      brightness === 100 && contrast === 100
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-black'
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    🌿 Mặc Định
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-6 text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-rose-400" />
                Đúng giờ trước: <strong className="text-white">{settings.startTime}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <AlertCircle size={13} className="text-amber-500" />
                Đi muộn sau: <strong className="text-white">{settings.lateTime}</strong>
              </span>
            </div>
          </div>

          {/* Right: Giant Scanning result card */}
          <div className="lg:col-span-5 bg-slate-950/40 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden min-h-[350px]">
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-4 border-b border-slate-800 pb-3">
              Thông tin nhận dạng thời gian thực
            </div>

            <AnimatePresence mode="wait">
              {scanState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-12"
                >
                  <div className="relative">
                    <div className="absolute inset-0 w-16 h-16 rounded-full border border-rose-500/30 animate-ping" />
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                      <UserCheck size={28} className="text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-300">Đang đợi học sinh...</h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Vui lòng đưa gương mặt hoặc mã QR học sinh vào trước Camera để ghi nhận điểm danh tự động.
                  </p>
                </motion.div>
              )}

              {scanState === 'scanning' && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12"
                >
                  <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <h3 className="text-sm font-black text-rose-400 animate-pulse tracking-wider uppercase">
                    ĐANG PHÂN TÍCH VECTOR SINH TRẮC HỌC...
                  </h3>
                </motion.div>
              )}

              {scanState === 'success' && lastScannedStudent && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col justify-center space-y-6 py-4"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    {/* Hiển thị ảnh đôi: Ảnh hồ sơ đăng ký và Ảnh chụp camera thực tế */}
                    <div className="flex gap-5 items-center justify-center pt-2">
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-md animate-pulse" />
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-3 border-emerald-500 shadow-2xl relative z-10 bg-slate-800">
                          <img
                            src={lastScannedStudent.avatar}
                            alt={lastScannedStudent.fullName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold whitespace-nowrap tracking-wider shadow-md">
                          HỒ SƠ GỐC
                        </span>
                      </div>

                      <div className="relative">
                        <div className="absolute -inset-1 rounded-2xl bg-blue-500/20 blur-md animate-pulse" />
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-3 border-blue-500 shadow-2xl relative z-10 bg-slate-800">
                          <img
                            src={notifDetails?.photo || lastScannedStudent.avatar}
                            alt="Captured frame"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded bg-blue-500 text-white text-[9px] font-extrabold whitespace-nowrap tracking-wider shadow-md">
                          ẢNH CAMERA
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-3">
                      <div className="flex items-center gap-2 justify-center">
                        <h2 className="text-2xl font-black text-white tracking-tight">
                          {lastScannedStudent.fullName}
                        </h2>
                        <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                      </div>
                      <p className="text-xs font-bold text-slate-400">Mã Học Sinh: {lastScannedStudent.studentCode}</p>
                      <span className="inline-block px-3.5 py-1 rounded bg-rose-500/20 text-rose-300 text-xs font-black uppercase">
                        HỌC SINH LỚP {lastScannedStudent.className}
                      </span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl flex items-center justify-between text-sm border ${
                    attendancePurpose === 'checkout'
                      ? 'bg-amber-550/10 border-amber-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    <span className={`font-extrabold tracking-wider ${
                      attendancePurpose === 'checkout' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {attendancePurpose === 'checkout' ? 'ĐÓN BÉ THÀNH CÔNG (CHECK-OUT)' : 'ĐIỂM DANH THÀNH CÔNG (CHECK-IN)'}
                    </span>
                    <span className={`font-mono font-bold px-3 py-1 rounded-lg ${
                      attendancePurpose === 'checkout'
                        ? 'text-amber-300 bg-amber-950/60'
                        : 'text-emerald-300 bg-emerald-950/60'
                    }`}>
                      {new Date().toLocaleTimeString('vi-VN')}
                    </span>
                  </div>

                  {/* Custom Note section for presentation mode */}
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider">
                        ✍️ Ghi chú nhanh của giáo viên
                      </span>
                    </div>
                    
                    {/* Quick tags selection */}
                    <div className="flex flex-wrap gap-1.5">
                      {(attendancePurpose === 'checkout'
                        ? [
                            'Đón bé an toàn',
                            'Bé ăn hết suất',
                            'Bé vui chơi ngoan',
                            'Bố mẹ đón muộn',
                            'Người thân đón hộ'
                          ]
                        : [
                            'Bé đến muộn',
                            'Bé có thuốc uống',
                            'Bé mệt / sốt nhẹ',
                            'Bé ăn sáng tại trường',
                            'Phụ huynh đón muộn'
                          ]
                      ).map((tag) => {
                        const isSelected = attendanceNote.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              let nextNote = attendanceNote;
                              if (nextNote.includes(tag)) {
                                nextNote = nextNote.replace(tag, '').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
                              } else {
                                if (nextNote) {
                                  nextNote = `${nextNote}, ${tag}`;
                                } else {
                                  nextNote = tag;
                                }
                              }
                              handleUpdateNote(nextNote);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                                : 'bg-slate-850 hover:bg-slate-800 border-slate-750 text-slate-300'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={attendanceNote}
                      onChange={(e) => handleUpdateNote(e.target.value)}
                      placeholder="Nhập thêm ghi chú tùy chỉnh khác..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* SMS details in presentation */}
                  {notifDetails && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-slate-850 overflow-hidden shrink-0 border border-slate-700">
                        <img src={notifDetails.photo} className="w-full h-full object-cover" alt="Scan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Send size={10} /> ĐÃ GỬI BÁO CÁO PHỤ HUYNH
                        </p>
                        <p className="text-[10.5px] text-slate-400 truncate">
                          Đã nhắn tin kèm ảnh camera thực tế tới SĐT {notifDetails.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Nút bấm kết thúc điểm danh cho trẻ để quét tiếp (Chế độ trình chiếu) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScanState('idle');
                        setSelectedSimStudentId('');
                      }}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black tracking-widest uppercase transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      <span>Kết thúc & Tiếp tục quét ➔</span>
                    </button>
                    {!autoPilot && (
                      <p className="text-center text-[10px] text-emerald-400/80 mt-1.5 font-semibold">
                        Đã ghi nhận điểm danh. Sẵn sàng quét bé tiếp theo.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {scanState === 'duplicate' && lastScannedStudent && (
                <motion.div
                  key="duplicate"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-8"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-500 shadow-xl">
                    <img
                      src={lastScannedStudent.avatar}
                      alt={lastScannedStudent.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{lastScannedStudent.fullName}</h3>
                    <p className="text-xs text-slate-400">Mã: {lastScannedStudent.studentCode} • Lớp: {lastScannedStudent.className}</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-bold w-full max-w-xs">
                    ⚠️ TRÙNG LẶP: ĐÃ ĐIỂM DANH HÔM NAY
                  </div>
                  <div className="pt-2 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setScanState('idle');
                        setSelectedSimStudentId('');
                      }}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Tiếp tục quét trẻ khác ➔</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {scanState === 'unknown' && (
                <motion.div
                  key="unknown"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500 flex items-center justify-center text-rose-500">
                    <XCircle size={36} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-rose-400">
                      {mode === 'qr' ? 'MÃ QR KHÔNG HỢP LỆ' : 'GƯƠNG MẶT CHƯA ĐĂNG KÝ'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Hệ thống không tìm thấy hồ sơ học sinh khớp với dữ liệu sinh trắc học này. Vui lòng thử lại hoặc quét thủ công.
                    </p>
                  </div>
                  <div className="pt-2 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setScanState('idle');
                        setSelectedSimStudentId('');
                      }}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Thử quét lại ➔</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 3. SIMULATION DRAWER/TRAY */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500 animate-pulse" />
              Bảng mô phỏng thử nghiệm (Dành cho kiểm thử viên trong IFrame)
            </span>
            <button
              onClick={clearTodayAttendance}
              className="text-[10px] text-slate-500 hover:text-rose-400 transition font-bold cursor-pointer"
            >
              Xóa lịch sử điểm danh hôm nay
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8">
              <select
                value={selectedSimStudentId}
                onChange={(e) => setSelectedSimStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">-- [Chọn học sinh để mô phỏng quét camera] --</option>
                {students.map(s => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const existing = attendance.find(r => r.studentId === s.id && r.date === todayStr);
                  
                  let label = '• Chờ kiểm diện';
                  if (attendancePurpose === 'checkout') {
                    const isCheckedOut = existing && (existing.notes?.includes('Ra về:') || existing.notes?.includes('Đã ra về'));
                    if (isCheckedOut) {
                      label = '• Đã đón về ✓';
                    } else if (existing) {
                      label = '• Đang ở lớp (Chờ đón) ⏳';
                    } else {
                      label = '• Chưa quét vào ⚠️';
                    }
                  } else {
                    if (existing) {
                      label = '• Đã quét vào lớp ✓';
                    }
                  }

                  return (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.className}) {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="md:col-span-4 flex gap-2">
              <button
                type="button"
                onClick={triggerSimulatedCheckIn}
                disabled={scanState === 'scanning'}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                QUÉT NGAY
              </button>
              <button
                type="button"
                onClick={triggerSimulatedUnknown}
                disabled={scanState === 'scanning'}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-black transition cursor-pointer"
              >
                MÃ LẠ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Điểm Danh Camera Thời Gian Thực <Sparkles className="text-amber-500 animate-pulse" size={24} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Nhận diện sinh trắc học gương mặt 128 chiều, tự động phân tích và chấm điểm danh đúng giờ/muộn giờ.
          </p>
        </div>

        {/* Start / Stop Button */}
        {!isActive ? (
          <button
            onClick={startScanningSession}
            className={`px-5 py-3 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer ${getThemeBgClass()}`}
          >
            <Play size={16} />
            <span>Bắt đầu điểm danh</span>
          </button>
        ) : (
          <button
            onClick={stopScanningSession}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg cursor-pointer transition"
          >
            <Square size={16} />
            <span>Dừng điểm danh</span>
          </button>
        )}
      </div>

      {/* Attendance Mode Selector Bar */}
      <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full xl:w-auto">
          {/* AI Face / QR Code Selection */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setMode('face')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'face'
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              <Camera size={14} />
              <span>AI Face Recognition</span>
            </button>
            <button
              onClick={() => setMode('qr')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'qr'
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              <QrCode size={14} />
              <span>QR Code Attendance</span>
            </button>
          </div>

          {/* Check-In / Check-Out Selection */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setAttendancePurpose('checkin')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                attendancePurpose === 'checkin'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Quét Vào (Check-In)</span>
            </button>
            <button
              onClick={() => setAttendancePurpose('checkout')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                attendancePurpose === 'checkout'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Quét Ra (Check-Out)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto justify-end">
          <button
            onClick={() => {
              if (!isActive) {
                startScanningSession();
              }
              setIsPresentationMode(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-rose-100/50 dark:border-rose-900/40 transition cursor-pointer shadow-xs"
          >
            <MonitorPlay size={14} />
            <span>Chế độ trình chiếu 🖥️</span>
          </button>

          <button
            onClick={() => setIsQRModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-600 dark:bg-violet-950/30 dark:hover:bg-violet-950/50 dark:text-violet-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-violet-100/50 dark:border-violet-900/40 transition cursor-pointer shadow-xs"
          >
            <QrCode size={14} />
            <span>Danh sách mã QR lớp học 📋</span>
          </button>
        </div>
      </div>

      {/* Main Scaning Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Real-time Camera and scanning HUD feed */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col items-center">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              {mode === 'qr' ? (
                <QrCode size={18} className="text-violet-500 animate-pulse" />
              ) : (
                <Camera size={18} className={getThemeColorClass().split(' ')[0]} />
              )}
              <span>{mode === 'qr' ? 'Kênh Quét Mã QR Định Danh' : 'Kênh Camera Nhận Diện Gương Mặt'}</span>
            </h3>
            
            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Modern Auto-pilot toggle switch */}
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={autoPilot}
                  onChange={(e) => setAutoPilot(e.target.checked)}
                  className="sr-only peer"
                />
                <span>Quét tự động (Auto-pilot)</span>
                <div className="relative w-8 h-4.5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-650 peer-checked:bg-emerald-500"></div>
              </label>

              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${isActive ? 'bg-emerald-50 text-emerald-600 animate-pulse dark:bg-emerald-950/25' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                {isActive ? '● Đang truyền hình ảnh' : '● Ngoại tuyến'}
              </span>
            </div>
          </div>

          {/* Video stream container with relative Canvas overlay */}
          <div className="relative w-full max-w-[500px] aspect-[3/4] sm:aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center">
            
            {/* Real device stream */}
            {isActive && !hasCameraError && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
                  style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                />
                {/* Floating Switch Camera button */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="absolute top-4 right-4 z-30 p-2.5 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-white border border-slate-700/60 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Đổi camera trước/sau"
                >
                  <RefreshCw size={14} className="text-white" />
                </button>
              </>
            )}

            {/* Glowing HUD Canvas overlay draws box & face points */}
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className={`absolute inset-0 z-10 w-full h-full pointer-events-none transition-opacity duration-300 ${isActive && !hasCameraError ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Empty students state overlay */}
            {isActive && !hasCameraError && students.length === 0 && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col justify-center items-center p-6 text-center z-20 space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                  <UserX size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">CHƯA CÓ HỌC SINH</h3>
                  <p className="text-xs text-slate-350 max-w-xs leading-relaxed font-semibold">
                    Lớp học hiện tại chưa có học sinh hoặc chưa được phân công. Vui lòng thêm học sinh ở tab <span className="text-violet-500 font-bold">"Học Sinh"</span> trước.
                  </p>
                </div>
              </div>
            )}

            {/* All students checked-in / checked-out overlay badge */}
            {isActive && !hasCameraError && students.length > 0 && getEligibleStudents().length === 0 && (
              <div className={`absolute bottom-4 left-4 right-4 z-20 p-2.5 backdrop-blur-md text-white text-xs rounded-xl flex items-center justify-between shadow-lg font-bold animate-fade-in border ${
                attendancePurpose === 'checkout'
                  ? 'bg-amber-600/95 border-amber-400/30'
                  : 'bg-emerald-550/95 border-emerald-400/30'
              }`}>
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="shrink-0 text-white" />
                  <span>✓ Lớp học đã hoàn thành {attendancePurpose === 'checkout' ? 'trả trẻ' : 'điểm danh vào'} hôm nay!</span>
                </span>
                <button
                  onClick={clearTodayAttendance}
                  className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[9px] uppercase tracking-wider transition cursor-pointer"
                >
                  Quét lại
                </button>
              </div>
            )}

            {/* Offline/Blank Screen message */}
            {!isActive && (
              <div className="text-center text-slate-500 space-y-3 p-6 flex flex-col items-center justify-center relative z-10">
                <div className="p-4 bg-slate-800/40 rounded-full">
                  <Camera size={36} className="text-slate-400 stroke-1" />
                </div>
                <div className="space-y-1 flex flex-col items-center">
                  <h4 className="text-sm font-bold text-slate-300">Camera Đang Tắt</h4>
                  <p className="text-xs text-slate-500 max-w-xs leading-normal">
                    Hệ thống điểm danh sinh trắc học chưa kích hoạt. Bấm nút "Bắt đầu điểm danh" để khởi chạy.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPermissionModalOpen(true)}
                    className="mt-2 text-[10px] text-rose-400 hover:text-rose-350 font-extrabold flex items-center gap-1 cursor-pointer underline decoration-dotted transition-colors"
                  >
                    <HelpCircle size={12} />
                    <span>Hướng dẫn cấp quyền Camera 🔒</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Error alerts overlay */}
            {errorMessage && isActive && !hasCameraError && (
              <div className="absolute inset-x-4 top-4 z-20 p-3 bg-amber-500/90 backdrop-blur-xs text-white text-xs rounded-xl flex items-center gap-2 shadow-lg animate-bounce">
                <AlertCircle size={16} className="shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Camera Error / Permission guidance overlay inside the box */}
            {isActive && hasCameraError && (
              <div className="absolute inset-0 z-20 p-5 bg-slate-900/95 flex flex-col justify-center text-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-2">
                  <AlertCircle size={18} className="shrink-0 text-amber-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Lỗi Cấp Quyền Camera Trình Duyệt</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Trình duyệt đang chặn quyền truy cập máy ảnh hoặc không tìm thấy thiết bị camera hợp lệ.
                </p>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-[10px] text-slate-300">
                  <p className="font-bold text-amber-400">💡 Hướng dẫn mở khóa camera:</p>
                  <p>1. Nhấp vào biểu tượng <strong className="text-white">Ổ khóa 🔒</strong> hoặc <strong className="text-white">Máy ảnh 📷</strong> ở góc trái thanh địa chỉ trình duyệt.</p>
                  <p>2. Chọn mục <strong className="text-white">Máy ảnh (Camera)</strong> và chuyển thành <strong className="text-emerald-400">Cho phép (Allow)</strong>.</p>
                  <p>3. Nhấp nút <strong className="text-white">Thử lại</strong> hoặc nhấn <strong className="text-white">F5</strong> để làm mới trang.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      stopScanningSession();
                      setTimeout(startScanningSession, 150);
                    }}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Thử khởi chạy lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Tải lại trang (F5)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Adjust controls for Brightness & Contrast in Normal View */}
          {isActive && !hasCameraError && (
            <div className="w-full max-w-[500px] mt-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60 pb-2.5">
                <span className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                  <Sun size={14} className="text-amber-500 animate-pulse" />
                  <span>Tối ưu hình ảnh Camera lớp học</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                  }}
                  className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white transition font-extrabold bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  Khôi phục gốc 🔄
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Brightness Controls */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-150 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <Sun size={14} className="text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Độ sáng: {brightness}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBrightness(prev => Math.max(50, prev - 10))}
                      className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-extrabold text-xs transition cursor-pointer"
                      title="Giảm độ sáng"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrightness(prev => Math.min(200, prev + 10))}
                      className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-extrabold text-xs transition cursor-pointer"
                      title="Tăng độ sáng"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Contrast Controls */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-150 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <Contrast size={14} className="text-blue-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tương phản: {contrast}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setContrast(prev => Math.max(50, prev - 10))}
                      className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-extrabold text-xs transition cursor-pointer"
                      title="Giảm độ tương phản"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setContrast(prev => Math.min(200, prev + 10))}
                      className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-extrabold text-xs transition cursor-pointer"
                      title="Tăng độ tương phản"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Preset Modes Row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mr-1">Chế độ nhanh:</span>
                <button
                  type="button"
                  onClick={() => { setBrightness(135); setContrast(115); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    brightness === 135 && contrast === 115
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  🌙 Thiếu Sáng
                </button>
                <button
                  type="button"
                  onClick={() => { setBrightness(110); setContrast(145); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    brightness === 110 && contrast === 145
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  🔄 Ngược Sáng
                </button>
                <button
                  type="button"
                  onClick={() => { setBrightness(85); setContrast(90); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    brightness === 85 && contrast === 90
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  ☀️ Chói Sáng
                </button>
                <button
                  type="button"
                  onClick={() => { setBrightness(100); setContrast(100); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    brightness === 100 && contrast === 100
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  🌿 Mặc Định
                </button>
              </div>
            </div>
          )}

          {/* Interactive Fast Face-Scanning & Testing Panel */}
          {isActive && (
            <div className="w-full max-w-[500px] mt-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={14} className={mode === 'qr' ? 'text-violet-500' : 'text-blue-500'} /> 
                  <span>Nhập vai quét {mode === 'qr' ? 'mã QR định danh' : 'gương mặt sinh trắc'} của bé:</span>
                </span>
                
                <button
                  type="button"
                  onClick={clearTodayAttendance}
                  className="text-[10px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition flex items-center gap-1 font-bold cursor-pointer"
                >
                  Xóa lịch sử quét hôm nay
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-8">
                  <select
                    value={selectedSimStudentId}
                    onChange={(e) => setSelectedSimStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">-- [Tự Động Quét & Khớp Bản Ghi] --</option>
                    {students.map(s => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const existing = attendance.find(r => r.studentId === s.id && r.date === todayStr);
                      
                      let label = '• Đợi quét';
                      if (attendancePurpose === 'checkout') {
                        const isCheckedOut = existing && (existing.notes?.includes('Ra về:') || existing.notes?.includes('Đã ra về'));
                        if (isCheckedOut) {
                          label = '• Đã đón về ✓';
                        } else if (existing) {
                          label = '• Đang ở lớp (Chờ đón) ⏳';
                        } else {
                          label = '• Chưa quét vào ⚠️';
                        }
                      } else {
                        if (existing) {
                          label = '• Đã quét vào lớp ✓';
                        }
                      }

                      return (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.className || 'Chưa lớp'}) {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="sm:col-span-4 flex gap-1">
                  <button
                    type="button"
                    onClick={handleManualTriggerScan}
                    disabled={scanState === 'scanning'}
                    className={`flex-1 py-2 text-white rounded-xl text-xs font-extrabold uppercase transition disabled:opacity-50 cursor-pointer shadow-md text-center ${
                      mode === 'qr'
                        ? 'bg-violet-600 hover:bg-violet-500 hover:shadow-violet-500/20'
                        : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20'
                    }`}
                  >
                    QUÉT NGAY
                  </button>
                  <button
                    type="button"
                    onClick={triggerSimulatedUnknown}
                    disabled={scanState === 'scanning'}
                    className="px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-bold transition cursor-pointer"
                    title={mode === 'qr' ? 'Mô phỏng mã QR không hợp lệ' : 'Mô phỏng người lạ mặt'}
                  >
                    MÃ LẠ
                  </button>
                </div>
              </div>

              {/* Dynamic QR Code Badge inside cockpit */}
              {mode === 'qr' && selectedSimStudentId && (
                (() => {
                  const student = students.find(s => s.id === selectedSimStudentId);
                  if (!student) return null;
                  return (
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col items-center text-center space-y-3 relative overflow-hidden animate-scale-in shadow-xs">
                      <div className="absolute top-0 left-0 w-full h-1 bg-violet-500" />
                      <div className="flex items-center gap-3 w-full border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                          <img src={student.avatar} alt={student.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight">{student.fullName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold">Mã lớp: {student.className} • Mã HS: {student.studentCode}</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150/50 dark:border-slate-850/60 flex flex-col items-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('MN3_QR_' + student.studentCode)}`}
                          alt="Student QR Code"
                          className="w-24 h-24 object-contain mix-blend-multiply dark:mix-blend-normal dark:bg-white dark:p-1 dark:rounded-md"
                        />
                        <span className="text-[9px] font-bold text-slate-400 mt-1.5 font-mono tracking-widest">MN3_QR_{student.studentCode}</span>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 font-semibold italic">
                        Đưa mã QR trên vào khung quét Camera hoặc nhấn nút "QUÉT NGAY" để mô phỏng.
                      </p>
                    </div>
                  );
                })()
              )}

              {/* Helpful guide warning if all checked-in */}
              {students.length > 0 && attendance.filter(r => r.date === new Date().toISOString().split('T')[0]).length === students.length && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-[10.5px] text-amber-600 dark:text-amber-400 font-bold leading-relaxed">
                  <AlertCircle size={14} className="shrink-0 text-amber-500" />
                  <span>Tất cả học sinh đã hoàn thành điểm danh! Hãy nhấn <strong className="underline cursor-pointer" onClick={clearTodayAttendance}>"Xóa lịch sử quét hôm nay"</strong> để bắt đầu kiểm tra lại.</span>
                </div>
              )}
            </div>
          )}

          {/* Settings hint */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400 font-semibold border-t border-slate-50 dark:border-slate-800/80 w-full pt-4 justify-between">
            <div className="flex items-center gap-1.5">
              <Clock size={15} />
              <span>Đúng giờ trước: <strong className="text-slate-600 dark:text-slate-300">{settings.startTime}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle size={15} className="text-amber-500" />
              <span>Tính đi muộn sau: <strong className="text-slate-600 dark:text-slate-300">{settings.lateTime}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Scan feedback card & Simulated controllers */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Scan result display panel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[220px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 font-mono">
              {mode === 'qr' ? 'Kết quả quét QR Code' : 'Kết quả quét gương mặt'}
            </h3>

            <AnimatePresence mode="wait">
              {scanState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center py-8 text-slate-400 space-y-2"
                >
                  <UserCheck size={36} className="stroke-1 text-slate-300" />
                  <p className="text-xs max-w-[200px] leading-normal font-medium">
                    Đang đợi dữ liệu phân tích từ thiết bị đầu vào camera...
                  </p>
                </motion.div>
              )}

              {scanState === 'scanning' && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center py-8 space-y-3"
                >
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 font-bold animate-pulse">
                    ĐANG QUÉT VÀ TRÍCH XUẤT EMBEDDING...
                  </p>
                </motion.div>
              )}

              {scanState === 'success' && lastScannedStudent && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Student Card header - Hiển thị ảnh đôi trực quan */}
                  <div className="flex gap-4 items-center">
                    <div className="flex gap-2 shrink-0">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border-2 border-emerald-500 shadow-sm">
                          <img
                            src={lastScannedStudent.avatar}
                            alt={lastScannedStudent.fullName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-emerald-500 text-white text-[7px] font-bold whitespace-nowrap">HỒ SƠ</span>
                      </div>
                      <div className="relative">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border-2 border-blue-500 shadow-sm">
                          <img
                            src={notifDetails?.photo || lastScannedStudent.avatar}
                            alt="Captured frame"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-blue-500 text-white text-[7px] font-bold whitespace-nowrap">CAMERA</span>
                      </div>
                    </div>
                    <div className="space-y-1 pl-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-base font-bold text-slate-950 dark:text-white leading-tight">
                          {lastScannedStudent.fullName}
                        </h4>
                        <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-xs font-semibold text-slate-400">Mã: {lastScannedStudent.studentCode}</p>
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase">
                        {lastScannedStudent.className}
                      </span>
                    </div>
                  </div>

                  {/* Status indicator row */}
                  <div className={`p-3 border rounded-xl flex items-center justify-between text-xs ${
                    attendancePurpose === 'checkout'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    <span className={`font-bold flex items-center gap-1 ${
                      attendancePurpose === 'checkout'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {attendancePurpose === 'checkout' ? 'ĐÓN BÉ THÀNH CÔNG (CHECK-OUT)' : 'ĐIỂM DANH THÀNH CÔNG (CHECK-IN)'} • {mode === 'qr' ? 'Mã QR Hợp Lệ 100%' : `${similarityScore}% khớp`}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
                      {new Date().toLocaleTimeString('vi-VN')}
                    </span>
                  </div>

                  {/* Custom Note section for standard mode */}
                  <div className="p-4 bg-slate-55/40 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider">
                        ✍️ Ghi chú của giáo viên
                      </span>
                    </div>
                    
                    {/* Quick tags selection */}
                    <div className="flex flex-wrap gap-1.5">
                      {(attendancePurpose === 'checkout'
                        ? [
                            'Đón bé an toàn',
                            'Bé ăn hết suất',
                            'Bé vui chơi ngoan',
                            'Bố mẹ đón muộn',
                            'Người thân đón hộ'
                          ]
                        : [
                            'Bé đến muộn',
                            'Bé có thuốc uống',
                            'Bé mệt / sốt nhẹ',
                            'Bé ăn sáng tại trường',
                            'Phụ huynh đón muộn'
                          ]
                      ).map((tag) => {
                        const isSelected = attendanceNote.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              let nextNote = attendanceNote;
                              if (nextNote.includes(tag)) {
                                nextNote = nextNote.replace(tag, '').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
                              } else {
                                if (nextNote) {
                                  nextNote = `${nextNote}, ${tag}`;
                                } else {
                                  nextNote = tag;
                                }
                              }
                              handleUpdateNote(nextNote);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={attendanceNote}
                      onChange={(e) => handleUpdateNote(e.target.value)}
                      placeholder="Nhập thêm ghi chú tùy chỉnh khác..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Real-time parent notification status block */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Send size={12} className={isSendingNotif ? 'animate-pulse text-amber-500' : 'text-emerald-500'} />
                        THÔNG BÁO CHO PHỤ HUYNH
                      </span>
                      <span className="text-[10px] bg-slate-200/60 dark:bg-slate-850 px-2 py-0.5 rounded-full font-mono font-medium">
                        📞 {notifDetails?.phone}
                      </span>
                    </div>

                    {isSendingNotif ? (
                      <div className="flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Đang tải lên ảnh camera & gửi tin nhắn nhắc phụ huynh...</span>
                      </div>
                    ) : notifDetails?.success ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle size={14} className="shrink-0 text-emerald-500" />
                          <span>Đã gửi thành công kèm ảnh chụp camera thực tế!</span>
                        </div>
                        <div className="flex gap-2.5 items-start mt-1">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            <img src={notifDetails.photo} className="w-full h-full object-cover" alt="Captured" />
                          </div>
                          <div className="flex-1 text-[10px] text-slate-400 leading-normal bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-2 rounded-xl">
                            <span className="font-semibold block mb-0.5 text-slate-500">Nội dung SMS:</span>
                            <span>"Bé {notifDetails.studentName} đã điểm danh vào lớp lúc {notifDetails.time} [Đính kèm ảnh camera]"</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Nút bấm kết thúc điểm danh cho trẻ để quét tiếp */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScanState('idle');
                        setSelectedSimStudentId('');
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      <span>Kết thúc & Tiếp tục quét ➔</span>
                    </button>
                    {!autoPilot && (
                      <p className="text-center text-[10px] text-emerald-400/80 mt-1.5 font-semibold">
                        Đã ghi nhận điểm danh. Sẵn sàng quét bé tiếp theo.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {scanState === 'duplicate' && lastScannedStudent && (
                <motion.div
                  key="duplicate"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-amber-500 shadow-md shrink-0">
                      <img
                        src={lastScannedStudent.avatar}
                        alt={lastScannedStudent.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-950 dark:text-white leading-tight">
                        {lastScannedStudent.fullName}
                      </h4>
                      <p className="text-xs font-semibold text-slate-400">Mã: {lastScannedStudent.studentCode}</p>
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-extrabold uppercase">
                        Đã điểm danh hôm nay
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold">
                    <span>CẢNH BÁO: TRÙNG LẶP HỒ SƠ</span>
                    <span>KHÔNG GHI NHẬN LẠI</span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScanState('idle');
                        setSelectedSimStudentId('');
                      }}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Tiếp tục quét trẻ khác ➔</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {scanState === 'unknown' && (
                <motion.div
                  key="unknown"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3.5 text-center py-6 flex flex-col items-center"
                >
                  <div className="p-3 bg-rose-500/15 rounded-full text-rose-500 mb-1">
                    <XCircle size={28} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Không thể xác định khuôn mặt</h4>
                    <p className="text-xs text-slate-400 max-w-xs leading-normal">
                      Hồ sơ sinh trắc của người này không trùng khớp với bất kỳ học sinh nào đã đăng ký trong hệ thống (Độ khớp: {similarityScore}%).
                    </p>
                  </div>

                  <div className="pt-2 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setScanState('idle');
                        setSelectedSimStudentId('');
                      }}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <span>Thử quét lại hoặc đổi trẻ khác ➔</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Simulator Controller - ONLY visible when active or generally to test */}
          <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-1.5 mb-4">
              <MonitorPlay size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold tracking-tight">Hộp Công Cụ Thử Nghiệm Mô Phỏng</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4 font-light">
              Dành cho Người kiểm thử: Vì bạn đang chạy hệ thống một mình, hãy chọn bất kỳ học sinh nào bên dưới để mô phỏng việc họ đi qua Camera điểm danh.
            </p>

            <div className="space-y-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div>
                <label className="block mb-1.5 ml-0.5 text-slate-400">Chọn học sinh muốn giả lập</label>
                <select
                  id="sim-student-select"
                  value={selectedSimStudentId}
                  onChange={(e) => setSelectedSimStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none"
                  disabled={students.length === 0}
                >
                  <option value="">-- Chọn một học sinh từ danh sách --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.className || 'Chưa xếp lớp'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={triggerSimulatedCheckIn}
                  disabled={!isActive || !selectedSimStudentId}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition shadow-lg"
                >
                  <UserCheck size={14} />
                  <span>Mô phỏng quét</span>
                </button>
                
                <button
                  type="button"
                  onClick={triggerSimulatedUnknown}
                  disabled={!isActive}
                  className="py-2.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20 disabled:cursor-not-allowed text-rose-300 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Mô phỏng người lạ
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-1.5 p-2.5 bg-white/5 rounded-xl text-[10px] text-slate-400 leading-relaxed font-light">
              <HelpCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Lưu ý: Bạn phải nhấn nút <strong>"Bắt đầu điểm danh"</strong> phía trên để mở Camera và kích hoạt bảng mô phỏng thử nghiệm này.
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* CLASS STUDENTS QR CODE DIRECTORY MODAL */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsQRModalOpen(false)} />
          
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100 flex flex-col max-h-[85vh]">
            <button 
              onClick={() => setIsQRModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer z-10 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full shadow-3xs"
            >
              <X size={16} />
            </button>

            {/* Header banner */}
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-6 text-white space-y-1 relative shrink-0">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-widest uppercase font-extrabold opacity-75">Thư Viện QR Code Lớp Học</p>
                  <h3 className="text-xl font-extrabold flex items-center gap-2">
                    Danh Sách Thẻ Định Danh Bé Ngoan <Sparkles size={18} className="text-yellow-400" />
                  </h3>
                  <p className="text-xs opacity-90 mt-1 font-medium">Danh sách QR định danh đồng bộ thời gian thực cho giáo viên.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const badgesHTML = students.map(s => `
                        <div class="card">
                          <div class="header">
                            <p>Thẻ Điểm Danh Mầm Non</p>
                            <h3>${settings.schoolName || 'TRƯỜNG MẦM NON 3'}</h3>
                          </div>
                          <div class="content">
                            <img class="avatar" src="${s.avatar}" />
                            <div>
                              <p class="name">${s.fullName}</p>
                              <p class="code">Mã HS: ${s.studentCode}</p>
                              <span class="class-badge">Lớp: ${s.className || 'Chưa xếp lớp'}</span>
                            </div>
                            <div class="qr-container">
                              <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('MN3_QR_' + s.studentCode)}" />
                              <div class="qr-text">MN3_QR_${s.studentCode}</div>
                            </div>
                          </div>
                        </div>
                      `).join('');

                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>In Thẻ QR Điểm Danh Cả Lớp</title>
                            <style>
                              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                              body {
                                font-family: 'Inter', sans-serif;
                                margin: 20px;
                                background: #fff;
                              }
                              .badges-grid {
                                display: grid;
                                grid-template-columns: repeat(3, 1fr);
                                gap: 20px;
                              }
                              .card {
                                border: 1px solid #e2e8f0;
                                border-radius: 16px;
                                overflow: hidden;
                                background: white;
                                text-align: center;
                                page-break-inside: avoid;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                              }
                              .header {
                                background: linear-gradient(135deg, #7c3aed, #6366f1);
                                color: white;
                                padding: 12px;
                              }
                              .header p { margin: 0; font-size: 8px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.8; }
                              .header h3 { margin: 3px 0 0; font-size: 12px; font-weight: 900; }
                              .content { padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
                              .avatar { width: 55px; height: 55px; border-radius: 10px; object-fit: cover; border: 1.5px solid #ddd; }
                              .name { font-size: 13px; font-weight: 900; color: #0f172a; margin: 0; }
                              .code { font-size: 10px; font-weight: bold; color: #64748b; margin: 1px 0 0; }
                              .class-badge { background: #f5f3ff; color: #7c3aed; padding: 2px 8px; border-radius: 100px; font-size: 8px; font-weight: 900; text-transform: uppercase; display: inline-block; }
                              .qr-container { padding: 6px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; margin-top: 4px; }
                              .qr-code { width: 90px; height: 90px; }
                              .qr-text { font-size: 8px; font-family: monospace; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-top: 4px; }
                              @media print {
                                body { margin: 0; }
                                .badges-grid { gap: 15px; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="badges-grid">
                              ${badgesHTML}
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
                  className="px-4 py-2 bg-white text-violet-700 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer border border-transparent transition shrink-0"
                >
                  <Printer size={15} />
                  <span>In Thẻ Cả Lớp 🖨️</span>
                </button>
              </div>
            </div>

            {/* Badges Grid View */}
            <div className="p-6 overflow-y-auto flex-1">
              {students.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <QrCode size={48} className="mx-auto stroke-1 text-slate-300" />
                  <p className="text-sm font-semibold">Chưa có dữ liệu học sinh</p>
                  <p className="text-xs">Hãy thêm học sinh trước để hệ thống tạo mã QR tự động.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {students.map((s) => (
                    <div 
                      key={s.id} 
                      className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900 flex flex-col text-center justify-between"
                    >
                      <div className="p-4 flex flex-col items-center space-y-2.5">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <img src={s.avatar} alt={s.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1">{s.fullName}</h4>
                          <span className="inline-block px-2 py-0.5 mt-1 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 text-[8.5px] font-extrabold uppercase rounded-full">
                            Mã: {s.studentCode}
                          </span>
                        </div>

                        {/* Interactive Scan QR preview */}
                        <div 
                          onClick={() => {
                            setSelectedSimStudentId(s.id);
                            setIsQRModalOpen(false);
                          }}
                          className="bg-white p-2 rounded-lg border border-slate-200/60 shadow-3xs cursor-pointer hover:border-violet-400 hover:scale-105 transition"
                          title="Click để nạp nhanh vào simulator"
                        >
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('MN3_QR_' + s.studentCode)}`}
                            alt="QR Code"
                            className="w-20 h-20 object-contain"
                          />
                        </div>
                      </div>

                      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-850/40 border-t border-slate-150 dark:border-slate-800 flex gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedSimStudentId(s.id);
                            setIsQRModalOpen(false);
                          }}
                          className="flex-1 py-1.5 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-lg text-[9px] uppercase transition cursor-pointer"
                        >
                          Nạp Thử Nghiệm
                        </button>
                        <button
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>In Thẻ QR Học Sinh - ${s.fullName}</title>
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
                                        width: 280px;
                                        border: 1px solid #e2e8f0;
                                        border-radius: 20px;
                                        overflow: hidden;
                                        background: white;
                                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                                        text-align: center;
                                      }
                                      .header {
                                        background: linear-gradient(135deg, #7c3aed, #6366f1);
                                        color: white;
                                        padding: 16px;
                                      }
                                      .header p { margin: 0; font-size: 9px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; opacity: 0.8; }
                                      .header h3 { margin: 4px 0 0; font-size: 14px; font-weight: 900; }
                                      .content { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
                                      .avatar { width: 70px; height: 70px; border-radius: 12px; object-fit: cover; border: 1.5px solid #ddd; }
                                      .name { font-size: 16px; font-weight: 900; color: #0f172a; margin: 0; }
                                      .code { font-size: 11px; font-weight: bold; color: #64748b; margin: 2px 0 0; }
                                      .class-badge { background: #f5f3ff; color: #7c3aed; padding: 3px 10px; border-radius: 100px; font-size: 9px; font-weight: 900; text-transform: uppercase; display: inline-block; }
                                      .qr-container { padding: 8px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; margin-top: 6px; }
                                      .qr-code { width: 120px; height: 120px; }
                                      .qr-text { font-size: 9px; font-family: monospace; font-weight: bold; color: #94a3b8; letter-spacing: 2px; margin-top: 6px; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="card">
                                      <div class="header">
                                        <p>Thẻ Điểm Danh Mầm Non</p>
                                        <h3>${settings.schoolName || 'TRƯỜNG MẦM NON 3'}</h3>
                                      </div>
                                      <div class="content">
                                        <img class="avatar" src="${s.avatar}" />
                                        <div>
                                          <p class="name">${s.fullName}</p>
                                          <p class="code">Mã HS: ${s.studentCode}</p>
                                          <span class="class-badge">Lớp: ${s.className || 'Chưa xếp lớp'}</span>
                                        </div>
                                        <div class="qr-container">
                                          <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('MN3_QR_' + s.studentCode)}" />
                                          <div class="qr-text">MN3_QR_${s.studentCode}</div>
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
                          className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg text-[9px] font-bold transition cursor-pointer flex items-center justify-center"
                          title="In mã QR của riêng bé"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer options */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/25 border-t border-slate-150 dark:border-slate-850 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsQRModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase transition hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
              >
                Đóng Thư Viện
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA PERMISSION GUIDE MODAL */}
      {isPermissionModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsPermissionModalOpen(false)} />
          
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-[130] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setIsPermissionModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer z-10 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full shadow-xs"
            >
              <X size={16} />
            </button>

            {/* Header banner */}
            <div className="bg-gradient-to-tr from-rose-600 to-amber-600 p-6 text-white space-y-1 relative shrink-0">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Camera size={24} className="text-white animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase font-extrabold opacity-75">Quyền Truy Cập Thiết Bị</p>
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    Hướng Dẫn Cấp Quyền Camera 🔒
                  </h3>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-2xl flex gap-3 text-xs">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-1">
                  <span className="font-extrabold block">TẠI SAO CẦN CẤP QUYỀN?</span>
                  <p className="leading-relaxed font-medium">
                    Trình duyệt web cần được cho phép truy cập camera để thực hiện việc nhận diện sinh trắc học gương mặt học sinh và quét mã QR định danh khi điểm danh.
                  </p>
                </div>
              </div>

              {/* Step 1: On Desktop */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  💻 CÁCH LÀM TRÊN MÁY TÍNH (Chrome, Edge, Cốc Cốc, Safari)
                </h4>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3.5 text-xs">
                  <div className="flex gap-3">
                    <span className="w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center font-extrabold shrink-0">1</span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Tìm biểu tượng bảo mật trên thanh địa chỉ</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Nhìn lên góc trái thanh nhập địa chỉ trang web (kế bên URL của trang), nhấp vào biểu tượng <strong className="text-slate-700 dark:text-slate-300">Ổ khóa 🔒</strong> hoặc <strong className="text-slate-700 dark:text-slate-300">Cài đặt trang web ⚙️</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 border-t border-slate-200/60 dark:border-slate-800/40 pt-3.5">
                    <span className="w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center font-extrabold shrink-0">2</span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Bật cho phép quyền Camera</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Tìm mục <strong className="text-slate-700 dark:text-slate-300">Máy ảnh (Camera)</strong> và đổi trạng thái từ <span className="text-rose-500 font-bold">Chặn / Hỏi</span> thành <span className="text-emerald-500 font-bold uppercase">Cho phép (Allow) 🟢</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 border-t border-slate-200/60 dark:border-slate-800/40 pt-3.5">
                    <span className="w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center font-extrabold shrink-0">3</span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Tải lại trang và bắt đầu</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Nhấn phím <strong className="text-slate-700 dark:text-slate-300">F5</strong> hoặc biểu tượng vòng xoay 🔄 của trình duyệt để tải lại trang, sau đó bấm lại nút <strong className="text-rose-500 font-bold">Bắt đầu điểm danh</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: On Mobile */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  📱 CÁCH LÀM TRÊN ĐIỆN THOẠI (iPhone, Android)
                </h4>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3.5 text-xs">
                  <div className="flex gap-3">
                    <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center font-extrabold shrink-0">1</span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Kiểm tra thông báo chặn trên màn hình</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Khi nhấn "Bật Camera", nếu có hộp thoại hiện lên hỏi quyền truy cập, hãy bấm chọn <strong className="text-emerald-500 font-bold">Cho phép (Allow)</strong> hoặc <strong className="text-emerald-500 font-bold">Trong khi dùng ứng dụng</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 border-t border-slate-200/60 dark:border-slate-800/40 pt-3.5">
                    <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center font-extrabold shrink-0">2</span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Bật lại trong cài đặt hệ thống (nếu đã lỡ chặn)</p>
                      <ul className="list-disc pl-4 mt-1 text-slate-500 dark:text-slate-400 space-y-1">
                        <li><strong>iOS (Safari):</strong> Vào Cài đặt hệ thống ⚙️ -&gt; Safari -&gt; Quyền truy cập Camera -&gt; đổi thành Cho phép.</li>
                        <li><strong>Android (Chrome):</strong> Nhấp biểu tượng 3 chấm ở góc trên -&gt; Cài đặt -&gt; Cài đặt trang web -&gt; Máy ảnh -&gt; bật Cho phép.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer options */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/25 border-t border-slate-150 dark:border-slate-850 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsPermissionModalOpen(false);
                  stopScanningSession();
                  setTimeout(startScanningSession, 150);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Play size={14} />
                <span>Thử Kích Hoạt Lại Camera 📷</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPermissionModalOpen(false)}
                className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase transition hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
              >
                Đã hiểu 👌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME PARENT NOTIFICATION TOAST POPUP */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, x: 150, y: 0, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 150, scale: 0.9, transition: { duration: 0.25 } }}
            className="fixed bottom-6 right-6 z-[150] w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100"
          >
            {/* Header Toast */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-3.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Send size={14} className="text-white animate-bounce" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold tracking-widest uppercase opacity-80 block leading-none">Hệ Thống SMS</span>
                  <h4 className="text-xs font-black tracking-wide leading-none">ĐÃ GỬI BÁO CÁO PHỤ HUYNH</h4>
                </div>
              </div>
              <button 
                onClick={() => setActiveToast(null)}
                className="text-white/80 hover:text-white bg-white/10 p-1 rounded-full transition cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* Content Toast */}
            <div className="p-4 space-y-3">
              <div className="flex gap-3 items-start">
                {/* Captured Photo */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm bg-slate-100">
                    <img src={activeToast.photo} className="w-full h-full object-cover" alt="Captured Frame" />
                  </div>
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 rounded-full bg-emerald-500 text-white text-[6px] font-extrabold whitespace-nowrap uppercase shadow-xs">CAM_01</span>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-black text-slate-850 dark:text-white leading-tight">
                    Bé {activeToast.studentName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    SĐT Phụ huynh: <span className="text-slate-600 dark:text-slate-300">{activeToast.parentPhone}</span>
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[8px] font-extrabold uppercase">
                      ● ĐÃ GỬI THÀNH CÔNG
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono font-bold">
                      {activeToast.time}
                    </span>
                  </div>
                </div>
              </div>

              {/* SMS preview box */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 rounded-xl space-y-1">
                <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Nội Dung Tin Nhắn Gửi Đi (Mô Phỏng):</span>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-normal font-medium">
                  "Bé {activeToast.studentName} đã điểm danh vào lớp lúc {activeToast.time} ngày {new Date().toLocaleDateString('vi-VN')}. Trạng thái: {activeToast.status === 'present' ? 'Đúng giờ' : 'Đến muộn'}. [Đính kèm ảnh camera thực tế]"
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
