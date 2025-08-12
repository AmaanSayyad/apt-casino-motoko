import React from "react";

/**
 * BackgroundImage - Component to set a background image with various options
 *
 * @param {string} src - Background image source path
 * @param {string} alt - Alt text for accessibility (will be added as aria-label)
 * @param {React.ReactNode} children - Content to render on top of the background
 * @param {string} overlay - CSS color value for overlay (e.g., 'rgba(0,0,0,0.5)')
 * @param {string} position - CSS background-position value
 * @param {string} size - CSS background-size value
 * @param {Object} style - Additional inline styles
 * @param {string} className - Additional CSS classes
 * @returns {JSX.Element}
 */
const BackgroundImage = ({
  src,
  alt,
  children,
  overlay = null,
  position = "center",
  size = "cover",
  style = {},
  className = "",
  ...props
}) => {
  // Base style for container
  const containerStyle = {
    position: "relative",
    backgroundImage: `url(${src})`,
    backgroundPosition: position,
    backgroundRepeat: "no-repeat",
    backgroundSize: size,
    ...style,
  };

  // Overlay styles if an overlay is specified
  const overlayStyle = overlay
    ? {
        content: "''",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: overlay,
        zIndex: 0,
      }
    : null;

  // Style for content on top of background
  const contentStyle = {
    position: "relative",
    zIndex: 1,
  };

  return (
    <div
      style={containerStyle}
      className={className}
      aria-label={alt}
      role="img"
      {...props}
    >
      {overlay && <div style={overlayStyle} aria-hidden="true" />}
      <div style={contentStyle}>{children}</div>
    </div>
  );
};

export default BackgroundImage;
