'use client';

import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  useEffect(() => {
    if (!activeAssignment || activeAssignment.meetingStatus !== 'awaiting_confirmation') {
      setMeetingPromptDismissedVersion(null);
    }
  }, [activeAssignment, activeAssignment?.meetingStatus]);

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
          setLocationError('현재 위치를 가져올 수 없어 기본 위치(서울 시청)를 표시합니다.');
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
      .catch(() => {});

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

    const sendRequest = async (coords?: GeolocationCoordinates) => {
      try {
        const response = await fetch('/api/match/meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignmentId: activeAssignment.id,
            accountId: account.id,
            action: 'arrived',
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null
          })
        });
        if (!response.ok) {
          throw new Error('arrival failed');
        }
        setMeetingPromptDismissedVersion(null);
        await fetchAssignmentSnapshot();
        setServiceMessage('관광객에게 만남 확인을 요청했습니다.');
      } catch (error) {
        console.error('만남 확인 요청 실패', error);
        setServiceError('만남 확인 요청을 전송하지 못했습니다.');
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendRequest(pos.coords),
        () => sendRequest(undefined),
        { enableHighAccuracy: true }
      );
    } else {
      sendRequest(undefined);
    }
  }, [activeAssignment, account?.id, fetchAssignmentSnapshot]);

  const handleMeetingConfirm = useCallback(async () => {
    if (!activeAssignment || !account?.id) return;

    const sendConfirm = async (coords?: GeolocationCoordinates) => {
      try {
        const response = await fetch('/api/match/meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignmentId: activeAssignment.id,
            accountId: account.id,
            action: 'confirm',
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null
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
        setMatchError('만남을 확정하지 못했습니다. 잠시 후 다시 시도하세요.');
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendConfirm(pos.coords),
        () => sendConfirm(undefined),
        { enableHighAccuracy: true }
      );
    } else {
      sendConfirm(undefined);
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
    const interval = window.setInterval(loadMovements, 3000);
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
        }).catch(() => {});
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
            }).catch(() => {});
          },
          () => {},
          { maximumAge: 0, enableHighAccuracy: true }
        );
      }
    };

    sendPosition();
    const interval = window.setInterval(sendPosition, 3000);
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
      setServiceMessage('관광객 위치로 이동하세요.');
      setActiveRequestId(null);
      await fetchAssignmentSnapshot();
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

    if (matchStage === 'matched' && activeAssignment) {
      const responderName = activeAssignment.responderName ?? matchRoleLabels[activeAssignment.responderRole];
      return (
        <>
          <p>{responderName} 님 위치를 따라 이동 중입니다.</p>
          {shouldShowMeetingPrompt && (
            <div className="meeting-prompt">
              <p>현장에서 만남이 완료되었나요?</p>
              <div className="match-actions">
                <button type="button" onClick={handleMeetingConfirm}>
                  만남 확인
                </button>
                <button type="button" className="outline" onClick={handleMeetingPromptDismiss}>
                  닫기
                </button>
              </div>
            </div>
          )}
          <div className="match-actions">
            <button type="button" onClick={() => fetchAssignmentSnapshot()}>
              경로 새로고침
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

    if (activeAssignment) {
      return (
        <>
          <div>
            <p>
              <strong>{activeAssignment.touristName ?? '관광객'}</strong>님과 연결되었습니다.
            </p>
            <p className="match-status">
              매칭 시각 {new Date(activeAssignment.matchedAt).toLocaleTimeString()}
            </p>
            {activeAssignment.meetingStatus === 'awaiting_confirmation' && <p className="match-status">관광객의 만남 확인을 기다리고 있습니다.</p>}
            {activeAssignment.meetingStatus === 'completed' && <p className="match-status">만남이 완료되었습니다.</p>}
          </div>
          <div className="match-actions">
            {activeAssignment.meetingStatus !== 'completed' && !shouldShowMeetingPrompt && (
              <button type="button" onClick={handleMeetingArrival} disabled={accepting}>
                만남 확인 요청
              </button>
            )}
            <button type="button" className="outline" onClick={() => fetchAssignmentSnapshot()} disabled={accepting}>
              새로 고침
            </button>
          </div>
        </>
      );
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
      <header className="map-nav">
        <button type="button" className="nav-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label="메뉴 열기">
          ☰
        </button>
        <div className="map-brand">TourLICA 이동 제어</div>
        <div className="map-nav-role">{serviceRole ? '통역사/도우미 모드' : '관광객 모드'}</div>
      </header>
      <div className={`map-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <p>{account?.name ?? '게스트'}</p>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기">
            ✕
          </button>
        </div>
        <div className="drawer-section">
          <h3>내 정보</h3>
          {drawerLoading && !profileInfo ? (
            <p className="match-status">불러오는 중...</p>
          ) : profileInfo ? (
            <ul>
              <li>이름: {profileInfo.name}</li>
              <li>이메일: {profileInfo.email}</li>
              {profileInfo.nickname && <li>닉네임: {profileInfo.nickname}</li>}
              {profileInfo.phone && <li>연락처: {profileInfo.phone}</li>}
              {profileInfo.country && <li>국가: {profileInfo.country}</li>}
              {profileInfo.gender && <li>성별: {profileInfo.gender}</li>}
            </ul>
          ) : (
            <p className="match-status">정보가 없습니다.</p>
          )}
        </div>
        <div className="drawer-section">
          <h3>매칭 히스토리</h3>
          {drawerLoading && matchHistory.length === 0 ? (
            <p className="match-status">불러오는 중...</p>
          ) : matchHistory.length === 0 ? (
            <p className="match-status">기록이 없습니다.</p>
          ) : (
            <ul className="history-list">
              {matchHistory.map((history) => {
                const counterpart = serviceRole ? history.touristName ?? '관광객' : history.responderName ?? '전문가';
                return (
                  <li key={history.id}>
                    <strong>{counterpart}</strong>
                    <span>{new Date(history.matchedAt).toLocaleString()}</span>
                    {history.latitude && history.longitude && (
                      <span>
                        위치: {history.latitude.toFixed(3)}, {history.longitude.toFixed(3)}
                      </span>
                    )}
                    <span>결과: {history.meetingStatus === 'completed' ? '완료' : '진행 중'}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <nav className="drawer-links">
          <a href="/login">로그아웃</a>
        </nav>
      </div>
      {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />}
      <div className="map-view">
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
                zoom={mapZoom}
                options={{ disableDefaultUI: true, zoomControl: true }}
              >
                {userMarkerPosition && <Marker position={userMarkerPosition} title="내 위치" label="나" />}
                {activeAssignment && activeAssignment.latitude && activeAssignment.longitude && (
                  <Marker
                    position={{ lat: activeAssignment.latitude, lng: activeAssignment.longitude }}
                    title="관광객 위치"
                    label="관광객"
                  />
                )}
                {movementPath.length > 0 && (
                  <Marker
                    position={{
                      lat: movementPath[movementPath.length - 1].latitude,
                      lng: movementPath[movementPath.length - 1].longitude
                    }}
                    title="통역사/도우미 위치"
                    label="전문가"
                  />
                )}
                {movementPath.length > 1 && (
                  <Polyline
                    path={movementPath.map((point) => ({ lat: point.latitude, lng: point.longitude }))}
                    options={{
                      strokeColor: '#38bdf8',
                      strokeOpacity: 0.9,
                      strokeWeight: 4
                    }}
                  />
                )}
                {!activeAssignment &&
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
            <div className="map-controls">
              <button
                type="button"
                onClick={() => {
                  const location = userMarkerPosition ?? selfLocation ?? center;
                  setCenter(location);
                  setMapZoom(15);
                }}
              >
                내 위치로 이동
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
          {activeAssignment && (
            <div className="assignment-panel">
              <p>
                현재 <strong>{activeAssignment.responderName ?? matchRoleLabels[activeAssignment.responderRole]}</strong> 님과 매칭되었습니다.
              </p>
              <p className="match-status">매칭 시각: {new Date(activeAssignment.matchedAt).toLocaleTimeString()}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <p>Kafka 대기열에서 관광객 요청을 수신해 원하는 건을 매칭할 수 있습니다.</p>
          <ul>
            <li>새 요청이 들어오면 지도 중심이 관광객 위치로 이동합니다.</li>
            <li>마커를 클릭하면 상세 정보를 확인하고, 하단에서 매칭을 수락할 수 있습니다.</li>
            <li>매칭을 수락하면 매칭 이력 테이블에 관광객/통역사/도우미 정보가 기록됩니다.</li>
          </ul>
          {activeAssignment && (
            <div className="assignment-panel">
              <p>
                <strong>{activeAssignment.touristName ?? '관광객'}</strong>님과 이동 경로를 공유 중입니다.
              </p>
              <p className="match-status">위치를 15초 간격으로 업데이트하고 있습니다.</p>
            </div>
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
