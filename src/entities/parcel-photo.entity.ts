import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Parcel } from './parcel.entity';

@Entity('parcel_photos')
export class ParcelPhoto {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'parcel_id' })
    @Index()
    parcelId: string;

    @Column({ name: 'file_name' })
    fileName: string;

    @Column({ name: 'file_path' })
    filePath: string;

    @Column({ name: 'file_size', type: 'integer' })
    fileSize: number;

    @Column({ name: 'mime_type' })
    mimeType: string;

    @Column({ name: 'uploaded_by', nullable: true })
    uploadedBy: string;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt: Date;

    // Relations
    @ManyToOne(() => Parcel)
    @JoinColumn({ name: 'parcel_id' })
    parcel: Parcel;
}
