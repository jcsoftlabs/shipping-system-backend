import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { Parcel } from '../entities/parcel.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Parcel])],
    controllers: [AdminController],
})
export class AdminModule { }
