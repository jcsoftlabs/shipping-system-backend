import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { Notification } from '../entities/notification.entity';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification]),
        EmailModule,
    ],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule { }
