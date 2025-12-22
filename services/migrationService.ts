
import { 
  doc, 
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { User, AttendanceRecord, VacationRecord, CashDeskRecord, BranchConfig, PositionMapping, NewsItem } from '../types';
import { SystemSettings } from './database';

const COLLECTIONS = {
  USERS: 'users',
  ATTENDANCE: 'attendance',
  VACATIONS: 'vacations',
  CASH_HISTORY: 'cashHistory',
  BRANCHES: 'branches',
  POSITIONS: 'positions',
  DEPARTMENTS: 'departments',
  NEWS: 'news',
  SETTINGS: 'settings'
};

export const MigrationService = {
  migrateLocalData: async (firebaseUid: string) => {
    console.log("[Migration] Checking for full local data sync...");
    const batch = writeBatch(db);
    let hasDataToMigrate = false;

    // 1. User Profile
    const localUserStr = localStorage.getItem('zenith_current_user');
    if (localUserStr) {
      try {
        const localUser = JSON.parse(localUserStr) as User;
        const userRef = doc(db, COLLECTIONS.USERS, firebaseUid);
        batch.set(userRef, { ...localUser, uid: firebaseUid }, { merge: true });
        hasDataToMigrate = true;
      } catch (e) {
        console.error("[Migration] Error parsing local user", e);
      }
    }

    // 2. Attendance
    const localAttendanceStr = localStorage.getItem('zenith_local_attendance');
    if (localAttendanceStr) {
      try {
        const localLogs = JSON.parse(localAttendanceStr) as AttendanceRecord[];
        localLogs.forEach(log => {
          const logRef = doc(db, COLLECTIONS.ATTENDANCE, log.id);
          batch.set(logRef, log, { merge: true });
        });
        if (localLogs.length > 0) hasDataToMigrate = true;
      } catch (e) {
        console.error("[Migration] Error parsing local attendance", e);
      }
    }

    // 3. Vacations
    const localVacationsStr = localStorage.getItem('zenith_local_vacations');
    if (localVacationsStr) {
      try {
        const localVacations = JSON.parse(localVacationsStr) as VacationRecord[];
        localVacations.forEach(vac => {
          const vacRef = doc(db, COLLECTIONS.VACATIONS, vac.id);
          batch.set(vacRef, vac, { merge: true });
        });
        if (localVacations.length > 0) hasDataToMigrate = true;
      } catch (e) {
        console.error("[Migration] Error parsing local vacations", e);
      }
    }

    // 4. Cash History
    const localCashStr = localStorage.getItem('zenith_local_cash_history');
    if (localCashStr) {
      try {
        const localCash = JSON.parse(localCashStr) as CashDeskRecord[];
        localCash.forEach(rec => {
          const recRef = doc(db, COLLECTIONS.CASH_HISTORY, rec.id);
          batch.set(recRef, rec, { merge: true });
        });
        if (localCash.length > 0) hasDataToMigrate = true;
      } catch (e) {
        console.error("[Migration] Error parsing local cash history", e);
      }
    }

    // 5. Branches
    const localBranchesStr = localStorage.getItem('zenith_local_branches');
    if (localBranchesStr) {
      try {
        const localBranches = JSON.parse(localBranchesStr) as BranchConfig[];
        localBranches.forEach(b => {
          const bRef = doc(db, COLLECTIONS.BRANCHES, b.name);
          batch.set(bRef, b, { merge: true });
        });
        if (localBranches.length > 0) hasDataToMigrate = true;
      } catch (e) {
        console.error("[Migration] Error parsing local branches", e);
      }
    }

    // 6. Positions
    const localPositionsStr = localStorage.getItem('zenith_local_positions');
    if (localPositionsStr) {
      try {
        const localPos = JSON.parse(localPositionsStr) as PositionMapping[];
        localPos.forEach(p => {
          const pRef = doc(db, COLLECTIONS.POSITIONS, p.title);
          batch.set(pRef, p, { merge: true });
        });
        if (localPos.length > 0) hasDataToMigrate = true;
      } catch (e) {
        console.error("[Migration] Error parsing local positions", e);
      }
    }

    // 7. Departments
    const localDeptsStr = localStorage.getItem('zenith_local_departments');
    if (localDeptsStr) {
      try {
        const localDepts = JSON.parse(localDeptsStr) as string[];
        const dRef = doc(db, COLLECTIONS.DEPARTMENTS, 'list');
        batch.set(dRef, { items: localDepts }, { merge: true });
        if (localDepts.length > 0) hasDataToMigrate = true;
      } catch (e) {
        console.error("[Migration] Error parsing local departments", e);
      }
    }

    // 8. News
    const localNewsStr = localStorage.getItem('zenith_local_news');
    if (localNewsStr) {
      try {
        const localNews = JSON.parse(localNewsStr) as NewsItem[];
        localNews.forEach(n => {
          const nRef = doc(db, COLLECTIONS.NEWS, n.id);
          batch.set(nRef, n, { merge: true });
        });
        if (localNews.length > 0) hasDataToMigrate = true;
      } catch (e) {
        console.error("[Migration] Error parsing local news", e);
      }
    }

    // 9. System Settings
    const localSettingsStr = localStorage.getItem('zenith_local_settings');
    if (localSettingsStr) {
      try {
        const localSettings = JSON.parse(localSettingsStr) as SystemSettings;
        const sRef = doc(db, COLLECTIONS.SETTINGS, 'system');
        batch.set(sRef, localSettings, { merge: true });
        hasDataToMigrate = true;
      } catch (e) {
        console.error("[Migration] Error parsing local settings", e);
      }
    }

    if (hasDataToMigrate) {
      try {
        await batch.commit();
        // Remove all local storage keys associated with the migration
        const keysToRemove = [
          'zenith_local_attendance',
          'zenith_local_vacations',
          'zenith_local_cash_history',
          'zenith_local_branches',
          'zenith_local_positions',
          'zenith_local_departments',
          'zenith_local_news',
          'zenith_local_settings'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
        console.log("[Migration] Full local database successfully migrated to cloud.");
      } catch (err: any) {
        if (err.code === 'permission-denied') {
          console.warn("[Migration] Permission denied. Ensure your firestore rules are active.");
        } else {
          console.error("[Migration] Batch commit failed:", err);
          throw err;
        }
      }
    }
  }
};
