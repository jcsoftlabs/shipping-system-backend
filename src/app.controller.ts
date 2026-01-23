import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    getHealth() {
        return {
            status: 'ok',
            message: 'Shipping Platform API is running',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        };
    }

    @Get('health')
    healthCheck() {
        return {
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };
    }
}
