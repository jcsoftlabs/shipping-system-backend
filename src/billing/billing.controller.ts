import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { GenerateInvoiceDto, RecordPaymentDto } from './dto/billing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Billing')
@Controller('api/billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    /**
     * Générer une facture pour des colis
     */
    @Post('invoices/generate')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Générer une facture pour des colis' })
    @ApiResponse({ status: 201, description: 'Facture générée' })
    async generateInvoice(
        @Body() generateInvoiceDto: GenerateInvoiceDto,
        @CurrentUser('id') userId: string,
    ) {
        const invoice = await this.billingService.generateInvoiceForParcels(
            userId,
            generateInvoiceDto.parcelIds,
        );

        return {
            success: true,
            message: 'Invoice generated successfully',
            data: invoice,
        };
    }

    /**
     * Récupérer mes factures
     */
    @Get('invoices/my-invoices')
    @ApiOperation({ summary: 'Récupérer mes factures' })
    async getMyInvoices(@CurrentUser('id') userId: string) {
        const invoices = await this.billingService.getUserInvoices(userId);

        return {
            success: true,
            data: invoices,
            total: invoices.length,
        };
    }

    /**
     * Récupérer une facture par ID
     */
    @Get('invoices/:id')
    @ApiOperation({ summary: 'Récupérer une facture' })
    async getInvoice(@Param('id') id: string) {
        const invoice = await this.billingService.getInvoiceById(id);

        return {
            success: true,
            data: invoice,
        };
    }

    /**
     * Enregistrer un paiement
     */
    @Post('invoices/:id/pay')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Enregistrer un paiement' })
    @ApiResponse({ status: 200, description: 'Paiement enregistré' })
    async recordPayment(
        @Param('id') invoiceId: string,
        @Body() recordPaymentDto: RecordPaymentDto,
    ) {
        const payment = await this.billingService.recordPayment(
            invoiceId,
            recordPaymentDto.amount,
            recordPaymentDto.method,
            recordPaymentDto.transactionId,
        );

        return {
            success: true,
            message: 'Payment recorded successfully',
            data: payment,
        };
    }

    /**
     * Récupérer les factures impayées (ADMIN)
     */
    @Get('admin/unpaid-invoices')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Récupérer les factures impayées' })
    async getUnpaidInvoices() {
        const invoices = await this.billingService.getUnpaidInvoices();

        return {
            success: true,
            data: invoices,
            total: invoices.length,
        };
    }

    /**
     * Récupérer les paiements cash (ADMIN/AGENT)
     */
    @Get('admin/cash-payments')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT)
    @ApiOperation({ summary: 'Récupérer les paiements cash' })
    async getCashPayments(
        @Query('date') date?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const payments = await this.billingService.getCashPayments(
            date,
            startDate,
            endDate,
        );

        const total = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

        return {
            success: true,
            data: payments,
            total: payments.length,
            totalAmount: total,
        };
    }

    /**
     * Enregistrer un paiement cash au bureau (AGENT/ADMIN)
     */
    @Post('cash-payment')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Enregistrer un paiement cash' })
    @ApiResponse({ status: 200, description: 'Paiement cash enregistré' })
    async recordCashPayment(
        @Body() dto: { invoiceId: string; amount: number; notes?: string },
        @CurrentUser('id') agentId: string,
    ) {
        const payment = await this.billingService.recordCashPayment(
            dto.invoiceId,
            dto.amount,
            agentId,
            dto.notes,
        );

        return {
            success: true,
            message: 'Cash payment recorded successfully',
            data: payment,
        };
    }

    /**
     * Générer un reçu thermique (AGENT/ADMIN)
     */
    @Get('invoices/:id/thermal-receipt')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT)
    @ApiOperation({ summary: 'Générer un reçu thermique' })
    @ApiResponse({ status: 200, description: 'Reçu généré' })
    async generateThermalReceipt(@Param('id') invoiceId: string) {
        const receipt = await this.billingService.generateThermalReceipt(invoiceId);

        return {
            success: true,
            data: {
                receipt,
                format: '80mm thermal printer',
            },
        };
    }

    /**
     * Vérifier si un colis est prêt pour retrait (AGENT/ADMIN)
     */
    @Get('check-pickup/:trackingNumber')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT)
    @ApiOperation({ summary: 'Vérifier si un colis est prêt pour retrait' })
    @ApiResponse({ status: 200, description: 'Statut du colis' })
    async checkParcelReadyForPickup(@Param('trackingNumber') trackingNumber: string) {
        const result = await this.billingService.checkParcelReadyForPickup(trackingNumber);

        return {
            success: true,
            data: result,
        };
    }

    /**
     * Obtenir les statistiques de facturation (AGENT/ADMIN)
     */
    @Get('statistics')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT)
    @ApiOperation({ summary: 'Obtenir les statistiques de facturation' })
    @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
    async getStatistics() {
        const statistics = await this.billingService.getBillingStatistics();

        return {
            success: true,
            data: statistics,
        };
    }
}
