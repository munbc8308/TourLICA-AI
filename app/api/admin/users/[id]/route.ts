import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const users = await query(
            `SELECT id, role, name, nickname, email, phone, gender, country, device_fingerprint, interpreter_code, is_active, admin_memo, created_at
       FROM accounts
       WHERE id = $1`,
            [id]
        );

        if (users.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user: users[0] });
    } catch (error) {
        console.error('Error fetching user details:', error);
        return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const body = await request.json();
        const { is_active, admin_memo } = body;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }
        if (admin_memo !== undefined) {
            updates.push(`admin_memo = $${paramIndex++}`);
            values.push(admin_memo);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(id);
        const result = await query(
            `UPDATE accounts
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        if (result.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user: result[0] });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
