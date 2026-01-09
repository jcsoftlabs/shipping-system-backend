import { IsArray, IsUUID, IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../entities/payment.entity';

export class GenerateInvoiceDto {
    @ApiProperty({
        description: 'IDs des colis à facturer',
        example: ['uuid1', 'uuid2'],
    })
    @IsArray()
    @IsUUID('4', { each: true })
    parcelIds: string[];
}

export class RecordPaymentDto {
    @ApiProperty({
        description: 'Montant du paiement',
        example: 50.00,
    })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiProperty({
        description: 'Méthode de paiement',
        enum: PaymentMethod,
        example: PaymentMethod.CARD,
    })
    @IsEnum(PaymentMethod)
    method: PaymentMethod;

    @ApiPropertyOptional({
        description: 'ID de transaction (Stripe, PayPal, etc.)',
        example: 'ch_3OxYZ123456789',
    })
    @IsOptional()
    @IsString()
    transactionId?: string;
}
