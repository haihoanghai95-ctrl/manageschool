/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Classroom, Student, AttendanceRecord, SchoolSettings, ParentAccount, WeeklyMenu, AbsenceReport, TeacherAccount } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleanObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleanObj[key] = cleanUndefined(val);
        }
      }
    }
    return cleanObj;
  }
  return obj;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const isPermissionError = errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("insufficient");
  const isOfflineError = errMsg.toLowerCase().includes("offline") || 
                         errMsg.toLowerCase().includes("could not reach cloud firestore backend") ||
                         errMsg.toLowerCase().includes("network") ||
                         errMsg.toLowerCase().includes("unavailable");

  if (isPermissionError) {
    console.warn('Firestore Permission Blocked (Please configure your Firebase Security Rules):', JSON.stringify(errInfo));
  } else if (isOfflineError) {
    console.warn('Firestore Operating Offline (Local state active):', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

// Check if a collection is empty
async function isCollectionEmpty(collectionName: string): Promise<boolean> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.empty;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
    return true;
  }
}

// Fetch all settings
export async function fetchSettingsFromFirebase(): Promise<SchoolSettings | null> {
  try {
    const docSnap = await getDoc(doc(db, "settings", "school"));
    return docSnap.exists() ? (docSnap.data() as SchoolSettings) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "settings/school");
    return null;
  }
}

export async function saveSettingsToFirebase(settings: SchoolSettings) {
  try {
    await setDoc(doc(db, "settings", "school"), cleanUndefined(settings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "settings/school");
  }
}

// Fetch all classrooms
export async function fetchClassroomsFromFirebase(): Promise<Classroom[]> {
  try {
    const snapshot = await getDocs(collection(db, "classrooms"));
    return snapshot.docs.map(d => d.data() as Classroom);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "classrooms");
    return [];
  }
}

export async function saveClassroomsToFirebase(classrooms: Classroom[]) {
  try {
    // Write all classrooms
    for (const cls of classrooms) {
      await setDoc(doc(db, "classrooms", cls.id), cleanUndefined(cls));
    }
    // Clean up deleted ones
    const snapshot = await getDocs(collection(db, "classrooms"));
    for (const docSnap of snapshot.docs) {
      if (!classrooms.some(c => c.id === docSnap.id)) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "classrooms");
  }
}

// Fetch all students
export async function fetchStudentsFromFirebase(): Promise<Student[]> {
  try {
    const snapshot = await getDocs(collection(db, "students"));
    return snapshot.docs.map(d => d.data() as Student);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "students");
    return [];
  }
}

export async function saveStudentsToFirebase(students: Student[]) {
  try {
    // Write all students
    for (const s of students) {
      await setDoc(doc(db, "students", s.id), cleanUndefined(s));
    }
    // Clean up deleted ones
    const snapshot = await getDocs(collection(db, "students"));
    for (const docSnap of snapshot.docs) {
      if (!students.some(s => s.id === docSnap.id)) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "students");
  }
}

// Fetch all teachers
export async function fetchTeachersFromFirebase(): Promise<TeacherAccount[]> {
  try {
    const snapshot = await getDocs(collection(db, "teachers"));
    return snapshot.docs.map(d => d.data() as TeacherAccount);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "teachers");
    return [];
  }
}

export async function saveTeachersToFirebase(teachers: TeacherAccount[]) {
  try {
    // Write all teachers
    for (const t of teachers) {
      await setDoc(doc(db, "teachers", t.phone), cleanUndefined(t));
    }
    // Clean up deleted ones
    const snapshot = await getDocs(collection(db, "teachers"));
    for (const docSnap of snapshot.docs) {
      if (!teachers.some(t => t.phone === docSnap.id)) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "teachers");
  }
}

// Fetch parents
export async function fetchParentsFromFirebase(): Promise<ParentAccount[]> {
  try {
    const snapshot = await getDocs(collection(db, "parents"));
    return snapshot.docs.map(d => d.data() as ParentAccount);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "parents");
    return [];
  }
}

export async function saveParentsToFirebase(parents: ParentAccount[]) {
  try {
    // Write all parents
    for (const p of parents) {
      await setDoc(doc(db, "parents", p.phone), cleanUndefined(p));
    }
    // Clean up deleted ones
    const snapshot = await getDocs(collection(db, "parents"));
    for (const docSnap of snapshot.docs) {
      if (!parents.some(p => p.phone === docSnap.id)) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "parents");
  }
}

