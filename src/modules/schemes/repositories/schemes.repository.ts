import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../../../database/database.service';

export interface IScheme {
  schemeId: number;
  schemeName: string;
  description: string;
  stateName?: string | null;
  cropId?: number | null;
  cropName?: string | null;
  applyLink?: string | null;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class SchemesRepository {
  private readonly logger = new Logger(SchemesRepository.name);

  constructor(private readonly database: DatabaseService) {}

  async findAll(stateName?: string, cropId?: number): Promise<IScheme[]> {
    let sql = `
      SELECT
        s.scheme_id     AS schemeId,
        s.scheme_name   AS schemeName,
        s.description   AS description,
        s.state_name    AS stateName,
        s.crop_id       AS cropId,
        c.crop_name     AS cropName,
        s.apply_link    AS applyLink,
        s.is_active     AS isActive,
        s.created_at    AS createdAt
      FROM schemes s
      LEFT JOIN crops c ON s.crop_id = c.crop_id
      WHERE s.is_active = TRUE
    `;

    const params: any[] = [];
    if (stateName) {
      sql += ` AND (s.state_name IS NULL OR s.state_name = ?)`;
      params.push(stateName);
    }
    if (cropId) {
      sql += ` AND (s.crop_id IS NULL OR s.crop_id = ?)`;
      params.push(cropId);
    }

    sql += ` ORDER BY s.scheme_name ASC`;

    try {
      const rows = await this.database.query<RowDataPacket[]>(sql, params);
      return rows.map((r: any) => ({
        schemeId: Number(r.schemeId),
        schemeName: r.schemeName,
        description: r.description,
        stateName: r.stateName,
        cropId: r.cropId ? Number(r.cropId) : null,
        cropName: r.cropName,
        applyLink: r.applyLink,
        isActive: Boolean(r.isActive),
        createdAt: new Date(r.createdAt),
      }));
    } catch {
      // Fallback seed schemes if table has not been populated yet
      return this.getFallbackSchemes(stateName);
    }
  }

  async findById(schemeId: number): Promise<IScheme | null> {
    try {
      const rows = await this.database.query<RowDataPacket[]>(
        `
          SELECT
            s.scheme_id   AS schemeId,
            s.scheme_name AS schemeName,
            s.description AS description,
            s.state_name  AS stateName,
            s.crop_id     AS cropId,
            c.crop_name   AS cropName,
            s.apply_link  AS applyLink,
            s.is_active   AS isActive,
            s.created_at  AS createdAt
          FROM schemes s
          LEFT JOIN crops c ON s.crop_id = c.crop_id
          WHERE s.scheme_id = ?
          LIMIT 1
        `,
        [schemeId],
      );

      if (!rows || rows.length === 0) return null;
      const r: any = rows[0];
      return {
        schemeId: Number(r.schemeId),
        schemeName: r.schemeName,
        description: r.description,
        stateName: r.stateName,
        cropId: r.cropId ? Number(r.cropId) : null,
        cropName: r.cropName,
        applyLink: r.applyLink,
        isActive: Boolean(r.isActive),
        createdAt: new Date(r.createdAt),
      };
    } catch {
      return null;
    }
  }

  private getFallbackSchemes(stateName?: string): IScheme[] {
    return [
      {
        schemeId: 1,
        schemeName: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        description:
          'Comprehensive crop insurance coverage against non-preventable natural risks from pre-sowing to post-harvest.',
        stateName: null,
        applyLink: 'https://pmfby.gov.in',
        isActive: true,
        createdAt: new Date(),
      },
      {
        schemeId: 2,
        schemeName: 'PM-Kisan Samman Nidhi',
        description:
          'Direct income support of ₹6,000 per year in 3 equal installments to eligible farmer families.',
        stateName: null,
        applyLink: 'https://pmkisan.gov.in',
        isActive: true,
        createdAt: new Date(),
      },
      {
        schemeId: 3,
        schemeName: 'Subsidized Micro-Irrigation Scheme (PMKSY)',
        description:
          'Up to 70% subsidy for small and marginal farmers on drip and sprinkler irrigation installations.',
        stateName: stateName || 'Gujarat',
        applyLink: 'https://pmksy.gov.in',
        isActive: true,
        createdAt: new Date(),
      },
      {
        schemeId: 4,
        schemeName: 'Kisan Credit Card (KCC) Scheme',
        description:
          'Affordable institutional credit up to ₹3 lakh at a concessional 4% interest rate with prompt repayment.',
        stateName: null,
        applyLink: 'https://www.myscheme.gov.in/schemes/kcc',
        isActive: true,
        createdAt: new Date(),
      },
    ];
  }
}
