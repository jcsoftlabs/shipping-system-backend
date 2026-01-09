import { IsString, IsOptional, IsNumber, IsEnum, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateParcelDto {
    @ApiProperty({
        description: 'Code d\'adresse du client (ex: HT-MIA-01044/A)',
        example: 'HT-MIA-00001/A',
    })
    @IsString()
    @MaxLength(20)
    addressCode: string;

    @ApiPropertyOptional({
        description: 'ID de la catégorie du colis',
        example: 'uuid-category-id',
    })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({
        description: 'Transporteur (USPS, FedEx, UPS, DHL)',
        example: 'USPS',
    })
    @IsOptional()
    @IsString()
    carrier?: string;

    @ApiPropertyOptional({
        description: 'Numéro de suivi du transporteur',
        example: '9400111899562941234567',
    })
    @IsOptional()
    @IsString()
    carrierTrackingNumber?: string;

    @ApiPropertyOptional({
        description: 'Description du contenu',
        example: 'iPhone 15 Pro',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Poids en livres',
        example: 1.5,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    weight?: number;

    @ApiPropertyOptional({
        description: 'Longueur en pouces',
        example: 6.0,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    length?: number;

    @ApiPropertyOptional({
        description: 'Largeur en pouces',
        example: 3.0,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    width?: number;

    @ApiPropertyOptional({
        description: 'Hauteur en pouces',
        example: 0.5,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    height?: number;

    @ApiPropertyOptional({
        description: 'Valeur déclarée en USD',
        example: 999.00,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    declaredValue?: number;

    @ApiPropertyOptional({
        description: 'Code de l\'entrepôt',
        example: 'MIA',
    })
    @IsOptional()
    @IsString()
    warehouse?: string;

    @ApiPropertyOptional({
        description: 'Notes publiques',
    })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({
        description: 'Notes internes (non visibles par le client)',
    })
    @IsOptional()
    @IsString()
    internalNotes?: string;
}
