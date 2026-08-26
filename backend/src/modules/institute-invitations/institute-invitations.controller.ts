import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';

import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';
import type { AccessTokenPayload } from '../auth/types/auth.types';

import { InstituteRole } from '../../generated/prisma/enums';

import { CreateInstituteInvitationDto } from './dto/create-institute-invitation.dto';
import { InstituteInvitationsService } from './institute-invitations.service';
import { AcceptInstituteInvitationDto } from './dto/accept-institute-invitation.dto';
import { QueryInstituteInvitationsDto } from './dto/query-institute-invitations.dto';

type CurrentTenantData = NonNullable<TenantRequest['tenant']>;

@Controller('institute-invitations')
export class InstituteInvitationsController {
  constructor(
    private readonly instituteInvitationsService: InstituteInvitationsService,
  ) {}

  @Post()
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  create(
    @CurrentTenant() tenant: CurrentTenantData,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() request: TenantRequest,
    @Body() dto: CreateInstituteInvitationDto,
  ) {
    return this.instituteInvitationsService.create(
      tenant.id,
      currentUser.sub,
      dto,
      {
        actorUserId: currentUser.sub,
        ipAddress: request.ip ?? undefined,
        userAgent: request.headers['user-agent'] ?? undefined,
      },
    );
  }

  @Get('validate')
  validate(@Query('token') token: string) {
    return this.instituteInvitationsService.validateInvitation(token);
  }

  @Post('accept')
  accept(@Body() dto: AcceptInstituteInvitationDto) {
    return this.instituteInvitationsService.accept(dto);
  }

  @Get()
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  findAll(
    @CurrentTenant() tenant: CurrentTenantData,
    @Query() query: QueryInstituteInvitationsDto,
  ) {
    return this.instituteInvitationsService.findAll(tenant.id, query);
  }

  @Delete(':invitationId')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  revoke(
    @CurrentTenant() tenant: CurrentTenantData,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() request: TenantRequest,
    @Param('invitationId') invitationId: string,
  ) {
    return this.instituteInvitationsService.revoke(tenant.id, invitationId, {
      actorUserId: currentUser.sub,
      ipAddress: request.ip ?? undefined,
      userAgent: request.headers['user-agent'] ?? undefined,
    });
  }

  @Post(':invitationId/resend')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  resend(
    @CurrentTenant() tenant: CurrentTenantData,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() request: TenantRequest,
    @Param('invitationId') invitationId: string,
  ) {
    return this.instituteInvitationsService.resend(tenant.id, invitationId, {
      actorUserId: currentUser.sub,
      ipAddress: request.ip ?? undefined,
      userAgent: request.headers['user-agent'] ?? undefined,
    });
  }
}
