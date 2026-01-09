import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('hub_addresses')
export class HubAddress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 3, unique: true })
    @Index()
    hub: string;

    @Column({ name: 'hub_name' })
    hubName: string;

    @Column({ name: 'street' })
    street: string;

    @Column({ name: 'city' })
    city: string;

    @Column({ name: 'state', length: 2 })
    state: string;

    @Column({ name: 'zipcode' })
    zipcode: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
