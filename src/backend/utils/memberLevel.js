/**
 * 파일 역할: 회원 포인트 기반 레벨/등급 계산 규칙을 제공하는 유틸리티 파일.
 */
const MEMBER_LEVELS = [
  { level: 1, emoji: '🐣', title: '룸린이', minPoints: 0 },
  { level: 2, emoji: '🍻', title: '단골러', minPoints: 100 },
  { level: 3, emoji: '🧠', title: '빠꼼이', minPoints: 300 },
  { level: 4, emoji: '🎓', title: '룸박사', minPoints: 800 },
  { level: 5, emoji: '💎', title: 'VIP', minPoints: 2000 },
  { level: 6, emoji: '👑', title: '사장님', minPoints: 5000 },
  { level: 7, emoji: '🔱', title: '전설', minPoints: 15000 }
];

function normalizePoints(points) {
  const parsed = Number(points || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function resolveMemberLevel(totalPoints) {
  const normalizedPoints = normalizePoints(totalPoints);
  let current = MEMBER_LEVELS[0];

  for (const info of MEMBER_LEVELS) {
    if (normalizedPoints >= info.minPoints) {
      current = info;
    } else {
      break;
    }
  }

  return {
    ...current,
    label: `${current.emoji} ${current.title}`,
    totalPoints: normalizedPoints
  };
}

module.exports = { MEMBER_LEVELS, resolveMemberLevel };
