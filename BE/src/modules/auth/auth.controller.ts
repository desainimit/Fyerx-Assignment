import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiError, Auth, CurrentUser, Public } from '@decorators';
import { AuthResultDto, LoginDto, MeDto, SignupDto } from '@dtos';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'Create a visitor account and return a JWT' })
  @ApiEnvelope(AuthResultDto, {
    status: HttpStatus.CREATED,
    description: 'Account created',
    message: 'Account created',
  })
  @ApiError(HttpStatus.BAD_REQUEST)
  @ApiError(
    HttpStatus.CONFLICT,
    'Email already registered',
    'An account with this email already exists',
  )
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in (visitor or admin) and return a JWT' })
  @ApiEnvelope(AuthResultDto, { message: 'Logged in' })
  @ApiError(HttpStatus.BAD_REQUEST)
  @ApiError(
    HttpStatus.UNAUTHORIZED,
    'Wrong email or password',
    'Invalid email or password',
  )
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Current user and whether favourites are set' })
  @ApiEnvelope(MeDto, { message: 'Current user' })
  @ApiError(HttpStatus.NOT_FOUND, 'User no longer exists', 'User not found')
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }
}
