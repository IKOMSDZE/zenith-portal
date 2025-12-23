
export interface BranchConfig {
  name: string;
  openTime: string; // HH:mm format
  lateThreshold: number; // minutes
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  uid: string; // Firebase Auth UID for Security Rules
  employeeName: string;
  employeeRole: UserRole; // Denormalized
  department: string;    // Denormalized
  branch: string;        // Denormalized
  date: string;          // Format: "YYYY-MM-DD" for better sorting
  checkIn: string;
  checkOut?: string;
  status: 'Complete' | 'Active';
  isLate: boolean;
}

// New interface for instant reporting
export interface BranchDailyStats {
  id: string; // Format: "branchName_YYYY-MM-DD"
  branch: string;
  date: string;
  totalPresent: number;
  totalLate: number;
  totalOnTime: number;
}

export type UserRole = 'Admin' | 'Manager' | 'Editor' | 'Accountant' | 'Employee' | 'HR';

export type VacationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PositionMapping {
  title: string;
  department: string;
}

export interface VacationRecord {
  id: string;
  employeeId: string;
  uid: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  calendarDays: number;
  reason: string;
  replacementPerson?: string;
  changer: string;
  manager: string;
  status: VacationStatus;
}

export interface CashDeskRecord {
  id: string;
  branch: string;
  cashierId: string;
  cashierName: string;
  date: string;
  openingBalance: number;
  cash: number;
  terminal: number;
  incasation: number;
  closingBalance: number;
  cancelledCheck?: {
    number: string;
    amount: number;
    reason: string;
  };
}

export interface NewsItem {
  id: string;
  type: 'Success' | 'Alert' | 'Info';
  date: string;
  title: string;
  content: string;
}

export interface User {
  id: string;
  uid?: string; // Firebase Auth UID
  name: string;
  role: UserRole;
  department: string;
  avatar: string;
  checkedIn: boolean;
  lastCheckIn?: string;
  isAdmin?: boolean;
  branch?: string;
  vacationDaysTotal: number;
  vacationDaysUsed: number;
  lastVacationResetYear?: number;
  birthday?: string;
  lastBirthdayUpdate?: string;
  jobStartDate?: string;
  position?: string;
  phoneNumber?: string;
  email?: string;
  personalId?: string;
  address?: string;
  password?: string;
  // Locally calculated next birthday for dashboard display
  nextBday?: Date;
}

export enum View {
  DASHBOARD = 'dashboard',
  ATTENDANCE = 'attendance',
  PROFILE = 'profile',
  ADMIN = 'admin',
  VACATIONS = 'vacations',
  VACATION_FORM = 'vacation_form',
  VACATION_REQUESTS = 'vacation_requests',
  CASHIER = 'cashier',
  COMPANY_STRUCTURE = 'company_structure',
  ATTENDANCE_REPORT = 'attendance_report',
  ACCOUNTANT = 'accountant',
  USERS = 'users'
}
