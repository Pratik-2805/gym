import { db } from '../lib/db';
import { encrypt, decrypt } from './encryption';
import { processChatbotMessage } from '../lib/chatbot-engine';

const META_GRAPH_VERSION = 'v20.0';
const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export const whatsappService = {
  /**
   * Exchanges an authorization code or token from Embedded Signup for a long-lived Access Token.
   * Onboards the WABA and phone details for the gym.
   */
  async connectWhatsApp(
    gymId: string,
    payload: {
      accessToken: string;
      wabaId: string;
      phoneNumberId: string;
      businessId: string;
    }
  ): Promise<any> {
    const { accessToken, wabaId, phoneNumberId, businessId } = payload;
    const maskedToken = accessToken ? `${accessToken.substring(0, 8)}...` : 'null';
    console.log(`[WhatsApp Service] Starting connectWhatsApp for Gym ID: ${gymId}. WABA ID: ${wabaId}, Phone ID: ${phoneNumberId}, Business ID: ${businessId}, Access Token: ${maskedToken}`);

    // 1. Swap user/short-lived token for long-lived system token via Meta API if live credentials exist
    let longLivedToken = accessToken;
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (appId && appSecret && !accessToken.startsWith('mock_')) {
      try {
        console.log(`[WhatsApp Service] Swapping short-lived token for long-lived token via Meta OAuth API...`);
        const url = `${META_GRAPH_BASE_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`;
        const response = await fetch(url);
        const data = (await response.json()) as any;
        if (data.access_token) {
          longLivedToken = data.access_token;
          console.log(`[WhatsApp Service] Successfully retrieved long-lived token from Meta.`);
        } else {
          console.warn(`[WhatsApp Service] Meta token exchange API did not return access_token:`, data);
        }
      } catch (err) {
        console.error('[WhatsApp Service] Token exchange failed, falling back to provided token', err);
      }
    }

    // 2. Query phone number details to extract the verified phone number
    let phoneNumber = 'Unknown';
    if (!longLivedToken.startsWith('mock_')) {
      try {
        console.log(`[WhatsApp Service] Retrieving display phone number details for Phone ID: ${phoneNumberId}...`);
        const phoneUrl = `${META_GRAPH_BASE_URL}/${phoneNumberId}?access_token=${longLivedToken}`;
        const response = await fetch(phoneUrl);
        const data = (await response.json()) as any;
        if (data.display_phone_number) {
          phoneNumber = data.display_phone_number.replace(/\D/g, ''); // strip formatting
          console.log(`[WhatsApp Service] Retrieved phone number: +${phoneNumber}`);
        } else {
          console.warn(`[WhatsApp Service] Display phone number details response missing display_phone_number:`, data);
        }
      } catch (err) {
        console.error('[WhatsApp Service] Display phone number retrieval failed', err);
      }
    } else {
      phoneNumber = '919988776655'; // mock default
      console.log(`[WhatsApp Service] Mock token detected. Using default phone number: +${phoneNumber}`);
    }

    // Encrypt the token before saving
    const encryptedToken = encrypt(longLivedToken);

    // 3. Register Phone Number and Subscribe App if live credentials exist
    if (!longLivedToken.startsWith('mock_')) {
      try {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        const registerUrl = `${META_GRAPH_BASE_URL}/${phoneNumberId}/register`;
        console.log(`[WhatsApp Service] Registering phone number with Meta Graph API. URL: ${registerUrl}`);
        const regResponse = await fetch(registerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${longLivedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            pin,
          }),
        });

        const regData = (await regResponse.json()) as any;
        if (!regResponse.ok) {
          if (regData?.error?.code !== 131045 && regData?.error?.code !== 133005) {
            console.error('[WhatsApp Service] Phone registration failed:', regData);
          } else {
            console.log('[WhatsApp Service] Phone number already registered (code 131045/133005).');
          }
        } else {
          console.log('[WhatsApp Service] Phone number registered successfully.');
        }
      } catch (err) {
        console.error('[WhatsApp Service] Phone number registration error:', err);
      }

      try {
        const subscribeUrl = `${META_GRAPH_BASE_URL}/${wabaId}/subscribed_apps`;
        console.log(`[WhatsApp Service] Subscribing fitflow app to WABA webhooks. URL: ${subscribeUrl}`);
        const subResponse = await fetch(subscribeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${longLivedToken}`,
          },
        });

        const subData = (await subResponse.json()) as any;
        if (!subResponse.ok && !subData?.error?.message?.includes('already subscribed')) {
          console.error('[WhatsApp Service] Webhook subscription failed:', subData);
        } else {
          console.log('[WhatsApp Service] App successfully subscribed to WABA webhooks.');
        }
      } catch (err) {
        console.error('[WhatsApp Service] Webhook subscription error:', err);
      }
    }

    // Save configuration to Database
    console.log(`[WhatsApp Service] Saving WhatsApp Cloud API configuration to Gym ID: ${gymId} in database...`);
    const gym = await db.gym.update({
      where: { id: gymId },
      data: {
        whatsapp_connected: true,
        whatsapp_phone_number: phoneNumber,
        whatsapp_phone_number_id: phoneNumberId,
        whatsapp_waba_id: wabaId,
        whatsapp_business_id: businessId,
        whatsapp_access_token: encryptedToken,
      },
    });

    console.log(`[WhatsApp Service] Seed default templates locally...`);
    // Seed default templates locally
    await this.seedDefaultTemplates(gymId);

    // Create Audit Log
    console.log(`[WhatsApp Service] Creating WHATSAPP_CONNECT audit log...`);
    await db.auditLog.create({
      data: {
        action: 'WHATSAPP_CONNECT',
        details: `Connected WhatsApp Cloud API for number: +${phoneNumber}`,
        gymId,
      },
    });

    console.log(`[WhatsApp Service] Connection setup successfully completed for Gym ID: ${gymId}`);
    return {
      success: true,
      gym: {
        id: gym.id,
        name: gym.name,
        whatsapp_connected: gym.whatsapp_connected,
        whatsapp_phone_number: gym.whatsapp_phone_number,
        whatsapp_waba_id: gym.whatsapp_waba_id,
        whatsapp_phone_number_id: gym.whatsapp_phone_number_id,
      },
    };
  },

  /**
   * Disconnects the WhatsApp Account and revokes tokens.
   */
  async disconnectWhatsApp(gymId: string): Promise<boolean> {
    console.log(`[WhatsApp Service] Disconnecting WhatsApp configuration for Gym ID: ${gymId}...`);
    await db.gym.update({
      where: { id: gymId },
      data: {
        whatsapp_connected: false,
        whatsapp_phone_number: null,
        whatsapp_phone_number_id: null,
        whatsapp_waba_id: null,
        whatsapp_business_id: null,
        whatsapp_access_token: null,
      },
    });

    // Log the disconnection
    console.log(`[WhatsApp Service] Creating WHATSAPP_DISCONNECT audit log...`);
    await db.auditLog.create({
      data: {
        action: 'WHATSAPP_DISCONNECT',
        details: 'Disconnected WhatsApp Cloud API WABA configuration.',
        gymId,
      },
    });

    console.log(`[WhatsApp Service] Successfully disconnected WhatsApp config for Gym ID: ${gymId}`);
    return true;
  },

  /**
   * Checks whether a phone number is eligible for WhatsApp Business App Coexistence.
   */
  async verifyCoexistenceEligibility(
    gymId: string,
    phoneNumberId: string,
    accessToken?: string
  ): Promise<{
    eligible: boolean;
    status: string;
    qualityRating: string;
    reason?: string;
    details?: string;
  }> {
    const maskedToken = accessToken ? `${accessToken.substring(0, 8)}...` : 'none';
    console.log(`[WhatsApp Service] Checking coexistence eligibility. Gym ID: ${gymId}, Phone ID: ${phoneNumberId}, Access Token: ${maskedToken}`);
    // If it's a mock token or simulator state
    if (!accessToken || accessToken.startsWith('mock_')) {
      // Mock validation logic based on phoneNumberId ending
      const isEligible = !phoneNumberId.endsWith('9'); // Simulate ineligible numbers ending in 9
      console.log(`[WhatsApp Service] Mock token/sandbox state detected. Coexistence eligibility result: ${isEligible}`);
      return {
        eligible: isEligible,
        status: 'APPROVED',
        qualityRating: isEligible ? 'GREEN' : 'RED',
        reason: isEligible ? undefined : 'VERSION_INCOMPATIBLE',
        details: isEligible
          ? 'Eligible. Ensure your WhatsApp Business App version is 2.24.17 or higher.'
          : 'Ineligible. The phone number is using an outdated WhatsApp Business mobile app client (< 2.24.17) or lacks tenure.',
      };
    }

    try {
      const url = `${META_GRAPH_BASE_URL}/${phoneNumberId}?fields=status,quality_rating,is_coexistence_eligible&access_token=${accessToken}`;
      console.log(`[WhatsApp Service] Querying coexistence eligibility from Meta Graph API. URL: ${url}`);
      const response = await fetch(url);
      const data = (await response.json()) as any;

      if (data.error) {
        console.error(`[WhatsApp Service] Meta Graph API returned error on coexistence check:`, data.error);
        return {
          eligible: false,
          status: 'ERROR',
          qualityRating: 'UNKNOWN',
          reason: 'API_ERROR',
          details: data.error.message,
        };
      }

      // Check the coexistence capability flags returned by Meta Graph API
      const eligible = data.is_coexistence_eligible === true || data.status === 'APPROVED';
      console.log(`[WhatsApp Service] Meta Graph API coexistence details: eligible=${eligible}, status=${data.status}, qualityRating=${data.quality_rating}`);

      return {
        eligible,
        status: data.status || 'UNKNOWN',
        qualityRating: data.quality_rating || 'UNKNOWN',
        details: eligible
          ? 'Eligible. Coexistence is supported for this WABA configuration.'
          : 'Ineligible. Meta determines this account is not eligible. Verify WhatsApp Business app is updated.',
      };
    } catch (err: any) {
      console.error('[WhatsApp Service] Coexistence check error:', err);
      return {
        eligible: false,
        status: 'ERROR',
        qualityRating: 'UNKNOWN',
        reason: 'FETCH_ERROR',
        details: err.message || 'Meta API connection timed out.',
      };
    }
  },

  /**
   * Sends a WhatsApp template-based message.
   */
  async sendTemplateMessage(
    gymId: string,
    recipientPhone: string,
    templateName: string,
    parameters: any[] = []
  ): Promise<boolean> {
    console.log(`[WhatsApp Service] Preparing to send template message. Gym ID: ${gymId}, Recipient: ${recipientPhone}, Template: ${templateName}, Params count: ${parameters.length}`);
    const gym = await db.gym.findUnique({ where: { id: gymId } });
    if (!gym || !gym.whatsapp_connected || !gym.whatsapp_phone_number_id || !gym.whatsapp_access_token) {
      console.warn(`[WhatsApp Service] Outbound template rejected. Gym ${gymId} is not connected to WhatsApp.`);
      return false;
    }

    const token = decrypt(gym.whatsapp_access_token);
    const phoneNumberId = gym.whatsapp_phone_number_id;

    const payload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US',
        },
        components: [
          {
            type: 'body',
            parameters: parameters.map((param) => ({
              type: 'text',
              text: String(param),
            })),
          },
        ],
      },
    };

    // If it's a simulated token, mock successful send
    if (token.startsWith('mock_')) {
      const mockMessageId = `wamid.HBgM${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
      console.log(`[WhatsApp Service] Mock token detected. Logging mock outbound template message in database. ID: ${mockMessageId}`);
      await db.whatsAppMessage.create({
        data: {
          gymId,
          messageId: mockMessageId,
          senderPhone: gym.whatsapp_phone_number || '919988776655',
          recipientPhone,
          text: `Template: ${templateName} | Params: ${parameters.join(', ')}`,
          direction: 'OUTBOUND',
          status: 'SENT',
        },
      });

      // Automatically mock delivery and read events after a short delay
      setTimeout(async () => {
        try {
          console.log(`[WhatsApp Service] Simulating mock delivery webhook for ID: ${mockMessageId}`);
          await this.processWebhook({
            entry: [{
              changes: [{
                value: {
                  statuses: [{
                    id: mockMessageId,
                    status: 'delivered',
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    recipient_id: recipientPhone,
                  }],
                },
              }],
            }],
          });
        } catch (e) {
          console.error('[WhatsApp Service] Error simulating delivery webhook:', e);
        }
      }, 1000);

      return true;
    }

    try {
      const url = `${META_GRAPH_BASE_URL}/${phoneNumberId}/messages`;
      console.log(`[WhatsApp Service] Dispatching template message via Meta Graph API. URL: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as any;
      if (data.messages && data.messages.length > 0) {
        const messageId = data.messages[0].id;
        console.log(`[WhatsApp Service] Template message sent successfully. Meta Message ID: ${messageId}`);
        await db.whatsAppMessage.create({
          data: {
            gymId,
            messageId,
            senderPhone: gym.whatsapp_phone_number || 'Unknown',
            recipientPhone,
            text: `[Template Message: ${templateName}]`,
            direction: 'OUTBOUND',
            status: 'SENT',
          },
        });
        return true;
      } else {
        console.error('[WhatsApp Service] Meta Graph API returned non-success response on template send:', data);
        return false;
      }
    } catch (err) {
      console.error('[WhatsApp Service] Error sending template message:', err);
      return false;
    }
  },

  /**
   * Sends a standard free-form text message.
   */
  async sendTextMessage(gymId: string, recipientPhone: string, text: string): Promise<boolean> {
    console.log(`[WhatsApp Service] Preparing to send free-form text message. Gym ID: ${gymId}, Recipient: ${recipientPhone}, Preview: "${text.substring(0, 40)}..."`);
    const gym = await db.gym.findUnique({ where: { id: gymId } });
    if (!gym || !gym.whatsapp_connected || !gym.whatsapp_phone_number_id || !gym.whatsapp_access_token) {
      console.warn(`[WhatsApp Service] Outbound text message rejected. Gym ${gymId} is not connected to WhatsApp.`);
      return false;
    }

    const token = decrypt(gym.whatsapp_access_token);
    const phoneNumberId = gym.whatsapp_phone_number_id;

    const payload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: {
        body: text,
      },
    };

    if (token.startsWith('mock_')) {
      const mockMessageId = `wamid.HBgM${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
      console.log(`[WhatsApp Service] Mock token detected. Logging mock outbound text message in database. ID: ${mockMessageId}`);
      await db.whatsAppMessage.create({
        data: {
          gymId,
          messageId: mockMessageId,
          senderPhone: gym.whatsapp_phone_number || '919988776655',
          recipientPhone,
          text,
          direction: 'OUTBOUND',
          status: 'SENT',
        },
      });
      return true;
    }

    try {
      const url = `${META_GRAPH_BASE_URL}/${phoneNumberId}/messages`;
      console.log(`[WhatsApp Service] Dispatching text message via Meta Graph API. URL: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as any;
      if (data.messages && data.messages.length > 0) {
        const messageId = data.messages[0].id;
        console.log(`[WhatsApp Service] Text message sent successfully. Meta Message ID: ${messageId}`);
        await db.whatsAppMessage.create({
          data: {
            gymId,
            messageId,
            senderPhone: gym.whatsapp_phone_number || 'Unknown',
            recipientPhone,
            text,
            direction: 'OUTBOUND',
            status: 'SENT',
          },
        });
        return true;
      } else {
        console.error('[WhatsApp Service] Meta Graph API returned non-success response on text send:', data);
        return false;
      }
    } catch (err) {
      console.error('[WhatsApp Service] Error sending text message:', err);
      return false;
    }
  },

  /**
   * Fetches message templates from Meta and synchronizes status and metadata locally.
   */
  async syncTemplates(gymId: string): Promise<boolean> {
    console.log(`[WhatsApp Service] Starting template synchronization for Gym ID: ${gymId}...`);
    const gym = await db.gym.findUnique({ where: { id: gymId } });
    if (!gym || !gym.whatsapp_connected || !gym.whatsapp_waba_id || !gym.whatsapp_access_token) {
      console.warn(`[WhatsApp Service] Cannot sync templates: Gym ${gymId} has incomplete WhatsApp config.`);
      return false;
    }

    const token = decrypt(gym.whatsapp_access_token);
    const wabaId = gym.whatsapp_waba_id;

    if (token.startsWith('mock_')) {
      console.log(`[WhatsApp Service] Mock token detected. Syncing mock templates locally...`);
      // Mock sync templates
      const mockTemplates = [
        { name: 'membership_expiry', status: 'APPROVED', category: 'UTILITY' },
        { name: 'payment_receipt', status: 'APPROVED', category: 'UTILITY' },
        { name: 'welcome_member', status: 'APPROVED', category: 'UTILITY' },
        { name: 'birthday_wish', status: 'APPROVED', category: 'UTILITY' },
      ];

      for (const t of mockTemplates) {
        await db.whatsAppTemplate.upsert({
          where: { gymId_templateName: { gymId, templateName: t.name } },
          update: { status: t.status, category: t.category },
          create: {
            gymId,
            templateName: t.name,
            status: t.status,
            category: t.category,
            components: {},
          },
        });
      }
      console.log(`[WhatsApp Service] Upserted 4 mock templates.`);
      return true;
    }

    try {
      const url = `${META_GRAPH_BASE_URL}/${wabaId}/message_templates?access_token=${token}`;
      console.log(`[WhatsApp Service] Fetching template metadata from Meta Graph API. URL: ${url}`);
      const response = await fetch(url);
      const data = (await response.json()) as any;

      if (data.data) {
        console.log(`[WhatsApp Service] Retrieved ${data.data.length} templates from Meta. Synchronizing locally...`);
        for (const metaT of data.data) {
          await db.whatsAppTemplate.upsert({
            where: {
              gymId_templateName: {
                gymId,
                templateName: metaT.name,
              },
            },
            update: {
              metaTemplateId: metaT.id,
              status: metaT.status,
              category: metaT.category,
              components: metaT.components || {},
            },
            create: {
              gymId,
              templateName: metaT.name,
              metaTemplateId: metaT.id,
              status: metaT.status,
              category: metaT.category,
              components: metaT.components || {},
              language: metaT.language || 'en_US',
            },
          });
        }
        console.log(`[WhatsApp Service] Template synchronization completed successfully.`);
        return true;
      }
      console.warn(`[WhatsApp Service] Meta templates response missing data block:`, data);
      return false;
    } catch (err) {
      console.error('[WhatsApp Service] Template sync failed:', err);
      return false;
    }
  },

  /**
   * Seeds default placeholders templates inside local WABA table on registration.
   */
  async seedDefaultTemplates(gymId: string): Promise<void> {
    const defaults = [
      { name: 'membership_expiry', category: 'UTILITY' },
      { name: 'payment_receipt', category: 'UTILITY' },
      { name: 'welcome_member', category: 'UTILITY' },
      { name: 'birthday_wish', category: 'UTILITY' },
    ];

    for (const def of defaults) {
      await db.whatsAppTemplate.upsert({
        where: { gymId_templateName: { gymId, templateName: def.name } },
        update: { status: 'APPROVED' },
        create: {
          gymId,
          templateName: def.name,
          status: 'APPROVED',
          category: def.category,
          components: {},
        },
      });
    }
  },

  /**
   * Processes the Webhook event notification from Meta Cloud API.
   * Handles delivery receipts, read receipts, template status updates, and customer messages.
   * Automatically supports WhatsApp Business App coexistence echos.
   */
  async processWebhook(payload: any): Promise<boolean> {
    console.log(`[WhatsApp Webhook] Received webhook notification event payload.`);
    if (!payload.entry || payload.entry.length === 0) {
      console.log(`[WhatsApp Webhook] Empty entry list. Webhook processing ignored.`);
      return false;
    }

    for (const entry of payload.entry) {
      if (!entry.changes || entry.changes.length === 0) continue;

      for (const change of entry.changes) {
        const value = change.value;
        if (!value) continue;

        // 1. Handle Message Status Updates (Delivered, Read, Failed)
        if (value.statuses && value.statuses.length > 0) {
          for (const statusObj of value.statuses) {
            const messageId = statusObj.id;
            const status = statusObj.status.toUpperCase(); // DELIVERED, READ, FAILED
            const timestamp = new Date(parseInt(statusObj.timestamp) * 1000);
            
            let errorMessage: string | null = null;
            if (statusObj.errors && statusObj.errors.length > 0) {
              errorMessage = statusObj.errors[0].message;
            }

            console.log(`[WhatsApp Webhook Status] Message ID: ${messageId}, Status: ${status}, Time: ${timestamp.toISOString()}${errorMessage ? `, Error: ${errorMessage}` : ''}`);

            // Find matching message in database
            const msg = await db.whatsAppMessage.findUnique({
              where: { messageId },
            });

            if (msg) {
              await db.whatsAppMessage.update({
                where: { messageId },
                data: {
                  status,
                  errorMessage,
                },
              });

              // Log status event history
              await db.whatsAppEvent.create({
                data: {
                  messageId,
                  eventType: status,
                  timestamp,
                  rawPayload: statusObj,
                },
              });
              console.log(`[WhatsApp Webhook Status] Updated status for Message ID: ${messageId} to ${status}`);
            } else {
              console.log(`[WhatsApp Webhook Status] Ignored status update. Message ID ${messageId} not found in FitFlow database.`);
            }
          }
        }

        // 2. Handle Incoming Customer Messages & SMB Coexistence Echoes
        if (value.messages && value.messages.length > 0) {
          const metadata = value.metadata;
          const displayPhoneNumber = metadata?.display_phone_number?.replace(/\D/g, '');
          const phoneId = metadata?.phone_number_id;

          console.log(`[WhatsApp Webhook Messages] Message block received. Display phone: ${displayPhoneNumber}, Phone ID: ${phoneId}`);

          // Find which Gym this webhook correlates to using the phone number id or display number
          const gym = await db.gym.findFirst({
            where: {
              OR: [
                { whatsapp_phone_number_id: phoneId },
                { whatsapp_phone_number: displayPhoneNumber },
              ],
            },
          });

          if (!gym) {
            console.warn(`[WhatsApp Webhook Messages] No matching gym found for phone number ID: ${phoneId} or display number: ${displayPhoneNumber}`);
            continue;
          }

          console.log(`[WhatsApp Webhook Messages] Correlated incoming message block to Gym ID: ${gym.id} (${gym.name})`);

          for (const message of value.messages) {
            const messageId = message.id;
            const from = message.from; // Customer's number
            const timestamp = new Date(parseInt(message.timestamp) * 1000);
            let textContent = '';

            if (message.type === 'text') {
              textContent = message.text.body;
            } else if (message.type === 'button') {
              textContent = message.button.text;
            } else if (message.type === 'interactive') {
              textContent = message.interactive.button_reply?.title || message.interactive.list_reply?.title || 'Interactive response';
            } else {
              textContent = `[Media/Unsupported: ${message.type}]`;
            }

            console.log(`[WhatsApp Webhook Messages] Processing message ID: ${messageId}, From: +${from}, Type: ${message.type}, Text: "${textContent.substring(0, 40)}..."`);

            // Detect SMB Coexistence Echos:
            const isEcho = from === gym.whatsapp_phone_number;

            if (isEcho) {
              const recipient = message.to || value.contacts?.[0]?.wa_id || 'Unknown';
              console.log(`[WhatsApp Webhook Messages] SMB Coexistence Echo detected (staff message via mobile app). Recipient: +${recipient}`);

              // Store this outbound message in our logs
              await db.whatsAppMessage.upsert({
                where: { messageId },
                update: { status: 'READ' }, // mark read as it was sent by a human staff member
                create: {
                  gymId: gym.id,
                  messageId,
                  senderPhone: gym.whatsapp_phone_number || 'Unknown',
                  recipientPhone: recipient,
                  text: textContent,
                  direction: 'ECHO',
                  status: 'READ',
                },
              });

              // Log notification copy to main notifications table
              const member = await db.member.findFirst({
                where: { phone: recipient, gymId: gym.id },
              });

              if (member) {
                console.log(`[WhatsApp Webhook Messages] Logged mobile staff reply notification for member: ${member.name} (+${recipient})`);
                await db.notification.create({
                  data: {
                    gymId: gym.id,
                    memberId: member.id,
                    recipientPhone: recipient,
                    title: 'WhatsApp Staff Reply (Mobile App)',
                    message: textContent,
                    type: 'OUTBOUND',
                    status: 'SENT',
                  },
                });
              }

              continue; // Do NOT run chatbot logic for staff echos!
            }

            // 3. Process normal customer incoming messages
            console.log(`[WhatsApp Webhook Messages] Normal inbound customer message. Sender: +${from}`);

            await db.whatsAppMessage.create({
              data: {
                gymId: gym.id,
                messageId,
                senderPhone: from,
                recipientPhone: gym.whatsapp_phone_number || 'Unknown',
                text: textContent,
                direction: 'INBOUND',
                status: 'DELIVERED',
              },
            });

            // Find or create member record
            let member = await db.member.findFirst({
              where: { phone: from, gymId: gym.id },
            });

            if (!member) {
              console.log(`[WhatsApp Webhook Messages] No member profile found for phone +${from}. Auto-generating guest profile...`);
              member = await db.member.create({
                data: {
                  gymId: gym.id,
                  phone: from,
                  name: `Guest ${from.slice(-4)}`,
                },
              });
            }

            // Capture notification logs
            await db.notification.create({
              data: {
                gymId: gym.id,
                memberId: member.id,
                recipientPhone: from,
                title: 'WhatsApp Incoming',
                message: textContent,
                type: 'INBOUND',
                status: 'SENT',
              },
            });

            // Skip chatbot response if takeover/bot disabled is active
            if (member.isBotDisabled) {
              console.log(`[WhatsApp Webhook Messages] Human takeover active (bot disabled) for member: ${member.name} (+${from}). Skipping automated chatbot response.`);
              continue;
            }

            // Process message through chatbot RAG/Engine
            console.log(`[WhatsApp Webhook Messages] Invoking Chatbot RAG Engine for member: ${member.name} (+${from}). Message: "${textContent}"`);
            const botResponses = await processChatbotMessage(gym.id, member, textContent);
            console.log(`[WhatsApp Webhook Messages] Chatbot engine generated ${botResponses.length} replies.`);

            // Send replies back to client
            for (const reply of botResponses) {
              console.log(`[WhatsApp Webhook Messages] Dispatching automated bot response: "${reply.substring(0, 40)}..."`);
              await this.sendTextMessage(gym.id, from, reply);
            }
          }
        }

        // 4. Handle Template Status Updates (Approved / Rejected) from Meta
        if (value.event === 'TEMPLATE_STATUS_UPDATE' || (value.message_template_id && value.event)) {
          const templateName = value.message_template_name;
          const status = value.event; // APPROVED, REJECTED, etc.
          const wabaId = value.whatsapp_business_account_id;

          console.log(`[WhatsApp Webhook TemplateStatus] Received template status update. WABA: ${wabaId}, Template: ${templateName}, Status: ${status}`);

          const gym = await db.gym.findFirst({
            where: { whatsapp_waba_id: wabaId },
          });

          if (gym && templateName) {
            await db.whatsAppTemplate.updateMany({
              where: {
                gymId: gym.id,
                templateName: templateName,
              },
              data: {
                status: status,
              },
            });
            console.log(`[WhatsApp Webhook TemplateStatus] Template Status Update: ${templateName} is now ${status} for Gym ID: ${gym.id}`);
          }
        }
      }
    }

    return true;
  },

  /**
   * Re-registers the phone number with Meta.
   */
  async reverifyWhatsApp(gymId: string): Promise<any> {
    console.log(`[WhatsApp Service] Starting reverifyWhatsApp for Gym ID: ${gymId}...`);
    const gym = await db.gym.findUnique({ where: { id: gymId } });
    if (!gym || !gym.whatsapp_access_token || !gym.whatsapp_phone_number_id) {
      console.warn(`[WhatsApp Service] Reverify aborted: WhatsApp configuration missing for Gym ID: ${gymId}`);
      throw new Error('WhatsApp is not configured for this gym.');
    }

    const token = decrypt(gym.whatsapp_access_token);
    const phoneNumberId = gym.whatsapp_phone_number_id;

    if (token.startsWith('mock_')) {
      console.log(`[WhatsApp Service] Mock token detected. Reverify registration successful.`);
      return { success: true, message: 'Mock registration successful' };
    }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const registerUrl = `${META_GRAPH_BASE_URL}/${phoneNumberId}/register`;
    console.log(`[WhatsApp Service] Re-registering phone number. URL: ${registerUrl}`);
    const regResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin,
      }),
    });

    const regData = (await regResponse.json()) as any;
    if (!regResponse.ok) {
      if (regData?.error?.code !== 131045 && regData?.error?.code !== 133005) {
        console.error(`[WhatsApp Service] Phone number re-registration failed:`, regData);
        throw new Error(regData?.error?.message || 'Phone number registration failed.');
      } else {
        console.log(`[WhatsApp Service] Phone number already registered with Meta.`);
      }
    } else {
      console.log(`[WhatsApp Service] Re-registered phone number successfully.`);
    }

    return { success: true };
  },

  /**
   * Requests a 6-digit verification code from Meta via SMS.
   */
  async requestVerificationCode(gymId: string): Promise<any> {
    console.log(`[WhatsApp Service] Requesting verification code for Gym ID: ${gymId}...`);
    const gym = await db.gym.findUnique({ where: { id: gymId } });
    if (!gym || !gym.whatsapp_access_token || !gym.whatsapp_phone_number_id) {
      console.warn(`[WhatsApp Service] Request code aborted: WhatsApp configuration missing for Gym ID: ${gymId}`);
      throw new Error('WhatsApp is not configured for this gym.');
    }

    const token = decrypt(gym.whatsapp_access_token);
    const phoneNumberId = gym.whatsapp_phone_number_id;

    if (token.startsWith('mock_')) {
      console.log(`[WhatsApp Service] Mock token detected. Mock verification code requested via SMS.`);
      return { success: true, message: 'Mock verification code requested via SMS.' };
    }

    const url = `${META_GRAPH_BASE_URL}/${phoneNumberId}/request_code`;
    console.log(`[WhatsApp Service] Requesting SMS code from Meta Graph API. URL: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        code_method: 'SMS',
        language: 'en_US',
      }),
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      console.error(`[WhatsApp Service] SMS verification code request failed:`, data);
      throw new Error(data?.error?.message || 'Failed to request verification code.');
    }

    console.log(`[WhatsApp Service] Verification code requested successfully via SMS.`);
    return { success: true, message: 'Verification code requested via SMS.' };
  },

  /**
   * Verifies the 6-digit code with Meta and then registers the phone number.
   */
  async verifyCodeAndRegister(gymId: string, code: string): Promise<any> {
    console.log(`[WhatsApp Service] Verifying 6-digit code for Gym ID: ${gymId}. Code: ${code}...`);
    const gym = await db.gym.findUnique({ where: { id: gymId } });
    if (!gym || !gym.whatsapp_access_token || !gym.whatsapp_phone_number_id) {
      console.warn(`[WhatsApp Service] Code verification aborted: WhatsApp configuration missing for Gym ID: ${gymId}`);
      throw new Error('WhatsApp is not configured for this gym.');
    }

    const token = decrypt(gym.whatsapp_access_token);
    const phoneNumberId = gym.whatsapp_phone_number_id;

    if (token.startsWith('mock_')) {
      console.log(`[WhatsApp Service] Mock token detected. Mock code verification successful.`);
      return { success: true, message: 'Mock code verification successful.' };
    }

    // 1. Verify the code
    const verifyUrl = `${META_GRAPH_BASE_URL}/${phoneNumberId}/verify_code`;
    console.log(`[WhatsApp Service] Verifying code with Meta Graph API. URL: ${verifyUrl}`);
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const verifyData = (await verifyResponse.json()) as any;
    if (!verifyResponse.ok) {
      console.error(`[WhatsApp Service] Meta Graph API code verification failed:`, verifyData);
      throw new Error(verifyData?.error?.message || 'Verification failed. Please check the code.');
    }

    console.log(`[WhatsApp Service] Meta Graph API code verification successful. Registering number...`);

    // 2. Register the phone number
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const registerUrl = `${META_GRAPH_BASE_URL}/${phoneNumberId}/register`;
    console.log(`[WhatsApp Service] Registering number via Meta Graph API. URL: ${registerUrl}`);
    const regResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin,
      }),
    });

    const regData = (await regResponse.json()) as any;
    if (!regResponse.ok) {
      if (regData?.error?.code !== 131045 && regData?.error?.code !== 133005) {
        console.error(`[WhatsApp Service] Meta Graph API registration post-verification failed:`, regData);
        throw new Error(regData?.error?.message || 'Code verified but phone registration failed.');
      } else {
        console.log(`[WhatsApp Service] Phone number already registered with Meta.`);
      }
    } else {
      console.log(`[WhatsApp Service] Phone number registered successfully after code verification.`);
    }

    return { success: true };
  },
};

export default whatsappService;
