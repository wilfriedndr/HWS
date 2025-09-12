import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { appConfig } from '../app.config';
import { Observable } from 'rxjs';

export interface Guide {
  id: number;

  // Titre/nom
  name?: string;
  title?: string;

  // Descriptif
  description?: string;

  // Champs fonctionnels affichés dans le Home
  days?: number;
  mobility?: string;
  season?: string;
  audience?: string;

  // Divers
  city?: string;
  category?: string;
  price?: number;
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

  listGuides(): Observable<Guide[] | PaginatedGuides> {
    return this.http.get<Guide[] | PaginatedGuides>(`${this.base}/api/guides/`);
  }

  getGuide(id: number): Observable<Guide> {
    return this.http.get<Guide>(`${this.base}/api/guides/${id}/`);
  }

  createGuide(body: Partial<Guide>): Observable<Guide> {
    return this.http.post<Guide>(`${this.base}/api/guides/`, body);
  }

  updateGuide(id: number, body: Partial<Guide>): Observable<Guide> {
    return this.http.put<Guide>(`${this.base}/api/guides/${id}/`, body);
  }

  deleteGuide(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/guides/${id}/`);
  }
}
