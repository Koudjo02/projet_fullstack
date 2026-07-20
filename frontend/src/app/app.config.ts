import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // provideHttpClient active HttpClient dans toute l'app.
    // withInterceptors permet d'injecter automatiquement le token JWT
    // sur CHAQUE requête sortante, sans avoir à le faire manuellement partout
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
