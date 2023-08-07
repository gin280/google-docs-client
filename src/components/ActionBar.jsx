import PropTypes from "prop-types";

function ActionBar({ show }) {
  return (
    <div style={{ display: show ? "block" : "none" }}>
      {/* 这里放置你的操作按钮 */}
    </div>
  );
}

ActionBar.propTypes = {
  show: PropTypes.bool.isRequired,
};

export default ActionBar;