// Fetch weekly menu
export async function fetchWeeklyMenuFromFirebase(): Promise<WeeklyMenu | null> {
  try {
    const docSnap = await getDoc(doc(db, "weekly_menu", "week_current"));
    return docSnap.exists() ? (docSnap.data() as WeeklyMenu) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "weekly_menu/week_current");
    return null;
  }
}

export async function saveWeeklyMenuToFirebase(weeklyMenu: WeeklyMenu) {
  try {
    await setDoc(doc(db, "weekly_menu", "week_current"), cleanUndefined(weeklyMenu));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "weekly_menu/week_current");
  }
}

// Fetch absence reports
export async function fetchAbsenceReportsFromFirebase(): Promise<AbsenceReport[]> {
  try {
    const snapshot = await getDocs(collection(db, "absence_reports"));
    return snapshot.docs.map(d => d.data() as AbsenceReport);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "absence_reports");
    return [];
  }
}

export async function saveAbsenceReportsToFirebase(reports: AbsenceReport[]) {
  try {
    // Write all absence reports
    for (const r of reports) {
      await setDoc(doc(db, "absence_reports", r.id), cleanUndefined(r));
    }
    // Clean up deleted ones
    const snapshot = await getDocs(collection(db, "absence_reports"));
    for (const docSnap of snapshot.docs) {
      if (!reports.some(r => r.id === docSnap.id)) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "absence_reports");
  }
}

// Fetch attendance
export async function fetchAttendanceFromFirebase(): Promise<AttendanceRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, "attendance"));
    return snapshot.docs.map(d => d.data() as AttendanceRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "attendance");
    return [];
  }
}

export async function saveAttendanceToFirebase(attendance: AttendanceRecord[]) {
  try {
    // Write all attendance
    for (const a of attendance) {
      await setDoc(doc(db, "attendance", a.id), cleanUndefined(a));
    }
    // Clean up deleted ones
    const snapshot = await getDocs(collection(db, "attendance"));
    for (const docSnap of snapshot.docs) {
      if (!attendance.some(a => a.id === docSnap.id)) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "attendance");
  }
}

// Test Connection Helper from skill
export async function testConnection() {
  try {
    const testDocRef = doc(db, 'test', 'connection');
    await setDoc(testDocRef, { timestamp: Date.now() }, { merge: true });
    console.log("Firebase connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else {
      console.error("Firebase connection test failed:", error);
    }
  }
}

