import nodemailer from "nodemailer";
import users from "../Modals/Auth.js";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

// Temporary in-memory store for OTPs
// In production, use Redis or a DB with TTL
const otpStore = new Map();

const createTransporter = () => {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtp = async (req, res) => {
  const { contact, type, name, image } = req.body;

  if (!contact || !type || !['email', 'mobile'].includes(type)) {
    return res.status(400).json({ message: "Valid contact and type ('email' or 'mobile') are required." });
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // StoreOTP payload
  otpStore.set(contact, { otp, expiresAt, type, name, image });

  if (type === 'email') {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn(`[Mock Email OTP] To: ${contact}, OTP: ${otp}`);
      return res.status(200).json({ message: "OTP sent successfully (Mocked, SMTP not configured)." });
    }

    try {
      await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: contact,
        subject: `Your YourTube Login OTP`,
        text: `Your OTP for YourTube login is ${otp}. It is valid for 5 minutes.`,
        html: `<h2>YourTube Login</h2><p>Your OTP is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`,
      });
      return res.status(200).json({ message: "OTP sent to email successfully." });
    } catch (error) {
      console.error("Email OTP error:", error);
      return res.status(500).json({ message: "Failed to send email OTP." });
    }
  } else if (type === 'mobile') {
    // Mocking SMS since no Twilio credentials are provided
    console.log(`\n\n=== [MOCK SMS DISPATCH] ===`);
    console.log(`To: ${contact}`);
    console.log(`Message: Your OTP for YourTube login is ${otp}. It is valid for 5 minutes.`);
    console.log(`===========================\n\n`);
    
    return res.status(200).json({ message: "OTP sent to mobile successfully (Check server logs)." });
  }
};

export const verifyOtp = async (req, res) => {
  const { contact, otp } = req.body;

  if (!contact || !otp) {
    return res.status(400).json({ message: "Contact and OTP are required." });
  }

  const storedData = otpStore.get(contact);

  if (!storedData) {
    return res.status(400).json({ message: "OTP expired or not sent. Request a new one." });
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(contact);
    return res.status(400).json({ message: "OTP expired. Request a new one." });
  }

  if (storedData.otp !== otp.toString()) {
    return res.status(400).json({ message: "Invalid OTP." });
  }

  // OTP verified, clear it from store
  otpStore.delete(contact);

  try {
    // Find user by email or mobileNumber depending on the type
    let userFilters = storedData.type === 'email' ? { email: contact } : { mobileNumber: contact };
    let existingUser = await users.findOne(userFilters);

    if (!existingUser) {
      // First-time explicit creation via Mobile/Email OTP missing Google data mapping fallback
      const newUserPayload = {
        name: storedData.name || (storedData.type === 'email' ? contact.split('@')[0] : "User"),
        image: storedData.image || "https://github.com/shadcn.png",
        currentPlan: "free",
        premiumPlan: "free",
        watchLimitMinutes: 5,
        isPremium: false,
      };

      if (storedData.type === 'email') {
        newUserPayload.email = contact;
      } else {
        newUserPayload.mobileNumber = contact;
      }

      const newUser = await users.create(newUserPayload);
      return res.status(201).json({ result: newUser });
    } else {
      // Return existing user properties
      const updatedUser = existingUser.currentPlan && existingUser.watchLimitMinutes !== undefined
        ? existingUser
        : await users.findByIdAndUpdate(
            existingUser._id,
            {
              $set: {
                currentPlan: existingUser.currentPlan || "free",
                premiumPlan: existingUser.premiumPlan || "free",
                watchLimitMinutes: existingUser.watchLimitMinutes !== undefined ? existingUser.watchLimitMinutes : 5,
                isPremium: existingUser.isPremium || false,
              },
            },
            { new: true }
          );

      return res.status(200).json({ result: updatedUser });
    }
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};
