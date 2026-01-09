import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('parcel_categories')
export class ParcelCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    icon: string;

    @Column({ name: 'base_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
    baseRate: number;

    @Column({ name: 'per_pound_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
    perPoundRate: number;

    @Column({ name: 'max_weight_lbs', type: 'decimal', precision: 10, scale: 2, nullable: true })
    maxWeightLbs: number;

    @Column({ name: 'max_length_inches', type: 'decimal', precision: 10, scale: 2, nullable: true })
    maxLengthInches: number;

    @Column({ name: 'max_width_inches', type: 'decimal', precision: 10, scale: 2, nullable: true })
    maxWidthInches: number;

    @Column({ name: 'max_height_inches', type: 'decimal', precision: 10, scale: 2, nullable: true })
    maxHeightInches: number;

    @Column({ name: 'is_active', default: true })
    @Index()
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
