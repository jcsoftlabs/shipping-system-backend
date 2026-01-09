import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { BillingService } from '../billing/billing.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/stripe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentMethod } from '../entities/payment.entity';

@ApiTags('Stripe Payments')
@Controller('api/stripe')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StripeController {
    constructor(
        private readonly stripeService: StripeService,
        private readonly billingService: BillingService,
    ) { }

    /**
     * Créer un Payment Intent pour une facture
     */
    @Post('create-payment-intent')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Créer un Payment Intent Stripe' })
    @ApiResponse({ status: 200, description: 'Payment Intent créé' })
    async createPaymentIntent(
        @Body() createPaymentIntentDto: CreatePaymentIntentDto,
        @CurrentUser('id') userId: string,
    ) {
        // Vérifier que la facture appartient à l'utilisateur
        if (createPaymentIntentDto.invoiceId) {
            const invoice = await this.billingService.getInvoiceById(
                createPaymentIntentDto.invoiceId,
            );

            if (invoice.userId !== userId) {
                throw new Error('Unauthorized');
            }
        }

        const paymentIntent = await this.stripeService.createPaymentIntent(
            createPaymentIntentDto.amount,
            createPaymentIntentDto.currency,
            {
                userId,
                invoiceId: createPaymentIntentDto.invoiceId || '',
            },
        );

        return {
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            },
        };
    }

    /**
     * Confirmer un paiement et enregistrer dans la base
     */
    @Post('confirm-payment')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Confirmer un paiement Stripe' })
    @ApiResponse({ status: 200, description: 'Paiement confirmé' })
    async confirmPayment(
        @Body() confirmPaymentDto: ConfirmPaymentDto,
        @CurrentUser('id') userId: string,
    ) {
        // Récupérer le Payment Intent
        const paymentIntent = await this.stripeService.getPaymentIntent(
            confirmPaymentDto.paymentIntentId,
        );

        // Vérifier que le paiement est réussi
        if (paymentIntent.status !== 'succeeded') {
            throw new Error('Payment not succeeded');
        }

        // Enregistrer le paiement dans la base
        const invoiceId = paymentIntent.metadata.invoiceId;
        if (invoiceId) {
            const payment = await this.billingService.recordPayment(
                invoiceId,
                paymentIntent.amount / 100, // Convertir centimes en dollars
                PaymentMethod.CARD,
                paymentIntent.id,
            );

            return {
                success: true,
                message: 'Payment confirmed and recorded',
                data: payment,
            };
        }

        return {
            success: true,
            message: 'Payment confirmed',
            data: paymentIntent,
        };
    }

    /**
     * Récupérer le statut d'un Payment Intent
     */
    @Get('payment-intent/:id')
    @ApiOperation({ summary: 'Récupérer un Payment Intent' })
    async getPaymentIntent(@Param('id') id: string) {
        const paymentIntent = await this.stripeService.getPaymentIntent(id);

        return {
            success: true,
            data: {
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                metadata: paymentIntent.metadata,
            },
        };
    }
}
