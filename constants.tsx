
import React from 'react';
import { User, AttendanceRecord, BranchConfig, VacationRecord, PositionMapping, NewsItem } from './types';

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

export const MOCK_USER: User = {
  id: 'EMP-001',
  name: 'Alex Rivera',
  role: 'Admin',
  department: 'რითეილი',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  checkedIn: false,
  isAdmin: true,
  branch: 'Vazha pshavela',
  vacationDaysTotal: 24,
  vacationDaysUsed: 5,
  birthday: '1990-05-15',
  jobStartDate: '2021-01-10',
  position: 'Lead Developer',
  phoneNumber: '+995 555 123 456',
  personalId: '01010101010',
  address: '123 Rustaveli Ave, Tbilisi'
};

export const MOCK_EMPLOYEES: User[] = [
  MOCK_USER,
  {
    id: 'EMP-002',
    name: 'Sarah Chen',
    role: 'Manager',
    department: 'ოფისი',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    checkedIn: true,
    lastCheckIn: '08:30 AM',
    branch: 'East point',
    vacationDaysTotal: 24,
    vacationDaysUsed: 2,
    position: 'Lead Developer'
  },
  {
    id: 'EMP-003',
    name: 'Marcus Thorne',
    role: 'HR',
    department: 'ოფისი',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    checkedIn: false,
    branch: 'Gldani',
    vacationDaysTotal: 24,
    vacationDaysUsed: 10,
    position: 'HR Manager'
  },
  {
    id: 'EMP-004',
    name: 'Elena Rodriguez',
    role: 'Employee',
    department: 'რითეილი',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    checkedIn: true,
    lastCheckIn: '09:15 AM',
    branch: 'Batumi',
    vacationDaysTotal: 24,
    vacationDaysUsed: 0,
    position: 'Shop consultant'
  }
];

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'ახალი ფილიალი ბათუმში',
    content: 'მოხარულები ვართ გაცნობოთ, რომ ჩვენი ქსელი ფართოვდება. ბათუმის ახალი ფილიალი უკვე მზად არის მომხმარებლების მისაღებად.',
    date: '2024-05-20',
    author: 'Admin',
    category: 'News'
  },
  {
    id: 'n2',
    title: 'კორპორატიული საღამო',
    content: 'მომავალ შაბათს ვიკრიბებით მთელი გუნდი კორპორატიულ ღონისძიებაზე. დასწრება სავალდებულო და სასურველია!',
    date: '2024-05-22',
    author: 'HR',
    category: 'Events'
  },
  {
    id: 'n3',
    title: 'უსაფრთხოების წესების განახლება',
    content: 'გთხოვთ გაეცნოთ სამუშაო ადგილზე უსაფრთხოების განახლებულ პროტოკოლს. დეტალები იხილეთ თქვენს ელ-ფოსტაზე.',
    date: '2024-05-23',
    author: 'Security',
    category: 'Urgent'
  }
];

export const MOCK_VACATIONS: VacationRecord[] = [
  {
    id: 'v1',
    employeeId: 'EMP-001',
    employeeName: 'Alex Rivera',
    startDate: '2024-06-10',
    endDate: '2024-06-14',
    workingDays: 5,
    calendarDays: 5,
    reason: 'კუთვნილი შვებულება',
    changer: 'Admin System',
    manager: 'Marcus Thorne',
    status: 'Approved'
  }
];

export const MOCK_ATTENDANCE_REPORTS: AttendanceRecord[] = [
  { id: 'r1', employeeId: 'EMP-002', employeeName: 'Sarah Chen', date: 'May 24, 2024', checkIn: '08:30 AM', status: 'Active', branch: 'East point', isLate: false },
  { id: 'r2', employeeId: 'EMP-004', employeeName: 'Elena Rodriguez', date: 'May 24, 2024', checkIn: '09:15 AM', status: 'Active', branch: 'Batumi', isLate: true },
];

export const Icons = {
  Dashboard: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  Admin: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
  ),
  Alert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
  ),
  Bell: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
  ),
  Check: () => (
     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  ),
  X: () => (
     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
  ),
  Gift: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="14" rx="2" ry="2"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5H12"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
  ),
  Newspaper: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
  ),
  Wallet: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
  ),
  LogOut: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  LogIn: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 5 12 10 7"/><line x1="15" y1="12" x2="5" y2="12"/></svg>
  )
};