// Full initialization and sync on mount (high-performance parallel sync with per-collection merging)
export async function syncOnMount(): Promise<{
  settings: SchoolSettings;
  classrooms: Classroom[];
  students: Student[];
  teachers: TeacherAccount[];
  parents: ParentAccount[];
  weeklyMenu: WeeklyMenu;
  absenceReports: AbsenceReport[];
  attendance: AttendanceRecord[];
  isOffline?: boolean;
} | null> {
  try {
    let hasError = false;
    let firstError: any = null;

    console.log("Starting high-performance parallel sync with Firestore...");

    // Fetch all collections in parallel to minimize latency (usually < 200ms)
    // Individual catches prevent any single blocked/errored collection from crashing the whole app
    const [
      fbSettings,
      fbClassrooms,
      fbStudents,
      fbTeachers,
      fbParents,
      fbWeeklyMenu,
      fbAbsenceReports,
      fbAttendance
    ] = await Promise.all([
      fetchSettingsFromFirebase().catch(e => { hasError = true; firstError = firstError || e; return null; }),
      fetchClassroomsFromFirebase().catch(e => { hasError = true; firstError = firstError || e; return []; }),
      fetchStudentsFromFirebase().catch(e => { hasError = true; firstError = firstError || e; return []; }),
      fetchTeachersFromFirebase().catch(e => { hasError = true; firstError = firstError || e; return []; }),
      fetchParentsFromFirebase().catch(e => { hasError = true; firstError = firstError || e; return []; }),
      fetchWeeklyMenuFromFirebase().catch(e => { hasError = true; firstError = firstError || e; return null; }),
      fetchAbsenceReportsFromFirebase().catch(e => { hasError = true; firstError = firstError || e; return []; }),
      fetchAttendanceFromFirebase().catch(e => { hasError = true; firstError = firstError || e; return []; })
    ]);

    // Read current local storage values to perform intelligent merge/sync
    const localSettings = JSON.parse(localStorage.getItem('sma_settings') || '{}');
    const localClassrooms = JSON.parse(localStorage.getItem('sma_classrooms') || '[]');
    const localStudents = JSON.parse(localStorage.getItem('sma_students') || '[]');
    const localTeachers = JSON.parse(localStorage.getItem('sma_teachers') || '[]');
    const localParents = JSON.parse(localStorage.getItem('sma_parents') || '[]');
    const localWeeklyMenu = JSON.parse(localStorage.getItem('sma_weekly_menu') || 'null');
    const localAbsenceReports = JSON.parse(localStorage.getItem('sma_absence_reports') || '[]');
    const localAttendance = JSON.parse(localStorage.getItem('sma_attendance') || '[]');

    // 1. Settings Sync
    let finalSettings = localSettings;
    if (fbSettings && fbSettings.schoolName) {
      finalSettings = fbSettings;
      if (finalSettings.themeColor !== 'rose' || finalSettings.darkMode !== false) {
        finalSettings.themeColor = 'rose';
        finalSettings.darkMode = false;
        await saveSettingsToFirebase(finalSettings).catch(e => { hasError = true; firstError = firstError || e; });
      }
      localStorage.setItem('sma_settings', JSON.stringify(finalSettings));
    } else if (localSettings && localSettings.schoolName) {
      if (localSettings.themeColor !== 'rose' || localSettings.darkMode !== false) {
        localSettings.themeColor = 'rose';
        localSettings.darkMode = false;
      }
      await saveSettingsToFirebase(localSettings).catch(e => { hasError = true; firstError = firstError || e; });
      localStorage.setItem('sma_settings', JSON.stringify(localSettings));
    } else {
      // Fallback fallback
      finalSettings = {
        startTime: '07:30',
        lateTime: '07:45',
        schoolName: 'TRƯỜNG MẦM NON 3 - PHƯỜNG BÀN CỜ TP.HỒ CHÍ MINH',
        themeColor: 'rose',
        darkMode: false,
      };
      localStorage.setItem('sma_settings', JSON.stringify(finalSettings));
      await saveSettingsToFirebase(finalSettings).catch(e => { hasError = true; firstError = firstError || e; });
    }

    // 2. Classrooms Sync
    let finalClassrooms = localClassrooms;
    if (fbClassrooms && fbClassrooms.length > 0) {
      finalClassrooms = fbClassrooms;
      localStorage.setItem('sma_classrooms', JSON.stringify(fbClassrooms));
    } else if (localClassrooms && localClassrooms.length > 0) {
      await saveClassroomsToFirebase(localClassrooms).catch(e => { hasError = true; firstError = firstError || e; });
    }

    // 3. Students Sync
    let finalStudents = localStudents;
    if (fbStudents && fbStudents.length > 0) {
      finalStudents = fbStudents;
      localStorage.setItem('sma_students', JSON.stringify(fbStudents));
    } else if (localStudents && localStudents.length > 0) {
      await saveStudentsToFirebase(localStudents).catch(e => { hasError = true; firstError = firstError || e; });
    }

    // 4. Teachers Sync
    let finalTeachers = localTeachers;
    if (fbTeachers && fbTeachers.length > 0) {
      finalTeachers = fbTeachers;
      localStorage.setItem('sma_teachers', JSON.stringify(fbTeachers));
    } else if (localTeachers && localTeachers.length > 0) {
      await saveTeachersToFirebase(localTeachers).catch(e => { hasError = true; firstError = firstError || e; });
    }

    // 5. Parents Sync
    let finalParents = localParents;
    if (fbParents && fbParents.length > 0) {
      finalParents = fbParents;
      localStorage.setItem('sma_parents', JSON.stringify(fbParents));
    } else if (localParents && localParents.length > 0) {
      await saveParentsToFirebase(localParents).catch(e => { hasError = true; firstError = firstError || e; });
    }

    // 6. Weekly Menu Sync
    let finalWeeklyMenu = localWeeklyMenu;
    if (fbWeeklyMenu && fbWeeklyMenu.id) {
      finalWeeklyMenu = fbWeeklyMenu;
      localStorage.setItem('sma_weekly_menu', JSON.stringify(fbWeeklyMenu));
    } else if (localWeeklyMenu && localWeeklyMenu.id) {
      await saveWeeklyMenuToFirebase(localWeeklyMenu).catch(e => { hasError = true; firstError = firstError || e; });
    }

    // 7. Absence Reports Sync
    let finalAbsenceReports = localAbsenceReports;
    if (fbAbsenceReports && fbAbsenceReports.length > 0) {
      finalAbsenceReports = fbAbsenceReports;
      localStorage.setItem('sma_absence_reports', JSON.stringify(fbAbsenceReports));
    } else if (localAbsenceReports && localAbsenceReports.length > 0) {
      await saveAbsenceReportsToFirebase(localAbsenceReports).catch(e => { hasError = true; firstError = firstError || e; });
    }

    // 8. Attendance Sync
    let finalAttendance = localAttendance;
    if (fbAttendance && fbAttendance.length > 0) {
      finalAttendance = fbAttendance;
      localStorage.setItem('sma_attendance', JSON.stringify(fbAttendance));
    } else if (localAttendance && localAttendance.length > 0) {
      await saveAttendanceToFirebase(localAttendance).catch(e => { hasError = true; firstError = firstError || e; });
    }

    // If Firestore permission error or network error happened, we handle it gracefully.
    let isOffline = false;
    if (hasError && firstError) {
      const errMsg = firstError instanceof Error ? firstError.message : String(firstError);
      const isOfflineError = errMsg.toLowerCase().includes("offline") || 
                             errMsg.toLowerCase().includes("could not reach cloud firestore backend") ||
                             errMsg.toLowerCase().includes("network") ||
                             errMsg.toLowerCase().includes("unavailable") ||
                             errMsg.toLowerCase().includes("failed to get document because the client is offline");
      if (isOfflineError) {
        console.warn("Firestore sync operating in offline mode: using local storage cache.");
        isOffline = true;
      } else {
        throw firstError;
      }
    }

    console.log("High-performance parallel sync completed successfully.");

    return {
      settings: finalSettings,
      classrooms: finalClassrooms,
      students: finalStudents,
      teachers: finalTeachers,
      parents: finalParents,
      weeklyMenu: finalWeeklyMenu,
      absenceReports: finalAbsenceReports,
      attendance: finalAttendance,
      isOffline
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const isPermissionError = errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("insufficient");
    const isOfflineError = errMsg.toLowerCase().includes("offline") || 
                           errMsg.toLowerCase().includes("could not reach cloud firestore backend") ||
                           errMsg.toLowerCase().includes("network") ||
                           errMsg.toLowerCase().includes("unavailable") ||
                           errMsg.toLowerCase().includes("failed to get document because the client is offline");
    if (isPermissionError) {
      console.warn("Firestore permissions block or warning encountered during sync.");
      throw error;
    } else if (isOfflineError) {
      console.warn("Firestore offline error handled gracefully during syncOnMount.");
      // Return local cache as fallback instead of throwing
      const localSettings = JSON.parse(localStorage.getItem('sma_settings') || '{}');
      const localClassrooms = JSON.parse(localStorage.getItem('sma_classrooms') || '[]');
      const localStudents = JSON.parse(localStorage.getItem('sma_students') || '[]');
      const localTeachers = JSON.parse(localStorage.getItem('sma_teachers') || '[]');
      const localParents = JSON.parse(localStorage.getItem('sma_parents') || '[]');
      const localWeeklyMenu = JSON.parse(localStorage.getItem('sma_weekly_menu') || 'null');
      const localAbsenceReports = JSON.parse(localStorage.getItem('sma_absence_reports') || '[]');
      const localAttendance = JSON.parse(localStorage.getItem('sma_attendance') || '[]');
      return {
        settings: {
          startTime: '07:30',
          lateTime: '07:45',
          schoolName: 'TRƯỜNG MẦM NON 3 - PHƯỜNG BÀN CỜ TP.HỒ CHÍ MINH',
          themeColor: 'rose',
          darkMode: false,
          ...localSettings
        },
        classrooms: localClassrooms,
        students: localStudents,
        teachers: localTeachers,
        parents: localParents,
        weeklyMenu: localWeeklyMenu,
        absenceReports: localAbsenceReports,
        attendance: localAttendance,
        isOffline: true
      };
    }
    throw error;
  }
}

