const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter with SMTP configuration
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('SMTP connection error:', error);
        } else {
          console.log('SMTP server is ready to take our messages');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} [options.html] - HTML content
   * @param {string} [options.from] - Sender email (optional)
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail(options) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: options.from || `${process.env.SMTP_FROM_NAME || 'SargenJS App'} <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully',
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send email',
      };
    }
  }

  /**
   * Send welcome email
   * @param {string} to - Recipient email
   * @param {string} name - Recipient name
   * @returns {Promise<Object>} - Send result
   */
  async sendWelcomeEmail(to, name) {
    return this.sendEmail({
      to,
      subject: 'Welcome to our application!',
      text: `Hello ${name}, welcome to our application!`,
      html: `
        <h2>Welcome ${name}!</h2>
        <p>Thank you for joining our application. We're excited to have you on board!</p>
        <p>Best regards,<br>The Team</p>
      `,
    });
  }
}

module.exports = new EmailService();
