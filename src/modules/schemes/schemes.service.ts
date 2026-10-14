import { Injectable, NotFoundException } from '@nestjs/common';
import { IScheme, SchemesRepository } from './repositories/schemes.repository';

@Injectable()
export class SchemesService {
  constructor(private readonly schemesRepo: SchemesRepository) {}

  async getAllSchemes(stateName?: string, cropId?: number): Promise<IScheme[]> {
    return this.schemesRepo.findAll(stateName, cropId);
  }

  async getSchemeById(schemeId: number): Promise<IScheme> {
    const scheme = await this.schemesRepo.findById(schemeId);
    if (!scheme) {
      throw new NotFoundException(`Government scheme with ID ${schemeId} not found`);
    }
    return scheme;
  }
}
