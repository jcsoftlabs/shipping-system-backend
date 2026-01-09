import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { CustomAddress } from './custom-address.entity';
import { ParcelCategory } from './parcel-category.entity';
import { ParcelStatusHistory } from './parcel-status-history.entity';

export enum ParcelStatus {
    PENDING = 'PENDING',
    RECEIVED = 'RECEIVED',
    PROCESSING = 'PROCESSING',
    READY = 'READY',
    SHIPPED = 'SHIPPED',
    IN_TRANSIT = 'IN_TRANSIT',
    CUSTOMS = 'CUSTOMS',
    OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
    DELIVERED = 'DELIVERED',
    EXCEPTION = 'EXCEPTION',
    RETURNED = 'RETURNED',
    CANCELLED = 'CANCELLED',
}

@Entity('parcels')
export class Parcel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tracking_number', unique: true })
    @Index()
    trackingNumber: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @Column({ name: 'custom_address_id' })
    @Index()
    customAddressId: string;

    @Column({ name: 'category_id', nullable: true })
    @Index()
    categoryId: string;

    @Column({ nullable: true })
    carrier: string;

    @Column({ name: 'carrier_tracking_number', nullable: true })
    carrierTrackingNumber: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    weight: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    length: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    width: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    height: number;

    @Column({ name: 'declared_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
    declaredValue: number;

    @Column({
        type: 'enum',
        enum: ParcelStatus,
        enumName: 'parcel_status',
        default: ParcelStatus.PENDING,
    })
    @Index()
    status: ParcelStatus;

    @Column({ nullable: true })
    @Index()
    warehouse: string;

    @Column({ name: 'current_location', nullable: true })
    currentLocation: string;

    @Column({ name: 'received_at', type: 'timestamp', nullable: true })
    @Index()
    receivedAt: Date;

    @Column({ name: 'shipped_at', type: 'timestamp', nullable: true })
    @Index()
    shippedAt: Date;

    @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
    deliveredAt: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ name: 'internal_notes', type: 'text', nullable: true })
    internalNotes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => User, (user) => user.parcels)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => CustomAddress)
    @JoinColumn({ name: 'custom_address_id' })
    customAddress: CustomAddress;

    @ManyToOne(() => ParcelCategory)
    @JoinColumn({ name: 'category_id' })
    category: ParcelCategory;

    @OneToMany(() => ParcelStatusHistory, (history) => history.parcel)
    statusHistory: ParcelStatusHistory[];
}
