import { Test, TestingModule } from '@nestjs/testing';
import { InstituteInvitationsController } from './institute-invitations.controller';

describe('InstituteInvitationsController', () => {
  let controller: InstituteInvitationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstituteInvitationsController],
    }).compile();

    controller = module.get<InstituteInvitationsController>(InstituteInvitationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
