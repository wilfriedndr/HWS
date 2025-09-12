import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Guide, Activity } from '../api.types';
import { AuthService } from './auth.service';

type GuidesContext = 'my' | 'all';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // IMPORTANT: URL relative pour passer par le proxy Angular (proxy.conf.json)
  private apiUrl = '/api';

  // Store local des guides (partagé avec le panneau admin)
  private guidesSubject = new BehaviorSubject<Guide[] | null>(null);
  guides$ = this.guidesSubject.asObservable();
  private lastContext: GuidesContext = 'my';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headers);
  }

  // Charge et met en cache la liste des guides
  loadGuides(context: GuidesContext = this.lastContext): Observable<Guide[]> {
    this.lastContext = context;
    const url = context === 'all' ? `${this.apiUrl}/guides/all/` : `${this.apiUrl}/guides/`;
    return this.http.get<Guide[]>(url, { headers: this.getHeaders() }).pipe(
      tap(list => this.guidesSubject.next(list)),
      catchError(err => {
        console.error('Erreur loadGuides:', err);
        this.guidesSubject.next([]);
        return of([]);
      })
    );
  }

  // Accès direct si tu en as besoin ailleurs
  getMyGuides(): Observable<Guide[]> {
    return this.http.get<Guide[]>(`${this.apiUrl}/guides/`, { headers: this.getHeaders() });
  }

  getAllGuides(): Observable<Guide[]> {
    return this.http.get<Guide[]>(`${this.apiUrl}/guides/all/`, { headers: this.getHeaders() });
  }

  // Guide spécifique
  getGuide(id: number): Observable<Guide> {
    return this.http.get<Guide>(`${this.apiUrl}/guides/${id}/`, { headers: this.getHeaders() });
  }

  // ACTIVITÉS — Variante 1: endpoint imbriqué en français: /guides/{id}/activites/
  getGuideActivites(guideId: number): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.apiUrl}/guides/${guideId}/activites/`, {
      headers: this.getHeaders()
    });
  }

  // ACTIVITÉS — Variante 2: endpoint plat: /activites/?guide={id}
  getActivitesByGuide(guideId: number): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.apiUrl}/activites/`, {
      headers: this.getHeaders(),
      params: { guide: guideId.toString() }
    });
  }

  // Créer un guide + refresh de la liste
  createGuide(guide: Partial<Guide>): Observable<Guide> {
    return this.http.post<Guide>(`${this.apiUrl}/guides/`, guide, { headers: this.getHeaders() }).pipe(
      tap(() => this.refreshGuides())
    );
  }

  // Modifier un guide + refresh de la liste
  updateGuide(id: number, guide: Partial<Guide>): Observable<Guide> {
    return this.http.patch<Guide>(`${this.apiUrl}/guides/${id}/`, guide, { headers: this.getHeaders() }).pipe(
      tap(() => this.refreshGuides())
    );
  }

  // Supprimer un guide + refresh de la liste
  deleteGuide(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/guides/${id}/`, { headers: this.getHeaders() }).pipe(
      tap(() => this.refreshGuides())
    );
  }

  // Rafraîchir la liste des guides en fonction du dernier contexte
  private refreshGuides(): void {
    this.loadGuides(this.lastContext).subscribe({
      error: (e) => console.error('Refresh guides échoué:', e)
    });
  }
}
