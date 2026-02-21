import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'fatal'],
    bodyParser: true,
    rawBody: true,
  });

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:3000', // Allow multiple origins from env or default to localhost
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // Allowed headers
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1', { exclude: ['/'] });

  // Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

  // Body parser custom limit
  app.useBodyParser('json', { limit: '10mb' });

  // Enable swagger docs
  const config = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription('API documentation for the Chat application')
    .setVersion('1.0')
    .addTag('Auth', 'Authentication related endpoints')
    .addTag('Chat', 'Chat related endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Enter JWT token in the format **Bearer &lt;token>** to access secured endpoints',
      },
      'JWT-auth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Refresh-JWT',
        description:
          'Enter refresh token in the format **Bearer &lt;token>** to refresh access tokens',
      },
      'JWT-refresh',
    )
    .addServer(
      process.env.API_SERVER_URL ?? 'http://localhost:3000',
      'Development server',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Chat Application API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar {
        display: none;
      }
      .swagger-ui .info {
        margin: 50px 0;
      }
      .swagger-ui .info .title {color: #4A90E2;}
    `,
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Start the server
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
