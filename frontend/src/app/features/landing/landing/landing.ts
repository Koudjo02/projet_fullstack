import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Header } from '../../../shared/components/header/header';

interface Feature {
  icon: string; // nom du SVG à afficher (voir template)
  title: string;
  desc: string;
}
interface Sport {
  name: string;
  icon: string;
  desc: string;
  format: string;
  comingSoon?: boolean;
}
interface FooterGroup {
  title: string;
  links: string[];
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, Header],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})

export class Landing {
  features: Feature[] = [
    { icon: 'calendar', title: 'Calendrier automatique', desc: "Générez poules et rencontres en un clic, sans conflit d'horaire." },
    { icon: 'list', title: 'Classements en direct', desc: 'Scores, points et différentiels mis à jour instantanément.' },
    { icon: 'users', title: 'Gestion des équipes', desc: 'Inscriptions, effectifs et feuilles de match centralisés.' },
    { icon: 'share', title: 'Partage public', desc: 'Un lien pour suivre le tournoi, accessible à tous les fans.' },
    { icon: 'zap', title: 'Résultats en temps réel', desc: 'Saisissez un score, tout le tableau se met à jour aussitôt.' },
    { icon: 'shield', title: 'Arbitrage fiable', desc: 'Rôles et validations pour des compétitions sans contestation.' },
  ];

  sports: Sport[] = [
  {
    name: 'Football',
    icon: 'circle',
    desc: 'Poules, phases finales et classements en temps réel pour vos tournois à 11, 7 ou 5.',
    format: 'Élimination · Championnat',
  },
  {
    name: 'Basketball',
    icon: 'circle-dot',
    desc: 'Gérez les scores par quart-temps, les feuilles de match et les statistiques joueurs.',
    format: '3x3 · 5x5',
  },
  {
    name: 'Tennis',
    icon: 'dumbbell',
    desc: 'Tableaux à élimination directe, têtes de série et suivi des sets automatisé.',
    format: 'Bientôt disponible',
    comingSoon: true,
  },
  {
    name: 'Handball',
    icon: 'trophy',
    desc: 'Calendrier, arbitrage et résultats centralisés pour toutes vos compétitions.',
    format: 'Bientôt disponible',
    comingSoon: true,
  },
];
footerGroups: FooterGroup[] = [
  { title: 'Sports', links: ['Football', 'Basketball', 'Tennis', 'Handball', 'Volleyball'] },
  { title: 'Plateforme', links: ['Fonctionnalités', 'Tarifs', 'Organisateurs', 'Nouveautés'] },
  { title: 'Ressources', links: ['Aide', 'Contact', 'Blog', 'Communauté'] },
];

currentYear = new Date().getFullYear();
}
