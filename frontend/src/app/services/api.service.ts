import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Guide, Activity } from '../api.types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  getMyGuides() {
    return this.http.get<Guide[]>('/api/guides/');
  }

  getGuide(id: number) {
    return this.http.get<Guide>(`/api/guides/${id}/`);
  }

  getGuideActivities(guideId: number) {
    return this.http.get<Activity[]>(`/api/guides/${guideId}/activities/`);
  }
}
