
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
  orderBy,
  QueryConstraint,
  startAfter,
  QueryDocumentSnapshot,
  increment,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, AttendanceRecord, VacationRecord, BranchConfig, PositionMapping, CashDeskRecord, UserRole, View, NewsItem } from '../types';
import { DEPARTMENTS } from '../constants';
import { PerformanceMonitor } from './performance';
import { CacheManager } from './cacheManager';

const COLLECTIONS = {
  USERS: 'users',
  ATTENDANCE: 'attendance',
  VACATIONS: 'vacations',
  BRANCHES: 'branches',
  POSITIONS: 'positions',
  DEPARTMENTS: 'departments',
  SETTINGS: 'settings',
  CASH_HISTORY: 'cashHistory',
  BRANCH_BALANCES: 'branchBalances',
  DAILY_STATS: 'branchDailyStats',
  NEWS: 'news'
};

export interface PaginatedResult<T> {
  data: T[];
  lastVisible: QueryDocumentSnapshot | null;
  totalCount: number;
}

export interface CustomFont {
  name: string;
  data: string;
  format: string;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, View[]> = {
  'Admin': Object.values(View),
  'Manager': [View.DASHBOARD, View.ATTENDANCE_REPORT, View.VACATIONS, View.PROFILE, View.CASHIER, View.USERS],
  'Editor': [View.DASHBOARD, View.ATTENDANCE_REPORT, View.PROFILE],
  'Accountant': [View.DASHBOARD, View.ACCOUNTANT, View.PROFILE],
  'Employee': [View.DASHBOARD, View.PROFILE, View.VACATIONS],
  'HR': [View.DASHBOARD, View.VACATIONS, View.PROFILE, View.USERS, View.ATTENDANCE_REPORT]
};

const FALLBACK_SETTINGS: SystemSettings = {
  rolePermissions: DEFAULT_ROLE_PERMISSIONS,
  appTitle: 'Zenith Portal',
  attendanceEnabledDepartments: [],
  branchSelectorEnabledDepartments: [],
  replacementEnabledDepartments: []
};

export interface SystemSettings {
  appTitle?: string;
  logoUrl?: string;
  faviconUrl?: string;
  headerFont?: CustomFont;
  bodyFont?: CustomFont;
  attendanceEnabledDepartments?: string[];
  rolePermissions: Record<UserRole, View[]>;
  branchSelectorEnabledDepartments?: string[];
  replacementEnabledDepartments?: string[];
  smsApiKey?: string;
  smsSenderName?: string;
  adminPhone?: string;
  accountantPhone?: string;
  hrPhone?: string;
  birthdaySmsTime?: string;
  userSmsTemplate?: string;
  adminSmsTemplate?: string;
}

async function safeGetCount(queryRef: any, dataSnapshot?: any): Promise<number> {
  try {
    const countSnap = await getCountFromServer(queryRef);
    return countSnap.data().count;
  } catch (error: any) {
    // If offline or index error, fallback to zero or snapshot length
    return dataSnapshot ? dataSnapshot.docs.length : 0;
  }
}

export const Database = {
  _batchWrite: async <T extends { id?: string; uid?: string; name?: string; title?: string }>(
    collectionName: string, 
    records: T[], 
    getId: (item: T) => string
  ) => {
    return PerformanceMonitor.trace(`batch_${collectionName}`, async () => {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((record) => {
          const docRef = doc(db, collectionName, getId(record));
          batch.set(docRef, record, { merge: true });
        });
        await batch.commit();
      }
    });
  },

  // Added warmup method for index.tsx
  warmup: () => {
    Database.getSettings();
    Database.getBranches();
    Database.getPositions();
    Database.getDepartments();
  },

