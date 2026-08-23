import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { InstituteRole } from '../../generated/prisma/enums';

import { InstituteUsersService } from './institute-users.service';
import { UpdateInstituteUserRoleDto } from './dto/update-institute-user-role.dto';
import { UpdateInstituteUserStatusDto } from './dto/update-institute-user-status.dto';

type CurrentTenantData = NonNullable<TenantRequest['tenant']>;

@Controller('institute-users')
export class InstituteUsersController {
  constructor(private readonly instituteUsersService: InstituteUsersService) {}

  @Get()
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  findAll(@CurrentTenant() tenant: CurrentTenantData) {
    return this.instituteUsersService.findAll(tenant.id);
  }

  @Get(':userId')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  findOne(
    @CurrentTenant() tenant: CurrentTenantData,
    @Param('userId') userId: string,
  ) {
    return this.instituteUsersService.findOne(tenant.id, userId);
  }

  @Post()
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  create(
    @CurrentTenant() tenant: CurrentTenantData,
    @Body() createInstituteUserDto: CreateInstituteUserDto,
  ) {
    return this.instituteUsersService.create(tenant.id, createInstituteUserDto);
  }

  @Patch(':userId/role')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  updateRole(
    @CurrentTenant() tenant: CurrentTenantData,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateInstituteUserRoleDto,
  ) {
    return this.instituteUsersService.updateRole(
      tenant.id,
      userId,
      updateRoleDto.role,
    );
  }

  @Patch(':userId/status')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  updateStatus(
    @CurrentTenant() tenant: CurrentTenantData,
    @Param('userId') userId: string,
    @Body() updateStatusDto: UpdateInstituteUserStatusDto,
  ) {
    return this.instituteUsersService.updateStatus(
      tenant.id,
      userId,
      updateStatusDto.status,
    );
  }

  @Delete(':userId')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  removeFromInstitute(
    @CurrentTenant() tenant: CurrentTenantData,
    @Param('userId') userId: string,
  ) {
    return this.instituteUsersService.removeFromInstitute(tenant.id, userId);
  }
}
