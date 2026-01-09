import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Créer un nouveau compte' })
    @ApiResponse({ status: 201, description: 'Compte créé avec succès' })
    @ApiResponse({ status: 400, description: 'Email déjà utilisé' })
    async register(@Body() registerDto: RegisterDto) {
        const result = await this.authService.register(registerDto);
        return {
            success: true,
            message: 'Account created successfully',
            data: result,
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Se connecter' })
    @ApiResponse({ status: 200, description: 'Connexion réussie' })
    @ApiResponse({ status: 401, description: 'Identifiants invalides' })
    async login(@Body() loginDto: LoginDto) {
        const result = await this.authService.login(loginDto);
        return {
            success: true,
            message: 'Login successful',
            data: result,
        };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Rafraîchir le token' })
    @ApiResponse({ status: 200, description: 'Token rafraîchi' })
    @ApiResponse({ status: 401, description: 'Token invalide' })
    async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
        const result = await this.authService.refreshTokens(
            refreshTokenDto.refreshToken,
        );
        return {
            success: true,
            data: result,
        };
    }
}
