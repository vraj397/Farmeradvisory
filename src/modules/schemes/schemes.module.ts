import { Module } from '@nestjs/common';
import { SchemesRepository } from './repositories/schemes.repository';
import { SchemesController } from './schemes.controller';
import { SchemesService } from './schemes.service';

@Module({
  controllers: [SchemesController],
  providers: [SchemesService, SchemesRepository],
  exports: [SchemesService, SchemesRepository],
})
export class SchemesModule {}
