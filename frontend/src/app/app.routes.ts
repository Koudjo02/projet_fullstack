import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Callback } from './features/auth/callback/callback';
import { Landing } from './features/landing/landing/landing';

export const routes: Routes = [
  { path: 'login', component: Login },
    { path: '', component: Landing },
  { path: 'auth/callback', component: Callback },
];
