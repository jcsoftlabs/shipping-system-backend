import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // CORS - Allow admin dashboard and client portal
    app.enableCors({
        origin: [
            'http://localhost:3001', // Admin dashboard
            'http://localhost:3002', // Client portal
            ...(process.env.CORS_ORIGIN?.split(',') || [])
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Validation globale
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Swagger Documentation
    const config = new DocumentBuilder()
        .setTitle('Shipping Platform API')
        .setDescription('API pour la plateforme de shipping USA → Haïti')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Auth', 'Authentification et autorisation')
        .addTag('Parcels', 'Gestion des colis')
        .addTag('Addresses', 'Gestion des adresses personnalisées')
        .addTag('Notifications', 'Notifications')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`
  🚀 Application is running on: http://localhost:${port}
  📚 Swagger documentation: http://localhost:${port}/api/docs
  `);
}

bootstrap();
