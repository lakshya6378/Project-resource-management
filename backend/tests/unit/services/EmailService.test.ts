import emailService from '../../../src/services/EmailService';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'msg_1' }),
    };

    (nodemailer.createTestAccount as jest.Mock).mockResolvedValue({
      user: 'test_user',
      pass: 'test_pass',
    });

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    (emailService as any).isInitialized = false;
    (emailService as any).transporter = null;
  });

  describe('init', () => {
    it('should initialize the transporter', async () => {
      await emailService.init();
      expect(nodemailer.createTestAccount).toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect((emailService as any).isInitialized).toBe(true);
    });
  });

  describe('sendMail', () => {
    it('should not send email if not initialized', async () => {
      await emailService.sendMail({ to: 'test@example.com' });
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should send email if initialized', async () => {
      await emailService.init();
      await emailService.sendMail({ to: 'test@example.com', subject: 'Test' });
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });
  });

  describe('specific email methods', () => {
    beforeEach(async () => {
      await emailService.init();
    });

    it('should sendAccountCredentialsEmail', async () => {
      await emailService.sendAccountCredentialsEmail({ email: 'user@test.com', fullName: 'User', username: 'usr' }, 'pass');
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should sendAtRiskMilestoneEmail', async () => {
      await emailService.sendAtRiskMilestoneEmail({ email: 'mgr@test.com' }, { name: 'Proj' }, { title: 'M1', dueDate: '2026-01-01' });
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should sendProjectDeadlineWarningEmail', async () => {
      await emailService.sendProjectDeadlineWarningEmail({ email: 'mgr@test.com' }, { name: 'Proj', endDate: '2026-01-01' }, 5);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should sendTimesheetReminderEmail', async () => {
      await emailService.sendTimesheetReminderEmail({ email: 'emp@test.com', fullName: 'Emp' }, 1);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should sendMissedTimesheetAlertEmail', async () => {
      await emailService.sendMissedTimesheetAlertEmail({ email: 'mgr@test.com' }, { fullName: 'Emp' }, new Date());
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });
  });
});
