
export interface BranchConfig {
  name: string;
  openTime: string; // HH:mm format
  lateThreshold: number; // minutes
}

export interface AttendanceRecord {
  id: string;
  employeeId?: string;
  employeeName?: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'Complete' | 'Active';
  branch?: string;
  isLate?: boolean;
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

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  content: string;
  type: 'Success' | 'Alert' | 'Info';
  author?: string;
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
  birthday?: string;
  lastBirthdayUpdate?: string;
  jobStartDate?: string;
  position?: string;
  phoneNumber?: string;
  email?: string;
  personalId?: string;
  address?: string;
  password?: string;
}

export enum View {
  DASHBOARD = 'dashboard',
  ATTENDANCE = 'attendance',
  PROFILE = 'profile',
  ADMIN = 'admin',
  VACATIONS = 'vacations',
  CASHIER = 'cashier',
  COMPANY_STRUCTURE = 'company_structure',
  ATTENDANCE_REPORT = 'attendance_report',
  ACCOUNTANT = 'accountant',
  USERS = 'users'
}
