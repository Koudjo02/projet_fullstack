import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // "inject" permet de récupérer une instance d'un service, même dans
  // une fonction simple comme celle-ci (pas une classe avec constructor)
  const authService = inject(Auth);
  const token = authService.getToken();

  if (token) {
    // Une requête HTTP en Angular est "immuable" — on ne peut pas juste
    // faire req.headers = ... . Il faut cloner la requête en lui ajoutant
    // le nouveau header, puis transmettre cette copie modifiée
    const clonedRequest = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(clonedRequest);
  }

  // Si pas de token (utilisateur pas connecté), on laisse passer
  // la requête telle quelle, sans rien ajouter
  return next(req);
};