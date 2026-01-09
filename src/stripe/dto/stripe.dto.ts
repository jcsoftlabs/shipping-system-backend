import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
    @ApiProperty({
        description: 'Montant en dollars',
        example: 50.00,
    })
    @IsNumber()
    @Min(0.5)
    amount: number;

    @ApiPropertyOptional({
        description: 'Devise (USD par défaut)',
        example: 'usd',
        default: 'usd',
    })
    @IsOptional()
    @IsString()
    currency?: string = 'usd';

    @ApiPropertyOptional({
        description: 'ID de la facture',
        example: 'uuid',
    })
    @IsOptional()
    @IsString()
    invoiceId?: string;
}

export class ConfirmPaymentDto {
    @ApiProperty({
        description: 'ID du Payment Intent',
        example: 'pi_xxx',
    })
    @IsString()
    paymentIntentId: string;

    @ApiProperty({
        description: 'ID de la méthode de paiement',
        example: 'pm_xxx',
    })
    @IsString()
    paymentMethodId: string;
}
