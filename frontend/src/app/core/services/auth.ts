import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  // URL de ton backend NestJS — en dur pour l'instant, on la rendra
  // configurable proprement plus tard avec les fichiers d'environnement
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  setToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getMyProfile() {
    return this.http.get(`${this.apiUrl}/users/me`);
  }
}
