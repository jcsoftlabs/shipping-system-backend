import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum AddressStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
}

@Entity('custom_addresses')
export class CustomAddress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @Column({ name: 'address_code', unique: true })
    @Index()
    addressCode: string;

    @Column({ length: 3 })
    @Index()
    hub: string;

    @Column({ name: 'client_id', length: 5 })
    clientId: string;

    @Column({ length: 1 })
    unit: string;

    @Column({ name: 'us_street' })
    usStreet: string;

    @Column({ name: 'us_city' })
    usCity: string;

    @Column({ name: 'us_state', length: 2 })
    usState: string;

    @Column({ name: 'us_zipcode' })
    usZipcode: string;

    @Column({
        type: 'enum',
        enum: AddressStatus,
        enumName: 'address_status',
        default: AddressStatus.ACTIVE,
    })
    @Index()
    status: AddressStatus;

    @Column({ name: 'is_primary', default: false })
    @Index()
    isPrimary: boolean;

    @Column({ name: 'generated_at', type: 'timestamp' })
    generatedAt: Date;

    @Column({ name: 'activated_at', type: 'timestamp', nullable: true })
    activatedAt: Date;

    @Column({ name: 'deactivated_at', type: 'timestamp', nullable: true })
    deactivatedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => User, (user) => user.addresses)
    @JoinColumn({ name: 'user_id' })
    user: User;
}
