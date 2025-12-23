
// constants.tsx

import React from 'react';
import { User, AttendanceRecord, BranchConfig, VacationRecord, PositionMapping } from './types';

export const DEFAULT_BRANCH_CONFIGS: BranchConfig[] = [
  { name: 'East point', openTime: '09:00', lateThreshold: 15 },
  { name: 'Vazha pshavela', openTime: '09:00', lateThreshold: 15 },
  { name: 'Gldani', openTime: '10:00', lateThreshold: 10 },
  { name: 'Batumi', openTime: '08:30', lateThreshold: 20 },
  { name: 'Poti', openTime: '09:30', lateThreshold: 15 }
];

export const DEPARTMENTS = [
  'რითეილი',
  'ოფისი',
  'საწყობი'
];

export const OFFICIAL_POSITIONS: PositionMapping[] = [
  { title: 'Shop manager', department: 'რითეილი' },
  { title: 'Shop consultant', department: 'რითეილი' },
  { title: 'Senior Product Designer', department: 'ოფისი' },
  { title: 'Lead Developer', department: 'ოფისი' },
  { title: 'Warehouse Lead', department: 'საწყობი' },
  { title: 'Inventory Clerk', department: 'საწყობი' }
];

export const BRANCH_STAFF_POSITIONS = ['Shop manager', 'Shop consultant'];

const DEFAULT_PASS = '123456';

const CURRENT_YEAR = new Date().getFullYear();

export const MOCK_USER: User = {
  id: 'EMP-999',
  uid: 'UID-999', // Added uid to satisfy type requirements in related records
  name: 'Alex Rivera',
  role: 'Admin',
  department: 'რითეილი',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  checkedIn: false,
  isAdmin: true,
  branch: 'Vazha pshavela',
  vacationDaysTotal: 24,
  vacationDaysUsed: 5,
  lastVacationResetYear: CURRENT_YEAR,
  birthday: '1990-05-15',
  jobStartDate: '2021-01-10',
  position: 'Lead Developer',
  phoneNumber: '+995 555 123 456',
  email: 'admin@portal.ge',
  personalId: '01010101010',
  address: '123 Rustaveli Ave, Tbilisi',
  password: DEFAULT_PASS
};

export const MOCK_EMPLOYEES: User[] = [
  MOCK_USER,
  {
    id: 'EMP-002',
    uid: 'UID-002', // Added uid
    name: 'Sarah Chen',
    role: 'Manager',
    department: 'ოფისი',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    checkedIn: true,
    lastCheckIn: '08:30 AM',
    branch: 'East point',
    vacationDaysTotal: 24,
    vacationDaysUsed: 2,
    lastVacationResetYear: CURRENT_YEAR,
    position: 'Lead Developer',
    email: 'sarah@portal.ge',
    personalId: '02020202020',
    password: DEFAULT_PASS
  },
  {
    id: 'EMP-003',
    uid: 'UID-003', // Added uid
    name: 'Marcus Thorne',
    role: 'HR',
    department: 'ოფისი',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    checkedIn: false,
    branch: 'Gldani',
    vacationDaysTotal: 24,
    vacationDaysUsed: 10,
    lastVacationResetYear: CURRENT_YEAR,
    position: 'HR Manager',
    email: 'marcus@portal.ge',
    personalId: '03030303030',
    password: DEFAULT_PASS
  },
  {
    id: 'EMP-004',
    uid: 'UID-004', // Added uid
    name: 'Elena Rodriguez',
    role: 'Employee',
    department: 'რითეილი',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    checkedIn: true,
    lastCheckIn: '09:15 AM',
    branch: 'Batumi',
    vacationDaysTotal: 24,
    vacationDaysUsed: 0,
    lastVacationResetYear: CURRENT_YEAR,
    position: 'Shop consultant',
    email: 'elena@portal.ge',
    personalId: '04040404040',
    password: DEFAULT_PASS
  }
];

export const MOCK_VACATIONS: VacationRecord[] = [
  {
    id: 'v1',
    employeeId: 'EMP-001',
    uid: 'UID-001', // Added uid to satisfy type requirement
    employeeName: 'Alex Rivera',
    startDate: '2024-06-10',
    endDate: '2024-06-15',
    workingDays: 5,
    calendarDays: 6,
    reason: 'კუთვნილი შვებულება',
    changer: 'Admin',
    manager: 'Approved',
    status: 'Approved'
  }
];

export const MOCK_ATTENDANCE_REPORTS: AttendanceRecord[] = [
  {
    id: '1',
    employeeId: 'EMP-001',
    uid: 'UID-001', // Added uid to satisfy type requirement
    employeeName: 'Alex Rivera',
    employeeRole: 'Admin', // Added employeeRole to satisfy type requirement
    department: 'რითეილი', // Added department to satisfy type requirement
    date: 'Jun 1, 2024',
    checkIn: '08:55:20',
    status: 'Complete',
    branch: 'Vazha pshavela',
    isLate: false
  }
];

export const Icons = {
  Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Admin: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Wallet: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
  Newspaper: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8Z"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  Gift: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  Google: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
};
