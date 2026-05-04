import { Role } from './role.enum';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
}
