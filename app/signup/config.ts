export type SignupRole = 'tourist' | 'interpreter' | 'helper';

interface RoleInfo {
  key: SignupRole;
  title: string;
  tagline: string;
  bullets: string[];
  helperText: string;
}

export const roleInfos: Record<SignupRole, RoleInfo> = {
  tourist: {
    key: 'tourist',
    title: '관광객',
    tagline: '여행 일정과 언어 지원을 즉시 연결',
    bullets: ['맞춤 일정 추천', '언어/문화 가이드 예약', '긴급 헬프라인 연동'],
    helperText: '기본 연락처와 선호 언어·국가를 입력하면 가장 가까운 통역/도우미를 추천합니다.'
  },
  interpreter: {
    key: 'interpreter',
    title: '통역사',
    tagline: '실시간 매칭으로 고객과 연결',
    bullets: ['고객 요청 실시간 수신', '스케줄 관리 · 매칭 관리', '고유 통역사 코드 기반 정산'],
    helperText: '통역사 고유번호를 입력하면 TourLICA 검증 절차를 빠르게 진행할 수 있습니다.'
  },
  helper: {
    key: 'helper',
    title: '도우미',
    tagline: '현지 케어 · 가이드 서비스를 제공',
    bullets: ['관광객 1:1 지원', '현지 경험 공유', '다국어 채널 참여'],
    helperText: '현지 가이드/도우미 정보와 연락처를 등록하면 즉시 요청을 받을 수 있습니다.'
  }
};

export const roleList = Object.values(roleInfos);
