import { NextRequest, NextResponse } from 'next/server';
import { loadMessages } from '@/lib/i18n';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale');

    if (!locale || !['ko', 'en', 'zh', 'ja'].includes(locale)) {
        return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    try {
        const messages = await loadMessages(locale as any);
        return NextResponse.json(messages);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }
}
