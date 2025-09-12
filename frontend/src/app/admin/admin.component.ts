import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { GuidesService, Guide } from '../services/guides.service';
import { InvitationsService, Invitation } from '../services/invitations.service';
import { UsersService, User } from '../services/users.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  providers: [DatePipe]
})
export class AdminComponent implements OnInit {
  guides: Guide[] = [];
  invitations: Invitation[] = [];
  users: User[] = [];

  activeTab: 'users' | 'guides' | 'invitations' = 'users';
  loading = false;
  message = '';
  messageType: 'success' | 'error' | '' = '';

  currentUsername: string | null = null;

  constructor(
    private guidesService: GuidesService,
    private invitesService: InvitationsService,
    private usersService: UsersService,
    private router: Router,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.loading = true;
    Promise.all([
      this.loadUsers(),
      this.loadGuides(),
      this.loadInvitations(),
      Promise.resolve(this.loadCurrentUsername())
    ]).finally(() => (this.loading = false));
  }

  /* ---------- Onglets ---------- */
  setActiveTab(tab: 'users' | 'guides' | 'invitations'): void {
    this.activeTab = tab;
    if (tab === 'users') this.loadUsers();
    if (tab === 'guides') this.loadGuides();
    if (tab === 'invitations') this.loadInvitations();
  }

  /* ---------- Chargements ---------- */
  async loadUsers(): Promise<void> {
    this.usersService.listUsers().subscribe({
      next: (res: User[] | any) => (this.users = res || []),
      error: (err: unknown) => this.reportError('Chargement utilisateurs', err)
    });
  }

  async loadGuides(): Promise<void> {
    this.guidesService.listGuides().subscribe({
      next: (res: Guide[]) => (this.guides = Array.isArray(res) ? res : []),
      error: (err: unknown) => this.reportError('Chargement guides', err)
    });
  }

  async loadInvitations(): Promise<void> {
    this.invitesService.listInvitations().subscribe({
      next: (res: Invitation[] | any) => (this.invitations = res || []),
      error: (err: unknown) => this.reportError('Chargement invitations', err)
    });
  }

  /* ---------- Création / Edition / Suppression Guides ---------- */
  openCreateGuideModal(): void {
    const title = (prompt('Titre du guide ?') || '').trim();
    if (!title) return;

    const description = (prompt('Description ?') || '').trim();
    const start_date = (prompt('Date de début (YYYY-MM-DD) ?') || '').trim();
    const end_date = (prompt('Date de fin (YYYY-MM-DD) ?') || '').trim();
    const mobility = (prompt('Mobilité (voiture, vélo, à pied...) ?') || '').trim();
    const season = (prompt('Saison (printemps, été, automne, hiver) ?') || '').trim();
    const audience = (prompt('Audience (famille, amis, seul, en groupe) ?') || '').trim();
    const daysStr = (prompt('Nombre de jours ?') || '').trim();
    const days = daysStr ? Number(daysStr) : undefined;

    const body: Partial<Guide> = {
      title,
      description,
      start_date,
      end_date,
      mobility: mobility || undefined,
      season: season || undefined,
      audience: audience || undefined,
      days: Number.isFinite(days) ? days : undefined
    };

    this.guidesService.createGuide(body).subscribe({
      next: () => {
        this.reportSuccess('Guide créé avec succès.');
        this.loadGuides();
      },
      error: (err) => this.reportError('Création guide', err)
    });
  }

  editGuide(guide: Guide): void {
    const newTitle = prompt('Nouveau titre ?', guide.title || guide.name || '')?.trim();
    if (!newTitle) return;

    this.guidesService.updateGuide(guide.id, { title: newTitle }).subscribe({
      next: () => {
        this.reportSuccess('Guide mis à jour.');
        this.loadGuides();
      },
      error: (err) => this.reportError('Mise à jour guide', err)
    });
  }

  deleteGuide(guide: Guide): void {
    if (!confirm(`Supprimer le guide "${guide.title || guide.name}" ?`)) return;
    this.guidesService.deleteGuide(guide.id).subscribe({
      next: () => {
        this.reportSuccess('Guide supprimé.');
        this.loadGuides();
      },
      error: (err) => this.reportError('Suppression guide', err)
    });
  }

  /* ---------- Helpers d’affichage Invitations ---------- */
  getGuideName(guideRef: any): string {
    if (guideRef && typeof guideRef === 'object') {
      return (guideRef.title || guideRef.name || `Guide #${guideRef.id ?? '—'}`).toString();
    }
    if (typeof guideRef === 'number') {
      const g = this.guides.find((x) => x.id === guideRef);
      return g ? (g.title || g.name || `Guide #${g.id}`) : `Guide #${guideRef}`;
    }
    return '—';
  }

  getUserName(userRef: any): string {
    if (userRef && typeof userRef === 'object') {
      return (userRef.username || userRef.email || `Utilisateur #${userRef.id ?? '—'}`).toString();
    }
    if (typeof userRef === 'number') {
      const u = this.users.find((x) => x.id === userRef);
      return u ? (u.username || u.email || `Utilisateur #${u.id}`) : `Utilisateur #${userRef}`;
    }
    return '—';
  }

  /* ---------- Users / Invitations ---------- */
  openCreateUserModal(): void {
    this.reportError('Création utilisateur', 'Non implémenté dans ce snippet.');
  }
  editUser(_user: User): void {
    this.reportError('Edition utilisateur', 'Non implémenté dans ce snippet.');
  }
  deleteUser(_user: User): void {
    this.reportError('Suppression utilisateur', 'Non implémenté dans ce snippet.');
  }
  openCreateInvitationModal(): void {
    this.reportError('Création invitation', 'Non implémenté dans ce snippet.');
  }
  deleteInvitation(_inv: Invitation): void {
    this.reportError('Suppression invitation', 'Non implémenté dans ce snippet.');
  }

  /* ---------- Session ---------- */
  private loadCurrentUsername(): void {
    try {
      this.currentUsername = localStorage.getItem('auth_username');
    } catch {
      this.currentUsername = null;
    }
  }

  /* ---------- Messages ---------- */
  private reportSuccess(msg: string): void {
    this.messageType = 'success';
    this.message = msg;
    setTimeout(() => (this.message = ''), 3500);
  }

  private reportError(context: string, err: any): void {
    const detail = this.extractError(err);
    this.messageType = 'error';
    this.message = `${context} — ${detail}`;
    console.error(context, err);
    setTimeout(() => (this.message = ''), 5000);
  }

  private extractError(err: any): string {
    if (!err) return 'Erreur inconnue';
    if (typeof err === 'string') return err;

    if (err.error) {
      if (typeof err.error === 'string') return err.error;
      if (typeof err.error.detail === 'string') return err.error.detail;
      if (typeof err.error.message === 'string') return err.error.message;

      try {
        const entries = Object.entries(err.error as Record<string, any>);
        if (entries.length) {
          const pretty = entries
            .map(([k, v]) => {
              const first = Array.isArray(v) ? v[0] : v;
              return `${k}: ${first}`;
            })
            .join(' | ');
          return pretty;
        }
      } catch {
      }
    }
    return err.message || 'Erreur réseau';
  }
}
