import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Active la validation automatique des DTO sur toutes les routes
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Autorise les requêtes venant du frontend Angular (localhost:4200)
  // "credentials: true" permet d'envoyer des cookies/headers d'authentification
  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();