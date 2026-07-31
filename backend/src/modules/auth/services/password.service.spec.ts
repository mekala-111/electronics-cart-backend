import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get(PasswordService);
  });

  it('hashes and verifies passwords with argon2id', async () => {
    const hash = await service.hash('SecurePass1!');
    expect(hash).not.toBe('SecurePass1!');
    await expect(service.verify(hash, 'SecurePass1!')).resolves.toBe(true);
    await expect(service.verify(hash, 'WrongPass1!')).resolves.toBe(false);
  });

  it('enforces strong password policy', () => {
    expect(service.isStrongPassword('SecurePass1!')).toBe(true);
    expect(service.isStrongPassword('short1!')).toBe(false);
    expect(service.isStrongPassword('alllowercase1!')).toBe(false);
    expect(service.isStrongPassword('ALLUPPERCASE1!')).toBe(false);
    expect(service.isStrongPassword('NoDigits!!')).toBe(false);
    expect(service.isStrongPassword('NoSpecial1')).toBe(false);
  });
});
