import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        const matches = await query(
            `SELECT 
         ma.id, 
         ma.matched_at, 
         ma.meeting_status,
         mr.requester_name as tourist_name,
         a_resp.name as responder_name,
         a_resp.role as responder_role
       FROM match_assignments ma
       LEFT JOIN match_requests mr ON ma.request_id = mr.id
       LEFT JOIN accounts a_resp ON ma.responder_account_id = a_resp.id
       ORDER BY ma.matched_at DESC
       LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const countResult = await query(`SELECT COUNT(*) as total FROM match_assignments`);
        const total = parseInt(countResult[0].total as string);

        return NextResponse.json({
            matches,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching matches:', error);
        return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }
}
