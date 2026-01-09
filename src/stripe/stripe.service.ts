import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private stripe: Stripe;

    constructor(private configService: ConfigService) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

        if (!secretKey) {
            this.logger.warn('Stripe secret key not configured');
        } else {
            this.stripe = new Stripe(secretKey, {
                apiVersion: '2025-12-15.clover',
            });
            this.logger.log('Stripe initialized successfully');
        }
    }

    /**
     * Crée un Payment Intent pour un paiement
     */
    async createPaymentIntent(
        amount: number,
        currency: string = 'usd',
        metadata?: Record<string, string>,
    ): Promise<Stripe.PaymentIntent> {
        if (!this.stripe) {
            throw new BadRequestException('Stripe not configured');
        }

        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Stripe utilise les centimes
                currency,
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            this.logger.log(`Payment Intent created: ${paymentIntent.id}`);

            return paymentIntent;
        } catch (error) {
            this.logger.error(`Failed to create Payment Intent: ${error.message}`);
            throw new BadRequestException(`Stripe error: ${error.message}`);
        }
    }

    /**
     * Récupère un Payment Intent
     */
    async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        if (!this.stripe) {
            throw new BadRequestException('Stripe not configured');
        }

        try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (error) {
            this.logger.error(`Failed to retrieve Payment Intent: ${error.message}`);
            throw new BadRequestException(`Stripe error: ${error.message}`);
        }
    }

    /**
     * Confirme un Payment Intent
     */
    async confirmPaymentIntent(
        paymentIntentId: string,
        paymentMethodId: string,
    ): Promise<Stripe.PaymentIntent> {
        if (!this.stripe) {
            throw new BadRequestException('Stripe not configured');
        }

        try {
            const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
                payment_method: paymentMethodId,
            });

            this.logger.log(`Payment Intent confirmed: ${paymentIntent.id}`);

            return paymentIntent;
        } catch (error) {
            this.logger.error(`Failed to confirm Payment Intent: ${error.message}`);
            throw new BadRequestException(`Stripe error: ${error.message}`);
        }
    }

    /**
     * Crée un remboursement
     */
    async createRefund(
        paymentIntentId: string,
        amount?: number,
    ): Promise<Stripe.Refund> {
        if (!this.stripe) {
            throw new BadRequestException('Stripe not configured');
        }

        try {
            const refundData: Stripe.RefundCreateParams = {
                payment_intent: paymentIntentId,
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100);
            }

            const refund = await this.stripe.refunds.create(refundData);

            this.logger.log(`Refund created: ${refund.id}`);

            return refund;
        } catch (error) {
            this.logger.error(`Failed to create refund: ${error.message}`);
            throw new BadRequestException(`Stripe error: ${error.message}`);
        }
    }

    /**
     * Vérifie un webhook Stripe
     */
    constructWebhookEvent(
        payload: string | Buffer,
        signature: string,
        webhookSecret: string,
    ): Stripe.Event {
        if (!this.stripe) {
            throw new BadRequestException('Stripe not configured');
        }

        try {
            return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (error) {
            this.logger.error(`Webhook verification failed: ${error.message}`);
            throw new BadRequestException(`Webhook error: ${error.message}`);
        }
    }
}
