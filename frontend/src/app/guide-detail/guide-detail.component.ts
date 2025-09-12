import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Guide, Activity } from '../api.types';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guide-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guide-detail.component.html',
  styleUrls: ['./guide-detail.component.scss']
})
export class GuideDetailComponent implements OnInit {
  guide: Guide | null = null;
  loading = true;
  error = '';
  activitiesByDay: { [key: number]: Activity[] } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadGuideDetail(+id);
    }
  }

  loadGuideDetail(id: number): void {
    this.loading = true;
    this.error = '';

    this.apiService.getMyGuides().subscribe({
      next: (guides) => {
        const guide = guides.find(g => g.id === id);
        if (guide) {
          this.guide = guide;
          this.loadActivities(id);
        } else {
          this.error = 'Guide non trouvé.';
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du guide:', error);
        this.error = 'Impossible de charger les détails du guide.';
        this.loading = false;
      }
    });
  }

  loadActivities(guideId: number): void {
    this.apiService.getGuideActivites(guideId).subscribe({
      next: (activities: Activity[]) => {
        if (this.guide) {
          this.guide.activities = activities;
          this.organizeActivitiesByDay();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des activités (endpoint imbriqué):', error);

        this.apiService.getActivitesByGuide(guideId).subscribe({
          next: (activities2: Activity[]) => {
            if (this.guide) {
              this.guide.activities = activities2;
              this.organizeActivitiesByDay();
            }
            this.loading = false;
          },
          error: (error2) => {
            console.error('Erreur lors du chargement des activités (fallback query):', error2);
            this.error = 'Impossible de charger les activités.';
            this.loading = false;
          }
        });
      }
    });
  }

  organizeActivitiesByDay(): void {
    if (!this.guide?.activities) return;

    this.activitiesByDay = {};
    this.guide.activities.forEach((activity: Activity) => {
      if (activity.day === undefined || activity.day === null) return;
      if (!this.activitiesByDay[activity.day]) {
        this.activitiesByDay[activity.day] = [];
      }
      this.activitiesByDay[activity.day].push(activity);
    });

    // Trier les activités par ordre dans chaque jour
    Object.keys(this.activitiesByDay).forEach(day => {
      this.activitiesByDay[+day].sort((a: Activity, b: Activity) => {
        const ao = a.order ?? 0;
        const bo = b.order ?? 0;
        return ao - bo;
      });
    });
  }

  getDays(): number[] {
    return Object.keys(this.activitiesByDay)
      .map(day => +day)
      .sort((a, b) => a - b);
  }

  getActivityCategoryLabel(category: string | undefined): string {
    if (!category) return 'Non spécifié';

    switch ((category || '').toLowerCase()) {
      case 'restaurant': return 'Restaurant';
      case 'visite': return 'Visite';
      case 'transport': return 'Transport';
      case 'hotel': return 'Hébergement';
      case 'activite': return 'Activité';
      case 'shopping': return 'Shopping';
      default: return category;
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
