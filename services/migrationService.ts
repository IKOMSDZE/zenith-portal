
import { 
  doc, 
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { User, AttendanceRecord, VacationRecord, CashDeskRecord, BranchConfig, PositionMapping } from '../types';
import { SystemSettings, SMSLog } from './database';

const COLLECTIONS = {
  USERS: 'users',
  ATTENDANCE: 'attendance',
  VACATIONS: 'vacations',
  CASH_HISTORY: 'cashHistory',
  BRANCHES: 'branches',
  POSITIONS: 'positions',
  DEPARTMENTS: 'departments',
  SETTINGS: 'settings',
  BRANCH_BALANCES: 'branchBalances',
  SMS_LOGS: 'smsLogs'
};

interface MigrationReport {
  success: boolean;
  itemsMigrated: {
    users: number;
    employees: number;
    attendance: number;
    vacations: number;
    cashHistory: number;
    branches: number;
    branchBalances: number;
    positions: number;
    departments: number;
    settings: boolean;
    smsLogs: number;
  };
  errors: string[];
  timestamp: string;
}

export const MigrationService = {
  /**
   * Comprehensive migration from localStorage to Firestore
   * Migrates all data types with error handling and reporting
   */
  migrateLocalData: async (firebaseUid: string): Promise<MigrationReport> => {
    console.log("[Migration] ==========================================");
    console.log("[Migration] Starting comprehensive data migration...");
    console.log("[Migration] Firebase UID:", firebaseUid);
    console.log("[Migration] ==========================================");
    
    const report: MigrationReport = {
      success: false,
      itemsMigrated: {
        users: 0,
        employees: 0,
        attendance: 0,
        vacations: 0,
        cashHistory: 0,
        branches: 0,
        branchBalances: 0,
        positions: 0,
        departments: 0,
        settings: false,
        smsLogs: 0
      },
      errors: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Migrate each data type independently with error handling
      await MigrationService._migrateUsers(firebaseUid, report);
      await MigrationService._migrateEmployees(report);
      await MigrationService._migrateAttendance(report);
      await MigrationService._migrateVacations(report);
      await MigrationService._migrateCashHistory(report);
      await MigrationService._migrateBranches(report);
      await MigrationService._migrateBranchBalances(report);
      await MigrationService._migratePositions(report);
      await MigrationService._migrateDepartments(report);
      await MigrationService._migrateSettings(report);
      await MigrationService._migrateSMSLogs(report);

      report.success = true;
      console.log("[Migration] ==========================================");
      console.log("[Migration] Migration completed successfully!");
      console.log("[Migration] ==========================================");
      MigrationService._printReport(report);

      // Cleanup localStorage after successful migration
      if (report.errors.length === 0) {
        MigrationService._cleanupLocalStorage();
      }

    } catch (error: any) {
      report.success = false;
      report.errors.push(`Fatal error: ${error.message || error}`);
      console.error("[Migration] Fatal error during migration:", error);
    }

    return report;
  },

  /**
   * Migrate current user profile
   */
  _migrateUsers: async (firebaseUid: string, report: MigrationReport) => {
    console.log("[Migration] Migrating user profile...");
    try {
      const localUserStr = localStorage.getItem('zenith_current_user');
      if (localUserStr) {
        const localUser = JSON.parse(localUserStr) as User;
        const userRef = doc(db, COLLECTIONS.USERS, firebaseUid);
        await setDoc(userRef, { ...localUser, uid: firebaseUid }, { merge: true });
        report.itemsMigrated.users = 1;
        console.log("[Migration] ✓ User profile migrated");
      }
    } catch (error: any) {
      report.errors.push(`User migration error: ${error.message}`);
      console.error("[Migration] ✗ User migration failed:", error);
    }
  },

  /**
   * Migrate all employees
   */
  _migrateEmployees: async (report: MigrationReport) => {
    console.log("[Migration] Migrating employees...");
    try {
      const localEmployeesStr = localStorage.getItem('zenith_local_employees');
      if (localEmployeesStr) {
        const employees = JSON.parse(localEmployeesStr) as User[];
        const batch = writeBatch(db);
        
        employees.forEach(emp => {
          const key = emp.uid || emp.id;
          const empRef = doc(db, COLLECTIONS.USERS, key);
          batch.set(empRef, emp, { merge: true });
        });

        await batch.commit();
        report.itemsMigrated.employees = employees.length;
        console.log(`[Migration] ✓ Migrated ${employees.length} employees`);
      }
    } catch (error: any) {
      report.errors.push(`Employees migration error: ${error.message}`);
      console.error("[Migration] ✗ Employees migration failed:", error);
    }
  },

  /**
   * Migrate attendance records
   */
  _migrateAttendance: async (report: MigrationReport) => {
    console.log("[Migration] Migrating attendance records...");
    try {
      const localAttendanceStr = localStorage.getItem('zenith_local_attendance');
      if (localAttendanceStr) {
        const logs = JSON.parse(localAttendanceStr) as AttendanceRecord[];
        const batch = writeBatch(db);
        
        logs.forEach(log => {
          const logRef = doc(db, COLLECTIONS.ATTENDANCE, log.id);
          batch.set(logRef, log, { merge: true });
        });

        await batch.commit();
        report.itemsMigrated.attendance = logs.length;
        console.log(`[Migration] ✓ Migrated ${logs.length} attendance records`);
      }
    } catch (error: any) {
      report.errors.push(`Attendance migration error: ${error.message}`);
      console.error("[Migration] ✗ Attendance migration failed:", error);
    }
  },

  /**
   * Migrate vacation records
   */
  _migrateVacations: async (report: MigrationReport) => {
    console.log("[Migration] Migrating vacation records...");
    try {
      const localVacationsStr = localStorage.getItem('zenith_local_vacations');
      if (localVacationsStr) {
        const vacations = JSON.parse(localVacationsStr) as VacationRecord[];
        const batch = writeBatch(db);
        
        vacations.forEach(vac => {
          const vacRef = doc(db, COLLECTIONS.VACATIONS, vac.id);
          batch.set(vacRef, vac, { merge: true });
        });

        await batch.commit();
        report.itemsMigrated.vacations = vacations.length;
        console.log(`[Migration] ✓ Migrated ${vacations.length} vacation records`);
      }
    } catch (error: any) {
      report.errors.push(`Vacations migration error: ${error.message}`);
      console.error("[Migration] ✗ Vacations migration failed:", error);
    }
  },

  /**
   * Migrate cash history
   */
  _migrateCashHistory: async (report: MigrationReport) => {
    console.log("[Migration] Migrating cash history...");
    try {
      const localCashStr = localStorage.getItem('zenith_local_cash_history');
      if (localCashStr) {
        const cashRecords = JSON.parse(localCashStr) as CashDeskRecord[];
        const batch = writeBatch(db);
        
        cashRecords.forEach(rec => {
          const recRef = doc(db, COLLECTIONS.CASH_HISTORY, rec.id);
          batch.set(recRef, rec, { merge: true });
        });

        await batch.commit();
        report.itemsMigrated.cashHistory = cashRecords.length;
        console.log(`[Migration] ✓ Migrated ${cashRecords.length} cash records`);
      }
    } catch (error: any) {
      report.errors.push(`Cash history migration error: ${error.message}`);
      console.error("[Migration] ✗ Cash history migration failed:", error);
    }
  },

  /**
   * Migrate branches
   */
  _migrateBranches: async (report: MigrationReport) => {
    console.log("[Migration] Migrating branches...");
    try {
      const localBranchesStr = localStorage.getItem('zenith_local_branches');
      if (localBranchesStr) {
        const branches = JSON.parse(localBranchesStr) as BranchConfig[];
        const batch = writeBatch(db);
        
        branches.forEach(branch => {
          const branchRef = doc(db, COLLECTIONS.BRANCHES, branch.name);
          batch.set(branchRef, branch, { merge: true });
        });

        await batch.commit();
        report.itemsMigrated.branches = branches.length;
        console.log(`[Migration] ✓ Migrated ${branches.length} branches`);
      }
    } catch (error: any) {
      report.errors.push(`Branches migration error: ${error.message}`);
      console.error("[Migration] ✗ Branches migration failed:", error);
    }
  },

  /**
   * Migrate branch balances
   */
  _migrateBranchBalances: async (report: MigrationReport) => {
    console.log("[Migration] Migrating branch balances...");
    try {
      const localBalancesStr = localStorage.getItem('zenith_local_branch_balances');
      if (localBalancesStr) {
        const balances = JSON.parse(localBalancesStr) as Record<string, number>;
        const batch = writeBatch(db);
        
        Object.entries(balances).forEach(([branchName, amount]) => {
          const balanceRef = doc(db, COLLECTIONS.BRANCH_BALANCES, branchName);
          batch.set(balanceRef, { amount }, { merge: true });
        });

        await batch.commit();
        report.itemsMigrated.branchBalances = Object.keys(balances).length;
        console.log(`[Migration] ✓ Migrated ${Object.keys(balances).length} branch balances`);
      }
    } catch (error: any) {
      report.errors.push(`Branch balances migration error: ${error.message}`);
      console.error("[Migration] ✗ Branch balances migration failed:", error);
    }
  },

  /**
   * Migrate positions
   */
  _migratePositions: async (report: MigrationReport) => {
    console.log("[Migration] Migrating positions...");
    try {
      const localPositionsStr = localStorage.getItem('zenith_local_positions');
      if (localPositionsStr) {
        const positions = JSON.parse(localPositionsStr) as PositionMapping[];
        const batch = writeBatch(db);
        
        positions.forEach(pos => {
          const posRef = doc(db, COLLECTIONS.POSITIONS, pos.title);
          batch.set(posRef, pos, { merge: true });
        });

        await batch.commit();
        report.itemsMigrated.positions = positions.length;
        console.log(`[Migration] ✓ Migrated ${positions.length} positions`);
      }
    } catch (error: any) {
      report.errors.push(`Positions migration error: ${error.message}`);
      console.error("[Migration] ✗ Positions migration failed:", error);
    }
  },

  /**
   * Migrate departments
   */
  _migrateDepartments: async (report: MigrationReport) => {
    console.log("[Migration] Migrating departments...");
    try {
      const localDeptsStr = localStorage.getItem('zenith_local_departments');
      if (localDeptsStr) {
        const departments = JSON.parse(localDeptsStr) as string[];
        const dRef = doc(db, COLLECTIONS.DEPARTMENTS, 'list');
        await setDoc(dRef, { items: departments }, { merge: true });
        report.itemsMigrated.departments = departments.length;
        console.log(`[Migration] ✓ Migrated ${departments.length} departments`);
      }
    } catch (error: any) {
      report.errors.push(`Departments migration error: ${error.message}`);
      console.error("[Migration] ✗ Departments migration failed:", error);
    }
  },

  /**
   * Migrate system settings
   */
  _migrateSettings: async (report: MigrationReport) => {
    console.log("[Migration] Migrating system settings...");
    try {
      const localSettingsStr = localStorage.getItem('zenith_local_settings');
      if (localSettingsStr) {
        const settings = JSON.parse(localSettingsStr) as SystemSettings;
        const sRef = doc(db, COLLECTIONS.SETTINGS, 'system');
        await setDoc(sRef, settings, { merge: true });
        report.itemsMigrated.settings = true;
        console.log("[Migration] ✓ Settings migrated");
      }
    } catch (error: any) {
      report.errors.push(`Settings migration error: ${error.message}`);
      console.error("[Migration] ✗ Settings migration failed:", error);
    }
  },

  /**
   * Migrate SMS logs
   */
  _migrateSMSLogs: async (report: MigrationReport) => {
    console.log("[Migration] Migrating SMS logs...");
    try {
      const localSMSLogsStr = localStorage.getItem('zenith_local_sms_logs');
      if (localSMSLogsStr) {
        const smsLogs = JSON.parse(localSMSLogsStr) as SMSLog[];
        const batch = writeBatch(db);
        
        smsLogs.forEach(log => {
          const logRef = doc(db, COLLECTIONS.SMS_LOGS, log.id);
          batch.set(logRef, log, { merge: true });
        });

        await batch.commit();
        report.itemsMigrated.smsLogs = smsLogs.length;
        console.log(`[Migration] ✓ Migrated ${smsLogs.length} SMS logs`);
      }
    } catch (error: any) {
      report.errors.push(`SMS logs migration error: ${error.message}`);
      console.error("[Migration] ✗ SMS logs migration failed:", error);
    }
  },

  /**
   * Clean up localStorage after successful migration
   */
  _cleanupLocalStorage: () => {
    console.log("[Migration] Cleaning up localStorage...");
    const keysToRemove = [
      'zenith_local_employees',
      'zenith_local_attendance',
      'zenith_local_vacations',
      'zenith_local_cash_history',
      'zenith_local_branches',
      'zenith_local_branch_balances',
      'zenith_local_positions',
      'zenith_local_departments',
      'zenith_local_news',
      'zenith_local_settings',
      'zenith_local_sms_logs'
    ];

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`[Migration] ✓ Removed: ${key}`);
      }
    });

    console.log("[Migration] ✓ localStorage cleanup complete");
  },

  /**
   * Print migration report
   */
  _printReport: (report: MigrationReport) => {
    console.log("[Migration] ==========================================");
    console.log("[Migration] MIGRATION REPORT");
    console.log("[Migration] ==========================================");
    console.log("[Migration] Status:", report.success ? "✓ SUCCESS" : "✗ FAILED");
    console.log("[Migration] Timestamp:", report.timestamp);
    console.log("[Migration] ------------------------------------------");
    console.log("[Migration] Items Migrated:");
    console.log("[Migration]   - Users:", report.itemsMigrated.users);
    console.log("[Migration]   - Employees:", report.itemsMigrated.employees);
    console.log("[Migration]   - Attendance:", report.itemsMigrated.attendance);
    console.log("[Migration]   - Vacations:", report.itemsMigrated.vacations);
    console.log("[Migration]   - Cash History:", report.itemsMigrated.cashHistory);
    console.log("[Migration]   - Branches:", report.itemsMigrated.branches);
    console.log("[Migration]   - Branch Balances:", report.itemsMigrated.branchBalances);
    console.log("[Migration]   - Positions:", report.itemsMigrated.positions);
    console.log("[Migration]   - Departments:", report.itemsMigrated.departments);
    console.log("[Migration]   - SMS Logs:", report.itemsMigrated.smsLogs);
    console.log("[Migration]   - Settings:", report.itemsMigrated.settings ? "YES" : "NO");
    console.log("[Migration] ------------------------------------------");
    
    if (report.errors.length > 0) {
      console.log("[Migration] Errors:");
      report.errors.forEach((error, index) => {
        console.log(`[Migration]   ${index + 1}. ${error}`);
      });
    } else {
      console.log("[Migration] ✓ No errors!");
    }
    
    console.log("[Migration] ==========================================");
  }
};
