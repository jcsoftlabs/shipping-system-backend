import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { CustomAddress } from './custom-address.entity';
import { Parcel } from './parcel.entity';
import { Notification } from './notification.entity';
import { AuditLog } from './audit-log.entity';

export enum UserRole {
    CLIENT = 'CLIENT',
    AGENT = 'AGENT',
    ADMIN = 'ADMIN',
    SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    email: string;

    @Column({ name: 'password_hash' })
    passwordHash: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        enumName: 'user_role',
        default: UserRole.CLIENT,
    })
    @Index()
    role: UserRole;

    @Column({ name: 'first_name', nullable: true })
    firstName: string;

    @Column({ name: 'last_name', nullable: true })
    lastName: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ name: 'avatar_url', nullable: true })
    avatarUrl: string;

    @Column({ name: 'email_verified', default: false })
    emailVerified: boolean;

    @Column({ name: 'email_verification_token', nullable: true })
    emailVerificationToken: string;

    @Column({ name: 'password_reset_token', nullable: true })
    passwordResetToken: string;

    @Column({ name: 'password_reset_expires', type: 'timestamp', nullable: true })
    passwordResetExpires: Date;

    @Column({ name: 'two_factor_enabled', default: false })
    twoFactorEnabled: boolean;

    @Column({ name: 'two_factor_secret', nullable: true })
    twoFactorSecret: string;

    @Column({ name: 'is_active', default: true })
    @Index()
    isActive: boolean;

    @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
    lastLoginAt: Date;

    @Column({ name: 'last_login_ip', type: 'inet', nullable: true })
    lastLoginIp: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @OneToMany(() => CustomAddress, (address) => address.user)
    addresses: CustomAddress[];

    @OneToMany(() => Parcel, (parcel) => parcel.user)
    parcels: Parcel[];

    @OneToMany(() => Notification, (notification) => notification.user)
    notifications: Notification[];

    @OneToMany(() => AuditLog, (log) => log.user)
    auditLogs: AuditLog[];
}
