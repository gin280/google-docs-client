import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";

export default function FollowButton({ label, onClick, editorRef }) {
  const [style, setStyle] = useState({
    position: "absolute",
    left: "0px",
    top: "0px",
    zIndex: 1000,
    display: "none",
  });

  const hideTimeout = useRef(null); // 使用 useRef 来存储 hideTimeout

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (editorRef.current) {
        const editorBounds = editorRef.current.getBoundingClientRect();
        const isInsideEditor =
          e.clientX > editorBounds.left &&
          e.clientX < editorBounds.right &&
          e.clientY > editorBounds.top &&
          e.clientY < editorBounds.bottom;

        if (isInsideEditor) {
          if (hideTimeout.current) {
            clearTimeout(hideTimeout.current);
            hideTimeout.current = null;
          }
          setStyle({
            position: "fixed",
            left: editorBounds.left - 96 + "px",
            top: e.clientY - 10 + "px",
            zIndex: 1000,
            display: "block",
          });
        } else {
          if (!hideTimeout.current) {
            hideTimeout.current = setTimeout(() => {
              setStyle({
                display: "none",
              });
            }, 500);
          }
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, [editorRef]);

  const handleMouseEnter = () => {
    clearTimeout(hideTimeout.current);
  };

  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => {
      setStyle({
        display: "none",
      });
    }, 500);
  };

  return (
    <button
      className="followButton"
      style={style}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {label}
    </button>
  );
}

FollowButton.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  editorRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element),
  }).isRequired,
};
