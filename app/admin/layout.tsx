'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import './admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations('Admin');
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        // Simple client-side auth check
        const accountStr = sessionStorage.getItem('tourlica.account');
        if (!accountStr) {
            router.push('/login');
            return;
        }
        const account = JSON.parse(accountStr);
        if (account.role !== 'admin') {
            router.push('/map');
        }
    }, [router]);

    const navItems = [
        { label: t('dashboard'), href: '/admin', icon: 'dashboard' },
        { label: t('users'), href: '/admin/users', icon: 'group' },
        { label: t('matches'), href: '/admin/matches', icon: 'handshake' }
    ];

    return (
        <div className="admin-layout">
            <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <h1 className="logo">TourLICA <span>{t('admin')}</span></h1>
                    <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? '«' : '»'}
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href as any}
                                    className={pathname === item.href ? 'active' : ''}
                                >
                                    <span className="material-icons">{item.icon}</span>
                                    {isSidebarOpen && <span className="label">{item.label}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={() => {
                        sessionStorage.removeItem('tourlica.account');
                        router.push('/login');
                    }}>
                        <span className="material-icons">logout</span>
                        {isSidebarOpen && <span>{t('logout')}</span>}
                    </button>
                </div>
            </aside>
            <main className="admin-content">
                <header className="admin-header">
                    <h2 className="page-title">
                        {navItems.find(item => item.href === pathname)?.label || t('dashboard')}
                    </h2>
                    <div className="admin-profile">
                        <span className="badge">{t('admin')}</span>
                    </div>
                </header>
                <div className="content-wrapper">
                    {children}
                </div>
            </main>
        </div>
    );
}
