
import { db } from '../firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, 
  addDoc, deleteDoc, query, orderBy, limit,
  updateDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User, AttendanceRecord, VacationRecord, BranchConfig, PositionMapping, CashDeskRecord, UserRole, View, NewsItem } from '../types';
import { MOCK_USER, MOCK_EMPLOYEES, MOCK_VACATIONS, MOCK_ATTENDANCE_REPORTS, DEFAULT_BRANCH_CONFIGS, OFFICIAL_POSITIONS, DEPARTMENTS, MOCK_NEWS } from '../constants';

const KEYS = {
  USER: 'zenith_current_user',
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  VACATIONS: 'vacations',
  BRANCHES: 'branches',
  POSITIONS: 'positions',
  DEPARTMENTS: 'departments',
  SETTINGS: 'settings',
  BRANCH_BALANCES: 'branch_balances',
  CASH_HISTORY: 'cash_history',
  NEWS: 'news'
};

export interface CustomFont {
  name: string;
  data: string; // Base64 data URL
  format: string;
}

export interface SystemSettings {
  headerFont?: CustomFont;
  bodyFont?: CustomFont;
  logoUrl?: string;
  smsApiKey?: string;
  firebaseConfig?: any;
  adminPhone?: string;
  accountantPhone?: string;
  birthdaySmsTime?: string;
  userSmsTemplate?: string;
  adminSmsTemplate?: string;
  accountantSmsTemplate?: string;
  attendanceEnabledDepartments?: string[];
  cashDeskEnabledDepartments?: string[];
  rolePermissions: Record<UserRole, View[]>;
}

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, View[]> = {
  Admin: Object.values(View),
  Manager: [View.DASHBOARD, View.ATTENDANCE, View.PROFILE, View.VACATIONS, View.CASHIER, View.ATTENDANCE_REPORT, View.ACCOUNTANT, View.USERS],
  Editor: [View.DASHBOARD, View.ATTENDANCE, View.PROFILE, View.VACATIONS, View.CASHIER, View.COMPANY_STRUCTURE, View.USERS],
  Accountant: [View.DASHBOARD, View.PROFILE, View.CASHIER, View.ACCOUNTANT],
  Employee: [View.DASHBOARD, View.ATTENDANCE, View.PROFILE, View.VACATIONS, View.CASHIER],
  HR: [View.DASHBOARD, View.PROFILE, View.VACATIONS, View.USERS]
};

