import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as express from "express";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3000);
  const apiPrefix = configService.get<string>("API_PREFIX", "api/v1");

  // Security Middleware — allow CDN resources used by the frontend
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdnjs.cloudflare.com",
            "https://fonts.googleapis.com",
          ],
          fontSrc: [
            "'self'",
            "https://cdnjs.cloudflare.com",
            "https://fonts.gstatic.com",
            "data:",
          ],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: [
            "'self'",
            "https://api.bigdatacloud.net",
            "https://nominatim.openstreetmap.org",
            "https://api.whatsapp.com",
            "https://api.open-meteo.com",
          ],
        },
      },
    }),
  );
  app.enableCors();

  // Serve static files (frontend & uploaded media)
  app.use(express.static(join(__dirname, "..")));
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Global Prefix — exclude static frontend files from the API prefix
  app.setGlobalPrefix(apiPrefix, {
    exclude: ["/"],
  });

  // Global Pipes, Filters, Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Farmer Crop Advisory Platform API")
    .setDescription(
      "Multilingual decision-support platform for Indian farmers (NestJS + Raw SQL MySQL 8+)",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port, "0.0.0.0");
  logger.log(`🌱 Frontend UI:  http://localhost:${port}`);
  logger.log(`📡 API Server:   http://localhost:${port}/${apiPrefix}`);
  logger.log(`📖 Swagger Docs: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
