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
      next: (res: Guide[] | any) => (this.guides = res || []),
      error: (err: unknown) => this.reportError('Chargement guides', err)
    });
  }

  async loadInvitations(): Promise<void> {
    this.invitesService.listInvitations().subscribe({
      next: (res: Invitation[] | any) => (this.invitations = res || []),
      error: (err: unknown) => this.reportError('Chargement invitations', err)
    });
  }

  loadCurrentUsername(): void {
    const u = window.localStorage.getItem('username') || sessionStorage.getItem('username');
    if (u) {
      this.currentUsername = u;
      return;
    }
    if (this.usersService.currentUser) {
      this.usersService.currentUser().subscribe({
        next: (me: User) => (this.currentUsername = me?.username ?? null),
        error: (_err: unknown) => (this.currentUsername = null)
      });
    }
  }

  /* ---------- Helpers UI ---------- */
  clearMessage(): void {
    this.message = '';
    this.messageType = '';
  }

  private report(message: string, type: 'success' | 'error' = 'success') {
    this.message = message;
    this.messageType = type;
    setTimeout(() => this.clearMessage(), 4000);
  }

  private reportError(prefix: string, err: unknown) {
    let text = '';
    if (!err) text = 'Erreur inconnue';
    else if (typeof err === 'string') text = err;
    else if (err instanceof Error) text = err.message;
    else {
      try {
        const anyErr = err as any;
        if (anyErr.error && typeof anyErr.error === 'string') text = anyErr.error;
        else if (anyErr.error && anyErr.error.message) text = anyErr.error.message;
        else if (anyErr.message) text = anyErr.message;
        else text = JSON.stringify(anyErr);
      } catch {
        text = 'Erreur non sérialisable';
      }
    }
    console.error(prefix, err);
    this.report(`${prefix} échoué: ${text}`, 'error');
  }

  /* ---------- Users actions ---------- */
  openCreateUserModal(): void {
    const username = window.prompt('Nom (unique) :', '');
    if (!username) return;
    const email = window.prompt('Email :', '') || undefined;
    const roleInput = window.prompt("Rôle ('admin' ou 'user') :", 'user');
    if (!roleInput) return;
    const role = roleInput === 'admin' ? 'admin' : 'user';
    const password = window.prompt('Mot de passe (optionnel) :', '') || undefined;

    const body: Partial<User> & { password?: string } = {
      username,
      email,
      role,
      is_active: true,
      password
    };

    this.usersService.createUser(body).subscribe({
      next: () => {
        this.report('Utilisateur créé', 'success');
        this.loadUsers();
      },
      error: (err: unknown) => this.reportError('Création utilisateur', err)
    });
  }

  editUser(user: User): void {
    const newEmail = window.prompt('Nouvel email pour ' + (user.username ?? ''), user.email || '');
    if (newEmail == null) return;
    this.usersService.updateUser(user.id, { email: newEmail }).subscribe({
      next: () => {
        this.report('Utilisateur mis à jour', 'success');
        this.loadUsers();
      },
      error: (err: unknown) => this.reportError('Mise à jour utilisateur', err)
    });
  }

  deleteUser(user: User): void {
    if (user.username === this.currentUsername) {
      this.report("Vous ne pouvez pas supprimer l'utilisateur courant", 'error');
      return;
    }
    if (!confirm(`Supprimer l'utilisateur ${user.username ?? '#'+user.id} ?`)) return;
    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.report('Utilisateur supprimé', 'success');
        this.loadUsers();
      },
      error: (err: unknown) => this.reportError('Suppression utilisateur', err)
    });
  }

  /* ---------- Guides actions ---------- */
  viewGuide(guide: Guide): void {
    this.router.navigate(['/guide', guide.id]);
  }

  openCreateGuideModal(): void {
    const name = window.prompt('Nom du guide :', '');
    if (!name) return;
    const body: Partial<Guide> = { name };
    this.guidesService.createGuide(body).subscribe({
      next: () => {
        this.report('Guide créé', 'success');
        this.loadGuides();
      },
      error: (err: unknown) => this.reportError('Création guide', err)
    });
  }

  editGuide(guide: Guide): void {
    const current = (guide as any).name ?? (guide as any).title ?? '';
    const newName = window.prompt('Modifier le nom du guide :', current);
    if (newName == null) return;
    const body: Partial<Guide> = { name: newName };
    this.guidesService.updateGuide(guide.id, body).subscribe({
      next: () => {
        this.report('Guide mis à jour', 'success');
        this.loadGuides();
      },
      error: (err: unknown) => this.reportError('Mise à jour guide', err)
    });
  }

  deleteGuide(guide: Guide): void {
    if (!confirm(`Supprimer le guide "${(guide as any).name ?? (guide as any).title ?? guide.id}" ?`)) return;
    this.guidesService.deleteGuide(guide.id).subscribe({
      next: () => {
        this.report('Guide supprimé', 'success');
        this.loadGuides();
      },
      error: (err: unknown) => this.reportError('Suppression guide', err)
    });
  }

  /* ---------- Invitations actions ---------- */
  openCreateInvitationModal(): void {
    const invited_email = window.prompt("Email de l'invité :", '');
    if (!invited_email) return;

    const defaultGuideId = this.guides.length ? String(this.guides[0].id) : '';
    const guideIdStr = window.prompt('ID du guide à partager :', defaultGuideId);
    if (!guideIdStr) return;

    const guideId = Number(guideIdStr);
    if (Number.isNaN(guideId)) {
      this.report("ID du guide invalide", 'error');
      return;
    }

    const body = { invited_email, guide: guideId };
    this.invitesService.createInvitation(body).subscribe({
      next: () => {
        this.report('Invitation créée', 'success');
        this.loadInvitations();
      },
      error: (err: unknown) => this.reportError('Création invitation', err)
    });
  }

  deleteInvitation(inv: Invitation): void {
    if (!confirm(`Supprimer l'invitation #${inv.id} (${inv.invited_email || ''}) ?`)) return;
    this.invitesService.deleteInvitation(inv.id).subscribe({
      next: () => {
        this.report('Invitation supprimée', 'success');
        this.loadInvitations();
      },
      error: (err: unknown) => this.reportError('Suppression invitation', err)
    });
  }

  /* ---------- Mapping affichage ---------- */
  getGuideName(guideRef: any): string {
    if (!guideRef) return '';
    if (typeof guideRef === 'string') return guideRef;
    if ('name' in guideRef && guideRef.name) return String(guideRef.name);
    if ('title' in guideRef && guideRef.title) return String(guideRef.title);
    if ('id' in guideRef && guideRef.id) {
      const found = this.guides.find(g => g.id === guideRef.id);
      return (found?.name ?? (found as any)?.title ?? `#${(guideRef as any).id}`);
    }
    return JSON.stringify(guideRef);
  }

  getUserName(userRef: any): string {
    if (!userRef) return '';
    if (typeof userRef === 'string') return userRef;
    if ('username' in userRef && (userRef as any).username) return String((userRef as any).username);
    if ('name' in userRef && (userRef as any).name) return String((userRef as any).name);
    if ('email' in userRef && (userRef as any).email) return String((userRef as any).email);
    if ('id' in userRef && (userRef as any).id) {
      const found = this.users.find(u => u.id === (userRef as any).id);
      return (found?.username ?? (found as any)?.name ?? found?.email ?? `#${(userRef as any).id}`);
    }
    return JSON.stringify(userRef);
  }

  /* ---------- Sélections locales ---------- */
  getUserById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getGuideById(id: number): Guide | undefined {
    return this.guides.find(g => g.id === id);
  }
}