export const Database = {
  /**
   * AUTOMATIC MIGRATION: 
   * Checks if critical collections are empty and seeds them with mock data if necessary.
   */
  init: async () => {
    const settingsSnap = await getDoc(doc(db, KEYS.SETTINGS, "global_settings"));
    
    if (!settingsSnap.exists()) {
      console.log("Starting automatic database migration to Firebase...");
      
      // 1. Seed Global Settings
      await setDoc(doc(db, KEYS.SETTINGS, "global_settings"), {
        smsApiKey: '9fb1518f8d95460f95147575276e6955',
        attendanceEnabledDepartments: ['რითეილი'],
        cashDeskEnabledDepartments: ['რითეილი'],
        rolePermissions: DEFAULT_ROLE_PERMISSIONS,
        logoUrl: ''
      });
      
      // 2. Seed Employees
      for (const emp of MOCK_EMPLOYEES) {
        await setDoc(doc(db, KEYS.EMPLOYEES, emp.id), emp);
      }
      
      // 3. Seed Branches
      for (const branch of DEFAULT_BRANCH_CONFIGS) {
        await setDoc(doc(db, KEYS.BRANCHES, branch.name), branch);
      }

      // 4. Seed Metadata (Positions & Departments)
      await setDoc(doc(db, "metadata", KEYS.POSITIONS), { list: OFFICIAL_POSITIONS });
      await setDoc(doc(db, "metadata", KEYS.DEPARTMENTS), { list: DEPARTMENTS });

      // 5. Seed News
      for (const item of MOCK_NEWS) {
        await setDoc(doc(db, KEYS.NEWS, item.id), item);
      }

      console.log("Migration complete.");
    }
  },

  // Auth/Session (Local Cache for immediate UI)
  getCurrentUser: (): User => {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : MOCK_USER;
  },

  setCurrentUser: async (user: User) => {
    const userRef = doc(db, KEYS.EMPLOYEES, user.id);
    await setDoc(userRef, user, { merge: true });
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  // Employees
  getEmployees: async (): Promise<User[]> => {
    const querySnapshot = await getDocs(collection(db, KEYS.EMPLOYEES));
    return querySnapshot.docs.map(doc => doc.data() as User);
  },

  setEmployees: async (employees: User[]) => {
    // Optimization: using sequential sets for simplicity in migration
    for (const emp of employees) {
      await setDoc(doc(db, KEYS.EMPLOYEES, emp.id), emp);
    }
  },

  // Attendance
  getAttendanceLogs: async (): Promise<AttendanceRecord[]> => {
    const q = query(collection(db, KEYS.ATTENDANCE), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
  },

  saveAttendanceLog: async (log: AttendanceRecord) => {
    await addDoc(collection(db, KEYS.ATTENDANCE), log);
  },

  updateAttendanceLog: async (log: AttendanceRecord) => {
    if (!log.id) return;
    const logRef = doc(db, KEYS.ATTENDANCE, log.id);
    await setDoc(logRef, log, { merge: true });
  },

  // Vacations
  getVacations: async (): Promise<VacationRecord[]> => {
    const querySnapshot = await getDocs(collection(db, KEYS.VACATIONS));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VacationRecord));
  },

  setVacations: async (vacations: VacationRecord[]) => {
    for (const v of vacations) {
      await setDoc(doc(db, KEYS.VACATIONS, v.id), v);
    }
  },

  // Branches & Balances
  getBranches: async (): Promise<BranchConfig[]> => {
    const querySnapshot = await getDocs(collection(db, KEYS.BRANCHES));
    return querySnapshot.docs.map(doc => doc.data() as BranchConfig);
  },

  setBranches: async (branches: BranchConfig[]) => {
    for (const b of branches) {
      await setDoc(doc(db, KEYS.BRANCHES, b.name), b);
    }
  },

  getBranchBalance: async (branchName: string): Promise<number> => {
    const snap = await getDoc(doc(db, KEYS.BRANCH_BALANCES, branchName));
    return snap.exists() ? snap.data().balance : 0;
  },

  updateBranchBalance: async (branchName: string, newBalance: number) => {
    await setDoc(doc(db, KEYS.BRANCH_BALANCES, branchName), { balance: newBalance });
  },

  // Metadata
  getPositions: async (): Promise<PositionMapping[]> => {
    const snap = await getDoc(doc(db, "metadata", KEYS.POSITIONS));
    return snap.exists() ? snap.data().list : OFFICIAL_POSITIONS;
  },

  setPositions: async (positions: PositionMapping[]) => {
    await setDoc(doc(db, "metadata", KEYS.POSITIONS), { list: positions });
  },

  getDepartments: async (): Promise<string[]> => {
    const snap = await getDoc(doc(db, "metadata", KEYS.DEPARTMENTS));
    return snap.exists() ? snap.data().list : DEPARTMENTS;
  },

  setDepartments: async (departments: string[]) => {
    await setDoc(doc(db, "metadata", KEYS.DEPARTMENTS), { list: departments });
  },

  // Cash History
  getCashHistory: async (): Promise<CashDeskRecord[]> => {
    const querySnapshot = await getDocs(collection(db, KEYS.CASH_HISTORY));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDeskRecord));
  },

  saveCashRecord: async (record: CashDeskRecord) => {
    await setDoc(doc(db, KEYS.CASH_HISTORY, record.id), record);
  },

  deleteCashRecord: async (id: string) => {
    await deleteDoc(doc(db, KEYS.CASH_HISTORY, id));
  },

  // News
  getNews: async (): Promise<NewsItem[]> => {
    const q = query(collection(db, KEYS.NEWS), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as NewsItem);
  },

  // Settings
  getSettings: async (): Promise<SystemSettings> => {
    const snap = await getDoc(doc(db, KEYS.SETTINGS, "global_settings"));
    if (snap.exists()) return snap.data() as SystemSettings;
    return { attendanceEnabledDepartments: ['რითეილი'], cashDeskEnabledDepartments: ['რითეილი'], rolePermissions: DEFAULT_ROLE_PERMISSIONS };
  },

  setSettings: async (settings: SystemSettings) => {
    await setDoc(doc(db, KEYS.SETTINGS, "global_settings"), settings);
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
  }
};
