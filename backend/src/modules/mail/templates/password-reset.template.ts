interface PasswordResetTemplateInput {
  firstName: string;
  resetUrl: string;
  expiresAt: Date;
}

export function passwordResetTemplate(
  input: PasswordResetTemplateInput,
): string {
  const expiresAt = input.expiresAt.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `
    <!DOCTYPE html>
    <html>
      <body
        style="
          margin: 0;
          padding: 0;
          background: #f4f7fb;
          font-family: Arial, sans-serif;
          color: #1f2937;
        "
      >
        <div
          style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
          "
        >
          <div
            style="
              background: #0f172a;
              padding: 28px;
              text-align: center;
              color: #ffffff;
            "
          >
            <h1 style="margin: 0;">
              DevPlux LMS
            </h1>
          </div>

          <div style="padding: 32px;">
            <h2>Reset your password</h2>

            <p>
              Hello ${input.firstName},
            </p>

            <p>
              We received a request to reset your
              DevPlux LMS password.
            </p>

            <div
              style="
                text-align: center;
                margin: 32px 0;
              "
            >
              <a
                href="${input.resetUrl}"
                style="
                  display: inline-block;
                  padding: 14px 24px;
                  background: #2563eb;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: bold;
                "
              >
                Reset Password
              </a>
            </div>

            <p>
              This link expires on:
              <strong>${expiresAt}</strong>
            </p>

            <p
              style="
                margin-top: 32px;
                font-size: 13px;
                color: #6b7280;
              "
            >
              If you did not request a password reset,
              you can safely ignore this email.
            </p>
          </div>

          <div
            style="
              padding: 20px;
              text-align: center;
              background: #f8fafc;
              font-size: 12px;
              color: #64748b;
            "
          >
            DevPlux Software Solutions
          </div>
        </div>
      </body>
    </html>
  `;
}