  getSettings: async (): Promise<SystemSettings> => {
    return CacheManager.wrap('settings', CacheManager.TTL.STATIC, async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'system'));
        if (snap.exists()) return snap.data() as SystemSettings;
        return FALLBACK_SETTINGS;
      } catch (error: any) {
        // Soft fallback for offline state
        if (!navigator.onLine || error.code === 'unavailable') {
          console.debug("[DB] Offline: Using local settings fallback.");
        } else {
          console.warn("[DB] Failed to fetch settings:", error);
        }
        return FALLBACK_SETTINGS;
      }
    });
  },

  setSettings: async (settings: SystemSettings) => {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'system'), settings);
    CacheManager.invalidate('settings');
  },

  getBranches: async (): Promise<BranchConfig[]> => {
    return CacheManager.wrap('branches', CacheManager.TTL.STATIC, async () => {
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.BRANCHES));
        return snap.docs.map(d => d.data() as BranchConfig);
      } catch (error) {
        return [];
      }
    });
  },

  setBranches: async (branches: BranchConfig[]) => {
    await Database._batchWrite(COLLECTIONS.BRANCHES, branches, b => b.name);
    CacheManager.invalidate('branches');
  },

  deleteBranch: async (name: string) => {
    await deleteDoc(doc(db, COLLECTIONS.BRANCHES, name));
    CacheManager.invalidate('branches');
  },

  // Added getPositions method
  getPositions: async (): Promise<PositionMapping[]> => {
    return CacheManager.wrap('positions', CacheManager.TTL.STATIC, async () => {
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.POSITIONS));
        return snap.docs.map(d => d.data() as PositionMapping);
      } catch (error) {
        return [];
      }
    });
  },

  // Added setPositions method
  setPositions: async (positions: PositionMapping[]) => {
    await Database._batchWrite(COLLECTIONS.POSITIONS, positions, p => p.title);
    CacheManager.invalidate('positions');
  },

  // Added deletePosition method
  deletePosition: async (title: string) => {
    await deleteDoc(doc(db, COLLECTIONS.POSITIONS, title));
    CacheManager.invalidate('positions');
  },

  // Added getDepartments method
  getDepartments: async (): Promise<string[]> => {
    return CacheManager.wrap('departments', CacheManager.TTL.STATIC, async () => {
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.DEPARTMENTS));
        const depts = snap.docs.map(d => (d.data() as { name: string }).name);
        return depts.length > 0 ? depts : DEPARTMENTS;
      } catch (error) {
        return DEPARTMENTS;
      }
    });
  },

  // Added setDepartments method
  setDepartments: async (departments: string[]) => {
    const deptObjects = departments.map(d => ({ name: d }));
    await Database._batchWrite(COLLECTIONS.DEPARTMENTS, deptObjects, d => d.name);
    CacheManager.invalidate('departments');
  },

  getEmployees: async (pageSize: number = 50, lastVisible?: QueryDocumentSnapshot, constraints: QueryConstraint[] = []): Promise<PaginatedResult<User>> => {
    try {
      const finalConstraints = [...constraints, orderBy('name'), limit(pageSize)];
      if (lastVisible) finalConstraints.push(startAfter(lastVisible));
      
      const q = query(collection(db, COLLECTIONS.USERS), ...finalConstraints);
      const snap = await getDocs(q);
      
      let totalCount = snap.docs.length;
      try {
        const countQuery = query(collection(db, COLLECTIONS.USERS), ...constraints);
        totalCount = await safeGetCount(countQuery, snap);
      } catch (e) {}
      
      return { 
        data: snap.docs.map(d => d.data() as User), 
        lastVisible: snap.docs[snap.docs.length - 1] || null,
        totalCount
      };
    } catch (error) {
      return { data: [], lastVisible: null, totalCount: 0 };
    }
  },

  setEmployees: async (employees: User[]) => {
    await Database._batchWrite(COLLECTIONS.USERS, employees, e => e.uid || e.id);
    CacheManager.invalidate('users');
  },

  deleteUser: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.USERS, id));
    CacheManager.invalidate('users');
  },

  // Added getUserByEmail method for LoginPage
  getUserByEmail: async (email: string): Promise<User | null> => {
    const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as User;
  },

  // Added getUserByPersonalId method for LoginPage
  getUserByPersonalId: async (personalId: string): Promise<User | null> => {
    const q = query(collection(db, COLLECTIONS.USERS), where('personalId', '==', personalId), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as User;
  },

  // Added syncUserWithAuth method for Auth flows
  syncUserWithAuth: async (uid: string, email: string): Promise<User | null> => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const u = snap.data() as User;
      Database.setCurrentUser(u);
      return u;
    }

    const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const docSnap = querySnap.docs[0];
      const userData = docSnap.data() as User;
      const updatedUser = { ...userData, uid };
      if (docSnap.id !== uid) {
        await deleteDoc(doc(db, COLLECTIONS.USERS, docSnap.id));
      }
      await setDoc(doc(db, COLLECTIONS.USERS, uid), updatedUser);
      Database.setCurrentUser(updatedUser);
      return updatedUser;
    }

    return null;
  },

  // Added setCurrentUser for local session state
  setCurrentUser: (user: User) => {
    localStorage.setItem('zenith_current_user', JSON.stringify(user));
  },

  // Added getCurrentUser for local session state
  getCurrentUser: async (): Promise<User | null> => {
    const str = localStorage.getItem('zenith_current_user');
    return str ? JSON.parse(str) : null;
  },

  getNews: async (lim: number = 5): Promise<NewsItem[]> => {
    return CacheManager.wrap(`news_limit_${lim}`, 10 * 60 * 1000, async () => {
      try {
        const q = query(collection(db, COLLECTIONS.NEWS), orderBy('date', 'desc'), limit(lim));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as NewsItem));
      } catch (error) {
        return [];
      }
    });
  },

  saveNewsItem: async (item: NewsItem) => {
    await setDoc(doc(db, COLLECTIONS.NEWS, item.id), item);
    CacheManager.invalidate('news');
  },

  // Fixed signature and added implementation for getAttendanceReport
  getAttendanceReport: async (
    filters: { 
      branch?: string; 
      department?: string;
      isLate?: boolean;
      days?: number;
    },
    pageSize: number = 50,
    lastVisible?: QueryDocumentSnapshot
  ): Promise<PaginatedResult<AttendanceRecord>> => {
    const constraints: QueryConstraint[] = [];
    if (filters.branch) constraints.push(where('branch', '==', filters.branch));
    if (filters.department) constraints.push(where('department', '==', filters.department));
    if (filters.isLate !== undefined) constraints.push(where('isLate', '==', filters.isLate));
    
    if (filters.days) {
      const date = new Date();
      date.setDate(date.getDate() - filters.days);
      const minDate = date.toISOString().split('T')[0];
      constraints.push(where('date', '>=', minDate));
    }

    const finalConstraints = [...constraints, orderBy('date', 'desc'), limit(pageSize)];
    if (lastVisible) finalConstraints.push(startAfter(lastVisible));

    const q = query(collection(db, COLLECTIONS.ATTENDANCE), ...finalConstraints);
    const snap = await getDocs(q);

    let totalCount = 0;
    try {
      const countQuery = query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints);
      totalCount = await safeGetCount(countQuery, snap);
    } catch (e) {}

    return {
      data: snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)),
      lastVisible: snap.docs[snap.docs.length - 1] || null,
      totalCount
    };
  },

  // Added getAttendanceLogs for Dashboard
  getAttendanceLogs: async (constraints: QueryConstraint[] = []): Promise<PaginatedResult<AttendanceRecord>> => {
    const q = query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints);
    const snap = await getDocs(q);
    return {
      data: snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)),
      lastVisible: snap.docs[snap.docs.length - 1] || null,
      totalCount: snap.docs.length
    };
  },

  // Added saveAttendanceLog method
  saveAttendanceLog: async (log: AttendanceRecord) => {
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, log.id), log);
  },

  // Added saveAttendanceBatch for migration
  saveAttendanceBatch: async (logs: AttendanceRecord[]) => {
    await Database._batchWrite(COLLECTIONS.ATTENDANCE, logs, l => l.id);
  },

  // Added deleteAttendanceLog method
  deleteAttendanceLog: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, id));
  },

  // Added saveCashRecord method
  saveCashRecord: async (record: CashDeskRecord) => {
    await setDoc(doc(db, COLLECTIONS.CASH_HISTORY, record.id), record);
    CacheManager.invalidate('cashHistory');
  },

  // Added deleteCashRecord method
  deleteCashRecord: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.CASH_HISTORY, id));
    CacheManager.invalidate('cashHistory');
  },

  // Added getCashHistory method
  getCashHistory: async (constraints: QueryConstraint[] = [], pageSize: number = 50, lastVisible?: QueryDocumentSnapshot): Promise<PaginatedResult<CashDeskRecord>> => {
    const finalConstraints = [...constraints, limit(pageSize)];
    if (lastVisible) finalConstraints.push(startAfter(lastVisible));
    const q = query(collection(db, COLLECTIONS.CASH_HISTORY), ...finalConstraints);
    const snap = await getDocs(q);

    let totalCount = 0;
    try {
      const countQuery = query(collection(db, COLLECTIONS.CASH_HISTORY), ...constraints);
      totalCount = await safeGetCount(countQuery, snap);
    } catch (e) {}

    return {
      data: snap.docs.map(d => ({ id: d.id, ...d.data() } as CashDeskRecord)),
      lastVisible: snap.docs[snap.docs.length - 1] || null,
      totalCount
    };
  },

  // Added getBranchBalance method
  getBranchBalance: async (branchName: string): Promise<number> => {
    const snap = await getDoc(doc(db, COLLECTIONS.BRANCH_BALANCES, branchName));
    return snap.exists() ? snap.data().amount : 0;
  },

  // Added updateBranchBalance method
  updateBranchBalance: async (branchName: string, amount: number) => {
    await setDoc(doc(db, COLLECTIONS.BRANCH_BALANCES, branchName), { amount });
  },

  // Added getAllBranchBalances method
  getAllBranchBalances: async (): Promise<Record<string, number>> => {
    const snap = await getDocs(collection(db, COLLECTIONS.BRANCH_BALANCES));
    const balances: Record<string, number> = {};
    snap.docs.forEach(d => {
      balances[d.id] = d.data().amount;
    });
    return balances;
  },

  // Added getVacations method
  getVacations: async (constraints: QueryConstraint[] = []): Promise<VacationRecord[]> => {
    const q = query(collection(db, COLLECTIONS.VACATIONS), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as VacationRecord));
  },

  // Added saveVacation method
  saveVacation: async (record: VacationRecord) => {
    await setDoc(doc(db, COLLECTIONS.VACATIONS, record.id), record);
    CacheManager.invalidate('vacations');
  },

  // Added deleteVacation method
  deleteVacation: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.VACATIONS, id));
    CacheManager.invalidate('vacations');
  }
};
