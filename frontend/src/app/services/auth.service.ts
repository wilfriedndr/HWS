// HWS/frontend/src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

type JwtPayload = {
  token_type?: string;
  user_id?: number;
  username?: string;
  email?: string;
  role?: 'admin' | 'user' | string;
  is_staff?: boolean;
  is_superuser?: boolean;
  exp?: number; // seconds since epoch
  [k: string]: any;
};

type TokenResponse = { access: string; refresh?: string };

type MeResponse = {
  id: number;
  username: string;
  email?: string;
  role?: 'admin' | 'user' | string;
  is_staff?: boolean;
  is_superuser?: boolean;
  [k: string]: any;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ACCESS_KEY = 'auth_access';
  private readonly REFRESH_KEY = 'auth_refresh';
  private readonly ROLE_KEY = 'auth_role';
  private readonly USERNAME_KEY = 'username';

  private loggedIn$ = new BehaviorSubject<boolean>(this.hasValidToken());
  private admin$ = new BehaviorSubject<boolean>(this.readAdminFlag());

  constructor(private http: HttpClient) {}

  // -------- Login / Logout --------
  login(username: string, password: string): Observable<void> {
    return this.http.post<TokenResponse>('/api/token/', { username, password }).pipe(
      tap(tokens => {
        this.storeTokens(tokens);
        window.localStorage.setItem(this.USERNAME_KEY, username);
        this.loggedIn$.next(true);
      }),
      tap(() => this.computeAdminFromToken()),
      switchMap(() => (this.needsRoleRefresh() ? this.refreshRoleFromProfile().pipe(map(() => void 0)) : of(void 0))),
      catchError((err: HttpErrorResponse) => {
        this.clearAll();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this.clearAll();
    this.loggedIn$.next(false);
    this.admin$.next(false);
  }

  // -------- Public API d'état --------
  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  isAdmin(): boolean {
    return !!this.admin$.value;
  }

  authChanges(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  // Le guard s'en sert pour décider de rafraîchir le rôle
  needsRoleRefresh(): boolean {
    // on relance un check si aucun rôle en cache OU si le cache dit "non-admin"
    const cached = window.localStorage.getItem(this.ROLE_KEY);
    return cached === null || this.admin$.value === false;
  }

  // Récupère le profil pour déduire le rôle
  refreshRoleFromProfile(): Observable<boolean> {
    const token = this.accessToken;
    if (!token) {
      this.clearRoleOnly();
      this.admin$.next(false);
      return of(false);
    }
    // ENDPOINT CORRIGÉ: /api/me/
    return this.http.get<MeResponse>('/api/me/').pipe(
      map(me => {
        const isAdmin =
          me?.is_superuser === true ||
          me?.is_staff === true ||
          ((me?.role ?? '').toString().toLowerCase() === 'admin');
        window.localStorage.setItem(this.ROLE_KEY, isAdmin ? 'admin' : 'user');
        this.admin$.next(isAdmin);
        return isAdmin;
      }),
      catchError(() => {
        this.clearRoleOnly();
        this.admin$.next(false);
        return of(false);
      })
    );
  }

  // -------- Token helpers --------
  get accessToken(): string | null {
    return window.localStorage.getItem(this.ACCESS_KEY);
  }

  public getToken(): string | null {
    return this.accessToken;
  }

  private storeTokens(tokens: TokenResponse) {
    if (tokens.access) window.localStorage.setItem(this.ACCESS_KEY, tokens.access);
    if (tokens.refresh) window.localStorage.setItem(this.REFRESH_KEY, tokens.refresh);
  }

  private clearAll() {
    window.localStorage.removeItem(this.ACCESS_KEY);
    window.localStorage.removeItem(this.REFRESH_KEY);
    window.localStorage.removeItem(this.ROLE_KEY);
    window.localStorage.removeItem(this.USERNAME_KEY);
  }

  private clearRoleOnly() {
    window.localStorage.removeItem(this.ROLE_KEY);
  }

  private hasValidToken(): boolean {
    const token = window.localStorage.getItem(this.ACCESS_KEY);
    if (!token) return false;
    const payload = this.decodeJwt(token);
    if (!payload?.exp) return true;
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp > nowSec;
  }

  private decodeJwt(token: string): JwtPayload | null {
    try {
      const [, payloadB64] = token.split('.');
      const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }

  private computeAdminFromToken() {
    const token = this.accessToken;
    if (!token) {
      this.admin$.next(false);
      this.clearRoleOnly();
      return;
    }
    const payload = this.decodeJwt(token);
    if (!payload) {
      this.admin$.next(false);
      this.clearRoleOnly();
      return;
    }
    const isAdmin =
      payload.is_superuser === true ||
      payload.is_staff === true ||
      ((payload.role ?? '').toString().toLowerCase() === 'admin');

    if (isAdmin) {
      this.admin$.next(true);
      window.localStorage.setItem(this.ROLE_KEY, 'admin');
    } else {
      // on ne fige pas "user" ici pour laisser /api/me/ affiner
      this.admin$.next(false);
      this.clearRoleOnly();
    }
  }

  private readAdminFlag(): boolean {
    return (window.localStorage.getItem(this.ROLE_KEY) ?? '').toLowerCase() === 'admin';
  }
}
