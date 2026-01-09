import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AddressGenerationService } from '../address/address-generation.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private addressService: AddressGenerationService,
    ) { }

    async register(registerDto: RegisterDto): Promise<any> {
        // Vérifier si l'email existe déjà
        const existingUser = await this.userRepository.findOne({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new UnauthorizedException('Email already exists');
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(registerDto.password, 12);

        // Créer l'utilisateur
        const user = this.userRepository.create({
            email: registerDto.email,
            passwordHash: hashedPassword,
            role: registerDto.role || UserRole.CLIENT,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            phone: registerDto.phone,
        });

        const savedUser = await this.userRepository.save(user);

        // Générer automatiquement une adresse pour le nouveau client
        try {
            await this.addressService.generateAddress(savedUser.id, 'MDL'); // Hub par défaut: Medley
            this.logger.log(`Address auto-generated for new user ${savedUser.email}`);
        } catch (error) {
            this.logger.warn(`Failed to auto-generate address for user ${savedUser.email}: ${error.message}`);
            // Ne pas bloquer l'inscription si la génération d'adresse échoue
        }

        // Générer les tokens
        const tokens = await this.generateTokens(savedUser);

        return {
            user: this.sanitizeUser(savedUser),
            ...tokens,
        };
    }

    async login(loginDto: LoginDto): Promise<any> {
        // Trouver l'utilisateur
        const user = await this.userRepository.findOne({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Vérifier si le compte est actif
        if (!user.isActive) {
            throw new UnauthorizedException('Account is inactive');
        }

        // Mettre à jour last login
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);

        // Générer les tokens
        const tokens = await this.generateTokens(user);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    async validateUser(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId, isActive: true },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return user;
    }

    private async generateTokens(user: User): Promise<any> {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                expiresIn: process.env.JWT_EXPIRATION || '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
            }),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }

    private sanitizeUser(user: User): any {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }

    async refreshTokens(refreshToken: string): Promise<any> {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            const user = await this.validateUser(payload.sub);
            return await this.generateTokens(user);
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}
