// HWS/frontend/src/app/services/guides.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { appConfig } from '../app.config';
import { Observable, map } from 'rxjs';

export interface Guide {
  id: number;

  // Titre/nom
  name?: string;
  title?: string;

  // Descriptif
  description?: string;

  // Champs fonctionnels
  days?: number;
  mobility?: string;
  season?: string;
  audience?: string;

  // Divers
  city?: string;
  category?: string;
  price?: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;

  [key: string]: any;
}

export interface PaginatedGuides {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: Guide[];
}

@Injectable({ providedIn: 'root' })
export class GuidesService {
  private base = (appConfig as any).apiBase?.toString().replace(/\/+$/, '') ?? '';

  constructor(private http: HttpClient) {}

  // Normalise toujours en Guide[]
  listGuides(): Observable<Guide[]> {
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Expires: '0'
    });
    return this.http
      .get<Guide[] | PaginatedGuides>(`${this.base}/api/guides/`, { headers })
      .pipe(map((res) => (Array.isArray(res) ? res : res?.results ?? [])));
  }

  getGuide(id: number): Observable<Guide> {
    return this.http.get<Guide>(`${this.base}/api/guides/${id}/`);
  }

  createGuide(body: Partial<Guide>): Observable<Guide> {
    return this.http.post<Guide>(`${this.base}/api/guides/`, body);
  }

  // PATCH partiel pour limiter les 400 liés aux champs requis
  updateGuide(id: number, body: Partial<Guide>): Observable<Guide> {
    return this.http.patch<Guide>(`${this.base}/api/guides/${id}/`, body);
  }

  deleteGuide(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/guides/${id}/`);
  }
}
