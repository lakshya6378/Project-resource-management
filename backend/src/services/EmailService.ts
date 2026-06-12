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

  async sendPasswordResetEmail(user: any, tempPassword: string) {
    await this.sendMail({
      to: user.email,
      subject: 'PRM Tool - Password Reset',
      html: `
        <h2>Hello ${user.fullName},</h2>
        <p>Your password has been reset by an administrator.</p>
        <p><strong>Username:</strong> ${user.username}</p>
        <p><strong>New Temporary Password:</strong> ${tempPassword}</p>
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

  async sendProjectAtRiskEmail(manager: any, project: any, aiSummary: string, suggestedHelp: string) {
    await this.sendMail({
      to: manager.email,
      subject: `Notification: Project ${project.name} is AT RISK`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px;">Project At-Risk: ${project.name}</h2>
          
          <div style="background-color: #fff; padding: 15px; margin-bottom: 20px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #555;">Project Details</h3>
            <p><strong>Name:</strong> ${project.name}</p>
            <p><strong>Manager:</strong> ${manager.fullName}</p>
            <p><strong>Health Status:</strong> <span style="color: #d9534f; font-weight: bold;">🔴 RED (AT RISK)</span></p>
          </div>
          
          <div style="background-color: #fff; padding: 15px; margin-bottom: 20px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #555;">🧠 AI Risk Summary</h3>
            <p style="white-space: pre-wrap;">${aiSummary}</p>
          </div>
          
          <div style="background-color: #fff; padding: 15px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #555;">💡 Suggested Help</h3>
            <p style="white-space: pre-wrap;">${suggestedHelp}</p>
          </div>
          
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 20px;">
            Managers can act quickly without constantly monitoring dashboards.
          </p>
        </div>
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

  async sendTimesheetReminderEmail(employee: any, reminderLevel: number) {
    const isWarning = reminderLevel === 2;
    await this.sendMail({
      to: employee.email,
      subject: isWarning ? 'URGENT: Final Reminder to Submit Your Weekly Timesheet' : 'Reminder: Submit Your Weekly Timesheet',
      html: `
        <h2>${isWarning ? 'Final Timesheet Reminder' : 'Timesheet Reminder'}</h2>
        <p>Hello ${employee.fullName},</p>
        <p>This is a ${isWarning ? '<strong>final warning</strong>' : 'friendly reminder'} to submit your timesheet for last week.</p>
        ${isWarning ? '<p style="color: red;">If you do not submit it today, your timesheet access will be frozen.</p>' : ''}
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

  async sendTimesheetFreezeEmail(manager: any, employee: any) {
    await this.sendMail({
      to: [manager.email, employee.email].join(','),
      subject: `Action Required: Timesheet Access Frozen - ${employee.fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #d9534f;">Timesheet Access Restricted</h2>
          <p>Hello,</p>
          <p>This is a notification that <strong>${employee.fullName}</strong> has failed to submit their timesheet after multiple reminders.</p>
          <p>As a result, their timesheet submission access is now <strong>FROZEN</strong>. They can still log in and view, but cannot create, update, or submit entries.</p>
          <p><strong>To Restore Access:</strong> The reporting manager can review the issue and restore access through the system by approving a Timesheet Access Request.</p>
        </div>
      `,
    });
  }
}

export default new EmailService();
