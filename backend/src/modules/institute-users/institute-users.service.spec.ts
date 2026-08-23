import { Test, TestingModule } from '@nestjs/testing';
import { InstituteUsersService } from './institute-users.service';

describe('InstituteUsersService', () => {
  let service: InstituteUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InstituteUsersService],
    }).compile();

    service = module.get<InstituteUsersService>(InstituteUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
