import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ENVIRONMENT } from '../../../core/tokens/environment.token';
import { BrandDto, DocumentumUserDto, UpdateDocumentumUserRequest } from '../models/documentum-user.model';

@Injectable()
export class DocumentumUsersService {
  private readonly api = inject(ApiService);
  private readonly env = inject(ENVIRONMENT);

  getAll(): Observable<DocumentumUserDto[]> {
    return this.api.get<DocumentumUserDto[]>(`${this.env.apiBaseUrl}/api/documentum/users`);
  }

  getById(id: string): Observable<DocumentumUserDto> {
    return this.api.get<DocumentumUserDto>(`${this.env.apiBaseUrl}/api/documentum/users/${id}`);
  }

  getAllBrands(): Observable<BrandDto[]> {
    return this.api.get<any[]>(`${this.env.apiBaseUrl}/api/documentum/GetAllBrands`).pipe(
      // Normalize: .NET APIs may return PascalCase (BrandGuid / BrandName) or camelCase
      map(items => (items ?? []).map(item => ({
        // API may return BrandGuid or BrandId (PascalCase or camelCase) — try all variants
        brandGuid: item.brandGuid ?? item.BrandGuid ?? item.brandId ?? item.BrandId ?? '',
        brandName: item.brandName ?? item.BrandName ?? '',
      } as BrandDto))),
    );
  }

  updateById(id: string, body: UpdateDocumentumUserRequest): Observable<DocumentumUserDto> {
    return this.api.put<DocumentumUserDto>(
      `${this.env.apiBaseUrl}/api/documentum/users/${id}`,
      body,
    );
  }
}
