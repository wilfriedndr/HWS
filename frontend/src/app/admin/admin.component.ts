import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { User, Guide, Invitation } from '../api.types';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
    activeTab = 'users';

    users: User[] = [];
    guides: Guide[] = [];
    invitations: Invitation[] = [];

    currentUsername = '';
    message = '';
    messageType: 'success' | 'error' = 'success';

    constructor(
        private authService: AuthService,
        private apiService: ApiService,
        private router: Router
    ) { }

    ngOnInit() {
        // vérifier les permissions admin
        this.currentUsername = this.authService.getCurrentUsername();
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/guides']);
            return;
        }

        this.loadUsers();
        this.loadGuides();
        this.loadInvitations();
    }

    setActiveTab(tab: string) {
        this.activeTab = tab;
    }

    // gestion des utilisateurs
    async loadUsers() {
        try {
            const response = await fetch('http://localhost:8000/api/users/', {
                headers: {
                    'Authorization': `Bearer ${this.authService.getToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.users = data.map((user: any) => ({
                    ...user,
                    role: (user.is_staff || user.is_superuser) ? 'admin' : 'user'
                }));
            }
        } catch (error) {
            this.showMessage('Erreur lors du chargement des utilisateurs', 'error');
        }
    }

    openCreateUserModal() {
        const username = prompt('Nom d\'utilisateur:');
        if (!username) return;

        const email = prompt('Email:');
        if (!email) return;

        const password = prompt('Mot de passe:');
        if (!password) return;

        const isStaff = confirm('Créer un administrateur?');

        this.createUser({ username, email, password, is_staff: isStaff });
    }

    async createUser(userData: any) {
        try {
            const response = await fetch('http://localhost:8000/api/users/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authService.getToken()}`
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                this.showMessage('Utilisateur créé avec succès', 'success');
                this.loadUsers();
            } else {
                const error = await response.json();
                this.showMessage(`Erreur: ${JSON.stringify(error)}`, 'error');
            }
        } catch (error) {
            this.showMessage('Erreur lors de la création', 'error');
        }
    }

    deleteUser(user: User) {
        if (!confirm(`Supprimer l'utilisateur ${user.username}?`)) return;

        this.removeUser(user.id);
    }

    async removeUser(userId: number) {
        try {
            const response = await fetch(`http://localhost:8000/api/users/${userId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authService.getToken()}`
                }
            });

            if (response.ok) {
                this.showMessage('Utilisateur supprimé avec succès', 'success');
                this.loadUsers();
            } else {
                this.showMessage('Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            this.showMessage('Erreur lors de la suppression', 'error');
        }
    }

    // gestion des guides
    loadGuides() {
        this.apiService.getAllGuides().subscribe({
            next: (guides: Guide[]) => {
                this.guides = guides;
            },
            error: (error: any) => {
                console.error('Erreur guides:', error);
                this.showMessage('Erreur lors du chargement des guides', 'error');
            }
        });
    }

    openCreateGuideModal() {
        const name = prompt('Nom du guide:');
        if (!name) return;

        const city = prompt('Ville:');
        if (!city) return;

        const category = prompt('Catégorie:');
        if (!category) return;

        const price = prompt('Prix:');
        if (!price) return;

        const people_max = prompt('Nombre maximum de personnes:');
        if (!people_max) return;

        this.createGuide({
            name,
            city,
            category,
            price: parseFloat(price),
            people_max: parseInt(people_max)
        });
    }

    async createGuide(guideData: any) {
        try {
            const response = await fetch('http://localhost:8000/api/guides/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authService.getToken()}`
                },
                body: JSON.stringify(guideData)
            });

            if (response.ok) {
                this.showMessage('Guide créé avec succès', 'success');
                this.loadGuides();
            } else {
                const error = await response.json();
                this.showMessage(`Erreur: ${JSON.stringify(error)}`, 'error');
            }
        } catch (error) {
            this.showMessage('Erreur lors de la création', 'error');
        }
    }

    viewGuide(guide: Guide) {
        this.router.navigate(['/guide', guide.id]);
    }

    editGuide(guide: Guide) {
        const name = prompt('Nouveau nom:', guide.name);
        if (!name || name === guide.name) return;

        this.updateGuide(guide.id, { name });
    }

    async updateGuide(guideId: number, guideData: any) {
        try {
            const response = await fetch(`http://localhost:8000/api/guides/${guideId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authService.getToken()}`
                },
                body: JSON.stringify(guideData)
            });

            if (response.ok) {
                this.showMessage('Guide modifié avec succès', 'success');
                this.loadGuides();
            } else {
                this.showMessage('Erreur lors de la modification', 'error');
            }
        } catch (error) {
            this.showMessage('Erreur lors de la modification', 'error');
        }
    }

    deleteGuide(guide: Guide) {
        if (!confirm(`Supprimer le guide ${guide.name}?`)) return;

        this.removeGuide(guide.id);
    }

    async removeGuide(guideId: number) {
        try {
            const response = await fetch(`http://localhost:8000/api/guides/${guideId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authService.getToken()}`
                }
            });

            if (response.ok) {
                this.showMessage('Guide supprimé avec succès', 'success');
                this.loadGuides();
            } else {
                this.showMessage('Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            this.showMessage('Erreur lors de la suppression', 'error');
        }
    }

    // gestion des invitations
    async loadInvitations() {
        try {
            const response = await fetch('http://localhost:8000/api/invitations/', {
                headers: {
                    'Authorization': `Bearer ${this.authService.getToken()}`
                }
            });

            if (response.ok) {
                this.invitations = await response.json();
            }
        } catch (error) {
            this.showMessage('Erreur lors du chargement des invitations', 'error');
        }
    }

    openCreateInvitationModal() {
        if (this.guides.length === 0 || this.users.length === 0) {
            this.showMessage('Chargement des données en cours...', 'error');
            return;
        }

        const guideId = prompt(`ID du guide (${this.guides.map(g => `${g.id}: ${g.name}`).join(', ')}):`);
        if (!guideId) return;

        const userId = prompt(`ID de l'utilisateur (${this.users.filter(u => u.role !== 'admin').map(u => `${u.id}: ${u.username}`).join(', ')}):`);
        if (!userId) return;

        this.createInvitation({
            guide: parseInt(guideId),
            invited_user: parseInt(userId)
        });
    }

    async createInvitation(invitationData: any) {
        try {
            const response = await fetch('http://localhost:8000/api/invitations/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authService.getToken()}`
                },
                body: JSON.stringify(invitationData)
            });

            if (response.ok) {
                this.showMessage('Invitation créée avec succès', 'success');
                this.loadInvitations();
            } else {
                const error = await response.json();
                this.showMessage(`Erreur: ${JSON.stringify(error)}`, 'error');
            }
        } catch (error) {
            this.showMessage('Erreur lors de la création de l\'invitation', 'error');
        }
    }

    deleteInvitation(invitation: Invitation) {
        if (!confirm(`Supprimer l'invitation pour ${this.getUserName(invitation.invited_user)}?`)) return;

        this.removeInvitation(invitation.id);
    }

    async removeInvitation(invitationId: number) {
        try {
            const response = await fetch(`http://localhost:8000/api/invitations/${invitationId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authService.getToken()}`
                }
            });

            if (response.ok) {
                this.showMessage('Invitation supprimée avec succès', 'success');
                this.loadInvitations();
            } else {
                this.showMessage('Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            this.showMessage('Erreur lors de la suppression', 'error');
        }
    }

    // gestion des messages
    showMessage(message: string, type: 'success' | 'error') {
        this.message = message;
        this.messageType = type;

        setTimeout(() => {
            this.clearMessage();
        }, 5000);
    }

    clearMessage() {
        this.message = '';
    }

    // helpers pour les invitations
    getGuideName(guideId: number): string {
        const guide = this.guides.find(g => g.id === guideId);
        return guide ? guide.name : `Guide #${guideId}`;
    }

    getUserName(userId: number): string {
        const user = this.users.find(u => u.id === userId);
        return user ? user.username : `User #${userId}`;
    }
}
