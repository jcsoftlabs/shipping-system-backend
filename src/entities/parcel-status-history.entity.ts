import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Parcel, ParcelStatus } from './parcel.entity';
import { User } from './user.entity';

@Entity('parcel_status_history')
export class ParcelStatusHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'parcel_id' })
    @Index()
    parcelId: string;

    @Column({
        name: 'old_status',
        type: 'enum',
        enum: ParcelStatus,
        enumName: 'parcel_status',
        nullable: true,
    })
    oldStatus: ParcelStatus;

    @Column({
        name: 'new_status',
        type: 'enum',
        enum: ParcelStatus,
        enumName: 'parcel_status',
    })
    @Index()
    newStatus: ParcelStatus;

    @Column({ nullable: true })
    location: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'changed_by', nullable: true })
    changedBy: string;

    @Column({ nullable: true })
    source: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt: Date;

    // Relations
    @ManyToOne(() => Parcel, (parcel) => parcel.statusHistory)
    @JoinColumn({ name: 'parcel_id' })
    parcel: Parcel;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'changed_by' })
    changedByUser: User;
}
