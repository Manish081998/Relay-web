export interface UserDetailDto {
  id: string;
  email: string;
  displayName: string;
  department?: string;
  roles: string[];
}

export interface UpdateUserRequest {
  displayName?: string;
  department?: string;
}
