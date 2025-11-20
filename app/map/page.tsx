'use client';

import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useState } from 'react';

const defaultCenter = { lat: 37.5665, lng: 126.978 }; // Seoul City Hall
const containerStyle = { width: '100%', height: '100%' } as const;

export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'tourlica-google-maps',
    googleMapsApiKey: apiKey
  });

  const [center, setCenter] = useState(defaultCenter);
  const [locationError, setLocationError] = useState<string | null>(null);

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

  const renderMap = useCallback(() => {
    if (!isLoaded) {
      return <p className="map-status">지도를 불러오는 중...</p>;
    }

    return (
      <div className="map-canvas">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          options={{ disableDefaultUI: true, zoomControl: true }}
        >
          <Marker position={center} title="현재 위치" />
        </GoogleMap>
      </div>
    );
  }, [center, isLoaded]);

  return (
    <main className="map-page">
      <div className="map-wrapper">
        {loadError ? <p className="map-status">지도를 불러올 수 없습니다. API Key를 확인하세요.</p> : renderMap()}
        <aside className="map-panel">
          <h1>TourLICA 지도</h1>
          <p>사용자의 현재 위치를 기반으로 반경 내 통역사/도우미를 시각화합니다.</p>
          {locationError && <p className="map-alert">{locationError}</p>}
          <ul>
            <li>반경 슬라이더를 통해 원하는 매칭 범위를 조정합니다.</li>
            <li>근접한 통역사에게 Kafka 이벤트를 전달하고 수락 여부를 수집합니다.</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
