
import { 
  doc, 
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { User, AttendanceRecord, VacationRecord, CashDeskRecord, BranchConfig, PositionMapping } from '../types';
import { SystemSettings, Database } from './database';

const COLLECTIONS = {
  USERS: 'users',
  ATTENDANCE: 'attendance',
  VACATIONS: 'vacations',
  CASH_HISTORY: 'cashHistory',
  BRANCHES: 'branches',
  POSITIONS: 'positions',
  DEPARTMENTS: 'departments',
  SETTINGS: 'settings',
  BRANCH_BALANCES: 'branchBalances'
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
  };
  errors: string[];
  timestamp: string;
}

export const MigrationService = {
  migrateLocalData: async (firebaseUid: string): Promise<MigrationReport> => {
    console.log("[Migration] Starting comprehensive data migration...");
    
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
        settings: false
      },
      errors: [],
      timestamp: new Date().toISOString()
    };

    try {
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

      report.success = true;
      if (report.errors.length === 0) MigrationService._cleanupLocalStorage();
    } catch (error: any) {
      report.success = false;
      report.errors.push(`Fatal error: ${error.message || error}`);
    }

    return report;
  },

  _migrateUsers: async (firebaseUid: string, report: MigrationReport) => {
    try {
      const localUserStr = localStorage.getItem('zenith_current_user');
      if (localUserStr) {
        const localUser = JSON.parse(localUserStr) as User;
        await setDoc(doc(db, COLLECTIONS.USERS, firebaseUid), { ...localUser, uid: firebaseUid }, { merge: true });
        report.itemsMigrated.users = 1;
      }
    } catch (error: any) { report.errors.push(`User migration error: ${error.message}`); }
  },

  _migrateEmployees: async (report: MigrationReport) => {
    try {
      const localEmployeesStr = localStorage.getItem('zenith_local_employees');
      if (localEmployeesStr) {
        const employees = JSON.parse(localEmployeesStr) as User[];
        await Database.setEmployees(employees);
        report.itemsMigrated.employees = employees.length;
      }
    } catch (error: any) { report.errors.push(`Employees migration error: ${error.message}`); }
  },

  _migrateAttendance: async (report: MigrationReport) => {
    try {
      const localAttendanceStr = localStorage.getItem('zenith_local_attendance');
      if (localAttendanceStr) {
        const logs = JSON.parse(localAttendanceStr) as AttendanceRecord[];
        await Database.saveAttendanceBatch(logs);
        report.itemsMigrated.attendance = logs.length;
      }
    } catch (error: any) { report.errors.push(`Attendance migration error: ${error.message}`); }
  },

  _migrateVacations: async (report: MigrationReport) => {
    try {
      const localVacationsStr = localStorage.getItem('zenith_local_vacations');
      if (localVacationsStr) {
        const vacations = JSON.parse(localVacationsStr) as VacationRecord[];
        // Note: Vacations usually small, but let's be safe.
        for (const v of vacations) {
          await Database.saveVacation(v);
        }
        report.itemsMigrated.vacations = vacations.length;
      }
    } catch (error: any) { report.errors.push(`Vacations migration error: ${error.message}`); }
  },

  _migrateCashHistory: async (report: MigrationReport) => {
    try {
      const localCashStr = localStorage.getItem('zenith_local_cash_history');
      if (localCashStr) {
        const cashRecords = JSON.parse(localCashStr) as CashDeskRecord[];
        for (const rec of cashRecords) {
          await Database.saveCashRecord(rec);
        }
        report.itemsMigrated.cashHistory = cashRecords.length;
      }
    } catch (error: any) { report.errors.push(`Cash history migration error: ${error.message}`); }
  },

  _migrateBranches: async (report: MigrationReport) => {
    try {
      const localBranchesStr = localStorage.getItem('zenith_local_branches');
      if (localBranchesStr) {
        const branches = JSON.parse(localBranchesStr) as BranchConfig[];
        await Database.setBranches(branches);
        report.itemsMigrated.branches = branches.length;
      }
    } catch (error: any) { report.errors.push(`Branches migration error: ${error.message}`); }
  },

  _migrateBranchBalances: async (report: MigrationReport) => {
    try {
      const localBalancesStr = localStorage.getItem('zenith_local_branch_balances');
      if (localBalancesStr) {
        const balances = JSON.parse(localBalancesStr) as Record<string, number>;
        for (const [branchName, amount] of Object.entries(balances)) {
          await Database.updateBranchBalance(branchName, amount);
        }
        report.itemsMigrated.branchBalances = Object.keys(balances).length;
      }
    } catch (error: any) { report.errors.push(`Branch balances migration error: ${error.message}`); }
  },

  _migratePositions: async (report: MigrationReport) => {
    try {
      const localPositionsStr = localStorage.getItem('zenith_local_positions');
      if (localPositionsStr) {
        const positions = JSON.parse(localPositionsStr) as PositionMapping[];
        await Database.setPositions(positions);
        report.itemsMigrated.positions = positions.length;
      }
    } catch (error: any) { report.errors.push(`Positions migration error: ${error.message}`); }
  },

  _migrateDepartments: async (report: MigrationReport) => {
    try {
      const localDeptsStr = localStorage.getItem('zenith_local_departments');
      if (localDeptsStr) {
        const departments = JSON.parse(localDeptsStr) as string[];
        await Database.setDepartments(departments);
        report.itemsMigrated.departments = departments.length;
      }
    } catch (error: any) { report.errors.push(`Departments migration error: ${error.message}`); }
  },

  _migrateSettings: async (report: MigrationReport) => {
    try {
      const localSettingsStr = localStorage.getItem('zenith_local_settings');
      if (localSettingsStr) {
        const settings = JSON.parse(localSettingsStr) as SystemSettings;
        await Database.setSettings(settings);
        report.itemsMigrated.settings = true;
      }
    } catch (error: any) { report.errors.push(`Settings migration error: ${error.message}`); }
  },

  _cleanupLocalStorage: () => {
    const keysToRemove = ['zenith_local_employees', 'zenith_local_attendance', 'zenith_local_vacations', 'zenith_local_cash_history', 'zenith_local_branches', 'zenith_local_branch_balances', 'zenith_local_positions', 'zenith_local_departments', 'zenith_local_settings'];
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
};
