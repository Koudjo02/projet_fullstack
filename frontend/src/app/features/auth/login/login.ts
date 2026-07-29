import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginWithGoogle(): void {
    window.location.href = 'http://localhost:3000/auth/google';  }
}
