import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParcelService } from './parcel.service';
import { ParcelController } from './parcel.controller';
import { Parcel } from '../entities/parcel.entity';
import { CustomAddress } from '../entities/custom-address.entity';
import { ParcelCategory } from '../entities/parcel-category.entity';
import { ParcelStatusHistory } from '../entities/parcel-status-history.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { BillingModule } from '../billing/billing.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Parcel,
            CustomAddress,
            ParcelCategory,
            ParcelStatusHistory,
        ]),
        AuditModule,
        NotificationModule,
        BillingModule,
    ],
    controllers: [ParcelController],
    providers: [ParcelService],
    exports: [ParcelService],
})
export class ParcelModule { }
