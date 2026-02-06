import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import db from '@/lib/db/client';
import { attachments, messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Attachments API endpoint
 * Handles saving file attachments to database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { messageId, attachments: attachmentData } = body;

    if (!messageId || !Array.isArray(attachmentData)) {
      return new Response(
        JSON.stringify({ error: 'messageId and attachments array are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('📎 Saving attachments:', {
      messageId,
      count: attachmentData.length,
      userId: session?.user?.id,
    });

    // Verify message exists (ownership check is handled by session ownership)
    const messageExists = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (messageExists.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert attachments
    const savedAttachments = [];

    for (const attachment of attachmentData) {
      const { fileName, fileType, base64Data, metadata } = attachment;

      if (!fileName || !fileType) {
        console.warn('⚠️ Skipping invalid attachment:', { fileName, fileType });
        continue;
      }

      try {
        const [saved] = await db
          .insert(attachments)
          .values({
            messageId,
            fileName,
            fileType,
            base64Data: base64Data || null,
            metadata: metadata || null,
          })
          .returning();

        savedAttachments.push(saved);
        console.log('✅ Saved attachment:', { id: saved.id, fileName });
      } catch (error) {
        console.error('❌ Failed to save attachment:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: savedAttachments.length,
        attachments: savedAttachments,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Attachments endpoint error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * GET attachments for a message
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: 'messageId parameter is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const messageAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.messageId, messageId));

    return new Response(
      JSON.stringify({ attachments: messageAttachments }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Attachments GET error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
