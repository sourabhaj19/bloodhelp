import { renderString, sampleVarsFor } from './email-template.service';
import { EmailTemplateService } from './email-template.service';

describe('renderString', () => {
  it('replaces simple placeholders', () => {
    expect(renderString('Hello {{firstName}}!', { firstName: 'Alex' }, false)).toBe('Hello Alex!');
  });

  it('supports dot-path access', () => {
    expect(renderString('Hi {{user.firstName}}', { user: { firstName: 'Jordan' } }, false)).toBe('Hi Jordan');
  });

  it('trims whitespace inside braces', () => {
    expect(renderString('{{  firstName  }}', { firstName: 'Sam' }, false)).toBe('Sam');
  });

  it('returns empty string for missing vars', () => {
    expect(renderString('Hello {{missing}}', {}, false)).toBe('Hello ');
    expect(renderString('{{a.b.c}}', { a: null }, false)).toBe('');
  });

  it('escapes HTML when escape=true', () => {
    const vars = { name: '<script>alert("xss")</script>' };
    expect(renderString('Hi {{name}}', vars, true)).toBe('Hi &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(renderString('A & B {{name}}', { name: 'a & b' }, true)).toContain('&amp;');
  });

  it('does not escape when escape=false', () => {
    expect(renderString('{{name}}', { name: '<b>hi</b>' }, false)).toBe('<b>hi</b>');
  });

  it('handles multiple placeholders', () => {
    expect(renderString('{{a}} {{b}} {{a}}', { a: '1', b: '2' }, false)).toBe('1 2 1');
  });

  it('leaves non-placeholder text unchanged', () => {
    expect(renderString('no vars here', {}, false)).toBe('no vars here');
  });
});

describe('sampleVarsFor', () => {
  it('provides vars for each notification type', () => {
    expect(sampleVarsFor('EMAIL_VERIFICATION', 'http://localhost').verifyLink).toContain('http://localhost');
    expect(sampleVarsFor('PASSWORD_RESET', 'http://app').resetLink).toContain('http://app');
    expect(sampleVarsFor('REPORT_CREATED', 'http://app')).toHaveProperty('reportedName');
    expect(sampleVarsFor('APPRECIATION_RECEIVED', 'http://app').senderName).toBe('Sam');
    expect(sampleVarsFor('CONTACT_MESSAGE', 'http://app').name).toBe('Alex');
    expect(sampleVarsFor('CONTACT_CONFIRMATION', 'http://app').subject).toBeDefined();
    expect(sampleVarsFor('WELCOME', 'http://app').firstName).toBe('Alex');
    expect(sampleVarsFor(null, 'http://app').firstName).toBe('Alex');
    expect(sampleVarsFor('UNKNOWN_TYPE', 'http://app').firstName).toBe('Alex');
  });
});

describe('EmailTemplateService (with mocked deps)', () => {
  function createService() {
    const prismaMock = {
      emailTemplate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;
    const mailMock = { send: jest.fn().mockResolvedValue({ skipped: false }) } as any;
    const configMock = { get: jest.fn((key: string, _def: any) => (key === 'app.frontendUrl' ? 'http://localhost:4200' : _def)) } as any;
    const svc = new EmailTemplateService(prismaMock, mailMock, configMock);
    return { svc, prismaMock, mailMock, configMock };
  }

  it('render uses HTML escaping for subject/html and not for text', () => {
    const { svc } = createService();
    const tpl = { subject: 'Hi {{firstName}}', htmlBody: '<p>{{firstName}}</p>', textBody: 'Hi {{firstName}}' };
    const out = svc.render(tpl, { firstName: '<Alex>' });
    expect(out.subject).toBe('Hi &lt;Alex&gt;');
    expect(out.html).toBe('<p>&lt;Alex&gt;</p>');
    expect(out.text).toBe('Hi <Alex>');
  });

  it('render handles null textBody', () => {
    const { svc } = createService();
    const tpl = { subject: 'Hi {{firstName}}', htmlBody: 'Hi {{firstName}}', textBody: null };
    const out = svc.render(tpl, { firstName: 'Alex' });
    expect(out.text).toBeUndefined();
  });

  it('sendForType returns no-template-mapped when not found', async () => {
    const { svc, prismaMock } = createService();
    prismaMock.emailTemplate.findUnique.mockResolvedValue(null);
    const res = await svc.sendForType('WELCOME', 'test@example.com', { firstName: 'Alex' });
    expect(res.sent).toBe(false);
    expect(res.reason).toBe('no-template-mapped');
  });

  it('sendForType returns template-inactive when inactive', async () => {
    const { svc, prismaMock } = createService();
    prismaMock.emailTemplate.findUnique.mockResolvedValue({ active: false, subject: 'hi', htmlBody: 'hi', textBody: null });
    const res = await svc.sendForType('WELCOME', 'test@example.com', {});
    expect(res.reason).toBe('template-inactive');
  });

  it('sendForType renders and sends when active', async () => {
    const { svc, prismaMock, mailMock } = createService();
    prismaMock.emailTemplate.findUnique.mockResolvedValue({ active: true, subject: 'Hi {{firstName}}', htmlBody: 'Hi {{firstName}}', textBody: null });
    mailMock.send.mockResolvedValue({ skipped: false });
    const res = await svc.sendForType('WELCOME', 'a@b.com', { firstName: 'Alex' });
    expect(res.sent).toBe(true);
    expect(mailMock.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com', subject: 'Hi Alex' }));
  });

  it('sendForType never throws on mail failure', async () => {
    const { svc, prismaMock, mailMock } = createService();
    prismaMock.emailTemplate.findUnique.mockResolvedValue({ active: true, subject: 'Hi', htmlBody: 'Hi', textBody: null });
    mailMock.send.mockRejectedValue(new Error('smtp down'));
    const res = await svc.sendForType('WELCOME', 'a@b.com', {});
    expect(res.sent).toBe(false);
    expect(res.reason).toBe('send-failed');
  });
});
