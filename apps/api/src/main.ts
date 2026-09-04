import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
// Load root .env so Prisma (reads process.env.DATABASE_URL) works when
// running from apps/api as well as from the repo root. Local files only.
for (const p of [join(process.cwd(), '.env'), join(process.cwd(), '..', '..', '.env')]) {
  if (existsSync(p)) {
    loadEnv({ path: p });
    break;
  }
}
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security hardening per §9 — Helmet + CORS restricted to FRONTEND_URL
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false, // Angular handles CSP via meta; Helmet default would block inline styles
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:4200'),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix per API contract §4 — /api/v1 is the versioned contract, but
  // health endpoints are intentionally unversioned per §4 table (GET /health).
  // We keep the Nest global prefix as 'api' (so health lives at /api/health and /api/v1/health via alias)
  // and add a second listener for bare /health via manual route handling in HealthController.
  // Phase 2 checkpoint expects GET /api/health -> 200, so we preserve that.
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Blood Donor Platform API')
    .setDescription('Production Blood Donor Management Platform API — Phase 2 Foundation')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`BloodHelp API listening on http://localhost:${port}/api/v1 — docs at /api/docs`);
}
bootstrap();
