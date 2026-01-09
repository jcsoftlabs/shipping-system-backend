import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateAddressDto {
    @ApiProperty({
        description: 'Hub code (MIA, NYC, LAX)',
        example: 'MIA',
        default: 'MIA',
    })
    @IsOptional()
    @IsString()
    hub?: string = 'MIA';
}
