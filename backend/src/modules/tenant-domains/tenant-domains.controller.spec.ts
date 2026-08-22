import { Test, TestingModule } from '@nestjs/testing';
import { TenantDomainsController } from './tenant-domains.controller';

describe('TenantDomainsController', () => {
  let controller: TenantDomainsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantDomainsController],
    }).compile();

    controller = module.get<TenantDomainsController>(TenantDomainsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
