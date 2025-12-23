
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
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.warn('[COUNT] Index not ready, using fallback count');
      if (dataSnapshot) return dataSnapshot.docs.length;
      return 0;
    }
    console.error('[COUNT] Count failed:', error);
    return 0;
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

  getSettings: async (): Promise<SystemSettings> => {
    return CacheManager.wrap('settings', CacheManager.TTL.STATIC, async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'system'));
        if (snap.exists()) return snap.data() as SystemSettings;
        return FALLBACK_SETTINGS;
      } catch (error) {
        console.error("[DB] Failed to fetch settings, using hardcoded defaults:", error);
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
        console.error("[DB] Failed to fetch branches:", error);
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

  getEmployees: async (pageSize: number = 50, lastVisible?: QueryDocumentSnapshot, constraints: QueryConstraint[] = []): Promise<PaginatedResult<User>> => {
    try {
      const finalConstraints = [...constraints, orderBy('name'), limit(pageSize)];
      if (lastVisible) finalConstraints.push(startAfter(lastVisible));
      
      const q = query(collection(db, COLLECTIONS.USERS), ...finalConstraints);
      const countQuery = query(collection(db, COLLECTIONS.USERS), ...constraints);
      
      const snap = await getDocs(q);
      const totalCount = await safeGetCount(countQuery, snap);
      
      return { 
        data: snap.docs.map(d => d.data() as User), 
        lastVisible: snap.docs[snap.docs.length - 1] || null,
        totalCount
      };
    } catch (error) {
      console.error("[DB] getEmployees failed:", error);
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

  getNews: async (lim: number = 5): Promise<NewsItem[]> => {
    return CacheManager.wrap(`news_limit_${lim}`, 10 * 60 * 1000, async () => {
      try {
        const q = query(collection(db, COLLECTIONS.NEWS), orderBy('date', 'desc'), limit(lim));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as NewsItem));
      } catch (error) {
        console.error("[DB] getNews failed:", error);
        return [];
      }
    });
  },

  saveNewsItem: async (item: NewsItem) => {
    await setDoc(doc(db, COLLECTIONS.NEWS, item.id), item);
    CacheManager.invalidate('news');
  },

  getAttendanceReport: async (
    filters: { 
      branch?: string; 
      department?: string; 
      isLate?: boolean; 
      days?: number 
    },
    pageSize: number = 50,
    lastVisible?: QueryDocumentSnapshot
  ): Promise<PaginatedResult<AttendanceRecord>> => {
    return PerformanceMonitor.trace('getAttendanceReport', async () => {
      try {
        const constraints: QueryConstraint[] = [];
        const days = filters.days || 30;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - days);
        const dateStr = targetDate.toISOString().split('T')[0];
        
        constraints.push(where('date', '>=', dateStr));
        if (filters.branch) constraints.push(where('branch', '==', filters.branch));
        if (filters.department) constraints.push(where('department', '==', filters.department));
        if (filters.isLate !== undefined) constraints.push(where('isLate', '==', filters.isLate));
        constraints.push(orderBy('date', 'desc'));
        
        const countQuery = query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints);
        constraints.push(limit(pageSize));
        if (lastVisible) constraints.push(startAfter(lastVisible));
        const q = query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints);
        
        const snap = await getDocs(q);
        const totalCount = await safeGetCount(countQuery, snap);

        return {
          data: snap.docs.map(d => d.data() as AttendanceRecord),
          lastVisible: snap.docs[snap.docs.length - 1] || null,
          totalCount
        };
      } catch (error) {
        console.error("[DB] getAttendanceReport failed:", error);
        return { data: [], lastVisible: null, totalCount: 0 };
      }
    });
  },

  getAttendanceLogs: async (constraints: QueryConstraint[] = [], pageSize: number = 50, lastVisible?: QueryDocumentSnapshot): Promise<PaginatedResult<AttendanceRecord>> => {
    try {
      const finalConstraints = [...constraints, limit(pageSize)];
      if (lastVisible) finalConstraints.push(startAfter(lastVisible));
      
      const q = query(collection(db, COLLECTIONS.ATTENDANCE), ...finalConstraints);
      const countQuery = query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints);
      
      const snap = await getDocs(q);
      const totalCount = await safeGetCount(countQuery, snap);
      
      return {
        data: snap.docs.map(d => d.data() as AttendanceRecord),
        lastVisible: snap.docs[snap.docs.length - 1] || null,
        totalCount
      };
    } catch (error) {
      console.error("[DB] getAttendanceLogs failed:", error);
      return { data: [], lastVisible: null, totalCount: 0 };
    }
  },

  saveAttendanceLog: async (log: AttendanceRecord) => {
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, log.id), log);
    CacheManager.invalidate('attendance');
  },

  saveAttendanceBatch: async (records: AttendanceRecord[]) => {
    await Database._batchWrite(COLLECTIONS.ATTENDANCE, records, r => r.id);
    CacheManager.invalidate('attendance');
  },

  deleteAttendanceLog: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, id));
    CacheManager.invalidate('attendance');
  },

  getVacations: async (constraints: QueryConstraint[] = []): Promise<VacationRecord[]> => {
    try {
      const q = query(collection(db, COLLECTIONS.VACATIONS), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as VacationRecord);
    } catch (error) {
      console.error("[DB] getVacations failed:", error);
      return [];
    }
  },

  saveVacation: async (record: VacationRecord) => {
    await setDoc(doc(db, COLLECTIONS.VACATIONS, record.id), record);
    CacheManager.invalidate('vacations');
  },

  deleteVacation: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.VACATIONS, id));
    CacheManager.invalidate('vacations');
  },

  getBranchBalance: async (branchName: string): Promise<number> => {
    return CacheManager.wrap(`balance_${branchName}`, CacheManager.TTL.FREQUENT, async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.BRANCH_BALANCES, branchName));
        return snap.exists() ? snap.data().amount : 0;
      } catch (error) {
        console.error("[DB] getBranchBalance failed:", error);
        return 0;
      }
    });
  },

  getAllBranchBalances: async (): Promise<Record<string, number>> => {
    return CacheManager.wrap('all_branch_balances', CacheManager.TTL.FREQUENT, async () => {
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.BRANCH_BALANCES));
        const balances: Record<string, number> = {};
        snap.docs.forEach(d => {
          balances[d.id] = d.data().amount;
        });
        return balances;
      } catch (error) {
        console.error("[DB] getAllBranchBalances failed:", error);
        return {};
      }
    });
  },

  updateBranchBalance: async (branchName: string, amount: number) => {
    await setDoc(doc(db, COLLECTIONS.BRANCH_BALANCES, branchName), { amount });
    CacheManager.invalidate(`balance_${branchName}`);
    CacheManager.invalidate('all_branch_balances');
  },

  saveCashRecord: async (record: CashDeskRecord) => {
    await setDoc(doc(db, COLLECTIONS.CASH_HISTORY, record.id), record);
    CacheManager.invalidate('cashHistory');
  },

  deleteCashRecord: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.CASH_HISTORY, id));
    CacheManager.invalidate('cashHistory');
  },

  getCashHistory: async (constraints: QueryConstraint[] = [], pageSize: number = 50, lastVisible?: QueryDocumentSnapshot): Promise<PaginatedResult<CashDeskRecord>> => {
    try {
      const finalConstraints = [...constraints, limit(pageSize)];
      if (lastVisible) finalConstraints.push(startAfter(lastVisible));
      
      const q = query(collection(db, COLLECTIONS.CASH_HISTORY), ...finalConstraints);
      const countQuery = query(collection(db, COLLECTIONS.CASH_HISTORY), ...constraints);
      
      const snap = await getDocs(q);
      const totalCount = await safeGetCount(countQuery, snap);
      
      return {
        data: snap.docs.map(d => d.data() as CashDeskRecord),
        lastVisible: snap.docs[snap.docs.length - 1] || null,
        totalCount
      };
    } catch (error) {
      console.error("[DB] getCashHistory failed:", error);
      return { data: [], lastVisible: null, totalCount: 0 };
    }
  },

  getDepartments: async (): Promise<string[]> => {
    return CacheManager.wrap('departments', CacheManager.TTL.STATIC, async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.DEPARTMENTS, 'list'));
        return snap.exists() ? (snap.data()?.items || DEPARTMENTS) : DEPARTMENTS;
      } catch (error) {
        console.error("[DB] getDepartments failed:", error);
        return DEPARTMENTS;
      }
    });
  },

  setDepartments: async (departments: string[]) => {
    await setDoc(doc(db, COLLECTIONS.DEPARTMENTS, 'list'), { items: departments });
    CacheManager.invalidate('departments');
  },

  getPositions: async (): Promise<PositionMapping[]> => {
    return CacheManager.wrap('positions', CacheManager.TTL.STATIC, async () => {
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.POSITIONS));
        return snap.docs.map(d => d.data() as PositionMapping);
      } catch (error) {
        console.error("[DB] getPositions failed:", error);
        return [];
      }
    });
  },

  setPositions: async (positions: PositionMapping[]) => {
    await Database._batchWrite(COLLECTIONS.POSITIONS, positions, p => p.title);
    CacheManager.invalidate('positions');
  },

  deletePosition: async (title: string) => {
    await deleteDoc(doc(db, COLLECTIONS.POSITIONS, title));
    CacheManager.invalidate('positions');
  },

  getUserByPersonalId: async (personalId: string): Promise<User | null> => {
    try {
      const q = query(collection(db, COLLECTIONS.USERS), where('personalId', '==', personalId), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as User;
    } catch (error) {
      console.error("[DB] getUserByPersonalId failed:", error);
      return null;
    }
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    try {
      const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email.toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as User;
    } catch (error) {
      console.error("[DB] getUserByEmail failed:", error);
      return null;
    }
  },

  syncUserWithAuth: async (firebaseUid: string, email: string): Promise<User | null> => {
    try {
      // 1. Try fetching by Document ID (which might be the UID)
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUid));
      if (userDoc.exists()) return userDoc.data() as User;

      // 2. Fallback: Search by UID field OR Email field
      const q = query(collection(db, COLLECTIONS.USERS), 
        where('email', '==', email.toLowerCase()), 
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const dbUser = snap.docs[0].data() as User;
        const oldDocId = snap.docs[0].id;
        
        // 3. Link UID if missing or different
        if (dbUser.uid !== firebaseUid) {
          const updatedUser = { ...dbUser, uid: firebaseUid };
          
          // Use a batch to ensure atomicity
          const batch = writeBatch(db);
          // Set user with UID as Document ID
          batch.set(doc(db, COLLECTIONS.USERS, firebaseUid), updatedUser, { merge: true });
          
          // If the old document ID wasn't the firebaseUid, we might want to delete it 
          // to avoid duplicates, but only if it's not the same document.
          if (oldDocId !== firebaseUid) {
            batch.delete(doc(db, COLLECTIONS.USERS, oldDocId));
          }
          
          await batch.commit();
          CacheManager.invalidate('users');
          return updatedUser;
        }
        return dbUser;
      }
      return null;
    } catch (error) {
      console.error("[DB] syncUserWithAuth failed:", error);
      return null;
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const sessionData = localStorage.getItem('zenith_current_user');
    if (!sessionData) return null;
    const sessionUser = JSON.parse(sessionData);
    const userId = sessionUser.uid || sessionUser.id;
    return CacheManager.wrap(`current_user_${userId}`, CacheManager.TTL.PROFILES, async () => {
      try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
        return userDoc.exists() ? (userDoc.data() as User) : sessionUser;
      } catch (error) {
        console.error("[DB] getCurrentUser failed:", error);
        return sessionUser;
      }
    });
  },

  setCurrentUser: async (user: User) => {
    const userId = user.uid || user.id;
    localStorage.setItem('zenith_current_user', JSON.stringify(user));
    try {
      await setDoc(doc(db, COLLECTIONS.USERS, userId), user, { merge: true });
    } catch (error) {
      console.error("[DB] setCurrentUser failed (local only):", error);
    }
    CacheManager.invalidate(`current_user_${userId}`);
    CacheManager.invalidate('users');
  },

  warmup: async () => {
    console.debug("[CACHE] Warming up static resources...");
    try {
      await Promise.allSettled([
        Database.getSettings(),
        Database.getBranches(),
        Database.getDepartments(),
        Database.getPositions(),
        Database.getNews(3)
      ]);
    } catch (error) {
      console.warn("[CACHE] Warmup partially failed due to offline status.");
    }
  }
};
