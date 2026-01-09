import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotoService } from './photo.service';
import { PhotoController } from './photo.controller';
import { ParcelPhoto } from '../entities/parcel-photo.entity';
import { Parcel } from '../entities/parcel.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ParcelPhoto, Parcel])],
    controllers: [PhotoController],
    providers: [PhotoService],
    exports: [PhotoService],
})
export class PhotoModule { }
