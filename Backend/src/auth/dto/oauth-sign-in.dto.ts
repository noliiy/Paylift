import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OAuthSignInDto {
  @ApiProperty({ example: 'Emre' })
  @IsString()
  @MinLength(1)
  displayName!: string;

  @ApiPropertyOptional({ example: 'emre@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'OAuth identity token (mockable for MVP)' })
  @IsOptional()
  @IsString()
  identityToken?: string;
}

export class SignInWithAppleDto extends OAuthSignInDto {}

export class SignInWithGoogleDto extends OAuthSignInDto {}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
