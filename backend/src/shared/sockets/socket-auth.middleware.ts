import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

export type SocketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => void;

export function createSocketAuthMiddleware(
  jwtService: JwtService,
): SocketAuthMiddleware {
  return (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);

    if (!token) {
      return next(new UnauthorizedException('Missing auth token'));
    }

    try {
      const payload = jwtService.verify(token);
      socket.data.user = payload;
      return next();
    } catch {
      return next(new UnauthorizedException('Invalid auth token'));
    }
  };
}
