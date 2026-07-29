import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-callback',
  imports: [],
  template: `<p>Connexion en cours...</p>`,
})
export class Callback implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private authService: Auth,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];

      if (token) {
        this.authService.setToken(token);
        console.log('Token stocké avec succès !');

        // On teste immédiatement un appel protégé avec ce token
        this.authService.getMyProfile().subscribe({
          next: (profile) => console.log('Profil récupéré :', profile),
          error: (err) => console.error('Erreur API :', err),
        });
      }
    });
  }
}
