import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressGenerationService } from './address-generation.service';
import { AddressController } from './address.controller';
import { CustomAddress } from '../entities/custom-address.entity';
import { AddressCounter } from '../entities/address-counter.entity';
import { HubAddress } from '../entities/hub-address.entity';
import { User } from '../entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([CustomAddress, AddressCounter, HubAddress, User]),
    ],
    controllers: [AddressController],
    providers: [AddressGenerationService],
    exports: [AddressGenerationService],
})
export class AddressModule { }
