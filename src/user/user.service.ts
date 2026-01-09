import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async findAll(): Promise<User[]> {
        return await this.userRepository.find({
            order: { createdAt: 'DESC' },
            select: ['id', 'email', 'firstName', 'lastName', 'role', 'phone', 'isActive', 'createdAt', 'updatedAt'],
        });
    }

    async findById(id: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
            select: ['id', 'email', 'firstName', 'lastName', 'role', 'phone', 'isActive', 'createdAt', 'updatedAt'],
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        // Create user
        const user = this.userRepository.create({
            ...createUserDto,
            passwordHash: hashedPassword,
            isActive: true,
        });

        const savedUser = await this.userRepository.save(user);

        // Remove password from response
        delete savedUser.passwordHash;
        return savedUser;
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findById(id);

        // Update user
        Object.assign(user, updateUserDto);
        const updatedUser = await this.userRepository.save(user);

        // Remove password from response
        delete updatedUser.passwordHash;
        return updatedUser;
    }

    async delete(id: string): Promise<void> {
        const user = await this.findById(id);
        await this.userRepository.remove(user);
    }

    async toggleActive(id: string): Promise<User> {
        const user = await this.findById(id);
        user.isActive = !user.isActive;
        const updatedUser = await this.userRepository.save(user);

        delete updatedUser.passwordHash;
        return updatedUser;
    }
}
