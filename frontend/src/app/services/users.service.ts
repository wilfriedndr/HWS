// HWS/frontend/src/app/services/users.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { appConfig } from '../app.config';

export interface User {
  id: number;
  username?: string;
  email?: string;
  role?: 'admin' | 'user';
  is_staff?: boolean;
  is_active?: boolean;
  is_superuser?: boolean;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private base = (appConfig as any).apiBase?.toString().replace(/\/+$/, '') ?? '';

  constructor(private http: HttpClient) {}

  listUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/api/users/`);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}/api/users/${id}/`);
  }

  createUser(body: Partial<User> & { password?: string }): Observable<User> {
    return this.http.post<User>(`${this.base}/api/users/`, body);
  }

  updateUser(id: number, body: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.base}/api/users/${id}/`, body);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/users/${id}/`);
  }

  // Corrigé: profil
  currentUser(): Observable<User> {
    return this.http.get<User>(`${this.base}/api/me/`);
  }
}
