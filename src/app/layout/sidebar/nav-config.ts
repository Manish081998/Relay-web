import { Role } from '../../models/role.enum';
import { NAV_ICONS } from './nav-icons';

export interface NavChild {
  label: string;
  route: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  icon: string;
  roles: Role[] | 'all';
  children: NavChild[];
}

export interface NavStandaloneItem {
  label: string;
  route: string;
  icon: string;
  roles: Role[] | 'all';
}

export const DASHBOARD_NAV: NavStandaloneItem = {
  label: 'Dashboard',
  route: '/dashboard',
  icon: NAV_ICONS.dashboard,
  roles: 'all',
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Intranet',
    icon: NAV_ICONS.intranet,
    roles: [Role.SuperAdmin, Role.Admin, Role.User],
    children: [{ label: 'Users', route: '/intranet/users', icon: NAV_ICONS.users }],
  },
  {
    label: 'Documentum',
    icon: NAV_ICONS.documentum,
    roles: [Role.SuperAdmin, Role.Admin, Role.User],
    children: [
      { label: 'Search', route: '/documentum/search', icon: NAV_ICONS.search },
      { label: 'Queue Search', route: '/documentum/queue-search', icon: NAV_ICONS.queue },
      { label: 'Annotation', route: '/documentum/test-annotation', icon: NAV_ICONS.annotation },
    ],
  },
];

export const ADMIN_NAV: NavStandaloneItem[] = [
  {
    label: 'Reports',
    route: '/reports',
    icon: NAV_ICONS.reports,
    roles: [Role.SuperAdmin, Role.Admin],
  },
  { label: 'Admin', route: '/admin', icon: NAV_ICONS.admin, roles: [Role.SuperAdmin] },
];
