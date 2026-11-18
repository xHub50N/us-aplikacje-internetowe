import React, { useState } from 'react';

interface AvatarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const BG_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #3b82f6)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #8b5cf6, #3b82f6)',
  'linear-gradient(135deg, #14b8a6, #3b82f6)',
];

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().substring(0, 2).toUpperCase();
  }
  return '?';
}

function getGradientIndex(str?: string | null): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % BG_GRADIENTS.length;
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 28,
  className = '',
  style = {},
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(user?.name, user?.email);
  const bgGradient = BG_GRADIENTS[getGradientIndex(user?.name || user?.email)];

  const containerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    flexShrink: 0,
    ...style,
  };

  if (user?.avatarUrl && !imageError) {
    return (
      <div style={containerStyle} className={`user-avatar ${className}`}>
        <img
          src={user.avatarUrl}
          alt={user.name || 'Awatar'}
          onError={() => setImageError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  const fontSize = Math.max(10, Math.floor(size * 0.4));

  return (
    <div
      style={{
        ...containerStyle,
        background: bgGradient,
        color: '#ffffff',
        fontSize: `${fontSize}px`,
        fontWeight: 600,
        letterSpacing: '0.5px',
      }}
      className={`user-avatar initials ${className}`}
      title={user?.name || user?.email || undefined}
    >
      {initials}
    </div>
  );
};
