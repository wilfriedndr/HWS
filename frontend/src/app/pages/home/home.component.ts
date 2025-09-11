import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Guide } from '../../api.types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export default class HomeComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  loadingLogin = false;
  loginError: string | null = null;

  guidesLoading = false;
  guidesError: string | null = null;
  guides: Guide[] = [];

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  get connected() { return this.auth.isAuthenticated(); }

  ngOnInit() {
    if (this.connected) this.loadGuides();
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loadingLogin = true;
    this.loginError = null;

    const { username, password } = this.form.value as { username: string; password: string };
    this.auth.login(username, password).subscribe({
      next: () => {
        this.loadingLogin = false;
        this.loadGuides();
      },
      error: (err) => {
        this.loadingLogin = false;
        this.loginError = err?.error?.detail ?? 'Échec de la connexion.';
      }
    });
  }

  loadGuides() {
    this.guidesLoading = true;
    this.guidesError = null;
    this.api.getMyGuides().subscribe({
      next: (data) => {
        this.guides = data;
        this.guidesLoading = false;
      },
      error: () => {
        this.guidesError = 'Impossible de charger les guides.';
        this.guidesLoading = false;
      }
    });
  }

  viewGuideDetails(guideId: number) {
    this.router.navigate(['/guide', guideId]);
  }

  logout() {
    this.auth.logout();
    this.guides = [];
  }
}
