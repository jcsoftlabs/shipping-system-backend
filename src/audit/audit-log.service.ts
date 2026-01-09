import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { UserRole } from '../entities/user.entity';

interface LogData {
    userId?: string;
    userEmail?: string;
    userRole?: UserRole;
    action: AuditAction | string;
    resource: string;
    resourceId?: string;
    description?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditLogService {
    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) { }

    async log(data: LogData): Promise<void> {
        try {
            const log = this.auditLogRepository.create({
                userId: data.userId,
                userEmail: data.userEmail,
                userRole: data.userRole,
                action: data.action as AuditAction,
                resource: data.resource,
                resourceId: data.resourceId,
                description: data.description,
                changes: data.changes,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            });

            await this.auditLogRepository.save(log);
        } catch (error) {
            // Ne pas bloquer l'opération si le logging échoue
            console.error('Audit log error:', error);
        }
    }
}
