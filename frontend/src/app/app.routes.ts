import { Routes } from '@angular/router';
import { GuideDetailComponent } from './guide-detail/guide-detail.component';

export const routes: Routes = [
  { path: 'guide/:id', component: GuideDetailComponent },
  { path: '', loadComponent: () => import('./pages/home/home.component') },
  { path: '**', redirectTo: '' },
];