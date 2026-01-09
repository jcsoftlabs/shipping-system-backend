import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceItem } from '../entities/invoice-item.entity';
import { Payment } from '../entities/payment.entity';
import { Parcel } from '../entities/parcel.entity';
import { ParcelCategory } from '../entities/parcel-category.entity';
import { ParcelStatusHistory } from '../entities/parcel-status-history.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Invoice,
            InvoiceItem,
            Payment,
            Parcel,
            ParcelCategory,
            ParcelStatusHistory,
        ]),
    ],
    controllers: [BillingController],
    providers: [BillingService],
    exports: [BillingService],
})
export class BillingModule { }
