import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('company_settings')
export class CompanySettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'company_name', default: 'Shipping Platform' })
    companyName: string;

    @Column({ name: 'company_address', nullable: true })
    companyAddress: string;

    @Column({ name: 'company_city', nullable: true })
    companyCity: string;

    @Column({ name: 'company_state', nullable: true })
    companyState: string;

    @Column({ name: 'company_zipcode', nullable: true })
    companyZipcode: string;

    @Column({ name: 'company_phone', nullable: true })
    companyPhone: string;

    @Column({ name: 'company_email', nullable: true })
    companyEmail: string;

    @Column({ name: 'company_website', nullable: true })
    companyWebsite: string;

    @Column({ name: 'receipt_footer', nullable: true, type: 'text' })
    receiptFooter: string;

    @Column({ name: 'logo_url', nullable: true })
    logoUrl: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
