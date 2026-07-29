import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NavItem {
  label: string;
  href: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
})
export class Header {
  navItems: NavItem[] = [
    { label: 'Football', href: '#sports' },
    { label: 'Basketball', href: '#sports' },
    { label: 'Tennis', href: '#sports', disabled: true },
    { label: 'Handball', href: '#sports', disabled: true },
  ];

  // Gère l'ouverture/fermeture du menu mobile
  isMobileMenuOpen = signal(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
