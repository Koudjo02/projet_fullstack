import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { createTestUser, prisma } from './utils/create-test-user';

describe('Babi Soccer - parcours complet (e2e)', () => {
  let app: INestApplication;

  // Variables partagées entre les tests, remplies au fur et à mesure
  // (chaque étape dépend souvent du résultat de la précédente,
  // exactement comme quand tu testais à la main dans Thunder Client)
  let adminToken: string;
  let adminId: number;
  let tournamentId: number;
  let inviteCode: string;

  let captain1Token: string;
  let captain1Id: number;
  let team1Id: number;

  let captain2Token: string;
  let captain2Id: number;
  let team2Id: number;

  let matchId: number;

  // beforeAll s'exécute UNE SEULE FOIS avant tous les tests de ce fichier
  // (contrairement à beforeEach qui s'exécuterait avant CHAQUE test)
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // On applique EXACTEMENT la même config que dans main.ts,
    // sinon les tests ne refléteraient pas le vrai comportement de l'app
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();

    // Prépare 2 capitaines pour pouvoir créer 2 équipes qui s'affrontent
    const admin = await createTestUser();
    adminToken = admin.token;
    adminId = admin.user.id;

    const c1 = await createTestUser();
    captain1Token = c1.token;
    captain1Id = c1.user.id;

    const c2 = await createTestUser();
    captain2Token = c2.token;
    captain2Id = c2.user.id;
  });

  // afterAll s'exécute une fois à la fin : on ferme proprement les connexions
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('Users', () => {
    it("GET /users/me renvoie le profil de l'utilisateur connecté", async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(adminId);
      expect(res.body.profileCompleted).toBe(false);
    });

    it('GET /users/me sans token renvoie 401', async () => {
      // Test négatif important : vérifie que JwtAuthGuard bloque bien
      // les requêtes non authentifiées
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('PATCH /users/me complète le profil et passe profileCompleted à true', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `admin_${adminId}`,
          gender: 'HOMME',
          phoneNumber: `010203${adminId}`, // unique grâce à l'id
        })
        .expect(200);

      expect(res.body.profileCompleted).toBe(true);
    });
  });

  describe('Tournaments', () => {
    it("POST /tournaments crée un tournoi et génère un inviteCode", async () => {
      const res = await request(app.getHttpServer())
        .post('/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Tournoi de test automatisé' })
        .expect(201);

      tournamentId = res.body.id;
      inviteCode = res.body.inviteCode;

      expect(inviteCode).toBeDefined();
      expect(res.body.adminId).toBe(adminId);
    });

    it("un participant peut rejoindre le tournoi via l'inviteCode (simulé)", async () => {
      // On ne peut pas tester la vraie route /auth/google (nécessite Google),
      // donc on simule directement ce que ferait auth.service.ts :
      // inscrire l'utilisateur comme TournamentParticipant
      await prisma.tournamentParticipant.create({
        data: { tournamentId, userId: captain1Id },
      });
      await prisma.tournamentParticipant.create({
        data: { tournamentId, userId: captain2Id },
      });

      const res = await request(app.getHttpServer())
        .get(`/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.participants).toHaveLength(2);
    });

    it('PATCH .../promote refuse un non-admin', async () => {
      // Sécurité : captain1 essaie de se promouvoir lui-même → doit échouer
      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/participants/${captain1Id}/promote`)
        .set('Authorization', `Bearer ${captain1Token}`)
        .send({ role: 'CAPTAIN' })
        .expect(403);
    });

    it("PATCH .../promote fonctionne pour l'admin", async () => {
      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/participants/${captain1Id}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'CAPTAIN' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/participants/${captain2Id}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'CAPTAIN' })
        .expect(200);
    });
  });

  describe('Teams', () => {
    it('un simple PLAYER ne peut pas créer une équipe', async () => {
      // On recrée un participant PLAYER frais pour ce test précis
      const player = await createTestUser();
      await prisma.tournamentParticipant.create({
        data: { tournamentId, userId: player.user.id, role: 'PLAYER' },
      });

      await request(app.getHttpServer())
        .post('/teams')
        .set('Authorization', `Bearer ${player.token}`)
        .send({ tournamentId, name: 'Équipe refusée' })
        .expect(403);
    });

    it('un CAPTAIN peut créer son équipe', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/teams')
        .set('Authorization', `Bearer ${captain1Token}`)
        .send({ tournamentId, name: 'Les Lions Test' })
        .expect(201);
      team1Id = res1.body.id;

      const res2 = await request(app.getHttpServer())
        .post('/teams')
        .set('Authorization', `Bearer ${captain2Token}`)
        .send({ tournamentId, name: 'Les Aigles Test' })
        .expect(201);
      team2Id = res2.body.id;

      expect(team1Id).not.toBe(team2Id);
    });
  });

  describe('Matches & Lineups', () => {
    it('POST /matches crée un match entre les 2 équipes (admin uniquement)', async () => {
      const res = await request(app.getHttpServer())
        .post('/matches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tournamentId, homeTeamId: team1Id, awayTeamId: team2Id })
        .expect(201);

      matchId = res.body.id;
    });

    it('le capitaine soumet sa composition', async () => {
      const res = await request(app.getHttpServer())
        .post(`/matches/${matchId}/lineups`)
        .set('Authorization', `Bearer ${captain1Token}`)
        .send({
          teamId: team1Id,
          slots: [
            { userId: captain1Id, position: 'ATT', jerseyNumber: 10, isStarter: true },
          ],
        })
        .expect(201);

      expect(res.body.slots).toHaveLength(1);
    });

    it('le tableau tactique combine les 2 équipes', async () => {
      // Composition de la 2ᵉ équipe, nécessaire pour que le tableau
      // tactique ait bien 2 lineups à combiner
      await request(app.getHttpServer())
        .post(`/matches/${matchId}/lineups`)
        .set('Authorization', `Bearer ${captain2Token}`)
        .send({
          teamId: team2Id,
          slots: [
            { userId: captain2Id, position: 'ATT', jerseyNumber: 9, isStarter: true },
          ],
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/matches/${matchId}/tactical-board`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.lineups).toHaveLength(2);
    });
  });

  describe('Messages (groupe)', () => {
    let messageId: number;

    it('un membre peut écrire dans le chat de son équipe', async () => {
      const res = await request(app.getHttpServer())
        .post(`/teams/${team1Id}/messages`)
        .set('Authorization', `Bearer ${captain1Token}`)
        .send({ content: 'Message de test' })
        .expect(201);

      messageId = res.body.id;
    });

    it("un non-membre ne peut pas écrire dans une équipe qui n'est pas la sienne", async () => {
      await request(app.getHttpServer())
        .post(`/teams/${team1Id}/messages`)
        .set('Authorization', `Bearer ${captain2Token}`) // capitaine de l'AUTRE équipe
        .send({ content: 'Intrusion' })
        .expect(403);
    });

    it("seul l'auteur peut modifier son message", async () => {
      await request(app.getHttpServer())
        .patch(`/teams/${team1Id}/messages/${messageId}`)
        .set('Authorization', `Bearer ${captain2Token}`) // pas l'auteur
        .send({ content: 'Tentative de modif' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/teams/${team1Id}/messages/${messageId}`)
        .set('Authorization', `Bearer ${captain1Token}`) // le vrai auteur
        .send({ content: 'Message modifié' })
        .expect(200);
    });
  });

  describe('Conversations (privées)', () => {
    let conversationId: number;

    it('POST /conversations/with/:userId crée la conversation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/conversations/with/${captain2Id}`)
        .set('Authorization', `Bearer ${captain1Token}`)
        .expect(201);

      conversationId = res.body.id;
    });

    it('impossible de démarrer une conversation avec soi-même', async () => {
      await request(app.getHttpServer())
        .post(`/conversations/with/${captain1Id}`)
        .set('Authorization', `Bearer ${captain1Token}`)
        .expect(403);
    });

    it("la conversation est la même peu importe qui l'initie (test du tri userA/userB)", async () => {
      const res = await request(app.getHttpServer())
        .post(`/conversations/with/${captain1Id}`)
        .set('Authorization', `Bearer ${captain2Token}`) // sens inversé cette fois
        .expect(201);

      // Doit retrouver EXACTEMENT la même conversation, pas en créer une 2ème
      expect(res.body.id).toBe(conversationId);
    });

    it('envoi et lecture de messages privés', async () => {
      await request(app.getHttpServer())
        .post(`/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${captain1Token}`)
        .send({ content: 'Salut en privé' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${captain2Token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
    });

    it("un utilisateur extérieur ne peut pas lire la conversation", async () => {
      const outsider = await createTestUser();

      await request(app.getHttpServer())
        .get(`/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .expect(403);
    });
  });
});
