import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('address_counters')
export class AddressCounter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 3, unique: true })
    @Index()
    hub: string;

    @Column({ name: 'current_sequence', default: 0 })
    currentSequence: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
