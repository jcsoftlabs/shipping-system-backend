import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    from?: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly from: string;

    constructor(private configService: ConfigService) {
        this.from = this.configService.get('EMAIL_FROM') || 'noreply@shipping-ht.com';
    }

    /**
     * Envoie un email
     * Pour l'instant, log seulement. Intégration SendGrid à faire.
     */
    async sendEmail(options: EmailOptions): Promise<void> {
        this.logger.log(`Sending email to ${options.to}: ${options.subject}`);

        // TODO: Intégrer SendGrid
        // const sgMail = require('@sendgrid/mail');
        // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        // await sgMail.send({
        //   to: options.to,
        //   from: options.from || this.from,
        //   subject: options.subject,
        //   text: options.text,
        //   html: options.html,
        // });

        // Pour l'instant, simuler l'envoi
        this.logger.log(`Email sent successfully to ${options.to}`);
    }

    /**
     * Envoie un email de bienvenue
     */
    async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
        await this.sendEmail({
            to: email,
            subject: 'Bienvenue sur Shipping HT',
            html: `
        <h1>Bienvenue ${firstName} !</h1>
        <p>Votre compte a été créé avec succès.</p>
        <p>Vous pouvez maintenant commencer à utiliser notre plateforme de shipping.</p>
      `,
        });
    }

    /**
     * Envoie un email de notification de colis reçu
     */
    async sendParcelReceivedEmail(
        email: string,
        trackingNumber: string,
        description: string,
    ): Promise<void> {
        await this.sendEmail({
            to: email,
            subject: `Colis reçu - ${trackingNumber}`,
            html: `
        <h1>Votre colis a été reçu !</h1>
        <p><strong>Numéro de suivi:</strong> ${trackingNumber}</p>
        <p><strong>Description:</strong> ${description}</p>
        <p>Nous vous tiendrons informé de son acheminement vers Haïti.</p>
      `,
        });
    }

    /**
     * Envoie un email de changement de statut
     */
    async sendStatusChangeEmail(
        email: string,
        trackingNumber: string,
        oldStatus: string,
        newStatus: string,
    ): Promise<void> {
        const statusMessages: Record<string, string> = {
            RECU_USA: 'reçu à l\'entrepôt USA',
            EN_TRANSIT: 'en transit vers Haïti',
            INVENTAIRE_HT: 'arrivé en Haïti et en inventaire',
            DISPONIBLE: 'disponible pour retrait',
            LIVRE: 'livré',
            BLOQUE: 'bloqué - veuillez nous contacter',
        };

        await this.sendEmail({
            to: email,
            subject: `Mise à jour - ${trackingNumber}`,
            html: `
        <h1>Mise à jour de votre colis</h1>
        <p><strong>Numéro de suivi:</strong> ${trackingNumber}</p>
        <p><strong>Nouveau statut:</strong> ${statusMessages[newStatus] || newStatus}</p>
        <p>Votre colis ${statusMessages[newStatus]}.</p>
      `,
        });
    }

    /**
     * Envoie un email de facture générée
     */
    async sendInvoiceEmail(
        email: string,
        invoiceNumber: string,
        total: number,
    ): Promise<void> {
        await this.sendEmail({
            to: email,
            subject: `Nouvelle facture - ${invoiceNumber}`,
            html: `
        <h1>Nouvelle facture disponible</h1>
        <p><strong>Numéro de facture:</strong> ${invoiceNumber}</p>
        <p><strong>Montant total:</strong> $${total.toFixed(2)}</p>
        <p>Veuillez procéder au paiement dans les 30 jours.</p>
      `,
        });
    }
}
