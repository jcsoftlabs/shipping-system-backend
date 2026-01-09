import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { ParcelPhoto } from '../entities/parcel-photo.entity';
import { Parcel } from '../entities/parcel.entity';

@Injectable()
export class PhotoService {
    private readonly logger = new Logger(PhotoService.name);

    constructor(
        @InjectRepository(ParcelPhoto)
        private photoRepository: Repository<ParcelPhoto>,

        @InjectRepository(Parcel)
        private parcelRepository: Repository<Parcel>,

        private configService: ConfigService,
    ) {
        // Configure Cloudinary
        cloudinary.config({
            cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
        });
    }

    /**
     * Upload une photo pour un colis sur Cloudinary
     */
    async uploadPhoto(
        parcelId: string,
        file: Express.Multer.File,
        uploadedBy: string,
    ): Promise<ParcelPhoto> {
        this.logger.log(`Uploading photo for parcel ${parcelId} to Cloudinary`);

        // Vérifier que le colis existe
        const parcel = await this.parcelRepository.findOne({
            where: { id: parcelId },
        });

        if (!parcel) {
            throw new NotFoundException(`Parcel ${parcelId} not found`);
        }

        try {
            // Upload vers Cloudinary
            const uploadResult = await new Promise<any>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'shipping-parcels',
                        public_id: `parcel-${parcelId}-${Date.now()}`,
                        resource_type: 'auto',
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    },
                );

                uploadStream.end(file.buffer);
            });

            // Créer l'entrée en base de données
            const photo = this.photoRepository.create({
                parcelId,
                fileName: file.originalname,
                filePath: uploadResult.secure_url, // URL Cloudinary
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedBy,
            });

            const savedPhoto = await this.photoRepository.save(photo);

            this.logger.log(`Photo uploaded to Cloudinary: ${uploadResult.secure_url}`);

            return savedPhoto;
        } catch (error) {
            this.logger.error(`Failed to upload to Cloudinary: ${error.message}`);
            throw error;
        }
    }

    /**
     * Récupère les photos d'un colis
     */
    async getParcelPhotos(parcelId: string): Promise<ParcelPhoto[]> {
        return await this.photoRepository.find({
            where: { parcelId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Récupère une photo par ID
     */
    async getPhotoById(photoId: string): Promise<ParcelPhoto> {
        const photo = await this.photoRepository.findOne({
            where: { id: photoId },
        });

        if (!photo) {
            throw new NotFoundException(`Photo ${photoId} not found`);
        }

        return photo;
    }

    /**
     * Récupère l'URL de la photo (déjà stockée dans filePath)
     */
    async getPhotoUrl(photoId: string): Promise<string> {
        const photo = await this.getPhotoById(photoId);
        return photo.filePath; // URL Cloudinary
    }

    /**
     * Supprime une photo de Cloudinary et de la base de données
     */
    async deletePhoto(photoId: string): Promise<void> {
        const photo = await this.getPhotoById(photoId);

        try {
            // Extraire le public_id de l'URL Cloudinary
            const urlParts = photo.filePath.split('/');
            const fileNameWithExt = urlParts[urlParts.length - 1];
            const publicId = `shipping-parcels/${fileNameWithExt.split('.')[0]}`;

            // Supprimer de Cloudinary
            await cloudinary.uploader.destroy(publicId);

            this.logger.log(`Photo deleted from Cloudinary: ${publicId}`);
        } catch (error) {
            this.logger.error(`Failed to delete from Cloudinary: ${error.message}`);
            // Continue quand même pour supprimer de la DB
        }

        // Supprimer l'entrée en base
        await this.photoRepository.remove(photo);

        this.logger.log(`Photo deleted from database: ${photo.fileName}`);
    }
}
