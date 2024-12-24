const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: 'salted',
    product: {
      name: 'ShoesHub',
      link: 'https://youtube.com',
    },
  });

  // For more info on how mailgen content work visit https://github.com/eladnava/mailgen#readme
  // Generate the plaintext version of the e-mail (for clients that do not support HTML)
  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  // Generate an HTML email with the provided contents
  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const mail = {
    from: 'shoeshuborg@gmail.com', // We can name this anything. The mail will go to your Mailtrap inbox
    to: options.email, // receiver's mail
    subject: options.subject, // mail subject
    text: emailTextual, // mailgen content textual variant
    html: emailHtml, // mailgen content textual variant
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    // As sending email is not strongly coupled to the business logic it is not worth to raise an error when email sending fails
    // So it's better to fail silently rather than breaking the app
    console.log(
      'Email service failed silently. Make sure you have provided your MAILTRAP credentials in the .env file'
    );
    console.log('Error: ', error);
  }
};

const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: 'Welcome to Shoes Hub! Please Verify Your Email',
      action: {
        instructions:
          'To verify your email please click on the following button:',
        button: {
          color: '#191970', // Optional action button color
          text: 'Verify your email',
          link: verificationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

async function forgotsendmail(options) {
  try {
    const htmlMailContent = `
    <html>
    <head>
        <style>
            /* Define CSS styles for better presentation */
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: auto;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 5px;
                background-color: #f9f9f9;
            }
            h2 {
                color: #333;
            }
            p {
                color: #555;
            }
            .otp {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }
            .footer {
                margin-top: 20px;
                color: #888;
            }
        </style>
    </head>
    <body>
    <div class="container">
        <h2>Do Not Share Your OTP</h2>
        <p>Dear User,</p>
        <p>Your One-Time Password (OTP) is: <strong>${options.content}</strong></p>
        <p>Please use this OTP to complete your verification process.</p>
        <div class="footer">
            <p>Thank You,</p>
            <p>TrackOnWeb Team</p>
        </div>
    </div>
    </body>
    </html>
    `;
    await transporter.sendMail({
      from: 'jayashysaini7361@gmail.com',
      to: options.email,
      subject: options.subject,
      html: htmlMailContent,
    });
  } catch (error) {
    console.error('Error sending mail', error);
    throw new ApiError(500, 'Failed to send mail');
  }
}

async function subscriptionSendmail(options) {
  try {
    const htmlMailContent = `
    <html>
    <head>
        <style>
            /* Define CSS styles for better presentation */
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: auto;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 5px;
                background-color: #f9f9f9;
            }
            h2 {
                color: #333;
            }
            p {
                color: #555;
            }
            .otp {
              font-size: 16px;
              font-weight: bold;
              color: #007bff;
          }
            .footer {
                margin-top: 20px;
                color: #888;
            }
        </style>
    </head>
    <body>
    <div class="container">
    <h2>Congratulations for Subscribing to Shoes Hub!</h2>
    <p>Dear User,</p>
    <p>Thank you for subscribing to Shoes Hub! Here is your coupon code:
    <strong class="otp">${options.content}</strong> </p>
    <p>Please use this coupon code to get Rs.500 FLAT OFF your next purchase.</p>
    <div class="footer">
        <p>Thank You,</p>
        <p>Shoes Hub Team</p>
    </div>
</div>
    </body>
    </html>
    `;
    await transporter.sendMail({
      from: 'jayashysaini7361@gmail.com',
      to: options.email,
      subject: options.subject,
      html: htmlMailContent,
    });
  } catch (error) {
    console.error('Error sending mail', error);
    throw new ApiError(500, 'Failed to send mail');
  }
}

module.exports = {
  sendEmail,
  forgotsendmail,
  emailVerificationMailgenContent,
  subscriptionSendmail,
};
