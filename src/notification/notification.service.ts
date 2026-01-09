import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from '../entities/notification.entity';
import { Parcel, ParcelStatus } from '../entities/parcel.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
        private emailService: EmailService,
    ) { }

    /**
     * Notifie le client qu'un colis a été reçu
     */
    async notifyParcelReceived(userId: string, parcel: Parcel): Promise<void> {
        try {
            const notification = this.notificationRepository.create({
                userId,
                type: NotificationType.EMAIL,
                channel: 'email',
                subject: 'Colis reçu à l\'entrepôt',
                message: `Votre colis ${parcel.trackingNumber} a été reçu à notre entrepôt de ${parcel.warehouse}.`,
                data: {
                    trackingNumber: parcel.trackingNumber,
                    status: parcel.status,
                    parcelId: parcel.id,
                },
                status: NotificationStatus.PENDING,
            });

            await this.notificationRepository.save(notification);

            // Envoyer l'email réel
            if (parcel.user?.email) {
                await this.emailService.sendParcelReceivedEmail(
                    parcel.user.email,
                    parcel.trackingNumber,
                    parcel.description || 'Votre colis',
                );
                notification.status = NotificationStatus.SENT;
                notification.sentAt = new Date();
                await this.notificationRepository.save(notification);
            }

            this.logger.log(`Notification created for parcel ${parcel.trackingNumber}`);
        } catch (error) {
            this.logger.error(`Failed to create notification: ${error.message}`);
        }
    }

    /**
     * Notifie le client d'un changement de statut
     */
    async notifyStatusChange(
        userId: string,
        parcel: Parcel,
        oldStatus: ParcelStatus,
        newStatus: ParcelStatus,
    ): Promise<void> {
        try {
            const statusMessages: Record<ParcelStatus, string> = {
                [ParcelStatus.PENDING]: 'est en attente de réception',
                [ParcelStatus.RECEIVED]: 'a été reçu à l\'entrepôt',
                [ParcelStatus.PROCESSING]: 'est en cours de traitement',
                [ParcelStatus.READY]: 'est prêt à être expédié',
                [ParcelStatus.SHIPPED]: 'a été expédié',
                [ParcelStatus.IN_TRANSIT]: 'est en transit',
                [ParcelStatus.CUSTOMS]: 'est en douane',
                [ParcelStatus.OUT_FOR_DELIVERY]: 'est en cours de livraison',
                [ParcelStatus.DELIVERED]: 'a été livré',
                [ParcelStatus.EXCEPTION]: 'a rencontré un problème',
                [ParcelStatus.RETURNED]: 'a été retourné',
                [ParcelStatus.CANCELLED]: 'a été annulé',
            };

            const notification = this.notificationRepository.create({
                userId,
                type: NotificationType.EMAIL,
                channel: 'email',
                subject: `Mise à jour de votre colis ${parcel.trackingNumber}`,
                message: `Votre colis ${parcel.trackingNumber} ${statusMessages[newStatus]}.`,
                data: {
                    trackingNumber: parcel.trackingNumber,
                    oldStatus,
                    newStatus,
                    parcelId: parcel.id,
                },
                status: NotificationStatus.PENDING,
            });

            await this.notificationRepository.save(notification);

            // Envoyer l'email réel
            if (parcel.user?.email) {
                await this.emailService.sendStatusChangeEmail(
                    parcel.user.email,
                    parcel.trackingNumber,
                    oldStatus,
                    newStatus,
                );
                notification.status = NotificationStatus.SENT;
                notification.sentAt = new Date();
                await this.notificationRepository.save(notification);
            }

            this.logger.log(`Status change notification created for parcel ${parcel.trackingNumber}`);
        } catch (error) {
            this.logger.error(`Failed to create status change notification: ${error.message}`);
        }
    }
}
