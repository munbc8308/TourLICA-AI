'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function AdminDashboard() {
    const t = useTranslations('Admin');
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeMatches: 0,
        totalMatches: 0
    });

    useEffect(() => {
        // In a real app, we would fetch these stats from an API
        // For now, we'll just mock or fetch lists to count
        const fetchStats = async () => {
            try {
                const [usersRes, matchesRes] = await Promise.all([
                    fetch('/api/admin/users?limit=1'),
                    fetch('/api/admin/matches?limit=1')
                ]);

                const usersData = await usersRes.json();
                const matchesData = await matchesRes.json();

                setStats({
                    totalUsers: usersData.pagination?.total || 0,
                    totalMatches: matchesData.pagination?.total || 0,
                    activeMatches: 0 // We would need a specific API for this
                });
            } catch (error) {
                console.error('Failed to fetch stats', error);
            }
        };

        fetchStats();
    }, []);

    return (
        <div>
            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        <span className="material-icons">people</span>
                    </div>
                    <div className="stat-info">
                        <h3>{t('totalUsers')}</h3>
                        <div className="value">{stats.totalUsers}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <span className="material-icons">handshake</span>
                    </div>
                    <div className="stat-info">
                        <h3>{t('totalMatches')}</h3>
                        <div className="value">{stats.totalMatches}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <span className="material-icons">schedule</span>
                    </div>
                    <div className="stat-info">
                        <h3>{t('activeMatches')}</h3>
                        <div className="value">-</div>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div style={{ padding: '24px', borderBottom: '1px solid var(--admin-border)' }}>
                    <h3 style={{ margin: 0 }}>{t('recentActivity')}</h3>
                </div>
                <div style={{ padding: '24px', color: '#718096', textAlign: 'center' }}>
                    {t('activityLogComingSoon')}
                </div>
            </div>
        </div>
    );
}
