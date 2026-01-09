import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcel, ParcelStatus } from '../entities/parcel.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Admin')
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
    constructor(
        @InjectRepository(Parcel)
        private parcelRepository: Repository<Parcel>,
    ) { }

    /**
     * Corriger les localisations des colis READY et DELIVERED
     */
    @Post('fix-parcel-locations')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Corriger les localisations des colis' })
    async fixParcelLocations() {
        const results = {
            readyParcels: { found: 0, updated: 0, details: [] as any[] },
            deliveredParcels: { found: 0, updated: 0, details: [] as any[] },
        };

        // 1. Corriger les colis READY
        const readyParcels = await this.parcelRepository.find({
            where: { status: ParcelStatus.READY },
        });

        results.readyParcels.found = readyParcels.length;

        for (const parcel of readyParcels) {
            if (parcel.currentLocation !== 'Port-au-Prince, Haïti - Prêt pour retrait') {
                const oldLocation = parcel.currentLocation;
                parcel.currentLocation = 'Port-au-Prince, Haïti - Prêt pour retrait';
                await this.parcelRepository.save(parcel);

                results.readyParcels.updated++;
                results.readyParcels.details.push({
                    trackingNumber: parcel.trackingNumber,
                    oldLocation,
                    newLocation: parcel.currentLocation,
                });
            }
        }

        // 2. Corriger les colis DELIVERED
        const deliveredParcels = await this.parcelRepository.find({
            where: { status: ParcelStatus.DELIVERED },
        });

        results.deliveredParcels.found = deliveredParcels.length;

        for (const parcel of deliveredParcels) {
            if (parcel.currentLocation !== 'Livré au client') {
                const oldLocation = parcel.currentLocation;
                parcel.currentLocation = 'Livré au client';
                await this.parcelRepository.save(parcel);

                results.deliveredParcels.updated++;
                results.deliveredParcels.details.push({
                    trackingNumber: parcel.trackingNumber,
                    oldLocation,
                    newLocation: parcel.currentLocation,
                });
            }
        }

        return {
            success: true,
            message: `Migration completed: ${results.readyParcels.updated + results.deliveredParcels.updated} parcels updated`,
            data: results,
        };
    }
}
