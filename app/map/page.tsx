'use client';

import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useEffect, useMemo, useState } from 'react';

type MatchRole = 'interpreter' | 'helper';
type MatchStage = 'idle' | 'selecting' | 'sending' | 'waiting';
type AccountRole = 'tourist' | 'interpreter' | 'helper' | 'admin';

interface AccountProfile {
  id: number;
  role: AccountRole;
  name: string;
  email: string;
}

interface PendingRequest {
  id: number;
  requesterName: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number | null;
  createdAt: string;
  device: string | null;
}

const defaultCenter = { lat: 37.5665, lng: 126.978 }; // Seoul City Hall
const containerStyle = { width: '100%', height: '100%' } as const;
const matchRoleLabels: Record<MatchRole, string> = {
  interpreter: '통역사',
  helper: '도우미'
};

export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'tourlica-google-maps',
    googleMapsApiKey: apiKey
  });

  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [matchStage, setMatchStage] = useState<MatchStage>('idle');
  const [matchRole, setMatchRole] = useState<MatchRole | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const serviceRole = isServiceRole(account?.role) ? (account?.role as MatchRole) : null;
  const isTourist = !account || account.role === 'tourist';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem('tourlica.account');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAccount(parsed);
      } catch {
        setAccount(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      () => {
        setLocationError('현재 위치를 가져올 수 없어 기본 위치(서울 시청)를 표시합니다.');
      }
    );
  }, [isLoaded]);

  useEffect(() => {
    if (!serviceRole) {
      setPendingRequests([]);
      setActiveRequestId(null);
      return;
    }

    let cancelled = false;

    async function fetchRequests() {
      try {
        const response = await fetch(`/api/match/requests?role=${serviceRole}`);
        if (!response.ok) {
          throw new Error('요청 실패');
        }
        const data = await response.json();
        if (!cancelled) {
          setPendingRequests(data?.requests ?? []);
          setServiceError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('요청 목록을 가져오지 못했습니다.', error);
          setServiceError('Kafka 대기열에서 요청을 불러오지 못했습니다. 잠시 후 다시 시도하세요.');
        }
      }
    }

    fetchRequests();
    const interval = window.setInterval(fetchRequests, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [serviceRole, refreshSignal]);

  useEffect(() => {
    if (!serviceRole || pendingRequests.length === 0) {
      if (pendingRequests.length === 0) {
        setActiveRequestId(null);
      }
      return;
    }

    if (!activeRequestId || !pendingRequests.some((req) => req.id === activeRequestId)) {
      const next = pendingRequests[0];
      setActiveRequestId(next.id);
      setCenter({ lat: next.latitude, lng: next.longitude });
    }
  }, [pendingRequests, serviceRole, activeRequestId]);

  useEffect(() => {
    if (!isTourist) {
      setMatchStage('idle');
      setMatchRole(null);
      setMatchError(null);
      setCurrentRequestId(null);
    }
  }, [isTourist]);

  const statusMessage = useMemo(() => {
    if (matchStage === 'waiting' && matchRole) {
      return `${matchRoleLabels[matchRole]} 호출 중입니다. 주변 전문가가 응답할 때까지 잠시만 기다려 주세요.`;
    }
    if (matchStage === 'sending') {
      return '요청을 Kafka 파이프라인으로 전송 중입니다...';
    }
    if (matchStage === 'selecting') {
      return '필요한 지원 유형을 선택하세요.';
    }
    return null;
  }, [matchStage, matchRole]);

  const startMatching = () => {
    setMatchError(null);
    setMatchStage('selecting');
    setMatchRole(null);
    setServiceMessage(null);
  };

  const sendMatchEvent = async (role: MatchRole) => {
    setMatchError(null);
    setMatchStage('sending');
    setMatchRole(role);

    const payload = {
      type: 'match_request',
      requesterRole: 'tourist',
      targetRole: role,
      location: center,
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      radiusKm: 3,
      accountId: account?.id ?? null,
      requesterName: account?.name ?? null
    };

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? '요청 실패');
      }

      if (data?.matchRequest?.id) {
        setCurrentRequestId(data.matchRequest.id);
      }

      setMatchStage('waiting');
    } catch (error) {
      console.error('매칭 요청 실패', error);
      setMatchError('매칭 요청 전송에 실패했습니다. 네트워크 상태를 확인하고 다시 시도하세요.');
      setMatchStage('selecting');
      setMatchRole(null);
    }
  };

  const cancelMatch = async () => {
    setMatchStage('idle');
    setMatchRole(null);
    setMatchError(null);

    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'match_cancel',
          requesterRole: 'tourist',
          location: center,
          device: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          accountId: account?.id ?? null,
          requestId: currentRequestId
        })
      });
    } catch (error) {
      console.warn('매칭 취소 이벤트 전송 실패', error);
    } finally {
      setCurrentRequestId(null);
    }
  };

  const activeRequest = serviceRole ? pendingRequests.find((req) => req.id === activeRequestId) ?? null : null;

  const focusRequest = (request: PendingRequest) => {
    setActiveRequestId(request.id);
    setCenter({ lat: request.latitude, lng: request.longitude });
  };

  const skipRequest = () => {
    if (!pendingRequests.length || !activeRequestId) return;
    const currentIndex = pendingRequests.findIndex((req) => req.id === activeRequestId);
    const nextRequest = pendingRequests[(currentIndex + 1) % pendingRequests.length];
    if (nextRequest) {
      focusRequest(nextRequest);
    }
  };

  const acceptMatch = async (requestId: number) => {
    if (!serviceRole || !account) {
      setServiceError('로그인 정보가 필요합니다.');
      return;
    }
    setServiceError(null);
    setServiceMessage(null);
    setAccepting(true);

    try {
      const response = await fetch('/api/match/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          responderAccountId: account.id,
          responderRole: serviceRole
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? '매칭 수락 실패');
      }

      setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
      setServiceMessage('매칭을 수락했습니다. 관광객에게 연결 알림을 보내는 중입니다.');
      setActiveRequestId(null);
    } catch (error) {
      console.error('매칭 수락 실패', error);
      setServiceError(error instanceof Error ? error.message : '매칭 수락 처리 중 오류가 발생했습니다.');
    } finally {
      setAccepting(false);
    }
  };

  const renderTouristControls = () => {
    if (matchStage === 'selecting') {
      return (
        <>
          <p>어떤 지원이 필요하신가요?</p>
          <div className="match-choice">
            <button type="button" onClick={() => sendMatchEvent('interpreter')}>
              <strong>통역사를 호출</strong>
              <span>실시간 언어 지원 요청</span>
            </button>
            <button type="button" onClick={() => sendMatchEvent('helper')}>
              <strong>도우미를 호출</strong>
              <span>현지 케어/동행 지원 요청</span>
            </button>
          </div>
          <div className="match-actions">
            <button type="button" className="outline" onClick={() => setMatchStage('idle')}>
              닫기
            </button>
          </div>
        </>
      );
    }

    if (matchStage === 'sending') {
      return (
        <>
          <p>Kafka 이벤트 전송 중...</p>
          <div className="match-actions">
            <button type="button" disabled>
              요청 전송 중
            </button>
          </div>
        </>
      );
    }

    if (matchStage === 'waiting' && matchRole) {
      return (
        <>
          <p>{matchRoleLabels[matchRole]} 호출 중입니다. 응답이 도착하면 즉시 연결해 드립니다.</p>
          <div className="match-actions">
            <button type="button" className="outline" onClick={cancelMatch}>
              매칭 취소
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <p>가까운 통역사/도우미가 필요하신가요?</p>
        <div className="match-actions">
          <button type="button" onClick={startMatching}>
            매칭 요청
          </button>
        </div>
      </>
    );
  };

  const renderServiceControls = () => {
    if (!serviceRole) {
      return <p>통역사/도우미 계정으로 로그인하면 실시간 요청을 수신합니다.</p>;
    }

    if (!activeRequest) {
      return (
        <>
          <p>대기 중인 요청이 없습니다. Kafka 대기열을 모니터링하는 중...</p>
          <div className="match-actions">
            <button type="button" onClick={() => setRefreshSignal((value) => value + 1)}>
              새로 고침
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <div>
          <p>
            <strong>{activeRequest.requesterName ?? '익명 관광객'}</strong>님의 요청입니다.
          </p>
          <p className="match-status">
            반경 {activeRequest.radiusKm ?? 3}km · {new Date(activeRequest.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="match-actions">
          <button type="button" className="outline" onClick={skipRequest} disabled={accepting}>
            다음 요청
          </button>
          <button type="button" onClick={() => acceptMatch(activeRequest.id)} disabled={accepting}>
            {accepting ? '수락 중...' : '매칭 수락'}
          </button>
        </div>
      </>
    );
  };

  return (
    <main className="map-page">
      <div className="map-wrapper">
        {loadError ? (
          <p className="map-status">지도를 불러올 수 없습니다. API Key를 확인하세요.</p>
        ) : (
          <div className="map-canvas">
            {!isLoaded ? (
              <div className="map-status">지도를 불러오는 중...</div>
            ) : (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={13}
                options={{ disableDefaultUI: true, zoomControl: true }}
              >
                {!serviceRole && <Marker position={center} title="현재 위치" />}
                {serviceRole &&
                  pendingRequests.map((request) => (
                    <Marker
                      key={request.id}
                      position={{ lat: request.latitude, lng: request.longitude }}
                      title={request.requesterName ?? 'Tourist request'}
                      onClick={() => focusRequest(request)}
                    />
                  ))}
              </GoogleMap>
            )}
            {matchStage === 'waiting' && isTourist && (
              <div className="map-ripple" aria-hidden>
                <span />
                <span />
                <span />
              </div>
            )}
            <div className="map-match-controls">
              {isTourist ? renderTouristControls() : renderServiceControls()}
              {isTourist && statusMessage && <p className="match-status">{statusMessage}</p>}
              {isTourist && matchError && <p className="form-error">{matchError}</p>}
              {!isTourist && serviceMessage && <p className="match-status">{serviceMessage}</p>}
              {!isTourist && serviceError && <p className="form-error">{serviceError}</p>}
            </div>
          </div>
        )}
        <aside className="map-panel">
          <h1>TourLICA 지도</h1>
          {isTourist ? (
            <>
              <p>사용자의 현재 위치를 기반으로 반경 내 통역사/도우미를 시각화합니다.</p>
              {locationError && <p className="map-alert">{locationError}</p>}
              <ul>
                <li>지도 하단에서 통역사 · 도우미 중 원하는 지원 유형을 골라 Kafka 매칭 이벤트를 발행합니다.</li>
                <li>파형 애니메이션은 주변 반경에 요청이 브로드캐스트되고 있음을 시각화합니다.</li>
                <li>매칭 취소 버튼을 누르면 즉시 Kafka에 취소 이벤트가 전송됩니다.</li>
              </ul>
            </>
          ) : (
            <>
              <p>Kafka 대기열에서 관광객 요청을 수신해 원하는 건을 매칭할 수 있습니다.</p>
              <ul>
                <li>새 요청이 들어오면 지도 중심이 관광객 위치로 이동합니다.</li>
                <li>마커를 클릭하면 상세 정보를 확인하고, 하단에서 매칭을 수락할 수 있습니다.</li>
                <li>매칭을 수락하면 매칭 이력 테이블에 관광객/통역사/도우미 정보가 기록됩니다.</li>
              </ul>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function isServiceRole(role: AccountRole | undefined | null): role is MatchRole {
  return role === 'interpreter' || role === 'helper';
}
