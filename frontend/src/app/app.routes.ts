// D:\Desktop\code\HWS\frontend\src\app\app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { GuideDetailComponent } from './guide-detail/guide-detail.component';
import { AdminComponent } from './admin/admin.component';
import { AdminGuard } from './guards/admin.guard';

/**
 * Export nommé 'routes' attendu par app.config.ts
 * Pas de route /login puisque Home s'occupe de la connexion.
 */
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'guide/:id', component: GuideDetailComponent },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AdminGuard]
  },
  { path: '**', redirectTo: '' }
];
