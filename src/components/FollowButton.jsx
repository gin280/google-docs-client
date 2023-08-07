import { useState, useEffect } from "react";

import PropTypes from "prop-types";

export default function FollowButton({ label, onClick, editorRef }) {
  const [style, setStyle] = useState({
    position: "absolute",
    left: "0px",
    top: "0px",
    zIndex: 1000,
    display: "none", // 初始时隐藏
    transition: "top 0.2s ease-out, left 0.2s ease-out", // 阻尼效果
  });

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
          setStyle({
            position: "fixed", // 使用fixed以便随滚动而滚动
            left: editorBounds.left - 108 + "px", // 调整离左侧的距离，你可以更改这个值
            top: e.clientY + "px",
            zIndex: 1000,
            display: "block",
          });
        } else {
          setStyle({
            display: "none", // 鼠标超出编辑器，隐藏按钮
          });
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [editorRef]);

  return (
    <button style={style} onClick={onClick}>
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
