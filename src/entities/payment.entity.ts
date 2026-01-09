import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Invoice } from './invoice.entity';

export enum PaymentMethod {
    CARD = 'CARD',
    CASH = 'CASH',
    BANK_TRANSFER = 'BANK_TRANSFER',
    MOBILE_MONEY = 'MOBILE_MONEY',
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'invoice_id' })
    @Index()
    invoiceId: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ default: 'USD' })
    currency: string;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
    })
    method: PaymentMethod;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    @Index()
    status: PaymentStatus;

    @Column({ name: 'transaction_id', nullable: true })
    transactionId: string;

    @Column({ nullable: true })
    gateway: string;

    @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
    gatewayResponse: any;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any;

    @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
    processedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Invoice)
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}
