import { Router } from "express";
import prisma from "../prisma.js";
import { authenticateToken } from "../middleware/auth.js";
import { signJWT } from "../utils/auth.js";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const router = Router();

// RP Details (Relying Party - the application)
const getRPDetails = (req) => {
  const rpName = "FitFlow Gym Management";
  const rpID = req.hostname === "localhost" ? "localhost" : req.hostname;
  return { rpName, rpID };
};

/**
 * ==========================================
 * REGISTRATION OPTIONS
 * ==========================================
 */
router.post("/register/options", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.gymUser.findUnique({
      where: { id: req.user.userId },
      include: { credentials: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { rpName, rpID } = getRPDetails(req);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id),
      userName: user.email,
      userDisplayName: user.name,
      excludeCredentials: user.credentials.map((cred) => ({
        id: cred.credentialID,
        type: "public-key",
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      })),
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "preferred",
      },
      attestationType: "none",
    });

    // Store challenge in temporary signed/secure cookie
    res.cookie("webauthn_reg_challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 5 * 60 * 1000, // 5 minutes
      path: "/",
    });

    return res.json(options);
  } catch (error) {
    console.error("WebAuthn register options error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ==========================================
 * REGISTRATION VERIFICATION
 * ==========================================
 */
router.post("/register/verify", authenticateToken, async (req, res) => {
  try {
    const challenge = req.cookies.webauthn_reg_challenge;
    if (!challenge) {
      return res.status(400).json({ error: "Registration challenge not found or expired" });
    }

    const user = await prisma.gymUser.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // The expectedOrigin must match the FRONTEND origin where the browser
    // registered the credential (localhost:3000), NOT the backend port (5000).
    const expectedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
    const { rpID } = getRPDetails(req);

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return res.status(400).json({ error: "Credential verification failed" });
    }

    // v13 API: fields are under registrationInfo.credential
    const { credential } = registrationInfo;

    // credential.id is already a Base64URL string in v13
    // credential.publicKey is a Uint8Array
    const publicKeyBase64URL = Buffer.from(credential.publicKey).toString("base64url");

    await prisma.userCredential.create({
      data: {
        userId: user.id,
        credentialID: credential.id,
        publicKey: publicKeyBase64URL,
        counter: Number(credential.counter),
        transports: credential.transports ? JSON.stringify(credential.transports) : null,
      },
    });

    res.clearCookie("webauthn_reg_challenge", { path: "/" });

    return res.json({ success: true });
  } catch (error) {
    console.error("WebAuthn register verify error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ==========================================
 * AUTHENTICATION OPTIONS
 * ==========================================
 */
router.post("/login/options", async (req, res) => {
  try {
    const { email } = req.body;
    const { rpID } = getRPDetails(req);

    let allowCredentials = undefined;

    if (email) {
      const user = await prisma.gymUser.findUnique({
        where: { email },
        include: { credentials: true },
      });

      if (!user || user.credentials.length === 0) {
        return res.status(400).json({ error: "No passkeys registered for this email address" });
      }

      allowCredentials = user.credentials.map((cred) => ({
        id: cred.credentialID,
        type: "public-key",
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: "preferred",
    });

    res.cookie("webauthn_login_challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 5 * 60 * 1000, // 5 minutes
      path: "/",
    });

    if (email) {
      res.cookie("webauthn_login_email", email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 5 * 60 * 1000, // 5 minutes
        path: "/",
      });
    } else {
      res.clearCookie("webauthn_login_email", { path: "/" });
    }

    return res.json(options);
  } catch (error) {
    console.error("WebAuthn login options error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ==========================================
 * AUTHENTICATION VERIFICATION
 * ==========================================
 */
router.post("/login/verify", async (req, res) => {
  try {
    const challenge = req.cookies.webauthn_login_challenge;
    const email = req.cookies.webauthn_login_email || null;

    if (!challenge) {
      return res.status(400).json({ error: "Authentication challenge not found or expired" });
    }

    const bodyCredID = req.body.id;

    let dbCredential = null;
    let user = null;

    if (email) {
      // Named authentication
      user = await prisma.gymUser.findUnique({
        where: { email },
        include: { credentials: true, gym: true },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      dbCredential = user.credentials.find(
        (c) => c.credentialID === bodyCredID
      );
    } else {
      // Nameless authentication (discoverable credentials/resident keys)
      dbCredential = await prisma.userCredential.findUnique({
        where: { credentialID: bodyCredID },
        include: { user: { include: { gym: true } } },
      });

      if (dbCredential) {
        user = dbCredential.user;
      }
    }

    if (!dbCredential || !user) {
      return res.status(400).json({ error: "Credential not registered with this account" });
    }

    // The expectedOrigin must match the FRONTEND origin where the browser
    // registered the credential (localhost:3000), NOT the backend port (5000).
    const expectedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
    const { rpID } = getRPDetails(req);

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
      // v13 API: credential is a top-level param (not `authenticator`)
      credential: {
        id: dbCredential.credentialID,
        publicKey: Buffer.from(dbCredential.publicKey, "base64url"),
        counter: dbCredential.counter,
        transports: dbCredential.transports ? JSON.parse(dbCredential.transports) : undefined,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (!verified || !authenticationInfo) {
      return res.status(400).json({ error: "Passkey verification failed" });
    }

    // Update signature counter
    await prisma.userCredential.update({
      where: { id: dbCredential.id },
      data: { counter: Number(authenticationInfo.newCounter) },
    });

    // Create session token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
    };

    const token = signJWT(payload, "7d");

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: "/",
    });

    res.clearCookie("webauthn_login_challenge", { path: "/" });
    res.clearCookie("webauthn_login_email", { path: "/" });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gym: user.gym ? { id: user.gym.id, name: user.gym.name, slug: user.gym.slug } : null,
      },
    });
  } catch (error) {
    console.error("WebAuthn login verify error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ==========================================
 * GET USER CREDENTIALS (PASSKEYS)
 * ==========================================
 */
router.get("/credentials", authenticateToken, async (req, res) => {
  try {
    const credentials = await prisma.userCredential.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        credentialID: true,
        createdAt: true,
        counter: true,
      },
    });
    return res.json(credentials);
  } catch (error) {
    console.error("WebAuthn list credentials error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ==========================================
 * DELETE USER CREDENTIAL (PASSKEY)
 * ==========================================
 */
router.delete("/credentials/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const credential = await prisma.userCredential.findUnique({
      where: { id },
    });

    if (!credential || credential.userId !== req.user.userId) {
      return res.status(404).json({ error: "Credential not found" });
    }

    await prisma.userCredential.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("WebAuthn delete credential error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
