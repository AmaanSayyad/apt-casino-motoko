import React, { useState, useEffect } from "react";

/**
 * ImageWithFallback - Component to display images with a fallback on error
 *
 * @param {string} src - Primary image source path
 * @param {string} fallbackSrc - Fallback image source path if primary fails
 * @param {string} alt - Alt text for the image
 * @param {Object} props - Additional props to pass to the img element
 * @returns {JSX.Element} - Image component with fallback handling
 */
const ImageWithFallback = ({ src, fallbackSrc, alt, ...props }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset error state when src changes
    setHasError(false);
    setImgSrc(src);
  }, [src]);

  const handleError = () => {
    if (!hasError && fallbackSrc) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt || "Image"}
      onError={handleError}
      loading="lazy"
      {...props}
    />
  );
};

export default ImageWithFallback;
