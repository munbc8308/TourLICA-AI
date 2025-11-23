'use client';

import { useEffect, useState } from 'react';

interface User {
    id: number;
    role: string;
    name: string;
    email: string;
    is_active: boolean;
    created_at: string;
    nickname?: string;
    phone?: string;
    gender?: string;
    country?: string;
    admin_memo?: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchUsers = async (pageNum: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?page=${pageNum}&limit=10`);
            const data = await res.json();
            setUsers(data.users);
            setTotalPages(data.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(page);
    }, [page]);

    const handleRowClick = async (user: User) => {
        try {
            // Fetch full details including memo
            const res = await fetch(`/api/admin/users/${user.id}`);
            const data = await res.json();
            setSelectedUser(data.user);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Failed to fetch user details:', error);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_active: selectedUser.is_active,
                    admin_memo: selectedUser.admin_memo
                })
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchUsers(page); // Refresh list
            } else {
                alert('Failed to update user');
            }
        } catch (error) {
            console.error('Failed to update user:', error);
            alert('Error updating user');
        }
    };

    return (
        <div>
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Role</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Joined At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center' }}>Loading...</td></tr>
                        ) : users.map((user) => (
                            <tr key={user.id} onClick={() => handleRowClick(user)}>
                                <td>{user.id}</td>
                                <td>
                                    <span className="status-badge" style={{
                                        backgroundColor: '#edf2f7', color: '#4a5568'
                                    }}>{user.role}</span>
                                </td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>
                                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Simple Pagination */}
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button
                        className="btn btn-secondary"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="btn btn-secondary"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* User Detail Modal */}
            {isModalOpen && selectedUser && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>User Details</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleUpdateUser}>
                            <div className="modal-body">
                                <div className="detail-row">
                                    <label>Role</label>
                                    <div className="value" style={{ textTransform: 'capitalize' }}>{selectedUser.role}</div>
                                </div>
                                <div className="detail-row">
                                    <label>Name</label>
                                    <div className="value">{selectedUser.name} ({selectedUser.nickname || '-'})</div>
                                </div>
                                <div className="detail-row">
                                    <label>Email</label>
                                    <div className="value">{selectedUser.email}</div>
                                </div>
                                <div className="detail-row">
                                    <label>Phone</label>
                                    <div className="value">{selectedUser.phone || '-'}</div>
                                </div>
                                <div className="detail-row">
                                    <label>Status</label>
                                    <select
                                        value={selectedUser.is_active ? 'true' : 'false'}
                                        onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.value === 'true' })}
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                                <div className="detail-row">
                                    <label>Admin Memo</label>
                                    <textarea
                                        value={selectedUser.admin_memo || ''}
                                        onChange={(e) => setSelectedUser({ ...selectedUser, admin_memo: e.target.value })}
                                        placeholder="Add internal notes here..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
