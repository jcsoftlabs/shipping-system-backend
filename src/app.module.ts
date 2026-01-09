import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ParcelModule } from './parcel/parcel.module';
import { NotificationModule } from './notification/notification.module';
import { AuditModule } from './audit/audit.module';
import { BillingModule } from './billing/billing.module';
import { EmailModule } from './email/email.module';
import { PhotoModule } from './photo/photo.module';
import { AddressModule } from './address/address.module';
import { StripeModule } from './stripe/stripe.module';
import { UserModule } from './user/user.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';

// Import entities
import { User } from './entities/user.entity';
import { Parcel } from './entities/parcel.entity';
import { ParcelCategory } from './entities/parcel-category.entity';
import { ParcelStatusHistory } from './entities/parcel-status-history.entity';
import { CustomAddress } from './entities/custom-address.entity';
import { AddressCounter } from './entities/address-counter.entity';
import { AddressGenerationLog } from './entities/address-generation-log.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment } from './entities/payment.entity';
import { ParcelPhoto } from './entities/parcel-photo.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Notification } from './entities/notification.entity';
import { CompanySettings } from './entities/company-settings.entity';
import { HubAddress } from './entities/hub-address.entity';

@Module({
    imports: [
        // Configuration globale
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // TypeORM avec configuration dynamique
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DATABASE_HOST'),
                port: configService.get('DATABASE_PORT'),
                username: configService.get('DATABASE_USER'),
                password: configService.get('DATABASE_PASSWORD'),
                database: configService.get('DATABASE_NAME'),
                entities: [
                    User,
                    Parcel,
                    ParcelCategory,
                    ParcelStatusHistory,
                    CustomAddress,
                    AddressCounter,
                    AddressGenerationLog,
                    Invoice,
                    InvoiceItem,
                    Payment,
                    ParcelPhoto,
                    AuditLog,
                    Notification,
                    CompanySettings,
                    HubAddress,
                ],
                synchronize: false, // IMPORTANT: false en production
                logging: configService.get('NODE_ENV') === 'development',
                ssl: {
                    rejectUnauthorized: false,
                },
            }),
            inject: [ConfigService],
        }),

        // Modules de l'application
        StripeModule,
        AuthModule,
        UserModule,
        ParcelModule,
        NotificationModule,
        AuditModule,
        BillingModule,
        EmailModule,
        PhotoModule,
        AddressModule,
        SettingsModule,
        AdminModule,
    ],
})
export class AppModule { }

export class AppModule { }
