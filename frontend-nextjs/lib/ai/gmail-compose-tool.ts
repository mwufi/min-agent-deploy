import { tool } from "ai";
import { z } from "zod";
import { sendMessage, createDraft } from "../server/gmail_client";

function findContactByName(userId: string, recipientName: string) {
  return "test@test.com";
}

export const createGmailComposeTool = (userId: string, defaultAccountId?: string) => ({
  smartCompose: tool({
    description: 'Intelligently compose and send an email. Can look up contacts by name and help draft messages.',
    parameters: z.object({
      recipientName: z.string().optional().describe('Name of the recipient to look up'),
      recipientEmail: z.string().optional().describe('Email address if known'),
      subject: z.string().describe('Email subject'),
      tone: z.enum(['professional', 'casual', 'friendly', 'formal', 'urgent']).default('professional'),
      keyPoints: z.array(z.string()).describe('Main points to include in the email'),
      action: z.enum(['send', 'draft']).default('draft').describe('Whether to send immediately or save as draft'),
      accountId: z.string().optional().describe('Specific Gmail account to use'),
    }),
    execute: async ({ recipientName, recipientEmail, subject, tone, keyPoints, action, accountId }) => {
      try {
        // Determine recipient email
        let finalRecipientEmail = recipientEmail;

        if (!finalRecipientEmail && recipientName) {
          finalRecipientEmail = findContactByName(userId, recipientName);
        }

        if (!finalRecipientEmail) {
          throw new Error('No recipient email address provided');
        }

        // Generate email body based on tone and key points
        const toneInstructions = {
          professional: 'Use a professional, business-appropriate tone',
          casual: 'Use a relaxed, conversational tone',
          friendly: 'Use a warm, friendly tone',
          formal: 'Use a formal, respectful tone',
          urgent: 'Use a direct, urgent tone emphasizing time sensitivity'
        };

        // Compose the email body
        let body = '';

        // Opening based on tone
        switch (tone) {
          case 'professional':
            body += 'Hello,\n\n';
            break;
          case 'casual':
            body += 'Hi there,\n\n';
            break;
          case 'friendly':
            body += 'Hi!\n\n';
            break;
          case 'formal':
            body += 'Dear Sir/Madam,\n\n';
            break;
          case 'urgent':
            body += 'URGENT:\n\n';
            break;
        }

        // Add key points
        if (keyPoints.length === 1) {
          body += keyPoints[0];
        } else {
          body += 'I wanted to reach out regarding the following:\n\n';
          keyPoints.forEach((point, index) => {
            body += `${index + 1}. ${point}\n`;
          });
        }

        // Closing based on tone
        body += '\n\n';
        switch (tone) {
          case 'professional':
            body += 'Best regards,';
            break;
          case 'casual':
            body += 'Cheers,';
            break;
          case 'friendly':
            body += 'Talk soon!';
            break;
          case 'formal':
            body += 'Sincerely,';
            break;
          case 'urgent':
            body += 'Please respond as soon as possible.\n\nBest,';
            break;
        }

        // Execute action
        if (action === 'send') {
          const result = await sendMessage(
            userId,
            {
              to: finalRecipientEmail,
              subject,
              body
            },
            accountId || defaultAccountId
          );
          console.log("result of sendMessage", result);

          return {
            success: true,
            action: 'sent',
            messageId: result.id,
            threadId: result.threadId,
            recipient: finalRecipientEmail,
            subject,
            preview: body.substring(0, 100) + '...'
          };
        } else {
          const draft = await createDraft(
            userId,
            {
              to: finalRecipientEmail,
              subject,
              body
            },
            accountId || defaultAccountId
          );

          return {
            success: true,
            action: 'drafted',
            draftId: draft.id,
            recipient: finalRecipientEmail,
            subject,
            preview: body.substring(0, 100) + '...'
          };
        }
      } catch (error) {
        throw new Error(`Failed to compose email: ${error}`);
      }
    },
  }),

  quickReply: tool({
    description: 'Send a quick reply to someone using pre-defined templates',
    parameters: z.object({
      recipientName: z.string().describe('Name of the person to reply to'),
      template: z.enum([
        'acknowledge',
        'schedule_meeting',
        'need_more_info',
        'will_review',
        'approved',
        'declined',
        'out_of_office'
      ]).describe('Type of quick reply'),
      customMessage: z.string().optional().describe('Additional custom message to include'),
      accountId: z.string().optional(),
    }),
    execute: async ({ recipientName, template, customMessage, accountId }) => {
      try {
        const recipientEmail = findContactByName(userId, recipientName);

        // Template messages
        const templates = {
          acknowledge: {
            subject: 'Re: Your message',
            body: 'Hi,\n\nThank you for your message. I\'ve received it and will respond soon.\n\nBest regards,'
          },
          schedule_meeting: {
            subject: 'Re: Meeting Request',
            body: 'Hi,\n\nI\'d be happy to meet. Here are some times that work for me:\n- [Time slot 1]\n- [Time slot 2]\n- [Time slot 3]\n\nPlease let me know what works best for you.\n\nBest regards,'
          },
          need_more_info: {
            subject: 'Re: Additional Information Needed',
            body: 'Hi,\n\nThank you for reaching out. I need some additional information to proceed:\n\n[Specify what information is needed]\n\nPlease provide these details at your earliest convenience.\n\nBest regards,'
          },
          will_review: {
            subject: 'Re: Will Review',
            body: 'Hi,\n\nThank you for sending this over. I\'ll review it carefully and get back to you with my feedback soon.\n\nBest regards,'
          },
          approved: {
            subject: 'Re: Approved',
            body: 'Hi,\n\nI\'ve reviewed your request/proposal and I\'m happy to approve it. You can proceed with the next steps.\n\nBest regards,'
          },
          declined: {
            subject: 'Re: Unable to Proceed',
            body: 'Hi,\n\nThank you for your message. Unfortunately, I\'m unable to proceed with this at this time. I appreciate your understanding.\n\nBest regards,'
          },
          out_of_office: {
            subject: 'Out of Office: Re: Your Message',
            body: 'Hi,\n\nI\'m currently out of office and will return on [date]. I\'ll respond to your message as soon as possible upon my return.\n\nFor urgent matters, please contact [alternative contact].\n\nBest regards,'
          }
        };

        const selectedTemplate = templates[template];
        let finalBody = selectedTemplate.body;

        if (customMessage) {
          finalBody = finalBody.replace('Best regards,', `${customMessage}\n\nBest regards,`);
        }

        const result = await sendMessage(
          userId,
          {
            to: recipientEmail,
            subject: selectedTemplate.subject,
            body: finalBody
          },
          accountId || defaultAccountId
        );

        return {
          success: true,
          messageId: result.id,
          recipient: recipientEmail,
          template,
          message: 'Quick reply sent successfully'
        };
      } catch (error) {
        throw new Error(`Failed to send quick reply: ${error}`);
      }
    },
  }),
});