import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Guide, Activity } from '../api.types';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // guides accessibles à l'utilisateur connecté
  getMyGuides(): Observable<Guide[]> {
    return this.http.get<Guide[]>(`${this.apiUrl}/guides/`, {
      headers: this.getHeaders()
    });
  }

  // tous les guides (pour les admins)
  getAllGuides(): Observable<Guide[]> {
    return this.http.get<Guide[]>(`${this.apiUrl}/guides/all/`, {
      headers: this.getHeaders()
    });
  }

  // guide spécifique
  getGuide(id: number): Observable<Guide> {
    return this.http.get<Guide>(`${this.apiUrl}/guides/${id}/`, {
      headers: this.getHeaders()
    });
  }

  // activités d'un guide
  getGuideActivities(guideId: number): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.apiUrl}/guides/${guideId}/activities/`, {
      headers: this.getHeaders()
    });
  }

  // créer un guide
  createGuide(guide: Partial<Guide>): Observable<Guide> {
    return this.http.post<Guide>(`${this.apiUrl}/guides/`, guide, {
      headers: this.getHeaders()
    });
  }

  // modifier un guide
  updateGuide(id: number, guide: Partial<Guide>): Observable<Guide> {
    return this.http.patch<Guide>(`${this.apiUrl}/guides/${id}/`, guide, {
      headers: this.getHeaders()
    });
  }

  // supprimer un guide
  deleteGuide(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/guides/${id}/`, {
      headers: this.getHeaders()
    });
  }
}
