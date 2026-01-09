import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParcelStatus } from '../../entities/parcel.entity';

export class UpdateParcelStatusDto {
    @ApiProperty({
        description: 'Nouveau statut du colis',
        enum: ParcelStatus,
        example: ParcelStatus.IN_TRANSIT,
    })
    @IsEnum(ParcelStatus)
    newStatus: ParcelStatus;

    @ApiPropertyOptional({
        description: 'Localisation actuelle',
        example: 'Port-au-Prince Customs',
    })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({
        description: 'Description du changement',
        example: 'Colis arrivé en douane',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Métadonnées supplémentaires',
    })
    @IsOptional()
    @IsObject()
    metadata?: any;
}
