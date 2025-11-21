'use client';

import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useEffect, useMemo, useState } from 'react';

type MatchRole = 'interpreter' | 'helper';
type MatchStage = 'idle' | 'selecting' | 'sending' | 'waiting';

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

  const [center, setCenter] = useState(defaultCenter);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [matchStage, setMatchStage] = useState<MatchStage>('idle');
  const [matchRole, setMatchRole] = useState<MatchRole | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

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
      radiusKm: 3
    };

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('요청 실패');
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
          device: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        })
      });
    } catch (error) {
      console.warn('매칭 취소 이벤트 전송 실패', error);
    }
  };

  const renderMatchControls = () => {
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
          <p>
            {matchRoleLabels[matchRole]} 호출 중입니다. 응답이 도착하면 즉시 연결해 드립니다.
          </p>
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
                <Marker position={center} title="현재 위치" />
              </GoogleMap>
            )}
            {matchStage === 'waiting' && (
              <div className="map-ripple" aria-hidden>
                <span />
                <span />
                <span />
              </div>
            )}
            <div className="map-match-controls">
              {renderMatchControls()}
              {statusMessage && <p className="match-status">{statusMessage}</p>}
              {matchError && <p className="form-error">{matchError}</p>}
            </div>
          </div>
        )}
        <aside className="map-panel">
          <h1>TourLICA 지도</h1>
          <p>사용자의 현재 위치를 기반으로 반경 내 통역사/도우미를 시각화합니다.</p>
          {locationError && <p className="map-alert">{locationError}</p>}
          <ul>
            <li>지도 하단에서 통역사 · 도우미 중 원하는 지원 유형을 골라 Kafka 매칭 이벤트를 발행합니다.</li>
            <li>파형 애니메이션은 주변 반경에 요청이 브로드캐스트되고 있음을 시각화합니다.</li>
            <li>매칭 취소 버튼을 누르면 즉시 Kafka에 취소 이벤트가 전송됩니다.</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
