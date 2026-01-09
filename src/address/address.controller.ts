import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AddressGenerationService } from './address-generation.service';
import { GenerateAddressDto } from './dto/generate-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Addresses')
@Controller('api/addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressController {
    constructor(
        private readonly addressService: AddressGenerationService,
    ) { }

    /**
     * Générer une nouvelle adresse personnalisée
     */
    @Post('generate')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Générer une adresse personnalisée' })
    @ApiResponse({ status: 201, description: 'Adresse générée' })
    @ApiResponse({ status: 409, description: 'Adresse déjà existante' })
    async generateAddress(
        @Body() generateAddressDto: GenerateAddressDto,
        @CurrentUser('id') userId: string,
    ) {
        const address = await this.addressService.generateAddress(
            userId,
            generateAddressDto.hub,
        );

        return {
            success: true,
            message: 'Address generated successfully',
            data: address,
        };
    }

    /**
     * Récupérer mes adresses
     */
    @Get('my-addresses')
    @ApiOperation({ summary: 'Récupérer mes adresses' })
    async getMyAddresses(@CurrentUser('id') userId: string) {
        const addresses = await this.addressService.getUserAddresses(userId);

        return {
            success: true,
            data: addresses,
            total: addresses.length,
        };
    }

    /**
     * Récupérer mon adresse primaire
     */
    @Get('my-addresses/primary')
    @ApiOperation({ summary: 'Récupérer mon adresse primaire' })
    async getPrimaryAddress(@CurrentUser('id') userId: string) {
        const address = await this.addressService.getPrimaryAddress(userId);

        return {
            success: true,
            data: address,
        };
    }

    /**
     * Rechercher une adresse par code
     */
    @Get('search/:code')
    @UseGuards(RolesGuard)
    @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Rechercher une adresse par code' })
    async searchByCode(@Param('code') code: string) {
        const address = await this.addressService.getAddressByCode(code);

        return {
            success: true,
            data: address,
        };
    }

    /**
     * Désactiver une adresse
     */
    @Delete(':id/deactivate')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Désactiver une adresse' })
    async deactivateAddress(@Param('id') id: string) {
        const address = await this.addressService.deactivateAddress(id);

        return {
            success: true,
            message: 'Address deactivated successfully',
            data: address,
        };
    }

    /**
     * Statistiques par hub (ADMIN)
     */
    @Get('admin/hub-statistics')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Statistiques par hub' })
    async getHubStatistics() {
        const statistics = await this.addressService.getHubStatistics();

        return {
            success: true,
            data: statistics,
        };
    }

    /**
     * Récupérer tous les hubs actifs
     */
    @Get('admin/hubs')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Récupérer tous les hubs' })
    async getActiveHubs() {
        const hubs = await this.addressService.getActiveHubs();

        return {
            success: true,
            data: hubs,
        };
    }

    /**
     * Créer ou mettre à jour un hub
     */
    @Post('admin/hubs')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Créer ou mettre à jour un hub' })
    async upsertHub(@Body() hubData: {
        hub: string;
        hubName: string;
        street: string;
        city: string;
        state: string;
        zipcode: string;
    }) {
        const hub = await this.addressService.upsertHubAddress(hubData);

        return {
            success: true,
            message: 'Hub saved successfully',
            data: hub,
        };
    }

    /**
     * Désactiver un hub
     */
    @Delete('admin/hubs/:hub')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Désactiver un hub' })
    async deactivateHub(@Param('hub') hub: string) {
        const hubAddress = await this.addressService.deactivateHub(hub);

        return {
            success: true,
            message: 'Hub deactivated successfully',
            data: hubAddress,
        };
    }
}
