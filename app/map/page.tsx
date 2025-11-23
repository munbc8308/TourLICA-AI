'use client';

import { GoogleMap, Marker, Polyline, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type MatchRole = 'interpreter' | 'helper';
type MatchStage = 'idle' | 'selecting' | 'sending' | 'waiting' | 'matched';
type AccountRole = 'tourist' | 'interpreter' | 'helper' | 'admin';

interface AccountProfile {
  id: number;
  role: AccountRole;
  name: string;
  email: string;
}

interface AccountDetails extends AccountProfile {
  nickname: string | null;
  phone: string | null;
  gender: string | null;
  country: string | null;
  deviceFingerprint: string | null;
}

interface PendingRequest {
  id: number;
  requesterName: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number | null;
  createdAt: string;
  device: string | null;
  targetRole: MatchRole;
}

interface MatchAssignment {
  id: number;
  requestId: number | null;
  touristAccountId: number | null;
  touristName: string | null;
  responderAccountId: number | null;
  responderName: string | null;
  responderRole: MatchRole;
  latitude: number | null;
  longitude: number | null;
  matchedAt: string;
  meetingStatus: 'enroute' | 'awaiting_confirmation' | 'completed';
  meetingStatusUpdatedAt: string;
}

interface MovementPoint {
  id: number;
  assignmentId: number;
  role: 'tourist' | 'interpreter' | 'helper';
  latitude: number;
  longitude: number;
  recordedAt: string;
}

const defaultCenter = { lat: 37.5665, lng: 126.978 }; // Seoul City Hall
const containerStyle = { width: '100%', height: '100%' } as const;

export default function MapPage() {
  const t = useTranslations('Map');
  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('Auth');

  const matchRoleLabels: Record<MatchRole, string> = {
    interpreter: tAuth('interpreter'),
    helper: tAuth('helper')
  };

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'tourlica-google-maps',
    googleMapsApiKey: apiKey
  });

  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(15);
  const [selfLocation, setSelfLocation] = useState<{ lat: number; lng: number } | null>(null);
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
  const [activeAssignment, setActiveAssignment] = useState<MatchAssignment | null>(null);
  const [movementPath, setMovementPath] = useState<MovementPoint[]>([]);
  const [meetingPromptDismissedVersion, setMeetingPromptDismissedVersion] = useState<string | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const centerInitializedRef = useRef(false);
  const [profileInfo, setProfileInfo] = useState<AccountDetails | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchAssignment[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<'user' | 'tourist' | 'expert' | null>(null);

  const serviceRole = isServiceRole(account?.role) ? (account?.role as MatchRole) : null;
  const isTourist = !account || account.role === 'tourist';
  const assignmentPerspective = serviceRole ? 'responder' : isTourist ? 'tourist' : null;
  const assignmentId = activeAssignment?.id ?? null;
  const shouldShowMeetingPrompt =
    Boolean(
      activeAssignment &&
      activeAssignment.meetingStatus === 'awaiting_confirmation' &&
      activeAssignment.meetingStatusUpdatedAt !== meetingPromptDismissedVersion
    );
  const userMarkerPosition = selfLocation ?? (!serviceRole ? center : null);
  const [menuOpen, setMenuOpen] = useState(false);

  const resetToInitialState = useCallback(() => {
    setMatchStage('idle');
    setMatchRole(null);
    setActiveAssignment(null);
    setMovementPath([]);
    setMeetingPromptDismissedVersion(null);
    setServiceMessage(null);
    setServiceError(null);
    setPendingRequests([]);
    setActiveRequestId(null);
    setCurrentRequestId(null);
    setMatchError(null);
  }, []);

  // ... (keeping useEffects mostly same, but updating error messages if possible, though error messages from API might still be hardcoded or need separate handling)

  // Skip to renderTouristControls for major UI changes

  const renderTouristControls = () => {
    if (matchStage === 'selecting') {
      return (
        <>
          <p>{t('requestHelp')}</p>
          <div className="match-choice">
            <button type="button" onClick={() => sendMatchEvent('interpreter')}>
              <strong>{tAuth('interpreter')}</strong>
              <span>{tAuth('interpreterDesc')}</span>
            </button>
            <button type="button" onClick={() => sendMatchEvent('helper')}>
              <strong>{tAuth('helper')}</strong>
              <span>{tAuth('helperDesc')}</span>
            </button>
          </div>
          <div className="match-actions">
            <button type="button" className="outline" onClick={() => setMatchStage('idle')}>
              {tCommon('close')}
            </button>
          </div>
        </>
      );
    }

    if (matchStage === 'sending') {
      return (
        <>
          <p>{tCommon('loading')}</p>
          <div className="match-actions">
            <button type="button" disabled>
              ...
            </button>
          </div>
        </>
      );
    }

    if (matchStage === 'waiting' && matchRole) {
      return (
        <>
          <p>{t('waitingForMatch')}</p>
          <div className="match-actions">
            <button type="button" className="outline" onClick={cancelMatch}>
              {tCommon('cancel')}
            </button>
          </div>
        </>
      );
    }

    if (matchStage === 'matched' && activeAssignment) {
      const responderName = activeAssignment.responderName ?? matchRoleLabels[activeAssignment.responderRole];
      return (
        <>
          <p>{t('matched')}: {responderName}</p>
          {shouldShowMeetingPrompt && (
            <div className="meeting-prompt">
              <p>{t('interpreterArrived')}</p>
              <div className="prompt-actions">
                <button onClick={handleMeetingConfirm}>{t('confirmMeeting')}</button>
                <button className="outline" onClick={handleMeetingPromptDismiss}>
                  {tCommon('close')}
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    return (
      <div className="match-actions">
        <button type="button" className="primary-btn" onClick={startMatching}>
          {t('requestHelp')}
        </button>
      </div>
    );
  };

  // ... (rest of the component)

  // Need to return the full component structure. Since I can't replace just parts easily without context, I'll try to target specific blocks if possible, or replace the whole file if I had the full content.
  // Since I viewed the first 800 lines, I have most of it.
  // I will use a more targeted replacement for the top part and `renderTouristControls`.




  useEffect(() => {
    if (!activeAssignment || activeAssignment.meetingStatus !== 'awaiting_confirmation') {
      setMeetingPromptDismissedVersion(null);
    }
  }, [activeAssignment, activeAssignment?.meetingStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) {
      setPanelCollapsed(true);
    }
  }, []);

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
    if (!isLoaded || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const updateLocation = (coords: GeolocationCoordinates) => {
      const location = { lat: coords.latitude, lng: coords.longitude };
      setSelfLocation(location);
      userLocationRef.current = location;
      setLocationError(null);
      if (!centerInitializedRef.current) {
        setCenter(location);
        setMapZoom(15);
        centerInitializedRef.current = true;
      }
    };

    const requestOnce = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateLocation(pos.coords),
        () => {
          setLocationError(t('locationErrorDefault'));
        },
        { enableHighAccuracy: highAccuracy, maximumAge: 0, timeout: 8000 }
      );
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => updateLocation(pos.coords),
      (error) => {
        console.warn('watchPosition error', error);
        // retry once with lower accuracy
        requestOnce(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    // request at least once immediately to populate center
    requestOnce(true);

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!account?.id) {
      setProfileInfo(null);
      setMatchHistory([]);
      return;
    }

    setDrawerLoading(true);

    const fetchProfile = fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: account.id })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.account) {
          setProfileInfo(data.account);
        }
      })
      .catch(() => { });

    const perspective = serviceRole ? 'responder' : 'tourist';
    const fetchHistory = fetch('/api/match/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: account.id, perspective, limit: 10 })
    })
      .then((res) => res.json())
      .then((data) => {
        setMatchHistory(data?.history ?? []);
      })
      .catch(() => setMatchHistory([]));

    Promise.all([fetchProfile, fetchHistory]).finally(() => setDrawerLoading(false));
  }, [account?.id, serviceRole]);

  useEffect(() => {
    if (!serviceRole || activeAssignment) {
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
          setServiceError(t('kafkaError'));
        }
      }
    }

    fetchRequests();
    const interval = window.setInterval(fetchRequests, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [serviceRole, refreshSignal, activeAssignment]);

  useEffect(() => {
    if (!serviceRole || activeAssignment || pendingRequests.length === 0) {
      if (pendingRequests.length === 0) {
        setActiveRequestId(null);
      }
      return;
    }

    if (!activeRequestId || !pendingRequests.some((req) => req.id === activeRequestId)) {
      const next = pendingRequests[0];
      setActiveRequestId(next.id);
      setCenter({ lat: next.latitude, lng: next.longitude });
      setMapZoom(15);
    }
  }, [pendingRequests, serviceRole, activeAssignment, activeRequestId]);

  const recenterToSelf = useCallback(() => {
    const fallback = { ...defaultCenter };
    const coords = selfLocation ?? userLocationRef.current ?? fallback;
    setCenter(coords);
    setMapZoom(15);
  }, [selfLocation]);

  useEffect(() => {
    if (!isTourist) {
      setMatchStage('idle');
      setMatchRole(null);
      setMatchError(null);
      setCurrentRequestId(null);
    }
  }, [isTourist]);

  const fetchAssignmentSnapshot = useCallback(async () => {
    if (!assignmentPerspective || !account?.id) {
      resetToInitialState();
      return;
    }

    const response = await fetch('/api/match/assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: account.id, perspective: assignmentPerspective })
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const assignment = (data?.assignment ?? null) as MatchAssignment | null;

    if (!assignment || assignment.meetingStatus === 'completed') {
      resetToInitialState();
      return;
    }

    setActiveAssignment(assignment);

    if (assignment.latitude && assignment.longitude) {
      setCenter({ lat: assignment.latitude, lng: assignment.longitude });
      setMapZoom(15);
    }
    if (isTourist) {
      setMatchStage('matched');
      setMatchRole(assignment.responderRole);
      setMatchError(null);
      setCurrentRequestId(null);
    }
  }, [assignmentPerspective, account?.id, isTourist, resetToInitialState]);

  useEffect(() => {
    if (!isTourist || !account?.id) return;

    const source = new EventSource(`/api/match/stream?accountId=${account.id}`);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'match_response' && payload.touristAccountId === account.id) {
          fetchAssignmentSnapshot();
        }
      } catch (error) {
        console.warn('match_response parse 오류', error);
      }
    };

    source.onerror = () => source.close();

    return () => {
      source.close();
    };
  }, [isTourist, account?.id, fetchAssignmentSnapshot]);

  const handleMeetingArrival = useCallback(async () => {
    if (!activeAssignment || !account?.id) return;

    const sendRequest = async (lat?: number, lng?: number) => {
      try {
        const response = await fetch('/api/match/meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignmentId: activeAssignment.id,
            accountId: account.id,
            action: 'arrived',
            latitude: lat ?? null,
            longitude: lng ?? null
          })
        });
        if (!response.ok) {
          throw new Error('arrival failed');
        }
        setMeetingPromptDismissedVersion(null);
        await fetchAssignmentSnapshot();
        setServiceMessage(t('meetingConfirmRequested'));
      } catch (error) {
        console.error('만남 확인 요청 실패', error);
        setServiceError(t('meetingConfirmRequestFailed'));
      }
    };

    // Use cached location if available
    const coords = userLocationRef.current;
    if (coords) {
      sendRequest(coords.lat, coords.lng);
    } else {
      sendRequest(undefined, undefined);
    }
  }, [activeAssignment, account?.id, fetchAssignmentSnapshot]);

  const handleMeetingConfirm = useCallback(async () => {
    if (!activeAssignment || !account?.id) return;

    const sendConfirm = async (lat?: number, lng?: number) => {
      try {
        const response = await fetch('/api/match/meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignmentId: activeAssignment.id,
            accountId: account.id,
            action: 'confirm',
            latitude: lat ?? null,
            longitude: lng ?? null
          })
        });
        if (!response.ok) {
          throw new Error('confirm failed');
        }
        await fetchAssignmentSnapshot();
        setMeetingPromptDismissedVersion(null);
        resetToInitialState();
      } catch (error) {
        console.error('만남 확인 실패', error);
        setMatchError(t('meetingConfirmFailed'));
      }
    };

    // Use cached location if available to avoid delay
    const coords = userLocationRef.current;
    if (coords) {
      sendConfirm(coords.lat, coords.lng);
    } else {
      sendConfirm(undefined, undefined);
    }
  }, [activeAssignment, account?.id, fetchAssignmentSnapshot, resetToInitialState]);

  const handleMeetingPromptDismiss = useCallback(() => {
    if (!activeAssignment) return;
    setMeetingPromptDismissedVersion(activeAssignment.meetingStatusUpdatedAt);
  }, [activeAssignment]);

  useEffect(() => {
    if (!assignmentPerspective || !account?.id) {
      setActiveAssignment(null);
      return;
    }
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      await fetchAssignmentSnapshot();
    }

    load();
    const interval = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [assignmentPerspective, account?.id, fetchAssignmentSnapshot]);

  useEffect(() => {
    const accountId = account?.id;
    if (!isTourist || !accountId) {
      if (!isTourist) {
        setCurrentRequestId(null);
        setMatchRole(null);
        setMatchStage('idle');
      }
      return;
    }

    let cancelled = false;

    async function fetchPendingRequest() {
      try {
        const response = await fetch('/api/match/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId })
        });

        if (!response.ok) {
          throw new Error('pending request fetch failed');
        }

        const data = await response.json();
        if (cancelled) return;

        const request = data?.request as (PendingRequest | null);
        if (request) {
          setCurrentRequestId(request.id);
          setMatchRole(request.targetRole);
          setMatchStage('waiting');
          setMatchError(null);
          setCenter({ lat: request.latitude, lng: request.longitude });
        } else {
          setCurrentRequestId(null);
          setMatchRole(null);
          setMatchStage((prev) => (prev === 'waiting' ? 'idle' : prev));
        }
      } catch (error) {
        console.warn('Failed to load pending match request', error);
      }
    }

    fetchPendingRequest();
    return () => {
      cancelled = true;
    };
  }, [isTourist, account?.id]);

  useEffect(() => {
    if (!assignmentId) {
      setMovementPath([]);
      setMeetingPromptDismissedVersion(null);
      return;
    }

    let cancelled = false;

    async function loadMovements() {
      if (cancelled) return;
      try {
        const response = await fetch(`/api/match/movements?assignmentId=${assignmentId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          const parsed = (data?.movements ?? []).map((movement: MovementPoint) => ({
            ...movement,
            latitude: Number(movement.latitude),
            longitude: Number(movement.longitude)
          }));
          setMovementPath(parsed);
        }
      } catch (error) {
        console.warn('이동 경로를 불러오지 못했습니다.', error);
      }
    }

    loadMovements();
    const interval = window.setInterval(loadMovements, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [assignmentId, activeAssignment?.id]);

  useEffect(() => {
    const assignmentId = activeAssignment?.id;
    if (!assignmentId || !account?.id) {
      return;
    }

    if (!serviceRole) {
      return;
    }

    let cancelled = false;

    const sendPosition = () => {
      if (cancelled) return;
      const coords = userLocationRef.current;
      if (coords) {
        fetch('/api/match/movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignmentId,
            latitude: coords.lat,
            longitude: coords.lng
          })
        }).catch(() => { });
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            userLocationRef.current = location;
            setSelfLocation(location);
            fetch('/api/match/movements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                assignmentId,
                latitude: location.lat,
                longitude: location.lng
              })
            }).catch(() => { });
          },
          () => { },
          { maximumAge: 0, enableHighAccuracy: true }
        );
      }
    };

    sendPosition();
    const interval = window.setInterval(sendPosition, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [assignmentId, activeAssignment?.id, account?.id, isTourist, serviceRole]);

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
    if (matchStage === 'matched' && matchRole) {
      return `${matchRoleLabels[matchRole]}와 연결되었습니다. 이동 경로를 따라오세요.`;
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
      setMatchError(t('matchRequestError'));
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
      setServiceError(t('loginRequired'));
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
      setServiceMessage(t('moveToTourist'));
      setActiveRequestId(null);
      await fetchAssignmentSnapshot();
    } catch (error) {
      console.error('매칭 수락 실패', error);
      setServiceError(error instanceof Error ? error.message : t('matchAcceptError'));
    } finally {
      setAccepting(false);
    }
  };



  const renderServiceControls = () => {
    if (!serviceRole) {
      return <p>{t('loginAsService')}</p>;
    }

    if (activeAssignment) {
      return (
        <>
          <div>
            <p>
              <strong>{t('connectedWith', { name: activeAssignment.touristName ?? t('tourist') })}</strong>
            </p>
            <p className="match-status">
              {t('matchedAt')} {new Date(activeAssignment.matchedAt).toLocaleTimeString()}
            </p>
            {activeAssignment.meetingStatus === 'awaiting_confirmation' && <p className="match-status">{t('waitingForConfirmation')}</p>}
            {activeAssignment.meetingStatus === 'completed' && <p className="match-status">{t('meetingCompleted')}</p>}
          </div>
          <div className="match-actions">
            {activeAssignment.meetingStatus !== 'completed' && !shouldShowMeetingPrompt && (
              <button type="button" onClick={handleMeetingArrival} disabled={accepting}>
                {t('requestMeetingConfirmation')}
              </button>
            )}
            <button type="button" className="outline" onClick={() => fetchAssignmentSnapshot()} disabled={accepting}>
              {t('refresh')}
            </button>
          </div>
        </>
      );
    }

    if (!activeRequest) {
      return (
        <>
          <p>{t('noPendingRequests')}</p>
          <div className="match-actions">
            <button type="button" onClick={() => setRefreshSignal((value) => value + 1)}>
              {t('refresh')}
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <div>
          <p>
            <strong>{t('requestFrom', { name: activeRequest.requesterName ?? t('anonymousTourist') })}</strong>
          </p>
          <p className="match-status">
            {t('radius')} {activeRequest.radiusKm ?? 3}km · {new Date(activeRequest.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="match-actions">
          <button type="button" className="outline" onClick={skipRequest} disabled={accepting}>
            {t('nextRequest')}
          </button>
          <button type="button" onClick={() => acceptMatch(activeRequest.id)} disabled={accepting}>
            {accepting ? t('accepting') : t('acceptMatch')}
          </button>
        </div>
      </>
    );
  };

  return (
    <main className="map-page">
      <header className="map-nav">
        <button type="button" className="nav-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={t('openMenu')}>
          ☰
        </button>
        <div className="map-brand">TOURLICA</div>
        <div className="map-nav-role">{serviceRole ? t('serviceMode') : t('touristMode')}</div>
      </header>
      <div className={`map-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <p>{account?.name ?? t('guest')}</p>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label={t('closeMenu')}>
            ✕
          </button>
        </div>
        <div className="drawer-section">
          <h3>{t('myProfile')}</h3>
          {drawerLoading && !profileInfo ? (
            <p className="match-status">{t('loading')}</p>
          ) : profileInfo ? (
            <ul>
              <li>{t('name')}: {profileInfo.name}</li>
              <li>{t('email')}: {profileInfo.email}</li>
              {profileInfo.nickname && <li>{t('nickname')}: {profileInfo.nickname}</li>}
              {profileInfo.phone && <li>{t('phone')}: {profileInfo.phone}</li>}
              {profileInfo.country && <li>{t('country')}: {profileInfo.country}</li>}
              {profileInfo.gender && <li>{t('gender')}: {profileInfo.gender}</li>}
            </ul>
          ) : (
            <p className="match-status">{t('noInfo')}</p>
          )}
        </div>
        <div className="drawer-section">
          <h3>{t('matchHistory')}</h3>
          {drawerLoading && matchHistory.length === 0 ? (
            <p className="match-status">{t('loading')}</p>
          ) : matchHistory.length === 0 ? (
            <p className="match-status">{t('noHistory')}</p>
          ) : (
            <ul className="history-list">
              {matchHistory.map((history) => {
                const counterpart = serviceRole ? history.touristName ?? t('tourist') : history.responderName ?? t('expert');
                return (
                  <li key={history.id}>
                    <strong>{counterpart}</strong>
                    <span>{new Date(history.matchedAt).toLocaleString()}</span>
                    {history.latitude && history.longitude && (
                      <span>
                        {t('location')}: {history.latitude.toFixed(3)}, {history.longitude.toFixed(3)}
                      </span>
                    )}
                    <span>{t('result')}: {history.meetingStatus === 'completed' ? t('completed') : t('inProgress')}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <nav className="drawer-links">
          <a href="/login">{t('logout')}</a>
        </nav>
      </div>
      {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />}
      <div className="map-view">
        {loadError ? (
          <p className="map-status">{t('mapLoadError')}</p>
        ) : (
          <div className="map-canvas">
            {!isLoaded ? (
              <div className="map-status">{t('mapLoading')}</div>
            ) : (
              <>
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={center}
                  zoom={mapZoom}
                  options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    streetViewControl: false,
                    fullscreenControl: false
                  }}
                >
                  {userMarkerPosition && (
                    <>
                      <Marker
                        position={userMarkerPosition}
                        title={t('myLocation')}
                        label={t('me')}
                        onClick={() => setSelectedMarker('user')}
                      />
                      {selectedMarker === 'user' && (
                        <InfoWindow
                          position={userMarkerPosition}
                          onCloseClick={() => setSelectedMarker(null)}
                        >
                          <div style={{ padding: '8px' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{t('myLocation')}</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                              {account?.name || t('me')}
                              {account?.role && ` (${t(account.role)})`}
                            </p>
                          </div>
                        </InfoWindow>
                      )}
                    </>
                  )}
                  {activeAssignment && activeAssignment.latitude && activeAssignment.longitude && (
                    <>
                      <Marker
                        position={{ lat: activeAssignment.latitude, lng: activeAssignment.longitude }}
                        title={t('touristLocation')}
                        label={t('tourist')}
                        onClick={() => setSelectedMarker('tourist')}
                      />
                      {selectedMarker === 'tourist' && (
                        <InfoWindow
                          position={{ lat: activeAssignment.latitude, lng: activeAssignment.longitude }}
                          onCloseClick={() => setSelectedMarker(null)}
                        >
                          <div style={{ padding: '8px' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{t('touristLocation')}</h3>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>
                              <strong>{activeAssignment.touristName || t('tourist')}</strong>
                            </p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                              {t('matchedAt')}: {new Date(activeAssignment.matchedAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </InfoWindow>
                      )}
                    </>
                  )}
                  {movementPath.length > 0 && (
                    <>
                      <Marker
                        position={{
                          lat: movementPath[movementPath.length - 1].latitude,
                          lng: movementPath[movementPath.length - 1].longitude
                        }}
                        title={t('expertLocation')}
                        label={t('expert')}
                        onClick={() => setSelectedMarker('expert')}
                      />
                      {selectedMarker === 'expert' && (
                        <InfoWindow
                          position={{
                            lat: movementPath[movementPath.length - 1].latitude,
                            lng: movementPath[movementPath.length - 1].longitude
                          }}
                          onCloseClick={() => setSelectedMarker(null)}
                        >
                          <div style={{ padding: '8px' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{t('expertLocation')}</h3>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>
                              <strong>{activeAssignment?.responderName || t('expert')}</strong>
                            </p>
                            {activeAssignment?.responderRole && (
                              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#666' }}>
                                {t(activeAssignment.responderRole)}
                              </p>
                            )}
                            <p style={{ margin: 0, fontSize: '10px', color: '#999' }}>
                              {t('updatingLocation')}
                            </p>
                          </div>
                        </InfoWindow>
                      )}
                    </>
                  )}
                  {movementPath.length > 1 && (
                    <Polyline
                      path={movementPath.map((point) => ({ lat: point.latitude, lng: point.longitude }))}
                      options={{
                        strokeColor: '#38bdf8',
                        strokeOpacity: 0.9,
                        strokeWeight: 4,
                        geodesic: true
                      }}
                    />
                  )}
                </GoogleMap>
                <div className="map-controls">
                  <button type="button" onClick={recenterToSelf}>
                    {t('moveToMyLocation')}
                  </button>
                </div>
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
              </>
            )}
          </div>
        )}
        <aside className={`map-panel ${panelCollapsed ? 'collapsed' : ''}`}>
          <button
            type="button"
            className="panel-toggle"
            onClick={() => setPanelCollapsed((prev) => !prev)}
            aria-label={t('togglePanel')}
          >
            {panelCollapsed ? t('showDescription') : t('hide')}
          </button>
          {!panelCollapsed && (
            <>
              <h1>{t('mapTitle')}</h1>
              {isTourist ? (
                <>
                  <p>{t('touristGuide1')}</p>
                  {locationError && <p className="map-alert">{locationError}</p>}
                  <ul>
                    <li>{t('touristGuide2')}</li>
                    <li>{t('touristGuide3')}</li>
                    <li>{t('touristGuide4')}</li>
                  </ul>
                  {activeAssignment && (
                    <div className="assignment-panel">
                      <p>
                        <strong>{t('matchedWith', { name: activeAssignment.responderName ?? matchRoleLabels[activeAssignment.responderRole] })}</strong>
                      </p>
                      <p className="match-status">{t('matchedAt')}: {new Date(activeAssignment.matchedAt).toLocaleTimeString()}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p>{t('serviceGuide1')}</p>
                  <ul>
                    <li>{t('serviceGuide2')}</li>
                    <li>{t('serviceGuide3')}</li>
                    <li>{t('serviceGuide4')}</li>
                  </ul>
                  {activeAssignment && (
                    <div className="assignment-panel">
                      <p>
                        <strong>{t('sharingPath', { name: activeAssignment.touristName ?? t('tourist') })}</strong>
                      </p>
                      <p className="match-status">{t('updatingLocation')}</p>
                    </div>
                  )}
                </>
              )}
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
