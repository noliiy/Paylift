import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService OAuth', () => {
  let service: AuthService;
  const prisma = {
    user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    employee: { findFirst: jest.fn() },
    refreshToken: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('access') } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((k: string) => (k === 'jwt.refreshTtl' ? '7d' : 'secret')) },
        },
      ],
    }).compile();
    service = module.get(AuthService);
    prisma.employee.findFirst.mockResolvedValue(null);
    prisma.refreshToken.create.mockResolvedValue({});
  });

  it('creates user on Apple sign-in', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1', email: null });

    await service.signInWithApple({ displayName: 'Emre', identityToken: 'apple-1' });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ appleSubject: 'apple-1', displayName: 'Emre' }),
      }),
    );
  });

  it('creates user on Google sign-in', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u2', email: 'g@test.com' });

    await service.signInWithGoogle({ displayName: 'Deniz', identityToken: 'google-1', email: 'g@test.com' });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ googleSubject: 'google-1' }),
      }),
    );
  });

  it('links Google to existing email account', async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing', email: 'same@test.com' });
    prisma.user.update.mockResolvedValue({ id: 'existing', email: 'same@test.com' });

    await service.signInWithGoogle({
      displayName: 'Deniz',
      identityToken: 'google-2',
      email: 'same@test.com',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'existing' },
        data: expect.objectContaining({ googleSubject: 'google-2' }),
      }),
    );
  });
});
