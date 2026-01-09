import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';
import { Parcel } from './parcel.entity';

@Entity('invoice_items')
export class InvoiceItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'invoice_id' })
    invoiceId: string;

    @Column({ name: 'parcel_id', nullable: true })
    parcelId: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'integer', default: 1 })
    quantity: number;

    @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
    unitPrice: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    // Relations
    @ManyToOne(() => Invoice, (invoice) => invoice.items)
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;

    @ManyToOne(() => Parcel, { nullable: true })
    @JoinColumn({ name: 'parcel_id' })
    parcel: Parcel;
}
