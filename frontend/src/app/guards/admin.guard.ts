// HWS/frontend/src/app/guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> {
    // 1) Non authentifié → redirection
    if (!this.auth.isAuthenticated()) {
      return this.router.createUrlTree(['/']);
    }

    // 2) Déjà reconnu admin → OK
    if (this.auth.isAdmin()) {
      return true;
    }

    // 3) Sinon, on tente TOUJOURS un refresh profil avant de décider
    return this.auth.refreshRoleFromProfile().pipe(
      map(isAdmin => (isAdmin ? true : this.router.createUrlTree(['/'])))
    );
  }
}
