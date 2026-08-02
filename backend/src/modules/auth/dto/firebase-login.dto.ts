import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class FirebaseLoginDto {
  @ApiProperty({ description: 'Firebase ID token from client SDK' })
  @IsString()
  @MinLength(20)
  idToken!: string;
}
