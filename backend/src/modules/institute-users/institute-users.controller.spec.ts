import { Test, TestingModule } from '@nestjs/testing';
import { InstituteUsersController } from './institute-users.controller';

describe('InstituteUsersController', () => {
  let controller: InstituteUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstituteUsersController],
    }).compile();

    controller = module.get<InstituteUsersController>(InstituteUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
