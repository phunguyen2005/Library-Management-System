import React, { useState } from 'react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export default function StarRating({
  rating,
  maxStars = 5,
  onChange,
  size = 'md',
  interactive = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'text-base';
      case 'lg':
        return 'text-3xl';
      case 'md':
      default:
        return 'text-xl';
    }
  };

  const getStarClass = (starIndex: number) => {
    const currentRating = hoverRating !== null ? hoverRating : rating;
    const isFilled = starIndex <= currentRating;

    return `material-symbols-outlined select-none transition-all ${getIconSize()} ${
      interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
    } ${isFilled ? 'text-amber-500 fill-amber-500 font-variation-fill' : 'text-outline hover:text-amber-400'}`;
  };

  const stars = [];
  for (let idx = 1; idx <= maxStars; idx++) {
    const starIdx = idx;
    stars.push(
      <span
        key={starIdx}
        className={getStarClass(starIdx)}
        style={{
          fontVariationSettings: (hoverRating !== null ? starIdx <= hoverRating : starIdx <= rating)
            ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
            : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        }}
        onClick={() => interactive && onChange && onChange(starIdx)}
        onMouseEnter={() => interactive && setHoverRating(starIdx)}
        onMouseLeave={() => interactive && setHoverRating(null)}
      >
        star
      </span>
    );
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
}
