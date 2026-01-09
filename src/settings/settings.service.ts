import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettings } from '../entities/company-settings.entity';

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);

    constructor(
        @InjectRepository(CompanySettings)
        private settingsRepository: Repository<CompanySettings>,
    ) { }

    /**
     * Get company settings (returns first record or creates default)
     */
    async getSettings(): Promise<CompanySettings> {
        let settings = await this.settingsRepository.findOne({
            where: {},
            order: { createdAt: 'ASC' },
        });

        if (!settings) {
            // Create default settings if none exist
            settings = this.settingsRepository.create({
                companyName: 'Haiti Shipping Platform',
                companyAddress: '123 Main Street',
                companyCity: 'Port-au-Prince',
                companyState: 'Haiti',
                companyZipcode: 'HT6110',
                companyPhone: '+509 1234-5678',
                companyEmail: 'contact@haitishipping.com',
                receiptFooter: 'Merci pour votre confiance! Thank you for your business!',
            });
            settings = await this.settingsRepository.save(settings);
        }

        return settings;
    }

    /**
     * Update company settings
     */
    async updateSettings(data: Partial<CompanySettings>): Promise<CompanySettings> {
        const settings = await this.getSettings();

        Object.assign(settings, data);

        const updated = await this.settingsRepository.save(settings);

        this.logger.log('Company settings updated');

        return updated;
    }
}
