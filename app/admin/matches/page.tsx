'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Match {
    id: number;
    matched_at: string;
    meeting_status: string;
    tourist_name: string;
    responder_name: string;
    responder_role: string;
    // Detail fields
    requester_name?: string;
    request_note?: string;
    tourist_real_name?: string;
    tourist_email?: string;
    responder_email?: string;
    responder_phone?: string;
}

interface Movement {
    role: string;
    latitude: number;
    longitude: number;
    recorded_at: string;
}

export default function MatchesPage() {
    const t = useTranslations('Admin');
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchMatches = async (pageNum: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/matches?page=${pageNum}&limit=10`);
            const data = await res.json();
            setMatches(data.matches);
            setTotalPages(data.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch matches:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches(page);
    }, [page]);

    const handleRowClick = async (match: Match) => {
        try {
            const res = await fetch(`/api/admin/matches/${match.id}`);
            const data = await res.json();
            setSelectedMatch(data.match);
            setMovements(data.movements);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Failed to fetch match details:', error);
        }
    };

    const handleUpdateStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatch) return;

        try {
            const res = await fetch(`/api/admin/matches/${selectedMatch.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meeting_status: selectedMatch.meeting_status
                })
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchMatches(page);
            } else {
                alert(t('updateFailed'));
            }
        } catch (error) {
            console.error('Failed to update match:', error);
            alert(t('updateFailed'));
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'enroute': return t('statusEnroute');
            case 'awaiting_confirmation': return t('statusAwaitingConfirmation');
            case 'completed': return t('statusCompleted');
            case 'cancelled': return t('statusCancelled');
            default: return status;
        }
    };

    return (
        <div>
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{t('id')}</th>
                            <th>{t('date')}</th>
                            <th>{t('tourist')}</th>
                            <th>{t('responder')}</th>
                            <th>{t('status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center' }}>{t('loading')}</td></tr>
                        ) : matches.map((match) => (
                            <tr key={match.id} onClick={() => handleRowClick(match)}>
                                <td>{match.id}</td>
                                <td>{new Date(match.matched_at).toLocaleString()}</td>
                                <td>{match.tourist_name}</td>
                                <td>
                                    {match.responder_name}
                                    <span style={{ fontSize: '0.8em', color: '#718096', marginLeft: '4px' }}>
                                        ({match.responder_role})
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-badge ${match.meeting_status}`}>
                                        {getStatusLabel(match.meeting_status)}
                                    </span>
                                </td>
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
                        {t('previous')}
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        {t('pageOf', { page, total: totalPages })}
                    </span>
                    <button
                        className="btn btn-secondary"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        {t('next')}
                    </button>
                </div>
            </div>

            {/* Match Detail Modal */}
            {isModalOpen && selectedMatch && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('matchDetails', { id: selectedMatch.id })}</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleUpdateStatus}>
                            <div className="modal-body">
                                <div className="detail-row">
                                    <label>{t('tourist')}</label>
                                    <div className="value">
                                        {selectedMatch.tourist_real_name} ({selectedMatch.tourist_email})
                                    </div>
                                </div>
                                <div className="detail-row">
                                    <label>{t('responder')}</label>
                                    <div className="value">
                                        {selectedMatch.responder_name} ({selectedMatch.responder_email})
                                        <br />
                                        <small>{selectedMatch.responder_phone}</small>
                                    </div>
                                </div>
                                <div className="detail-row">
                                    <label>{t('requestNote')}</label>
                                    <div className="value">{selectedMatch.request_note || '-'}</div>
                                </div>
                                <div className="detail-row">
                                    <label>{t('meetingStatus')}</label>
                                    <select
                                        value={selectedMatch.meeting_status}
                                        onChange={(e) => setSelectedMatch({ ...selectedMatch, meeting_status: e.target.value })}
                                    >
                                        <option value="enroute">{t('statusEnroute')}</option>
                                        <option value="awaiting_confirmation">{t('statusAwaitingConfirmation')}</option>
                                        <option value="completed">{t('statusCompleted')}</option>
                                        <option value="cancelled">{t('statusCancelled')}</option>
                                    </select>
                                </div>

                                <div className="detail-row">
                                    <label>{t('movementHistory')}</label>
                                    <div style={{
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        background: '#f7fafc',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem'
                                    }}>
                                        {movements.length === 0 ? (
                                            <div style={{ color: '#a0aec0' }}>{t('noMovements')}</div>
                                        ) : (
                                            movements.map((m, idx) => (
                                                <div key={idx} style={{ marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: 600 }}>{new Date(m.recorded_at).toLocaleTimeString()}</span>:
                                                    {m.latitude.toFixed(6)}, {m.longitude.toFixed(6)}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>{t('cancel')}</button>
                                <button type="submit" className="btn btn-primary">{t('updateStatus')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
