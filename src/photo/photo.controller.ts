import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiConsumes,
} from '@nestjs/swagger';
import { PhotoService } from './photo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Photos')
@Controller('api/photos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PhotoController {
    constructor(private readonly photoService: PhotoService) { }

    /**
     * Upload une photo pour un colis
     */
    @Post('parcels/:parcelId/upload')
    @UseGuards(RolesGuard)
    @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload une photo de colis sur Cloudinary' })
    @ApiResponse({ status: 201, description: 'Photo uploadée' })
    async uploadPhoto(
        @Param('parcelId') parcelId: string,
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser('id') userId: string,
    ) {
        const photo = await this.photoService.uploadPhoto(parcelId, file, userId);

        return {
            success: true,
            message: 'Photo uploaded successfully to Cloudinary',
            data: photo,
        };
    }

    /**
     * Récupère les photos d'un colis
     */
    @Get('parcels/:parcelId')
    @ApiOperation({ summary: 'Récupérer les photos d\'un colis' })
    async getParcelPhotos(@Param('parcelId') parcelId: string) {
        const photos = await this.photoService.getParcelPhotos(parcelId);

        return {
            success: true,
            data: photos,
            total: photos.length,
        };
    }

    /**
     * Récupère l'URL d'une photo (Cloudinary URL)
     */
    @Get(':id/url')
    @ApiOperation({ summary: 'Récupérer l\'URL Cloudinary d\'une photo' })
    async getPhotoUrl(@Param('id') id: string) {
        const url = await this.photoService.getPhotoUrl(id);

        return {
            success: true,
            data: { url },
        };
    }

    /**
     * Supprime une photo
     */
    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Supprimer une photo de Cloudinary' })
    async deletePhoto(@Param('id') id: string) {
        await this.photoService.deletePhoto(id);

        return {
            success: true,
            message: 'Photo deleted successfully from Cloudinary',
        };
    }
}
