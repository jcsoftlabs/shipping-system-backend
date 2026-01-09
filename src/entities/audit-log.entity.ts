import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User, UserRole } from './user.entity';

export enum AuditAction {
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    STATUS_CHANGE = 'STATUS_CHANGE',
    EXPORT = 'EXPORT',
    IMPORT = 'IMPORT',
}

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', nullable: true })
    @Index()
    userId: string;

    @Column({ name: 'user_email', nullable: true })
    userEmail: string;

    @Column({
        name: 'user_role',
        type: 'enum',
        enum: UserRole,
        enumName: 'user_role',
        nullable: true,
    })
    userRole: UserRole;

    @Column({
        type: 'enum',
        enum: AuditAction,
        enumName: 'audit_action',
    })
    @Index()
    action: AuditAction;

    @Column()
    @Index()
    resource: string;

    @Column({ name: 'resource_id', type: 'uuid', nullable: true })
    @Index()
    resourceId: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    changes: any;

    @Column({ name: 'ip_address', type: 'inet', nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt: Date;

    // Relations
    @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
