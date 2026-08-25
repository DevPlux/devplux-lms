import { Test, TestingModule } from '@nestjs/testing';
import { InstituteInvitationsService } from './institute-invitations.service';

describe('InstituteInvitationsService', () => {
  let service: InstituteInvitationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InstituteInvitationsService],
    }).compile();

    service = module.get<InstituteInvitationsService>(InstituteInvitationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
