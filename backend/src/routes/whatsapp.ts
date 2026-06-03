import { Router, Response } from 'express';
import { db } from '../lib/db';
import { authenticateToken, scopeToGym, RequestWithUser } from '../middleware/auth';
import { whatsappService } from '../services/whatsapp-service';

import { decrypt } from '../services/encryption';

const router = Router({ mergeParams: true });

// Apply authentication and scoping
router.use(authenticateToken);
router.use(scopeToGym);

// GET /api/dashboard/:gymSlug/whatsapp/status
router.get('/status', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;

    const gym = await db.gym.findUnique({
      where: { slug: gymSlug },
    });

    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    // Default status values
    let whatsappVerificationStatus = 'NOT_VERIFIED';
    let whatsappQualityRating = 'UNKNOWN';
    let whatsappMessagingTier = 'UNKNOWN';
    let whatsappVerifiedName = gym.name;
    let whatsappDisplayPhoneNumber = gym.whatsapp_phone_number || '';

    // If connected, attempt to fetch live health metrics from Meta Graph API
    if (gym.whatsapp_connected && gym.whatsapp_access_token && gym.whatsapp_phone_number_id) {
      try {
        const token = decrypt(gym.whatsapp_access_token);
        if (!token.startsWith('mock_')) {
          // Fetch phone details
          const phoneUrl = `https://graph.facebook.com/v20.0/${gym.whatsapp_phone_number_id}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,status&access_token=${token}`;
          const phoneResp = await fetch(phoneUrl);
          const phoneData = (await phoneResp.json()) as any;
          if (phoneResp.ok && phoneData) {
            whatsappVerificationStatus = phoneData.code_verification_status || 'NOT_VERIFIED';
            whatsappQualityRating = phoneData.quality_rating || 'UNKNOWN';
            whatsappVerifiedName = phoneData.verified_name || gym.name;
            whatsappDisplayPhoneNumber = phoneData.display_phone_number || gym.whatsapp_phone_number || '';
          }

          // Fetch limit tier
          const limitUrl = `https://graph.facebook.com/v20.0/${gym.whatsapp_waba_id}/phone_numbers?access_token=${token}`;
          const limitResp = await fetch(limitUrl);
          const limitData = (await limitResp.json()) as any;
          if (limitResp.ok && limitData?.data && Array.isArray(limitData.data)) {
            const numberObj = limitData.data.find((n: any) => n.id === gym.whatsapp_phone_number_id);
            if (numberObj) {
              whatsappMessagingTier = numberObj.messaging_limit_tier || 'UNKNOWN';
            }
          }
        } else {
          // Fallback values for mock/simulation connection
          whatsappVerificationStatus = 'VERIFIED';
          whatsappQualityRating = 'GREEN';
          whatsappMessagingTier = 'TIER_1';
          whatsappVerifiedName = gym.name;
          whatsappDisplayPhoneNumber = gym.whatsapp_phone_number || '919988776655';
        }
      } catch (err) {
        console.error('[WhatsApp Status Meta Refresh failed]', err);
      }
    }

    // 1. Calculate analytics counts from WhatsAppMessage table
    const sentCount = await db.whatsAppMessage.count({
      where: { gymId: gym.id, status: 'SENT' },
    });

    const deliveredCount = await db.whatsAppMessage.count({
      where: { gymId: gym.id, status: 'DELIVERED' },
    });

    const readCount = await db.whatsAppMessage.count({
      where: { gymId: gym.id, status: 'READ' },
    });

    const failedCount = await db.whatsAppMessage.count({
      where: { gymId: gym.id, status: 'FAILED' },
    });

    // 2. Fetch recent message logs
    const recentMessages = await db.whatsAppMessage.findMany({
      where: { gymId: gym.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // 3. Fetch synced templates
    const templates = await db.whatsAppTemplate.findMany({
      where: { gymId: gym.id },
      orderBy: { templateName: 'asc' },
    });

    return res.json({
      connected: gym.whatsapp_connected,
      phoneNumber: whatsappDisplayPhoneNumber || gym.whatsapp_phone_number,
      phoneNumberId: gym.whatsapp_phone_number_id,
      wabaId: gym.whatsapp_waba_id,
      businessId: gym.whatsapp_business_id,
      facebookAppId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || null,
      facebookConfigId: process.env.NEXT_PUBLIC_FB_SIGNUP_CONFIG_ID || null,
      whatsappVerificationStatus,
      whatsappQualityRating,
      whatsappMessagingTier,
      whatsappVerifiedName,
      whatsappDisplayPhoneNumber,
      analytics: {
        sent: sentCount,
        delivered: deliveredCount,
        read: readCount,
        failed: failedCount,
        total: sentCount + deliveredCount + readCount + failedCount,
      },
      recentMessages,
      templates,
    });
  } catch (error) {
    console.error('Error fetching WhatsApp status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/connect
router.post('/connect', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;
    const { accessToken, wabaId, phoneNumberId, businessId } = req.body;

    if (!accessToken || !wabaId || !phoneNumberId || !businessId) {
      return res.status(400).json({ error: 'Missing Meta Embedded Signup details' });
    }

    const gym = await db.gym.findUnique({ where: { slug: gymSlug } });
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const result = await whatsappService.connectWhatsApp(gym.id, {
      accessToken,
      wabaId,
      phoneNumberId,
      businessId,
    });

    return res.json(result);
  } catch (error) {
    console.error('Error connecting WhatsApp:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/embedded-setup
router.post('/embedded-setup', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;
    const { code, wabaId, phoneNumberId, businessId } = req.body;

    if (!code || !wabaId || !phoneNumberId) {
      return res.status(400).json({ error: 'Missing OAuth authorization code, WABA ID, or Phone Number ID.' });
    }

    const gym = await db.gym.findUnique({ where: { slug: gymSlug } });
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      return res.status(500).json({ error: 'Meta Developer App credentials not configured in backend.' });
    }

    const qs = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    });

    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?${qs.toString()}`;
    const tokenResp = await fetch(tokenUrl);
    const tokenData = (await tokenResp.json()) as any;

    if (!tokenResp.ok || !tokenData.access_token) {
      console.error('[WhatsApp Embedded Signup] Token exchange failed:', tokenData);
      return res.status(400).json({
        error: 'Failed to exchange Meta OAuth authorization code.',
        metaError: tokenData?.error || tokenData,
      });
    }

    const accessToken = tokenData.access_token;

    // Connect the number and run activation steps (registration, sub_apps, database saving)
    const result = await whatsappService.connectWhatsApp(gym.id, {
      accessToken,
      wabaId,
      phoneNumberId,
      businessId: businessId || '',
    });

    return res.json(result);
  } catch (error) {
    console.error('Error in WhatsApp embedded setup callback:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/disconnect
router.post('/disconnect', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;

    const gym = await db.gym.findUnique({ where: { slug: gymSlug } });
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    await whatsappService.disconnectWhatsApp(gym.id);
    return res.json({ success: true, message: 'WhatsApp disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/verify-eligibility
router.post('/verify-eligibility', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;
    const { phoneNumberId, accessToken } = req.body;

    if (!phoneNumberId) {
      return res.status(400).json({ error: 'Phone Number ID is required' });
    }

    const gym = await db.gym.findUnique({ where: { slug: gymSlug } });
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const result = await whatsappService.verifyCoexistenceEligibility(
      gym.id,
      phoneNumberId,
      accessToken
    );

    return res.json(result);
  } catch (error) {
    console.error('Error verifying coexistence eligibility:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/sync-templates
router.post('/sync-templates', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;

    const gym = await db.gym.findUnique({ where: { slug: gymSlug } });
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const success = await whatsappService.syncTemplates(gym.id);
    if (!success) {
      return res.status(400).json({ error: 'Template sync failed. Verify WABA is active.' });
    }

    return res.json({ success: true, message: 'Templates synchronized successfully' });
  } catch (error) {
    console.error('Error syncing templates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/simulate
router.post('/simulate', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Recipient phone and message text are required' });
    }

    const gym = await db.gym.findUnique({ where: { slug: gymSlug } });
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    // Mock incoming message webhook logic
    const mockWebhookPayload = {
      entry: [{
        changes: [{
          value: {
            metadata: {
              phone_number_id: gym.whatsapp_phone_number_id || 'mock_phone_id',
              display_phone_number: gym.whatsapp_phone_number || '919988776655',
            },
            contacts: [{
              wa_id: phone.replace('+', ''),
              profile: { name: 'Simulated User' },
            }],
            messages: [{
              id: `wamid.HBgM${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
              from: phone.replace('+', ''),
              text: { body: message },
              type: 'text',
              timestamp: Math.floor(Date.now() / 1000).toString(),
            }],
          },
        }],
      }],
    };

    // Run webhook processing logic
    await whatsappService.processWebhook(mockWebhookPayload);

    return res.json({ success: true, message: 'Inbound message simulated and chatbot executed' });
  } catch (error) {
    console.error('Error simulating WhatsApp inbound message:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/connect/simulate-success
router.post('/connect/simulate-success', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;

    const gym = await db.gym.findUnique({ where: { slug: gymSlug } });
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    // Simulate Embedded Signup result
    const result = await whatsappService.connectWhatsApp(gym.id, {
      accessToken: `mock_long_lived_token_${Date.now()}`,
      wabaId: `mock_waba_id_${Math.floor(Math.random() * 100000000)}`,
      phoneNumberId: `mock_phone_id_${Math.floor(Math.random() * 100000000)}`,
      businessId: `mock_business_id_${Math.floor(Math.random() * 100000000)}`,
    });

    return res.json(result);
  } catch (error) {
    console.error('Error simulating pairing success:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/reverify
router.post('/reverify', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;

    const gym = await db.gym.findUnique({
      where: { slug: gymSlug },
    });

    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    await whatsappService.reverifyWhatsApp(gym.id);

    // Refresh and fetch latest health metrics
    let whatsappVerificationStatus = 'NOT_VERIFIED';
    let whatsappQualityRating = 'UNKNOWN';
    let whatsappMessagingTier = 'UNKNOWN';
    let whatsappVerifiedName = gym.name;
    let whatsappDisplayPhoneNumber = gym.whatsapp_phone_number || '';

    if (gym.whatsapp_access_token && gym.whatsapp_phone_number_id) {
      const token = decrypt(gym.whatsapp_access_token);
      if (!token.startsWith('mock_')) {
        const phoneUrl = `https://graph.facebook.com/v20.0/${gym.whatsapp_phone_number_id}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,status&access_token=${token}`;
        const phoneResp = await fetch(phoneUrl);
        const phoneData = (await phoneResp.json()) as any;
        if (phoneResp.ok && phoneData) {
          whatsappVerificationStatus = phoneData.code_verification_status || 'NOT_VERIFIED';
          whatsappQualityRating = phoneData.quality_rating || 'UNKNOWN';
          whatsappVerifiedName = phoneData.verified_name || gym.name;
          whatsappDisplayPhoneNumber = phoneData.display_phone_number || gym.whatsapp_phone_number || '';
        }

        const limitUrl = `https://graph.facebook.com/v20.0/${gym.whatsapp_waba_id}/phone_numbers?access_token=${token}`;
        const limitResp = await fetch(limitUrl);
        const limitData = (await limitResp.json()) as any;
        if (limitResp.ok && limitData?.data && Array.isArray(limitData.data)) {
          const numberObj = limitData.data.find((n: any) => n.id === gym.whatsapp_phone_number_id);
          if (numberObj) {
            whatsappMessagingTier = numberObj.messaging_limit_tier || 'UNKNOWN';
          }
        }
      } else {
        whatsappVerificationStatus = 'VERIFIED';
        whatsappQualityRating = 'GREEN';
        whatsappMessagingTier = 'TIER_1';
        whatsappVerifiedName = gym.name;
        whatsappDisplayPhoneNumber = gym.whatsapp_phone_number || '919988776655';
      }
    }

    return res.json({
      whatsappBusinessId: gym.whatsapp_waba_id,
      whatsappPhoneNumberId: gym.whatsapp_phone_number_id,
      whatsappStatus: gym.whatsapp_connected ? 'connected' : 'not_configured',
      whatsappVerifiedAt: gym.updatedAt,
      whatsappLastError: null,
      whatsappVerificationStatus,
      whatsappQualityRating,
      whatsappMessagingTier,
      whatsappVerifiedName,
      whatsappDisplayPhoneNumber,
    });
  } catch (error: any) {
    console.error('Error in WhatsApp reverify:', error);
    return res.status(400).json({ error: error.message || 'Verification retry failed.' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/register
router.post('/register', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;

    const gym = await db.gym.findUnique({
      where: { slug: gymSlug },
    });

    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const result = await whatsappService.requestVerificationCode(gym.id);
    return res.json(result);
  } catch (error: any) {
    console.error('Error requesting WhatsApp verification code:', error);
    return res.status(400).json({ error: error.message || 'Failed to request verification code.' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/verify
router.post('/verify', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required.' });
    }

    const gym = await db.gym.findUnique({
      where: { slug: gymSlug },
    });

    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    await whatsappService.verifyCodeAndRegister(gym.id, code);

    // Refresh and fetch latest health metrics
    let whatsappVerificationStatus = 'VERIFIED';
    let whatsappQualityRating = 'GREEN';
    let whatsappMessagingTier = 'UNKNOWN';
    let whatsappVerifiedName = gym.name;
    let whatsappDisplayPhoneNumber = gym.whatsapp_phone_number || '';

    if (gym.whatsapp_access_token && gym.whatsapp_phone_number_id) {
      const token = decrypt(gym.whatsapp_access_token);
      if (!token.startsWith('mock_')) {
        const phoneUrl = `https://graph.facebook.com/v20.0/${gym.whatsapp_phone_number_id}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,status&access_token=${token}`;
        const phoneResp = await fetch(phoneUrl);
        const phoneData = (await phoneResp.json()) as any;
        if (phoneResp.ok && phoneData) {
          whatsappVerificationStatus = phoneData.code_verification_status || 'VERIFIED';
          whatsappQualityRating = phoneData.quality_rating || 'UNKNOWN';
          whatsappVerifiedName = phoneData.verified_name || gym.name;
          whatsappDisplayPhoneNumber = phoneData.display_phone_number || gym.whatsapp_phone_number || '';
        }

        const limitUrl = `https://graph.facebook.com/v20.0/${gym.whatsapp_waba_id}/phone_numbers?access_token=${token}`;
        const limitResp = await fetch(limitUrl);
        const limitData = (await limitResp.json()) as any;
        if (limitResp.ok && limitData?.data && Array.isArray(limitData.data)) {
          const numberObj = limitData.data.find((n: any) => n.id === gym.whatsapp_phone_number_id);
          if (numberObj) {
            whatsappMessagingTier = numberObj.messaging_limit_tier || 'UNKNOWN';
          }
        }
      } else {
        whatsappVerificationStatus = 'VERIFIED';
        whatsappQualityRating = 'GREEN';
        whatsappMessagingTier = 'TIER_1';
        whatsappVerifiedName = gym.name;
        whatsappDisplayPhoneNumber = gym.whatsapp_phone_number || '919988776655';
      }
    }

    return res.json({
      whatsappBusinessId: gym.whatsapp_waba_id,
      whatsappPhoneNumberId: gym.whatsapp_phone_number_id,
      whatsappStatus: gym.whatsapp_connected ? 'connected' : 'not_configured',
      whatsappVerifiedAt: gym.updatedAt,
      whatsappLastError: null,
      whatsappVerificationStatus,
      whatsappQualityRating,
      whatsappMessagingTier,
      whatsappVerifiedName,
      whatsappDisplayPhoneNumber,
    });
  } catch (error: any) {
    console.error('Error verifying WhatsApp code:', error);
    return res.status(400).json({ error: error.message || 'Verification code check failed.' });
  }
});

// POST /api/dashboard/:gymSlug/whatsapp/refresh-status
router.post('/refresh-status', async (req: RequestWithUser, res: Response): Promise<any> => {
  try {
    const { gymSlug } = req.params;

    const gym = await db.gym.findUnique({
      where: { slug: gymSlug },
    });

    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    // Default status values
    let whatsappVerificationStatus = 'NOT_VERIFIED';
    let whatsappQualityRating = 'UNKNOWN';
    let whatsappMessagingTier = 'UNKNOWN';
    let whatsappVerifiedName = gym.name;
    let whatsappDisplayPhoneNumber = gym.whatsapp_phone_number || '';

    // If connected, attempt to fetch live health metrics from Meta Graph API
    if (gym.whatsapp_connected && gym.whatsapp_access_token && gym.whatsapp_phone_number_id) {
      try {
        const token = decrypt(gym.whatsapp_access_token);
        if (!token.startsWith('mock_')) {
          // Fetch phone details
          const phoneUrl = `https://graph.facebook.com/v20.0/${gym.whatsapp_phone_number_id}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,status&access_token=${token}`;
          const phoneResp = await fetch(phoneUrl);
          const phoneData = (await phoneResp.json()) as any;
          if (phoneResp.ok && phoneData) {
            whatsappVerificationStatus = phoneData.code_verification_status || 'NOT_VERIFIED';
            whatsappQualityRating = phoneData.quality_rating || 'UNKNOWN';
            whatsappVerifiedName = phoneData.verified_name || gym.name;
            whatsappDisplayPhoneNumber = phoneData.display_phone_number || gym.whatsapp_phone_number || '';
          }

          // Fetch limit tier
          const limitUrl = `https://graph.facebook.com/v20.0/${gym.whatsapp_waba_id}/phone_numbers?access_token=${token}`;
          const limitResp = await fetch(limitUrl);
          const limitData = (await limitResp.json()) as any;
          if (limitResp.ok && limitData?.data && Array.isArray(limitData.data)) {
            const numberObj = limitData.data.find((n: any) => n.id === gym.whatsapp_phone_number_id);
            if (numberObj) {
              whatsappMessagingTier = numberObj.messaging_limit_tier || 'UNKNOWN';
            }
          }
        } else {
          // Fallback values for mock/simulation connection
          whatsappVerificationStatus = 'VERIFIED';
          whatsappQualityRating = 'GREEN';
          whatsappMessagingTier = 'TIER_1';
          whatsappVerifiedName = gym.name;
          whatsappDisplayPhoneNumber = gym.whatsapp_phone_number || '919988776655';
        }
      } catch (err) {
        console.error('[WhatsApp Status Meta Refresh failed]', err);
      }
    }

    return res.json({
      whatsappBusinessId: gym.whatsapp_waba_id,
      whatsappPhoneNumberId: gym.whatsapp_phone_number_id,
      whatsappStatus: gym.whatsapp_connected ? 'connected' : 'not_configured',
      whatsappVerifiedAt: gym.updatedAt,
      whatsappLastError: null,
      whatsappVerificationStatus,
      whatsappQualityRating,
      whatsappMessagingTier,
      whatsappVerifiedName,
      whatsappDisplayPhoneNumber,
    });
  } catch (error) {
    console.error('Error refreshing WhatsApp status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

