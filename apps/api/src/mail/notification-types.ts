/** Notification types an admin can map an email template to, with the variables each template receives. */
export const NOTIFICATION_TYPES: { type: string; description: string; variables: string[] }[] = [
  { type: 'WELCOME', description: 'Sent when the email address is verified', variables: ['firstName', 'appUrl'] },
  { type: 'EMAIL_VERIFICATION', description: 'Email verification link (registration + resend)', variables: ['firstName', 'verifyLink', 'appUrl'] },
  { type: 'PASSWORD_RESET', description: 'Password reset link', variables: ['firstName', 'resetLink', 'appUrl'] },
  { type: 'PASSWORD_CHANGED', description: 'Password was changed (notice + other devices logged out)', variables: ['firstName', 'appUrl'] },
  { type: 'REPORT_CREATED', description: 'A new report filed (sent to admins)', variables: ['reportedName', 'reportedEmail', 'reasonLabel', 'reportId', 'appUrl'] },
  { type: 'REPORT_STATUS_CHANGED', description: 'Report triage decision (sent to reporter)', variables: ['firstName', 'reportedName', 'statusLabel', 'reportId', 'appUrl'] },
  { type: 'APPRECIATION_RECEIVED', description: 'Someone thanked a donor', variables: ['firstName', 'senderName', 'message', 'appUrl'] },
  { type: 'CONTACT_MESSAGE', description: 'Contact-form copy (sent to support)', variables: ['name', 'email', 'subject', 'message'] },
  { type: 'CONTACT_CONFIRMATION', description: 'Contact-form confirmation (sent to sender)', variables: ['name', 'subject'] },
];

export const NOTIFICATION_TYPE_VALUES = NOTIFICATION_TYPES.map((t) => t.type);
