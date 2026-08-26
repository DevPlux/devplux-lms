import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { instituteInvitationTemplate } from './templates/institute-invitation.template';

interface SendInstituteInvitationInput {
  to: string;
  firstName: string;
  instituteName: string;
  role: string;
  invitationUrl: string;
  expiresAt: Date;
}

@Injectable()
export class MailService {
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');

    this.resend = new Resend(apiKey);
  }

  async sendInstituteInvitation(input: SendInstituteInvitationInput) {
    const fromName =
      this.configService.get<string>('MAIL_FROM_NAME') ?? 'DevPlux LMS';

    const fromEmail = this.configService.getOrThrow<string>('MAIL_FROM_EMAIL');

    const html = instituteInvitationTemplate({
      firstName: input.firstName,
      instituteName: input.instituteName,
      role: input.role,
      invitationUrl: input.invitationUrl,
      expiresAt: input.expiresAt,
    });

    const { data, error } = await this.resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: input.to,
      subject: `You're invited to ${input.instituteName}`,
      html,
    });

    if (error) {
      throw new InternalServerErrorException('Failed to send invitation email');
    }

    return data;
  }
}
