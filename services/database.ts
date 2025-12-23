
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  query, 
  limit, 
  where, 
  writeBatch,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { User, AttendanceRecord, VacationRecord, BranchConfig, PositionMapping, CashDeskRecord, UserRole, View } from '../types';
import { MOCK_EMPLOYEES, DEFAULT_BRANCH_CONFIGS, OFFICIAL_POSITIONS, DEPARTMENTS } from '../constants';

const COLLECTIONS = {
  USERS: 'users',
  ATTENDANCE: 'attendance',
  VACATIONS: 'vacations',
  BRANCHES: 'branches',
  POSITIONS: 'positions',
  DEPARTMENTS: 'departments',
  SETTINGS: 'settings',
  CASH_HISTORY: 'cashHistory',
  BRANCH_BALANCES: 'branchBalances'
};

export interface CustomFont {
  name: string;
  data: string; // Base64 data URL
  format: string;
}

export interface SystemSettings {
  appTitle?: string;
  faviconUrl?: string;
  headerFont?: CustomFont;
  bodyFont?: CustomFont;
  logoUrl?: string;
  smsApiKey?: string;
  smsSenderName?: string;
  adminPhone?: string;
  accountantPhone?: string;
  hrPhone?: string;
  birthdaySmsTime?: string;
  userSmsTemplate?: string;
  adminSmsTemplate?: string;
  accountantSmsTemplate?: string;
  attendanceEnabledDepartments?: string[];
  cashDeskEnabledDepartments?: string[];
  replacementEnabledDepartments?: string[];
  branchSelectorEnabledDepartments?: string[];
  rolePermissions: Record<UserRole, View[]>;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, View[]> = {
  Admin: [
    View.DASHBOARD, View.PROFILE, View.ADMIN, View.VACATIONS, View.VACATION_FORM, View.VACATION_REQUESTS, View.CASHIER, 
    View.COMPANY_STRUCTURE, View.ATTENDANCE_REPORT, View.ACCOUNTANT, View.USERS
  ],
  Manager: [
    View.DASHBOARD, View.PROFILE, View.VACATIONS, View.VACATION_FORM, View.VACATION_REQUESTS, 
    View.CASHIER, View.ATTENDANCE_REPORT, View.ACCOUNTANT, View.USERS
  ],
  Editor: [View.DASHBOARD, View.PROFILE, View.VACATIONS, View.VACATION_FORM, View.CASHIER, View.COMPANY_STRUCTURE, View.USERS],
  Accountant: [View.DASHBOARD, View.PROFILE, View.CASHIER, View.ACCOUNTANT],
  Employee: [View.DASHBOARD, View.PROFILE, View.VACATIONS, View.VACATION_FORM, View.CASHIER],
  HR: [View.DASHBOARD, View.PROFILE, View.VACATIONS, View.VACATION_FORM, View.VACATION_REQUESTS, View.USERS]
};

const DEFAULT_SETTINGS: SystemSettings = {
  appTitle: 'Zenith Portal',
  smsApiKey: 'af211e7c34a14673b6ff4e27116a7fc1',
  smsSenderName: 'smsoffice',
  attendanceEnabledDepartments: ['რითეილი'],
  cashDeskEnabledDepartments: ['რითეილი'],
  replacementEnabledDepartments: ['რითეილი'],
  branchSelectorEnabledDepartments: ['რითეილი'],
  rolePermissions: DEFAULT_ROLE_PERMISSIONS,
  logoUrl: '',
  faviconUrl: '',
  userSmsTemplate: 'გილოცავთ დაბადების დღეს {name}! გისურვებთ წარმატებებს.',
  adminSmsTemplate: 'დღეს არის {name}-ს დაბადების დღე. ტელ: {phone}',
  adminPhone: '',
  accountantPhone: '',
  hrPhone: '',
  birthdaySmsTime: '09:00',
};

export const Database = {
  init: async () => {
    const settingsSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'system'));
    if (!settingsSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(doc(db, COLLECTIONS.SETTINGS, 'system'), DEFAULT_SETTINGS);
      
      MOCK_EMPLOYEES.forEach(emp => {
        const key = emp.uid || emp.id;
        batch.set(doc(db, COLLECTIONS.USERS, key), emp);
      });
      
      DEFAULT_BRANCH_CONFIGS.forEach(branch => {
        batch.set(doc(db, COLLECTIONS.BRANCHES, branch.name), branch);
        batch.set(doc(db, COLLECTIONS.BRANCH_BALANCES, branch.name), { amount: 0 });
      });
      
      OFFICIAL_POSITIONS.forEach(pos => {
        batch.set(doc(db, COLLECTIONS.POSITIONS, pos.title), pos);
      });
      
      batch.set(doc(db, COLLECTIONS.DEPARTMENTS, 'list'), { items: DEPARTMENTS });

      const sampleTx: CashDeskRecord = {
        id: 'INIT-TX-001',
        branch: DEFAULT_BRANCH_CONFIGS[0].name,
        cashierId: 'SYSTEM',
        cashierName: 'System Admin',
        date: new Date().toISOString().split('T')[0],
        openingBalance: 0,
        cash: 0,
        terminal: 0,
        incasation: 0,
        closingBalance: 0
      };
      batch.set(doc(db, COLLECTIONS.CASH_HISTORY, sampleTx.id), sampleTx);
      
      await batch.commit();
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const sessionData = localStorage.getItem('zenith_current_user');
    if (!sessionData) return null;
    const sessionUser = JSON.parse(sessionData);
    if (sessionUser.uid) {
       const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, sessionUser.uid));
       if (userDoc.exists()) return userDoc.data() as User;
    }
    const userDocById = await getDoc(doc(db, COLLECTIONS.USERS, sessionUser.id));
    return userDocById.exists() ? (userDocById.data() as User) : sessionUser;
  },

  getUserByUid: async (uid: string): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    if (userDoc.exists()) return userDoc.data() as User;
    return null;
  },

  getUserByPersonalId: async (personalId: string): Promise<User | null> => {
    const q = query(collection(db, COLLECTIONS.USERS), where("personalId", "==", personalId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].data() as User;
    return MOCK_EMPLOYEES.find(e => e.personalId === personalId) || null;
  },

  syncUserWithAuth: async (firebaseUid: string, email: string): Promise<User | null> => {
    const existing = await Database.getUserByUid(firebaseUid);
    if (existing) return existing;

    const q = query(collection(db, COLLECTIONS.USERS), where("email", "==", email), limit(1));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const docData = snap.docs[0].data() as User;
      const oldId = snap.docs[0].id;
      const updatedUser = { ...docData, uid: firebaseUid };
      const batch = writeBatch(db);
      batch.set(doc(db, COLLECTIONS.USERS, firebaseUid), updatedUser);
      if (oldId !== firebaseUid) batch.delete(doc(db, COLLECTIONS.USERS, oldId));
      await batch.commit();
      return updatedUser;
    }

    const mockUser = MOCK_EMPLOYEES.find(e => e.email?.toLowerCase() === email.toLowerCase());
    if (mockUser) {
      const migratedUser = { ...mockUser, uid: firebaseUid };
      await setDoc(doc(db, COLLECTIONS.USERS, firebaseUid), migratedUser);
      return migratedUser;
    }
    return null;
  },

  setCurrentUser: async (user: User) => {
    localStorage.setItem('zenith_current_user', JSON.stringify(user));
    const key = user.uid || user.id;
    await setDoc(doc(db, COLLECTIONS.USERS, key), user);
  },

  getEmployees: async (): Promise<User[]> => {
    const snap = await getDocs(collection(db, COLLECTIONS.USERS));
    return snap.docs.map(d => d.data() as User);
  },

  setEmployees: async (employees: User[]) => {
    const batch = writeBatch(db);
    employees.forEach((emp) => {
      const key = emp.uid || emp.id;
      const ref = doc(db, COLLECTIONS.USERS, key);
      batch.set(ref, emp);
    });
    await batch.commit();
  },

  deleteUser: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.USERS, id));
  },

  getAttendanceLogs: async (): Promise<AttendanceRecord[]> => {
    const snap = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE)));
    return snap.docs.map(d => d.data() as AttendanceRecord);
  },

  saveAttendanceLog: async (log: AttendanceRecord) => {
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, log.id), log);
  },

  deleteAttendanceLog: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, id));
  },

  getVacations: async (): Promise<VacationRecord[]> => {
    const snap = await getDocs(collection(db, COLLECTIONS.VACATIONS));
    return snap.docs.map(d => d.data() as VacationRecord);
  },

  saveVacation: async (vacation: VacationRecord) => {
    await setDoc(doc(db, COLLECTIONS.VACATIONS, vacation.id), vacation);
  },

  setVacations: async (vacations: VacationRecord[]) => {
    const batch = writeBatch(db);
    vacations.forEach((v) => {
      batch.set(doc(db, COLLECTIONS.VACATIONS, v.id), v);
    });
    await batch.commit();
  },

  deleteVacation: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.VACATIONS, id));
  },

  getBranches: async (): Promise<BranchConfig[]> => {
    const snap = await getDocs(collection(db, COLLECTIONS.BRANCHES));
    return snap.docs.map(d => d.data() as BranchConfig);
  },

  setBranches: async (branches: BranchConfig[]) => {
    const batch = writeBatch(db);
    branches.forEach((b) => {
      batch.set(doc(db, COLLECTIONS.BRANCHES, b.name), b);
    });
    await batch.commit();
  },

  deleteBranch: async (branchName: string) => {
    await deleteDoc(doc(db, COLLECTIONS.BRANCHES, branchName));
    await deleteDoc(doc(db, COLLECTIONS.BRANCH_BALANCES, branchName));
  },

  getBranchBalance: async (branchName: string): Promise<number> => {
    const snap = await getDoc(doc(db, COLLECTIONS.BRANCH_BALANCES, branchName));
    // Fixed: Cast snap.data() to any to bypass Property 'amount' does not exist on type 'unknown' error.
    return snap.exists() ? ((snap.data() as any)?.amount || 0) : 0;
  },

  updateBranchBalance: async (branchName: string, newBalance: number) => {
    await setDoc(doc(db, COLLECTIONS.BRANCH_BALANCES, branchName), { amount: newBalance });
  },

  getPositions: async (): Promise<PositionMapping[]> => {
    const snap = await getDocs(collection(db, COLLECTIONS.POSITIONS));
    return snap.docs.map(d => d.data() as PositionMapping);
  },

  setPositions: async (positions: PositionMapping[]) => {
    const batch = writeBatch(db);
    positions.forEach((p) => {
      batch.set(doc(db, COLLECTIONS.POSITIONS, p.title), p);
    });
    await batch.commit();
  },

  deletePosition: async (title: string) => {
    await deleteDoc(doc(db, COLLECTIONS.POSITIONS, title));
  },

  getDepartments: async (): Promise<string[]> => {
    const snap = await getDoc(doc(db, COLLECTIONS.DEPARTMENTS, 'list'));
    // Fixed: Cast snap.data() to any to bypass Property 'items' does not exist on type 'unknown' error.
    return snap.exists() ? ((snap.data() as any)?.items || DEPARTMENTS) : DEPARTMENTS;
  },

  setDepartments: async (departments: string[]) => {
    await setDoc(doc(db, COLLECTIONS.DEPARTMENTS, 'list'), { items: departments });
  },

  getCashHistory: async (): Promise<CashDeskRecord[]> => {
    const q = query(collection(db, COLLECTIONS.CASH_HISTORY), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CashDeskRecord);
  },

  saveCashRecord: async (record: CashDeskRecord) => {
    await setDoc(doc(db, COLLECTIONS.CASH_HISTORY, record.id), record);
  },

  deleteCashRecord: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.CASH_HISTORY, id));
  },

  getSettings: async (): Promise<SystemSettings> => {
    const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'system'));
    const data = snap.exists() ? (snap.data() as SystemSettings) : DEFAULT_SETTINGS;
    if (!data.rolePermissions) {
      data.rolePermissions = DEFAULT_ROLE_PERMISSIONS;
    }
    return data;
  },

  setSettings: async (settings: SystemSettings) => {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'system'), settings);
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
  }
};
