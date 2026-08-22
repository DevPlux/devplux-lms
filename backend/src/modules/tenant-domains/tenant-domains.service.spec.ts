import { Test, TestingModule } from '@nestjs/testing';
import { TenantDomainsService } from './tenant-domains.service';

describe('TenantDomainsService', () => {
  let service: TenantDomainsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantDomainsService],
    }).compile();

    service = module.get<TenantDomainsService>(TenantDomainsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
