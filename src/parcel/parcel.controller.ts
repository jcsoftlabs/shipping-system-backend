import {
    Controller,
    Post,
    Get,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { ParcelService } from './parcel.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelStatusDto } from './dto/update-parcel-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { ParcelStatus } from '../entities/parcel.entity';

@ApiTags('Parcels')
@Controller('api/parcels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ParcelController {
    constructor(private readonly parcelService: ParcelService) { }

    /**
     * Créer un nouveau colis
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Créer un nouveau colis' })
    @ApiResponse({ status: 201, description: 'Colis créé avec succès' })
    async create(
        @Body() createParcelDto: CreateParcelDto,
        @CurrentUser('id') userId: string,
    ) {
        const parcel = await this.parcelService.createParcel(
            createParcelDto,
            userId,
        );

        return {
            success: true,
            message: 'Parcel created successfully',
            data: parcel,
        };
    }

    /**
     * Rechercher un colis par numéro de tracking
     */
    @Get('tracking/:trackingNumber')
    @ApiOperation({ summary: 'Rechercher un colis par numéro de tracking' })
    @ApiResponse({ status: 200, description: 'Colis trouvé' })
    @ApiResponse({ status: 404, description: 'Colis non trouvé' })
    async findByTracking(@Param('trackingNumber') trackingNumber: string) {
        const parcel = await this.parcelService.findByTrackingNumber(trackingNumber);

        return {
            success: true,
            data: parcel,
        };
    }

    /**
     * Vérifier si un colis est prêt pour retrait (facture payée + statut DISPONIBLE)
     */
    @Get('tracking/:trackingNumber/ready-for-pickup')
    @UseGuards(RolesGuard)
    @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Vérifier si un colis est prêt pour retrait' })
    async checkReadyForPickup(@Param('trackingNumber') trackingNumber: string) {
        const result = await this.parcelService.checkReadyForPickup(trackingNumber);

        return {
            success: true,
            data: result,
        };
    }

    /**
     * Récupérer tous les colis d'un client
     */
    @Get('my-parcels')
    @ApiOperation({ summary: 'Récupérer mes colis' })
    async getMyParcels(@CurrentUser('id') userId: string) {
        const parcels = await this.parcelService.findByUser(userId);

        return {
            success: true,
            data: parcels,
            total: parcels.length,
        };
    }

    /**
     * Rechercher des colis avec filtres (AGENT/ADMIN uniquement)
     */
    @Get('search')
    @UseGuards(RolesGuard)
    @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Rechercher des colis avec filtres' })
    @ApiQuery({ name: 'status', required: false, enum: ParcelStatus })
    @ApiQuery({ name: 'warehouse', required: false })
    @ApiQuery({ name: 'addressCode', required: false })
    async search(
        @Query('status') status?: ParcelStatus,
        @Query('warehouse') warehouse?: string,
        @Query('addressCode') addressCode?: string,
    ) {
        const parcels = await this.parcelService.search({
            status,
            warehouse,
            addressCode,
        });

        return {
            success: true,
            data: parcels,
            total: parcels.length,
        };
    }

    /**
     * Récupérer les colis par statut (AGENT/ADMIN uniquement)
     */
    @Get('by-status/:status')
    @UseGuards(RolesGuard)
    @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Récupérer les colis par statut' })
    async findByStatus(@Param('status') status: ParcelStatus) {
        const parcels = await this.parcelService.findByStatus(status);

        return {
            success: true,
            data: parcels,
            total: parcels.length,
        };
    }

    /**
     * Récupérer les statistiques des colis (ADMIN)
     */
    @Get('admin/statistics')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Récupérer les statistiques des colis' })
    async getStatistics() {
        const statistics = await this.parcelService.getStatistics();

        return {
            success: true,
            data: statistics,
        };
    }

    /**
     * Récupérer un colis par ID
     */
    @Get(':id')
    @ApiOperation({ summary: 'Récupérer un colis par ID' })
    @ApiResponse({ status: 200, description: 'Colis trouvé' })
    @ApiResponse({ status: 404, description: 'Colis non trouvé' })
    async findById(@Param('id') id: string) {
        const parcel = await this.parcelService.findById(id);

        return {
            success: true,
            data: parcel,
        };
    }

    /**
     * Récupérer l'historique d'un colis
     */
    @Get(':id/history')
    @ApiOperation({ summary: 'Récupérer l\'historique d\'un colis' })
    async getHistory(@Param('id') id: string) {
        const history = await this.parcelService.getStatusHistory(id);

        return {
            success: true,
            data: history,
        };
    }

    /**
     * Mettre à jour le statut d'un colis (AGENT/ADMIN uniquement)
     */
    @Put(':id/status')
    @UseGuards(RolesGuard)
    @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Mettre à jour le statut d\'un colis',
        description: 'Valide automatiquement les transitions de statut autorisées'
    })
    @ApiResponse({ status: 200, description: 'Statut mis à jour' })
    @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
    @ApiResponse({ status: 404, description: 'Colis non trouvé' })
    async updateStatus(
        @Param('id') id: string,
        @Body() updateStatusDto: UpdateParcelStatusDto,
        @CurrentUser('id') userId: string,
    ) {
        const parcel = await this.parcelService.updateStatus(
            id,
            updateStatusDto,
            userId
        );

        return {
            success: true,
            message: 'Status updated successfully',
            data: {
                id: parcel.id,
                trackingNumber: parcel.trackingNumber,
                oldStatus: updateStatusDto.newStatus, // Will be fixed in service
                newStatus: parcel.status,
                updatedAt: parcel.updatedAt,
            },
        };
    }
}
