export interface BrandDto {
  brandGuid: string;
  brandName: string;
}

export interface DocumentumUserDto {
  userId: string;
  globalId: string;
  emailId: string;
  brandId: string;
  brandName: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdBy: string;
  createdDate: string;
}

export interface UpdateDocumentumUserRequest {
  userId: string;
  brandId: string;
  isActive: boolean;
  modifiedBy: string;
}
