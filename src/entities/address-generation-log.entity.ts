import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('address_generation_logs')
export class AddressGenerationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    @Index()
    userId: string;

    @Column({ name: 'address_code', nullable: true })
    addressCode: string;

    @Column({ length: 3 })
    hub: string;

    @Column({ name: 'client_id', length: 5, nullable: true })
    clientId: string;

    @Column({ length: 1, nullable: true })
    unit: string;

    @Column({ default: false })
    success: boolean;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt: Date;
}
