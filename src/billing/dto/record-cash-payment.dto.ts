import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordCashPaymentDto {
    @ApiProperty({ example: 'invoice-uuid' })
    @IsString()
    invoiceId: string;

    @ApiProperty({ example: 100.50 })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiProperty({ example: 'Paiement reçu au bureau de Port-au-Prince', required: false })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ example: 'agent-uuid' })
    @IsString()
    receivedBy: string;
}
