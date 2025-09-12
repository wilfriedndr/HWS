// HWS/frontend/src/app/services/invitations.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { appConfig } from '../app.config';
import { Observable } from 'rxjs';

export interface Invitation {
  id: number;
  guide: number | any;
  invited_user?: number | any;
  invited_email?: string;
  created_at?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  // on enlève les / en trop à la fin
  private base = (appConfig as any).apiBase?.toString().replace(/\/+$/, '') ?? '';

  constructor(private http: HttpClient) {}

  listInvitations(): Observable<Invitation[] | any> {
    return this.http.get<Invitation[] | any>(`${this.base}/api/invitations/`);
  }

  getInvitation(id: number): Observable<Invitation> {
    return this.http.get<Invitation>(`${this.base}/api/invitations/${id}/`);
  }

  createInvitation(body: Partial<Invitation>): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.base}/api/invitations/`, body);
  }

  deleteInvitation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/invitations/${id}/`);
  }

  updateInvitation(id: number, body: Partial<Invitation>): Observable<Invitation> {
    return this.http.put<Invitation>(`${this.base}/api/invitations/${id}/`, body);
  }
}
