import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });
      this.isInitialized = true;
      console.log('📧 Ethereal Email Service initialized.');
    } catch (error) {
      console.error('❌ Failed to initialize EmailService:', error);
    }
  }

  async sendMail(options: nodemailer.SendMailOptions) {
    if (!this.isInitialized || !this.transporter) {
      console.warn('⚠️ EmailService not initialized. Skipping email send.');
      return;
    }
    try {
      const info = await this.transporter.sendMail({
        from: '"PRM Tool Admin" <admin@prmtool.local>',
        ...options,
      });
      console.log(`✉️  Email sent: ${info.messageId}`);
      console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
      console.error('❌ Error sending email:', error);
    }
  }

  async sendAccountCredentialsEmail(user: any, tempPassword: string) {
    await this.sendMail({
      to: user.email,
      subject: 'Welcome to PRM Tool - Your Account Credentials',
      html: `
        <h2>Welcome ${user.fullName}!</h2>
        <p>Your account has been created successfully.</p>
        <p><strong>Username:</strong> ${user.username}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Please log in and change your password immediately.</p>
      `,
    });
  }

  async sendAtRiskMilestoneEmail(manager: any, project: any, milestone: any) {
    await this.sendMail({
      to: manager.email,
      subject: `Action Required: Milestone AT RISK for project ${project.name}`,
      html: `
        <h2>Milestone At Risk!</h2>
        <p>Hello ${manager.fullName},</p>
        <p>The milestone <strong>${milestone.title}</strong> for project <strong>${project.name}</strong> has passed its due date (${new Date(milestone.dueDate).toLocaleDateString()}) and is not yet completed.</p>
        <p>It has been marked as <strong>AT_RISK</strong>. Please review and take necessary actions.</p>
      `,
    });
  }

  async sendProjectDeadlineWarningEmail(manager: any, project: any, daysLeft: number) {
    await this.sendMail({
      to: manager.email,
      subject: `Warning: Project ${project.name} deadline is approaching!`,
      html: `
        <h2>Project Deadline Warning</h2>
        <p>Hello ${manager.fullName},</p>
        <p>The project <strong>${project.name}</strong> is due in ${daysLeft} days (${new Date(project.endDate).toLocaleDateString()}).</p>
        <p>Please ensure all deliverables are on track.</p>
      `,
    });
  }

  async sendTimesheetReminderEmail(employee: any) {
    await this.sendMail({
      to: employee.email,
      subject: 'Reminder: Submit Your Weekly Timesheet',
      html: `
        <h2>Timesheet Reminder</h2>
        <p>Hello ${employee.fullName},</p>
        <p>This is a friendly reminder to submit your timesheet for this week before the deadline.</p>
      `,
    });
  }

  async sendMissedTimesheetAlertEmail(manager: any, employee: any, weekStart: Date) {
    await this.sendMail({
      to: manager.email,
      subject: `Alert: Missed Timesheet - ${employee.fullName}`,
      html: `
        <h2>Missed Timesheet Alert</h2>
        <p>Hello ${manager.fullName},</p>
        <p><strong>${employee.fullName}</strong> failed to submit their timesheet for the week starting ${new Date(weekStart).toLocaleDateString()}.</p>
        <p>The system has automatically generated a MISSED entry.</p>
      `,
    });
  }
}

export default new EmailService();
