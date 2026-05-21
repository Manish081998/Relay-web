import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.constants';
import { EdgeOrderSearchParams, EdgeOrdersPagedResponse } from '../models/edge-orders.model';

@Injectable()
export class EdgeOrdersService {
  private readonly api = inject(ApiService);

  searchEdgeOrders(params?: EdgeOrderSearchParams): Observable<EdgeOrdersPagedResponse> {
    const httpParams = params
      ? (Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ) as Record<string, string>)
      : undefined;

    return this.api.get<EdgeOrdersPagedResponse>(
      API_ENDPOINTS.INTRANET.EDGE_ORDERS_SEARCH,
      { params: httpParams },
    );
  }
}
