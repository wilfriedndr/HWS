import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GuidesService, Guide } from '../../services/guides.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  form: FormGroup;

  connected = false;
  loadingLogin = false;
  loginError = '';

  guides: Guide[] = [];
  guidesLoading = false;
  guidesError = '';

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private guidesService: GuidesService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.connected = this.auth.isAuthenticated();
    if (this.connected) this.fetchGuides();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  onSubmit(): void {
    if (this.form.invalid || this.loadingLogin) return;
    const { username, password } = this.form.value as { username: string; password: string };
    this.loadingLogin = true;
    this.loginError = '';

    this.auth.login(username, password).subscribe({
      next: () => {
        this.connected = true;
        this.loadingLogin = false;
        this.fetchGuides();
      },
      error: (err: any) => {
        this.loadingLogin = false;
        this.loginError = this.extractError(err);
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.connected = false;
    this.guides = [];
  }

  viewGuideDetails(id: number) {
    this.router.navigate(['/guide', id]);
  }

  private fetchGuides() {
    this.guidesLoading = true;
    this.guidesError = '';
    this.guidesService.listGuides().subscribe({
      next: (res: Guide[] | any) => {
        this.guides = res || [];
        this.guidesLoading = false;
      },
      error: (err: unknown) => {
        this.guidesLoading = false;
        this.guidesError = this.extractError(err);
      }
    });
  }

  private extractError(err: any): string {
    if (!err) return 'Erreur inconnue';
    if (typeof err === 'string') return err;
    if (err.error) {
      if (typeof err.error === 'string') return err.error;
      if (typeof err.error.detail === 'string') return err.error.detail;
      if (err.error.message) return err.error.message;
    }
    return err.message || 'Erreur réseau';
  }
}
