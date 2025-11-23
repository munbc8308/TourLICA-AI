'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import './admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
        { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
        { label: 'User Management', href: '/admin/users', icon: 'group' },
        { label: 'Match Management', href: '/admin/matches', icon: 'handshake' }
    ];

    return (
        <div className="admin-layout">
            <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <h1 className="logo">TourLICA <span>Admin</span></h1>
                    <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? '«' : '»'}
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
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
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>
            <main className="admin-content">
                <header className="admin-header">
                    <h2 className="page-title">
                        {navItems.find(item => item.href === pathname)?.label || 'Dashboard'}
                    </h2>
                    <div className="admin-profile">
                        <span className="badge">Admin</span>
                    </div>
                </header>
                <div className="content-wrapper">
                    {children}
                </div>
            </main>
        </div>
    );
}
