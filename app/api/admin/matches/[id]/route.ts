import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;

        // Fetch match details
        const matches = await query(
            `SELECT 
         ma.*,
         mr.requester_name,
         mr.note as request_note,
         a_tourist.name as tourist_real_name,
         a_tourist.email as tourist_email,
         a_resp.name as responder_name,
         a_resp.email as responder_email,
         a_resp.phone as responder_phone
       FROM match_assignments ma
       LEFT JOIN match_requests mr ON ma.request_id = mr.id
       LEFT JOIN accounts a_tourist ON ma.tourist_account_id = a_tourist.id
       LEFT JOIN accounts a_resp ON ma.responder_account_id = a_resp.id
       WHERE ma.id = $1`,
            [id]
        );

        if (matches.length === 0) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // Fetch movements (path)
        const movements = await query(
            `SELECT role, latitude, longitude, recorded_at
       FROM match_movements
       WHERE assignment_id = $1
       ORDER BY recorded_at ASC`,
            [id]
        );

        return NextResponse.json({
            match: matches[0],
            movements
        });
    } catch (error) {
        console.error('Error fetching match details:', error);
        return NextResponse.json({ error: 'Failed to fetch match details' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const body = await request.json();
        const { meeting_status } = body;

        if (!meeting_status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const result = await query(
            `UPDATE match_assignments
       SET meeting_status = $1, meeting_status_updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
            [meeting_status, id]
        );

        if (result.length === 0) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        return NextResponse.json({ match: result[0] });
    } catch (error) {
        console.error('Error updating match:', error);
        return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
    }
}
