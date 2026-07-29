import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';

@Injectable()
export class TournamentsCrudService {
  constructor(private prisma: PrismaService) {}

  /**
   * Génère un code aléatoire à 12 caractères hexadécimaux pour les invitations
   */
  private generateInviteCode(): string {
    return randomBytes(6).toString('hex');
  }

  /**
   * Nettoie et transforme un nom de tournoi en URL lisible (slug).
   * N'ajoute un suffixe numérique QUE si le slug de base est déjà pris —
   * garde les URLs les plus courtes et mémorisables possible, important
   * pour une plateforme pensée pour être partagée (WhatsApp, réseaux sociaux).
   */
  private async generateSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // retire les accents
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.tournament.findUnique({ where: { slug } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Valide qu'un slug fourni manuellement par le client respecte le bon
   * format (minuscules, chiffres, tirets uniquement), et qu'il est libre.
   */
  private async validateCustomSlug(slug: string): Promise<void> {
    const isValidFormat = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
    if (!isValidFormat) {
      throw new BadRequestException(
        'Le slug ne doit contenir que des minuscules, chiffres et tirets',
      );
    }

    const existing = await this.prisma.tournament.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Ce slug est déjà utilisé par un autre tournoi');
    }
  }

  /**
   * Créer un nouveau tournoi.
   * L'utilisateur qui le crée est automatiquement désigné comme Administrateur du tournoi.
   */
  async create(adminId: number, dto: CreateTournamentDto) {
  // Vérifie si le créateur est SUPER_ADMIN, pour auto-approuver son propre tournoi
  const creator = await this.prisma.user.findUnique({
    where: { id: adminId },
    select: { platformRole: true },
  });
  const isSuperAdmin = creator?.platformRole === 'SUPER_ADMIN';

  let slug: string;
  if (dto.slug) {
    await this.validateCustomSlug(dto.slug);
    slug = dto.slug;
  } else {
    slug = await this.generateSlug(dto.name);
  }

  return this.prisma.tournament.create({
    data: {
      ...dto,
      slug,
      inviteCode: this.generateInviteCode(),
      adminId,
      isApproved: isSuperAdmin,
    },
  });
}
  /**
   * Mettre à jour les informations d'un tournoi (nom, dates, etc.)
   * Réservé uniquement à l'administrateur du tournoi.
   *
   * Le slug n'est JAMAIS régénéré automatiquement lors d'un changement de nom —
   * un lien déjà partagé (WhatsApp, réseaux sociaux) ne doit jamais casser.
   * Si l'admin veut vraiment changer son slug, il doit le faire explicitement
   * via le champ dédié dans UpdateTournamentDto.
   */
  async update(id: number, userId: number, dto: UpdateTournamentDto) {
    // 1. Vérifier si le tournoi existe et n'est pas supprimé
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament || tournament.deletedAt) {
      throw new NotFoundException('Tournoi introuvable');
    }

    // 2. Sécurité : Seul l'Admin du tournoi a le droit d'éditer
    if (tournament.adminId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce tournoi");
    }

    // 3. Si l'admin fournit explicitement un nouveau slug, on le valide.
    // Sinon, on garde le slug existant tel quel, même si le nom change.
    let slug = tournament.slug;
    if (dto.slug && dto.slug !== tournament.slug) {
      await this.validateCustomSlug(dto.slug);
      slug = dto.slug;
    }

    // 4. Appliquer les modifications en BDD
    return this.prisma.tournament.update({
      where: { id },
      data: { ...dto, slug },
    });
  }

  /**
   * Récupérer la liste des tournois liés à un utilisateur (qu'il soit Admin ou Participant).
   * Exclut les tournois supprimés (soft delete).
   */
  async findAllForUser(userId: number) {
    return this.prisma.tournament.findMany({
      where: {
        deletedAt: null,
        OR: [
          { adminId: userId },
          { participants: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupérer les détails d'un tournoi spécifique avec ses participants et équipes.
   * Un tournoi supprimé (soft delete) est traité comme introuvable.
   */
  async findOne(id: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, name: true, avatarUrl: true },
            },
          },
        },
        teams: true,
      },
    });

    if (!tournament || tournament.deletedAt) {
      throw new NotFoundException('Tournoi introuvable');
    }

    return tournament;
  }

  /**
   * Supprime un tournoi — SOFT DELETE : on marque deletedAt plutôt que de
   * détruire la ligne, pour conserver l'historique (équipes, matchs, participants
   * restent consultables/archivés, rien n'est perdu définitivement).
   * Réservé uniquement à l'administrateur du tournoi.
   */
  async remove(id: number, requesterId: number) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });

    if (!tournament || tournament.deletedAt) {
      throw new NotFoundException('Tournoi introuvable');
    }

    if (tournament.adminId !== requesterId) {
      throw new ForbiddenException("Seul l'administrateur du tournoi peut le supprimer");
    }

    return this.prisma.tournament.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
  // Liste publique des tournois — accessible SANS authentification
async findPublicTournaments(filters: { city?: string; sport?: string; status?: string }) {
  return this.prisma.tournament.findMany({
    where: {
      isPublic: true,
      isApproved: true,
      deletedAt: null,
      ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' } }),
      ...(filters.sport && { sport: filters.sport as any }),
      ...(filters.status && { status: filters.status as any }),
    },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true, name: true, slug: true, description: true, city: true,
      location: true, logoUrl: true, bannerUrl: true, sport: true,
      format: true, status: true, maxTeams: true, price: true, reward: true,
      startDate: true, registrationDeadline: true, isFeatured: true,
      _count: { select: { teams: true } },
    },
  });
}

// Détail public d'un tournoi via son slug — pour la page de partage
async findBySlug(slug: string) {
  const tournament = await this.prisma.tournament.findFirst({
    where: { slug, isPublic: true, deletedAt: null },
    select: {
      id: true, name: true, slug: true, description: true, city: true,
      location: true, logoUrl: true, bannerUrl: true, sport: true,
      format: true, status: true, maxTeams: true, price: true, reward: true,
      startDate: true, endDate: true, registrationDeadline: true, isApproved: true,
      admin: { select: { id: true, username: true, name: true, avatarUrl: true } },
      _count: { select: { teams: true, participants: true } },
    },
  });

  if (!tournament) {
    throw new NotFoundException('Tournoi introuvable');
  }

  return tournament;
}
}
