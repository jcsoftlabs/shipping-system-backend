import {
    Controller,
    Get,
    Put,
    Body,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Settings')
@Controller('api/settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get('company')
    @ApiOperation({ summary: 'Get company settings' })
    async getCompanySettings() {
        const settings = await this.settingsService.getSettings();

        return {
            success: true,
            data: settings,
        };
    }

    @Public()
    @Get('branding')
    @ApiOperation({ summary: 'Get public branding information (no auth required)' })
    async getPublicBranding() {
        const settings = await this.settingsService.getSettings();

        // Return only public branding information
        return {
            success: true,
            data: {
                companyName: settings.companyName,
                companyAddress: settings.companyAddress,
                companyCity: settings.companyCity,
                companyState: settings.companyState,
                companyZipcode: settings.companyZipcode,
                companyPhone: settings.companyPhone,
                companyEmail: settings.companyEmail,
                logoUrl: settings.logoUrl,
                receiptFooter: settings.receiptFooter,
            },
        };
    }

    @Put('company')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update company settings' })
    async updateCompanySettings(@Body() data: any) {
        const settings = await this.settingsService.updateSettings(data);

        return {
            success: true,
            message: 'Settings updated successfully',
            data: settings,
        };
    }
}
